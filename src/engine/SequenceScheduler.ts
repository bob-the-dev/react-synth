/**
 * Sequence Scheduler - Manages audio event scheduling with Tone.js
 *
 * Responsibilities:
 * - Creates and manages Tone.Part instances for all tracks
 * - Schedules metronome clicks
 * - Provides playback control (start, stop, update)
 * - Manages Transport lifecycle
 */

import * as Tone from "tone";
import { Track } from "../types/SequenceTypes";
import { AudioTrack } from "../types/AudioTypes";
import { PatternEngine } from "../patterns/PatternEngine";

export class SequenceScheduler {
  private parts: Tone.Part[] = [];
  private metronomeRef: Tone.Synth | null = null;
  private patternEngine: PatternEngine;

  constructor(scale?: number[]) {
    this.patternEngine = new PatternEngine(scale);
  }

  /**
   * Schedule all tracks for playback
   *
   * @param tracks - Sequence tracks with musical data
   * @param audioTracks - Audio engine tracks with synths
   * @param bpm - Beats per minute
   * @param stepsPerBar - Number of steps in the sequence (usually 8)
   * @param metronomeEnabled - Whether to play click track
   * @param onStepChange - Callback fired when step changes for visual feedback
   */
  scheduleTracks(
    tracks: Track[],
    audioTracks: AudioTrack[],
    bpm: number,
    stepsPerBar: number,
    metronomeEnabled: boolean = false,
    onStepChange?: (step: number) => void,
  ): void {
    // Clear existing parts
    this.dispose();

    console.log(`[SequenceScheduler] scheduleTracks called with ${tracks.length} tracks, BPM: ${bpm}, stepsPerBar: ${stepsPerBar}`);

    const secondsPerBeat = 60.0 / bpm;

    // Schedule metronome if enabled
    if (metronomeEnabled) {
      this.scheduleMetronome(stepsPerBar, secondsPerBeat);
    }

    // Schedule visual feedback for current step
    if (onStepChange) {
      this.scheduleVisualFeedback(stepsPerBar, secondsPerBeat, onStepChange);
    }

    // Schedule each track
    tracks.forEach((track, trackIndex) => {
      if (track.muted) {
        console.log(`[SequenceScheduler] Track ${trackIndex} is muted, skipping`);
        return;
      }

      const audioTrack = audioTracks[trackIndex];
      if (!audioTrack?.synth) {
        console.log(`[SequenceScheduler] Track ${trackIndex} has no synth, skipping`);
        return;
      }

      this.scheduleTrack(track, audioTrack, stepsPerBar, secondsPerBeat);
    });

    console.log(`[SequenceScheduler] Total parts created: ${this.parts.length}`);
  }

  /**
   * Schedule a single track
   */
  private scheduleTrack(
    track: Track,
    audioTrack: AudioTrack,
    stepsPerBar: number,
    secondsPerBeat: number,
  ): void {
    const synth = audioTrack.synth!;

    let totalEvents = 0;
    // Process each step
    track.steps.forEach((step, stepIndex) => {
      const stepStartTime = stepIndex * secondsPerBeat;
      const stepDuration = secondsPerBeat;

      // Resolve step to note events
      const events = this.patternEngine.resolveStep(
        step,
        stepStartTime,
        stepDuration,
        track.id,
      );

      if (events.length > 0) {
        console.log(`[SequenceScheduler] Track ${track.id}, Step ${stepIndex}: ${events.length} events (patternId: ${step.patternId})`);
      }
      totalEvents += events.length;

      // Create a Part for each event
      events.forEach((event) => {
        const part = new Tone.Part(
          (time) => {
            // Trigger the note with calculated velocity
            synth.triggerAttackRelease(
              event.note,
              event.duration,
              time,
              event.velocity,
            );
          },
          [[event.time, null]],
        );

        part.loop = true;
        part.loopEnd = stepsPerBar * secondsPerBeat;
        this.parts.push(part);
      });
    });

    console.log(`[SequenceScheduler] Track ${track.id} scheduled ${totalEvents} total events`);
  }

  /**
   * Schedule metronome clicks
   */
  private scheduleMetronome(stepsPerBar: number, secondsPerBeat: number): void {
    // Create metronome synth if needed
    if (!this.metronomeRef) {
      this.metronomeRef = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination();
      this.metronomeRef.volume.value = -12; // Quieter than main synths
    }

    // Two clicks per step (eighth note subdivisions)
    const clicksPerStep = 2;
    const totalClicks = stepsPerBar * clicksPerStep;
    const clickInterval = secondsPerBeat / clicksPerStep;

    for (let i = 0; i < totalClicks; i++) {
      const clickTime = i * clickInterval;
      const isDownbeat = i % (clicksPerStep * 4) === 0; // Every 4 steps
      const pitch = isDownbeat ? "C5" : "C4";

      const part = new Tone.Part(
        (time) => {
          this.metronomeRef?.triggerAttackRelease(pitch, "32n", time, 0.3);
        },
        [[clickTime, null]],
      );

      part.loop = true;
      part.loopEnd = stepsPerBar * secondsPerBeat;
      this.parts.push(part);
    }
  }

  /**
   * Schedule visual step feedback using Tone.Draw
   */
  private scheduleVisualFeedback(
    stepsPerBar: number,
    secondsPerBeat: number,
    onStepChange: (step: number) => void,
  ): void {
    console.log(`[SequenceScheduler] Scheduling visual feedback for ${stepsPerBar} steps, ${secondsPerBeat}s per beat`);
    for (let step = 0; step < stepsPerBar; step++) {
      const stepTime = step * secondsPerBeat;

      const part = new Tone.Part(
        (time) => {
          Tone.Draw.schedule(() => {
            console.log(`[Visual] Step ${step} at time ${time}`);
            onStepChange(step);
          }, time);
        },
        [[stepTime, null]],
      );

      part.loop = true;
      part.loopEnd = stepsPerBar * secondsPerBeat;
      this.parts.push(part);
    }
    console.log(`[SequenceScheduler] Created ${stepsPerBar} visual feedback parts`);
  }

  /**
   * Start playback
   */
  start(): void {
    console.log(`[SequenceScheduler] Starting ${this.parts.length} parts`);
    this.parts.forEach((part, index) => {
      part.start(0);
      console.log(`[SequenceScheduler] Started part ${index}`);
    });
    Tone.Transport.start();
    console.log(`[SequenceScheduler] Transport started, state: ${Tone.Transport.state}`);
  }

  /**
   * Stop playback
   */
  stop(): void {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.parts.forEach((part) => part.stop(0));
  }

  /**
   * Update BPM
   */
  setBPM(bpm: number): void {
    Tone.Transport.bpm.value = bpm;
  }

  /**
   * Update the musical scale
   */
  setScale(scale: number[]): void {
    this.patternEngine.setScale(scale);
  }

  /**
   * Clean up all parts and metronome
   */
  dispose(): void {
    this.parts.forEach((part) => part.dispose());
    this.parts = [];
  }

  /**
   * Dispose scheduler and all resources
   */
  destroy(): void {
    this.dispose();
    if (this.metronomeRef) {
      this.metronomeRef.dispose();
      this.metronomeRef = null;
    }
  }
}
