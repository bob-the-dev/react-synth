/**
 * Audio Context Factory - Creates and manages audio tracks with effect chains
 *
 * Responsibilities:
 * - Create synthesizer instances with effect chains
 * - Provide consistent audio routing
 * - Manage audio resource lifecycle
 */

import * as Tone from "tone";
import { AudioTrack } from "../types/AudioTypes";
import { DualOscVoice } from "./DualOscVoice";

/**
 * Create an audio track with synthesizer and full effect chain
 *
 * Signal flow: synth → distortion → filter → delay → reverb → destination
 *
 * @param settings - Synthesizer voice settings (flat structure)
 * @returns Complete audio track with all effects
 */
export function createAudioTrack(settings: any): AudioTrack {
  // Create filter
  const filter = new Tone.Filter({
    type: settings.filterType || "lowpass",
    frequency: settings.filterFreq || 1000,
    Q: settings.filterQ || 1,
  });

  // Create distortion
  const distortion = new Tone.Distortion({
    distortion: settings.drive || 0,
    wet: settings.drive > 0 ? 1 : 0,
  });

  // Create delay
  const delay = new Tone.FeedbackDelay({
    delayTime: settings.delayTime || 0.25,
    feedback: settings.delayFeedback || 0.3,
    wet: settings.delayWet || 0,
  });

  // Create reverb
  const reverb = new Tone.JCReverb({
    roomSize: settings.reverbSize || 0.5,
    wet: settings.reverbWet || 0,
  });

  // Chain effects: distortion → filter → delay → reverb → destination
  distortion.connect(filter);
  filter.connect(delay);
  delay.connect(reverb);
  reverb.toDestination();

  // Create synthesizer with dual oscillator voice
  const synth = new Tone.PolySynth(DualOscVoice, {
    ...settings,
  }).connect(distortion);

  // Set max polyphony to avoid voice stealing
  synth.maxPolyphony = 128;

  // Apply synth-level settings
  synth.volume.value = settings.volume || 0;
  if (settings.portamento > 0) {
    synth.set({ portamento: settings.portamento });
  }

  // Create LFO (starts stopped)
  const lfo = new Tone.LFO({
    frequency: settings.lfoRate || 4,
    min: 0,
    max: 0,
    type: settings.lfoType || "sine",
  });

  return {
    synth,
    reverb,
    lfo,
    delay,
    filter,
    distortion,
  };
}

/**
 * Dispose of an audio track and all its resources
 */
export function disposeAudioTrack(track: AudioTrack): void {
  if (track.synth) track.synth.dispose();
  if (track.reverb) track.reverb.dispose();
  if (track.lfo) track.lfo.dispose();
  if (track.delay) track.delay.dispose();
  if (track.filter) track.filter.dispose();
  if (track.distortion) track.distortion.dispose();
}

/**
 * Create multiple audio tracks
 */
export function createAudioTracks(settingsArray: any[]): AudioTrack[] {
  return settingsArray.map((settings) => createAudioTrack(settings));
}

/**
 * Dispose of multiple audio tracks
 */
export function disposeAudioTracks(tracks: AudioTrack[]): void {
  tracks.forEach((track) => disposeAudioTrack(track));
}
