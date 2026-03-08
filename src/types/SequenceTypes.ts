/**
 * Core types for the step sequencer system
 *
 * Architecture:
 * - PatternCell: Reusable musical pattern (building block)
 * - Step: Reference to a pattern with modifiers for one grid position
 * - Track: Horizontal row containing 8 steps
 * - SequenceGrid: Complete 5x8 grid of tracks and steps
 */

/**
 * Defines what a single voice should play within a pattern
 */
export interface PlayInstruction {
  /** Notes to play (as scale degrees, e.g., 0=root, 2=3rd, 4=5th) */
  notes: number[];

  /** Number of subdivisions within the step (1=single note, 3=triplet, 4=quadruplet) */
  subdivisions: number;

  /** Note duration in Tone.js notation ("8n", "16n", "4n.", etc.) */
  duration: string;

  /** Optional velocity override (0-127 MIDI velocity) */
  velocity?: number;

  /** Articulation style affects note duration and timing */
  articulation?: "staccato" | "legato" | "normal";
}

/**
 * A pattern cell defines what to play in a single step position.
 * It fits exactly one column of the sequencer grid.
 * This is the "building block" concept.
 */
export interface PatternCell {
  /** Unique identifier for this pattern */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** Category for organization and filtering */
  category: "single" | "tuplet" | "arpeggio" | "chord" | "rest";

  /** Instructions for what to play (can be multiple for chords) */
  instructions: PlayInstruction[];

  /** Optional description for tooltips/help */
  description?: string;
}

/**
 * Custom drawn note (for piano roll mode)
 */
export interface CustomNote {
  /** Note pitch in MIDI number (0-127) */
  pitch: number;

  /** Position within the step (0.0 = start, 1.0 = end) */
  position: number;

  /** Duration as fraction of step (typically 0.125 for 8th note) */
  duration: number;

  /** Velocity (0-127) */
  velocity?: number;
}

/**
 * A step represents one cell in the sequencer grid.
 * It references a pattern and can apply per-step modifiers.
 */
export interface Step {
  /** Reference to a pattern cell ID, or null for empty step */
  patternId: string | null;

  /** Custom drawn notes (alternative to pattern) */
  customNotes?: CustomNote[];

  /** Transpose amount in semitones (e.g., +12 = up one octave) */
  transpose?: number;

  /** Velocity multiplier (0.0-2.0, where 1.0 = no change) */
  velocityMultiplier?: number;

  /** Mute this specific step */
  muted?: boolean;

  /** Root note for the pattern (e.g., "C4", "D#3") - overrides default scale */
  rootNote?: string;

  /** If true, multi-note patterns arpeggiate randomly instead of playing as a chord */
  arpeggiate?: boolean;
}

/**
 * A track represents one horizontal row in the sequencer.
 * Contains 8 steps and track-level settings.
 */
export interface Track {
  /** Unique identifier for this track */
  id: string;

  /** Display name */
  name: string;

  /** Which instrument preset to use (references preset ID) */
  instrumentPresetId: string;

  /** Array of steps (typically 8 for 2 bars of 4/4) */
  steps: Step[];

  /** Track is muted */
  muted: boolean;

  /** Track volume in decibels (-60 to +6) */
  volume: number;

  /** Track is soloed (mutes all other tracks) */
  solo: boolean;

  /** Base transpose for entire track in semitones */
  trackTranspose?: number;
}

/**
 * The complete sequencer grid state
 */
export interface SequenceGrid {
  /** All tracks in the sequence */
  tracks: Track[];

  /** Musical scale as MIDI note numbers (e.g., [60, 62, 64, 65, 67, 69, 71, 72] for C major) */
  scale: number[];

  /** Beats per minute */
  bpm: number;

  /** Number of steps per bar (typically 8 for 2 bars of 4/4) */
  stepsPerBar: number;
}

/**
 * Resolved note event ready for audio scheduling
 */
export interface NoteEvent {
  /** MIDI note number (0-127) */
  note: number;

  /** Absolute time in seconds from start of loop */
  time: number;

  /** Duration in Tone.js notation */
  duration: string;

  /** Velocity (0-1 normalized) */
  velocity: number;

  /** Which track this note belongs to */
  trackId: string;
}
