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
    if (!step.patternId || step.muted) {
      return [];
    }

    // Look up the pattern
    const pattern = getPatternCell(step.patternId);
    if (!pattern) {
      console.warn(`Pattern not found: ${step.patternId}`);
      return [];
    }

    const events: NoteEvent[] = [];
    const transpose = step.transpose || 0;
    const velocityMult = step.velocityMultiplier || 1.0;

    // Process each instruction in the pattern
    pattern.instructions.forEach((instruction) => {
      const instructionEvents = this.resolveInstruction(
        instruction,
        stepStartTime,
        stepDuration,
        transpose,
        velocityMult,
        trackId,
      );
      events.push(...instructionEvents);
    });

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
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const subDuration = stepDuration / instruction.subdivisions;

    instruction.notes.forEach((scaleDegree, noteIndex) => {
      // Convert scale degree to MIDI note number
      const midiNote = this.scaleDegreesToMidi(scaleDegree) + transpose;

      // Calculate timing within the step
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
   * @returns MIDI note number
   */
  private scaleDegreesToMidi(scaleDegree: number): number {
    const scaleLength = this.scale.length;
    const octaveShift = Math.floor(scaleDegree / scaleLength);
    const scaleIndex =
      ((scaleDegree % scaleLength) + scaleLength) % scaleLength;

    return this.scale[scaleIndex] + octaveShift * 12;
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
}
