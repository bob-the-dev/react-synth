/**
 * Audio engine types for Tone.js integration
 */

import * as Tone from "tone";

/**
 * Audio track with synth and effects chain
 * Consolidates the Track interface previously duplicated in main.tsx and StepSequencer.tsx
 */
export interface AudioTrack {
  synth: Tone.PolySynth<any> | null;
  reverb: Tone.JCReverb | null;
  lfo: Tone.LFO | null;
  delay: Tone.FeedbackDelay | null;
  filter: Tone.Filter | null;
  distortion: Tone.Distortion | null;
}

/**
 * Configuration for creating an audio track
 */
export interface AudioTrackConfig {
  /** Settings for the synthesizer voice */
  synthSettings: any; // Will be TrackSettings from SettingsTypes

  /** Volume in decibels */
  volume: number;

  /** Whether track is muted */
  muted: boolean;
}
