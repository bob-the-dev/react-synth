/**
 * Library of reusable pattern cells (building blocks)
 *
 * Each pattern cell defines what happens in ONE step position (one grid column).
 * Patterns use scale degrees (0-7) instead of absolute MIDI notes for musical flexibility.
 */

import { PatternCell } from "../types/SequenceTypes";

/**
 * Complete library of pattern cells
 */
export const PATTERN_CELLS: PatternCell[] = [
  // ==================== REST ====================
  {
    id: "rest",
    name: "Rest",
    category: "rest",
    description: "Silent step (no notes played)",
    instructions: [],
  },

  // ==================== SINGLE NOTES ====================
  {
    id: "single-note",
    name: "Single",
    category: "single",
    description: "One note for the full step duration",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "8n",
        articulation: "normal",
      },
    ],
  },
  {
    id: "single-staccato",
    name: "Staccato",
    category: "single",
    description: "Short, detached note",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "16n",
        articulation: "staccato",
      },
    ],
  },
  {
    id: "single-legato",
    name: "Legato",
    category: "single",
    description: "Smooth, connected note",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "4n",
        articulation: "legato",
      },
    ],
  },
  {
    id: "dotted-eighth",
    name: "Dotted 8th",
    category: "single",
    description: "Dotted eighth note (swing feel)",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "8n.",
      },
    ],
  },

  // ==================== TUPLETS (REPEATED NOTES) ====================
  {
    id: "double",
    name: "Double",
    category: "tuplet",
    description: "Two repeated notes",
    instructions: [
      {
        notes: [0, 0],
        subdivisions: 2,
        duration: "16n",
      },
    ],
  },
  {
    id: "triplet",
    name: "Triplet",
    category: "tuplet",
    description: "Three notes in the space of two",
    instructions: [
      {
        notes: [0, 0, 0],
        subdivisions: 3,
        duration: "8t",
      },
    ],
  },
  {
    id: "quadruplet",
    name: "Quad",
    category: "tuplet",
    description: "Four sixteenth notes",
    instructions: [
      {
        notes: [0, 0, 0, 0],
        subdivisions: 4,
        duration: "16n",
      },
    ],
  },
  {
    id: "quintuplet",
    name: "Quint",
    category: "tuplet",
    description: "Five notes evenly spaced",
    instructions: [
      {
        notes: [0, 0, 0, 0, 0],
        subdivisions: 5,
        duration: "16n",
      },
    ],
  },
  {
    id: "sextuplet",
    name: "Sext",
    category: "tuplet",
    description: "Six notes (two triplets)",
    instructions: [
      {
        notes: [0, 0, 0, 0, 0, 0],
        subdivisions: 6,
        duration: "16t",
      },
    ],
  },
  {
    id: "septuplet",
    name: "Sept",
    category: "tuplet",
    description: "Seven notes evenly spaced",
    instructions: [
      {
        notes: [0, 0, 0, 0, 0, 0, 0],
        subdivisions: 7,
        duration: "32n",
      },
    ],
  },
  {
    id: "octuplet",
    name: "Oct",
    category: "tuplet",
    description: "Eight thirty-second notes",
    instructions: [
      {
        notes: [0, 0, 0, 0, 0, 0, 0, 0],
        subdivisions: 8,
        duration: "32n",
      },
    ],
  },

  // ==================== ARPEGGIOS ====================
  {
    id: "arp-up-triad",
    name: "↑ Triad",
    category: "arpeggio",
    description: "Ascending major triad (root, 3rd, 5th)",
    instructions: [
      {
        notes: [0, 2, 4],
        subdivisions: 3,
        duration: "16n",
      },
    ],
  },
  {
    id: "arp-down-triad",
    name: "↓ Triad",
    category: "arpeggio",
    description: "Descending major triad",
    instructions: [
      {
        notes: [4, 2, 0],
        subdivisions: 3,
        duration: "16n",
      },
    ],
  },
  {
    id: "arp-up-down-triad",
    name: "↑↓ Triad",
    category: "arpeggio",
    description: "Up and down triad",
    instructions: [
      {
        notes: [0, 2, 4, 2],
        subdivisions: 4,
        duration: "16n",
      },
    ],
  },
  {
    id: "arp-up-seventh",
    name: "↑ 7th",
    category: "arpeggio",
    description: "Ascending seventh chord",
    instructions: [
      {
        notes: [0, 2, 4, 6],
        subdivisions: 4,
        duration: "16n",
      },
    ],
  },
  {
    id: "arp-down-seventh",
    name: "↓ 7th",
    category: "arpeggio",
    description: "Descending seventh chord",
    instructions: [
      {
        notes: [6, 4, 2, 0],
        subdivisions: 4,
        duration: "16n",
      },
    ],
  },
  {
    id: "arp-up-octave",
    name: "↑ Octave",
    category: "arpeggio",
    description: "Ascending full octave",
    instructions: [
      {
        notes: [0, 1, 2, 3, 4, 5, 6, 7],
        subdivisions: 8,
        duration: "32n",
      },
    ],
  },
  {
    id: "arp-down-octave",
    name: "↓ Octave",
    category: "arpeggio",
    description: "Descending full octave",
    instructions: [
      {
        notes: [7, 6, 5, 4, 3, 2, 1, 0],
        subdivisions: 8,
        duration: "32n",
      },
    ],
  },

  // ==================== CHORDS (SIMULTANEOUS NOTES) ====================
  {
    id: "chord-major",
    name: "Major",
    category: "chord",
    description: "Major triad (root, 3rd, 5th)",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "4n",
        velocity: 60, // Reduced for 3-note chord
      },
      {
        notes: [2],
        subdivisions: 1,
        duration: "4n",
        velocity: 60,
      },
      {
        notes: [4],
        subdivisions: 1,
        duration: "4n",
        velocity: 60,
      },
    ],
  },
  {
    id: "chord-seventh",
    name: "7th Chord",
    category: "chord",
    description: "Seventh chord (four notes)",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "4n",
        velocity: 50, // Reduced for 4-note chord
      },
      {
        notes: [2],
        subdivisions: 1,
        duration: "4n",
        velocity: 50,
      },
      {
        notes: [4],
        subdivisions: 1,
        duration: "4n",
        velocity: 50,
      },
      {
        notes: [6],
        subdivisions: 1,
        duration: "4n",
        velocity: 50,
      },
    ],
  },
  {
    id: "chord-staccato",
    name: "Stab",
    category: "chord",
    description: "Short chord stab",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "16n",
        articulation: "staccato",
        velocity: 60, // Reduced for 3-note chord
      },
      {
        notes: [2],
        subdivisions: 1,
        duration: "16n",
        articulation: "staccato",
        velocity: 60,
      },
      {
        notes: [4],
        subdivisions: 1,
        duration: "16n",
        articulation: "staccato",
        velocity: 60,
      },
    ],
  },
  {
    id: "chord-power",
    name: "Power",
    category: "chord",
    description: "Power chord (root and 5th)",
    instructions: [
      {
        notes: [0],
        subdivisions: 1,
        duration: "4n",
        velocity: 70, // Reduced for 2-note chord
      },
      {
        notes: [4],
        subdivisions: 1,
        duration: "4n",
        velocity: 70,
      },
    ],
  },
];

/**
 * Get a pattern cell by ID
 */
export function getPatternCell(id: string): PatternCell | undefined {
  return PATTERN_CELLS.find((p) => p.id === id);
}

/**
 * Get all patterns in a category
 */
export function getPatternsByCategory(
  category: PatternCell["category"],
): PatternCell[] {
  return PATTERN_CELLS.filter((p) => p.category === category);
}

/**
 * Get all unique categories
 */
export function getCategories(): PatternCell["category"][] {
  return ["single", "tuplet", "arpeggio", "chord", "rest"];
}

/**
 * Search patterns by name or description
 */
export function searchPatterns(query: string): PatternCell[] {
  const lowerQuery = query.toLowerCase();
  return PATTERN_CELLS.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery),
  );
}
