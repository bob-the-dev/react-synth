/**
 * Piano Keyboard - Visual keyboard for note selection
 *
 * Displays a clickable piano keyboard with white and black keys
 */

import { useState } from "react";

interface PianoKeyboardProps {
  /** Currently selected note (e.g., "C4") */
  selectedNote: string;

  /** Callback when a key is clicked */
  onNoteSelect: (note: string) => void;

  /** Callback to preview/play the note */
  onPreview?: (note: string) => void;
}

// Notes in chromatic order with their type
const CHROMATIC_NOTES = [
  { note: "C", black: false },
  { note: "C#", black: true },
  { note: "D", black: false },
  { note: "D#", black: true },
  { note: "E", black: false },
  { note: "F", black: false },
  { note: "F#", black: true },
  { note: "G", black: false },
  { note: "G#", black: true },
  { note: "A", black: false },
  { note: "A#", black: true },
  { note: "B", black: false },
];

export default function PianoKeyboard({
  selectedNote,
  onNoteSelect,
  onPreview,
}: PianoKeyboardProps) {
  const [hoverNote, setHoverNote] = useState<string | null>(null);
  const [currentOctaveStart, setCurrentOctaveStart] = useState(3); // Start at octave 3-4

  const handleKeyClick = (noteName: string) => {
    onNoteSelect(noteName);
    onPreview?.(noteName);
  };

  // Navigate octaves
  const handlePrevOctave = () => {
    if (currentOctaveStart > 0) {
      setCurrentOctaveStart(currentOctaveStart - 1);
    }
  };

  const handleNextOctave = () => {
    if (currentOctaveStart < 7) {
      setCurrentOctaveStart(currentOctaveStart + 1);
    }
  };

  // Generate notes for current 2-octave view
  const displayOctaves = 2; // Show 2 octaves at a time
  const allNotes: Array<{ name: string; black: boolean }> = [];
  for (let i = 0; i < displayOctaves; i++) {
    const octave = currentOctaveStart + i;
    if (octave <= 8) {
      for (const { note, black } of CHROMATIC_NOTES) {
        allNotes.push({ name: `${note}${octave}`, black });
      }
    }
  }

  // Separate white and black keys for rendering
  const whiteKeys = allNotes.filter((n) => !n.black);
  const blackKeys = allNotes.filter((n) => n.black);

  const whiteKeyWidth = 24;
  const whiteKeyHeight = 90;
  const blackKeyWidth = 16;
  const blackKeyHeight = 55;

  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "#666",
        }}
      >
        Root Note - Click to select & preview
      </label>

      {/* Carousel navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <button
          onClick={handlePrevOctave}
          disabled={currentOctaveStart === 0}
          style={{
            padding: "6px 12px",
            fontSize: "16px",
            backgroundColor: currentOctaveStart === 0 ? "#e0e0e0" : "#2196F3",
            color: currentOctaveStart === 0 ? "#999" : "white",
            border: "none",
            borderRadius: "4px",
            cursor: currentOctaveStart === 0 ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
          title="Previous octave"
        >
          ◀
        </button>

        <span
          style={{
            fontSize: "12px",
            color: "#666",
            minWidth: "80px",
            textAlign: "center",
          }}
        >
          Octaves {currentOctaveStart}-{currentOctaveStart + displayOctaves - 1}
        </span>

        <button
          onClick={handleNextOctave}
          disabled={currentOctaveStart >= 7}
          style={{
            padding: "6px 12px",
            fontSize: "16px",
            backgroundColor: currentOctaveStart >= 7 ? "#e0e0e0" : "#2196F3",
            color: currentOctaveStart >= 7 ? "#999" : "white",
            border: "none",
            borderRadius: "4px",
            cursor: currentOctaveStart >= 7 ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
          title="Next octave"
        >
          ▶
        </button>
      </div>

      <div
        style={{
          position: "relative",
          height: `${whiteKeyHeight}px`,
          width: `${whiteKeys.length * whiteKeyWidth}px`,
          margin: "0 auto",
          userSelect: "none",
        }}
      >
        {/* White keys */}
        {whiteKeys.map((key, index) => {
          const isSelected = key.name === selectedNote;
          const isHover = key.name === hoverNote;

          return (
            <div
              key={key.name}
              onClick={() => handleKeyClick(key.name)}
              onMouseEnter={() => setHoverNote(key.name)}
              onMouseLeave={() => setHoverNote(null)}
              style={{
                position: "absolute",
                left: `${index * whiteKeyWidth}px`,
                width: `${whiteKeyWidth}px`,
                height: `${whiteKeyHeight}px`,
                backgroundColor: isSelected
                  ? "#2196F3"
                  : isHover
                    ? "#E3F2FD"
                    : "white",
                border: "1px solid #333",
                borderRadius: "0 0 3px 3px",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: "4px",
                fontSize: "8px",
                color: isSelected ? "white" : "#666",
                fontWeight: isSelected ? "bold" : "normal",
                transition: "background-color 0.1s",
                boxShadow: isHover ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
              }}
              title={key.name}
            >
              {key.name}
            </div>
          );
        })}

        {/* Black keys */}
        {blackKeys.map((key) => {
          // Calculate position based on note name
          const whiteKeyIndex = whiteKeys.findIndex((wk) => {
            const blackNote = key.name.substring(0, key.name.length - 1); // e.g., "C#"
            const blackOctave = key.name.slice(-1);
            const baseNote = blackNote[0]; // "C" from "C#"
            return wk.name === `${baseNote}${blackOctave}`;
          });

          const isSelected = key.name === selectedNote;
          const isHover = key.name === hoverNote;

          return (
            <div
              key={key.name}
              onClick={() => handleKeyClick(key.name)}
              onMouseEnter={() => setHoverNote(key.name)}
              onMouseLeave={() => setHoverNote(null)}
              style={{
                position: "absolute",
                left: `${whiteKeyIndex * whiteKeyWidth + whiteKeyWidth * 0.7}px`,
                width: `${blackKeyWidth}px`,
                height: `${blackKeyHeight}px`,
                backgroundColor: isSelected
                  ? "#1976D2"
                  : isHover
                    ? "#424242"
                    : "#000",
                border: "1px solid #000",
                borderRadius: "0 0 2px 2px",
                cursor: "pointer",
                zIndex: 10,
                transition: "background-color 0.1s",
                boxShadow: isHover
                  ? "0 1px 4px rgba(0,0,0,0.4)"
                  : "0 1px 3px rgba(0,0,0,0.3)",
              }}
              title={key.name}
            />
          );
        })}
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: "8px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        Selected: <strong style={{ color: "#2196F3" }}>{selectedNote}</strong>
      </div>
    </div>
  );
}
