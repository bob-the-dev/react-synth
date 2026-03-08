/**
 * Pattern Engine - Resolves pattern cells into concrete note events
 *
 * Responsibilities:
 * - Convert scale degrees to MIDI note numbers
 * - Apply step-level modifiers (transpose, velocity)
 * - Handle articulation
 * - Generate timing information
 */

import { Step, NoteEvent, PlayInstruction } from "../types/SequenceTypes";
import { getPatternCell } from "./PatternCells";

export class PatternEngine {
  private scale: number[];

  /**
   * @param scale - Musical scale as MIDI note numbers (e.g., [60, 62, 64, 65, 67, 69, 71, 72] for C major)
   */
  constructor(scale: number[] = [60, 62, 64, 65, 67, 69, 71, 72]) {
    this.scale = scale;
  }

  /**
   * Resolve a step into concrete note events ready for scheduling
   *
   * @param step - The step to resolve
   * @param stepStartTime - Absolute time in seconds when this step starts
   * @param stepDuration - Duration of this step in seconds
   * @param trackId - ID of the track this step belongs to
   * @returns Array of note events
   */
  resolveStep(
    step: Step,
    stepStartTime: number,
    stepDuration: number,
    trackId: string,
  ): NoteEvent[] {
    // Empty or muted steps produce no events
    if (step.muted) {
      return [];
    }

    // Handle custom notes (piano roll mode)
    if (step.customNotes && step.customNotes.length > 0) {
      const customEvents = step.customNotes.map((customNote) => {
        // customNote.position is 0-7 (8th note subdivisions)
        // customNote.pitch is MIDI pitch (already absolute, not relative to root)
        // customNote.duration is number of subdivisions (1-8)

        const noteStartTime =
          stepStartTime + (customNote.position / 8) * stepDuration;
        const noteDuration = this.subdivisionsToDuration(customNote.duration);
        const velocity = customNote.velocity || 0.7;

        return {
          trackId,
          note: customNote.pitch,
          time: noteStartTime,
          duration: noteDuration,
          velocity,
        };
      });
      console.log(`[PatternEngine] Custom notes for ${trackId}:`, customEvents);
      return customEvents;
    }

    // Handle pattern-based notes
    if (!step.patternId) {
      return [];
    }

    // Look up the pattern
    const pattern = getPatternCell(step.patternId);
    if (!pattern) {
      console.warn(`Pattern not found: ${step.patternId}`);
      return [];
    }

    // Use custom scale if rootNote is specified
    const scale = step.rootNote
      ? this.generateScaleFromRoot(step.rootNote)
      : this.scale;

    const events: NoteEvent[] = [];
    const transpose = step.transpose || 0;
    const velocityMult = step.velocityMultiplier || 1.0;
    const arpeggiate = step.arpeggiate || false;

    // Process each instruction in the pattern
    pattern.instructions.forEach((instruction) => {
      const instructionEvents = this.resolveInstruction(
        instruction,
        stepStartTime,
        stepDuration,
        transpose,
        velocityMult,
        trackId,
        scale,
        arpeggiate,
      );
      events.push(...instructionEvents);
    });

    console.log(
      `[PatternEngine] Pattern ${step.patternId} for ${trackId}:`,
      events.length,
      "events",
    );
    return events;
  }

  /**
   * Resolve a single play instruction to note events
   */
  private resolveInstruction(
    instruction: PlayInstruction,
    stepStartTime: number,
    stepDuration: number,
    transpose: number,
    velocityMult: number,
    trackId: string,
    scale: number[],
    arpeggiate: boolean,
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const subDuration = stepDuration / instruction.subdivisions;
    const noteCount = instruction.notes.length;

    instruction.notes.forEach((scaleDegree, noteIndex) => {
      // Convert scale degree to MIDI note number using provided scale
      let midiNote = this.scaleDegreeToMidi(scaleDegree, scale) + transpose;

      // Apply random octave shift if arpeggiate is enabled
      if (arpeggiate && noteCount > 1) {
        // Randomly shift up or down by 0, 1, or 2 octaves
        // This creates variation while keeping timing intact
        const octaveShifts = [-24, -12, 0, 12, 24]; // -2, -1, 0, +1, +2 octaves
        const randomShift =
          octaveShifts[Math.floor(Math.random() * octaveShifts.length)];
        midiNote += randomShift;

        // Ensure we stay within valid MIDI range (0-127)
        midiNote = Math.max(0, Math.min(127, midiNote));
      }

      // Calculate timing within the step (keep original timing)
      const timeOffset = noteIndex * subDuration;

      // Get base velocity
      const baseVelocity = instruction.velocity || 80;
      const finalVelocity =
        Math.min(127, Math.max(0, baseVelocity * velocityMult)) / 127;

      // Get duration (articulation could modify this)
      let duration = instruction.duration;
      if (instruction.articulation === "staccato") {
        // For staccato, use shorter duration
        duration = this.shortenDuration(duration, 0.5);
      }

      events.push({
        note: midiNote,
        time: stepStartTime + timeOffset,
        duration: duration,
        velocity: finalVelocity,
        trackId: trackId,
      });
    });

    return events;
  }

  /**
   * Convert scale degree to MIDI note number
   *
   * Scale degrees can be:
   * - 0-7: notes within the current octave
   * - 8+: notes in higher octaves (8 = root + 1 octave, 15 = root + 2 octaves, etc.)
   * - negative: notes in lower octaves
   *
   * @param scaleDegree - Scale degree (can be any integer)
   * @param scale - Musical scale to use (defaults to instance scale)
   * @returns MIDI note number
   */
  private scaleDegreeToMidi(scaleDegree: number, scale?: number[]): number {
    const useScale = scale || this.scale;
    const scaleLength = useScale.length;
    const octaveShift = Math.floor(scaleDegree / scaleLength);
    const scaleIndex =
      ((scaleDegree % scaleLength) + scaleLength) % scaleLength;

    return useScale[scaleIndex] + octaveShift * 12;
  }

  /**
   * Shorten duration for articulation effects
   * This is a simplified approach - you could parse and modify Tone.js durations more precisely
   *
   * @param duration - Original duration string
   * @param factor - Multiplier (< 1 shortens, > 1 lengthens)
   * @returns Modified duration string
   */
  private shortenDuration(duration: string, factor: number): string {
    // Simple approach: for staccato, just use a shorter note value
    // In a real implementation, you might parse the duration more carefully
    if (factor < 1 && duration.includes("8n")) {
      return "16n";
    }
    if (factor < 1 && duration.includes("4n")) {
      return "8n";
    }
    return duration;
  }

  /**
   * Update the musical scale
   *
   * @param scale - New scale as MIDI note numbers
   */
  setScale(scale: number[]): void {
    this.scale = scale;
  }

  /**
   * Get the current scale
   */
  getScale(): number[] {
    return [...this.scale];
  }

  /**
   * Convert note name to MIDI note number
   *
   * @param noteName - Note name (e.g., "C4", "D#5", "Gb3")
   * @returns MIDI note number (0-127)
   */
  private noteNameToMidi(noteName: string): number {
    const noteMap: { [key: string]: number } = {
      C: 0,
      "C#": 1,
      Db: 1,
      D: 2,
      "D#": 3,
      Eb: 3,
      E: 4,
      F: 5,
      "F#": 6,
      Gb: 6,
      G: 7,
      "G#": 8,
      Ab: 8,
      A: 9,
      "A#": 10,
      Bb: 10,
      B: 11,
    };

    // Parse note name (e.g., "C#4" -> note="C#", octave=4)
    const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      console.warn(`Invalid note name: ${noteName}, defaulting to C4`);
      return 60; // C4
    }

    const [, note, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    const noteValue = noteMap[note];

    if (noteValue === undefined) {
      console.warn(`Invalid note: ${note}, defaulting to C4`);
      return 60;
    }

    return noteValue + (octave + 1) * 12; // MIDI octave starts at -1
  }

  /**
   * Generate a major scale from a root note
   *
   * @param rootNote - Root note name (e.g., "C4", "D#3")
   * @returns Array of MIDI note numbers for a major scale
   */
  private generateScaleFromRoot(rootNote: string): number[] {
    const rootMidi = this.noteNameToMidi(rootNote);
    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11, 12]; // Major scale formula

    return majorScaleIntervals.map((interval) => rootMidi + interval);
  }

  /**
   * Convert subdivision count to Tone.js duration notation
   *
   * @param subdivisions - Number of 8th note subdivisions (1-8)
   * @returns Tone.js duration string
   */
  private subdivisionsToDuration(subdivisions: number): string {
    // Map subdivisions to Tone.js notation
    // 1 subdivision = 8th note = "8n"
    // 2 subdivisions = quarter note = "4n"
    // 3 subdivisions = dotted quarter = "4n."
    // 4 subdivisions = half note = "2n"
    // 5 subdivisions = ??? (approximate as "2n.")
    // 6 subdivisions = dotted half = "2n."
    // 7 subdivisions = ??? (approximate as "2n..")
    // 8 subdivisions = whole note = "1n"

    switch (subdivisions) {
      case 1:
        return "8n";
      case 2:
        return "4n";
      case 3:
        return "4n.";
      case 4:
        return "2n";
      case 5:
      case 6:
        return "2n.";
      case 7:
      case 8:
        return "1n";
      default:
        return "8n"; // Default to 8th note
    }
  }
}
