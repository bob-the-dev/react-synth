/**
 * Simple, hardcoded instruments for each track
 * These are independent and don't share settings
 */

import * as Tone from "tone";
import { AudioTrack } from "../types/AudioTypes";

/**
 * Create Track 1 - Piano (clean, melodic)
 */
export function createPianoTrack(): AudioTrack {
  const reverb = new Tone.Reverb({
    decay: 2,
    wet: 0.3,
  }).toDestination();

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.005,
      decay: 0.3,
      sustain: 0.2,
      release: 1.2,
    },
    volume: 0,
  }).connect(reverb);

  synth.maxPolyphony = 32;

  return {
    synth,
    reverb,
    lfo: null,
    delay: null,
    filter: null,
    distortion: null,
  };
}

/**
 * Create Track 2 - Bass (deep, punchy)
 */
export function createBassTrack(): AudioTrack {
  const filter = new Tone.Filter({
    type: "lowpass",
    frequency: 800,
    Q: 2,
  });

  const distortion = new Tone.Distortion({
    distortion: 0.3,
    wet: 0.5,
  });

  filter.connect(distortion);
  distortion.toDestination();

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sawtooth" },
    envelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.4,
      release: 0.5,
    },
    volume: 0,
  }).connect(filter);

  synth.maxPolyphony = 8;

  return {
    synth,
    reverb: null,
    lfo: null,
    delay: null,
    filter,
    distortion,
  };
}

/**
 * Create Track 3 - Hi-hat (percussive, bright)
 */
export function createHiHatTrack(): AudioTrack {
  const filter = new Tone.Filter({
    type: "highpass",
    frequency: 5000,
    Q: 1,
  });

  filter.toDestination();

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "square" },
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0,
      release: 0.05,
    },
    volume: -6,
  }).connect(filter);

  synth.maxPolyphony = 16;

  return {
    synth,
    reverb: null,
    lfo: null,
    delay: null,
    filter,
    distortion: null,
  };
}

/**
 * Create Track 4 - Drone (sustained pad)
 */
export async function createDroneTrack(): Promise<AudioTrack> {
  const delay = new Tone.FeedbackDelay({
    delayTime: 0.375,
    feedback: 0.3,
    wet: 0.4,
  });

  const reverb = new Tone.Reverb({
    decay: 4,
    wet: 0.5,
  });

  // Generate reverb impulse response (required for Reverb to work)
  await reverb.generate();

  delay.connect(reverb);
  reverb.toDestination();

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.8,
      decay: 0.3,
      sustain: 0.7,
      release: 2.0,
    },
    volume: -3,
  }).connect(delay);

  synth.maxPolyphony = 32;

  return {
    synth,
    reverb,
    lfo: null,
    delay,
    filter: null,
    distortion: null,
  };
}

/**
 * Create all 4 tracks with simple, independent instruments
 */
export async function createSimpleTracks(): Promise<AudioTrack[]> {
  return [
    createPianoTrack(),
    createBassTrack(),
    createHiHatTrack(),
    await createDroneTrack(), // Await drone track reverb generation
  ];
}

/**
 * Dispose of all audio tracks
 */
export function disposeSimpleTracks(tracks: AudioTrack[]): void {
  tracks.forEach((track) => {
    if (track.synth) track.synth.dispose();
    if (track.reverb) track.reverb.dispose();
    if (track.lfo) track.lfo?.dispose();
    if (track.delay) track.delay?.dispose();
    if (track.filter) track.filter?.dispose();
    if (track.distortion) track.distortion?.dispose();
  });
}
