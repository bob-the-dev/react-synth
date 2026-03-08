/**
 * Piano Roll - Draw custom notes on a step
 *
 * FL Studio-style piano roll for drawing 8th notes within a step
 */

import { useState, useRef, MouseEvent } from "react";
import { CustomNote } from "../types/SequenceTypes";

interface PianoRollProps {
  /** Custom notes to display/edit */
  customNotes: CustomNote[];

  /** Callback when notes change */
  onChange: (notes: CustomNote[]) => void;

  /** Root note for MIDI reference (e.g., "C4") */
  rootNote?: string;
}

// Number of piano keys to show (2 octaves)
const NUM_OCTAVES = 2;
const KEYS_PER_OCTAVE = 12;
const TOTAL_KEYS = NUM_OCTAVES * KEYS_PER_OCTAVE;

// Number of 8th note subdivisions in a step
const SUBDIVISIONS = 8;

export default function PianoRoll({
  customNotes,
  onChange,
  rootNote = "C4",
}: PianoRollProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Convert root note to MIDI number
  const getRootMidi = (): number => {
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

    const match = rootNote.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) return 60; // Default to C4

    const [, note, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    const noteValue = noteMap[note] || 0;

    return noteValue + (octave + 1) * 12;
  };

  const rootMidi = getRootMidi();
  const minMidi = rootMidi - KEYS_PER_OCTAVE; // One octave below
  const maxMidi = rootMidi + KEYS_PER_OCTAVE - 1; // One octave above

  // Convert MIDI to note name
  const midiToNoteName = (midi: number): string => {
    const notes = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
  };

  // Check if a note is a black key
  const isBlackKey = (midi: number): boolean => {
    const semitone = midi % 12;
    return [1, 3, 6, 8, 10].includes(semitone); // C#, D#, F#, G#, A#
  };

  // Handle mouse down - start drawing or erasing
  const handleMouseDown = (
    e: MouseEvent<HTMLDivElement>,
    pitch: number,
    subdivision: number,
  ) => {
    e.preventDefault();

    const existingIndex = customNotes.findIndex(
      (n) =>
        n.pitch === pitch &&
        Math.floor(n.position * SUBDIVISIONS) === subdivision,
    );

    if (e.button === 2 || e.ctrlKey || existingIndex >= 0) {
      // Right click or Ctrl+Click or clicking existing note = erase mode
      setIsErasing(true);
      if (existingIndex >= 0) {
        onChange(customNotes.filter((_, i) => i !== existingIndex));
      }
    } else {
      // Left click on empty cell = draw mode
      setIsDrawing(true);
      addNote(pitch, subdivision);
    }
  };

  const handleMouseEnter = (pitch: number, subdivision: number) => {
    if (isDrawing) {
      addNote(pitch, subdivision);
    } else if (isErasing) {
      const existingIndex = customNotes.findIndex(
        (n) =>
          n.pitch === pitch &&
          Math.floor(n.position * SUBDIVISIONS) === subdivision,
      );
      if (existingIndex >= 0) {
        onChange(customNotes.filter((_, i) => i !== existingIndex));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsErasing(false);
  };

  const addNote = (pitch: number, subdivision: number) => {
    const position = subdivision / SUBDIVISIONS;
    const duration = 1 / SUBDIVISIONS; // 8th note duration

    // Don't add if already exists
    const exists = customNotes.some(
      (n) =>
        n.pitch === pitch &&
        Math.floor(n.position * SUBDIVISIONS) === subdivision,
    );

    if (!exists) {
      onChange([...customNotes, { pitch, position, duration, velocity: 80 }]);
    }
  };

  // Clear all notes
  const handleClear = () => {
    onChange([]);
  };

  return (
    <div
      style={{
        marginBottom: "16px",
        userSelect: "none",
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <label
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#666",
          }}
        >
          Draw Notes (Click to add, Right-click to remove)
        </label>
        <button
          onClick={handleClear}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Clear All
        </button>
      </div>

      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: `40px repeat(${SUBDIVISIONS}, 1fr)`,
          gridTemplateRows: `repeat(${TOTAL_KEYS}, 20px)`,
          border: "1px solid #333",
          backgroundColor: "#f5f5f5",
          overflow: "hidden",
        }}
      >
        {/* Piano roll grid */}
        {Array.from({ length: TOTAL_KEYS }).map((_, keyIndex) => {
          const pitch = maxMidi - keyIndex; // Top to bottom
          const isBlack = isBlackKey(pitch);
          const noteName = midiToNoteName(pitch);
          const isRoot = pitch === rootMidi;

          return (
            <div
              key={`row-${keyIndex}`}
              style={{
                display: "contents",
              }}
            >
              {/* Note label */}
              <div
                style={{
                  gridColumn: 1,
                  gridRow: keyIndex + 1,
                  backgroundColor: isBlack ? "#333" : "#fff",
                  color: isBlack ? "#fff" : "#000",
                  border: "1px solid #999",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: isRoot ? "bold" : "normal",
                  borderRight: isRoot ? "3px solid #2196F3" : "1px solid #999",
                }}
              >
                {noteName}
              </div>

              {/* Grid cells for each subdivision */}
              {Array.from({ length: SUBDIVISIONS }).map((_, subIndex) => {
                const hasNote = customNotes.some(
                  (n) =>
                    n.pitch === pitch &&
                    Math.floor(n.position * SUBDIVISIONS) === subIndex,
                );

                return (
                  <div
                    key={`cell-${keyIndex}-${subIndex}`}
                    onMouseDown={(e) => handleMouseDown(e, pitch, subIndex)}
                    onMouseEnter={() => handleMouseEnter(pitch, subIndex)}
                    style={{
                      gridColumn: subIndex + 2,
                      gridRow: keyIndex + 1,
                      backgroundColor: hasNote
                        ? "#4CAF50"
                        : isBlack
                          ? "#e0e0e0"
                          : "#fff",
                      border: "1px solid #ccc",
                      borderLeft:
                        subIndex % 2 === 0
                          ? "2px solid #999"
                          : "1px solid #ccc",
                      cursor: "crosshair",
                      transition: "background-color 0.05s",
                    }}
                    title={`${noteName} - ${subIndex + 1}/8`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "11px",
          color: "#666",
          textAlign: "center",
        }}
      >
        Range: {midiToNoteName(minMidi)} - {midiToNoteName(maxMidi)} •{" "}
        {customNotes.length} note
        {customNotes.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
