/**
 * Pattern Picker - Modal for selecting pattern cells
 *
 * Displays categorized list of available patterns with search and preview
 */

import { useState } from "react";
import { PatternCell, Step, CustomNote } from "../types/SequenceTypes";
import {
  PATTERN_CELLS,
  getPatternsByCategory,
  getCategories,
} from "../patterns/PatternCells";
import PianoKeyboard from "./PianoKeyboard";
import PianoRoll from "./PianoRoll";

type EditMode = "pattern" | "custom";

interface PatternPickerProps {
  /** Current step configuration */
  step: Step;

  /** Callback when step is modified */
  onStepChange: (step: Step) => void;

  /** Callback to close picker */
  onClose: () => void;

  /** Callback to preview a note */
  onPreviewNote?: (noteName: string) => void;
}

export default function PatternPicker({
  step,
  onStepChange,
  onClose,
  onPreviewNote,
}: PatternPickerProps) {
  const [mode, setMode] = useState<EditMode>(
    step.customNotes && step.customNotes.length > 0 ? "custom" : "pattern",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [tempRootNote, setTempRootNote] = useState(step.rootNote || "C4");
  const [tempArpeggiate, setTempArpeggiate] = useState(
    step.arpeggiate || false,
  );
  const [tempCustomNotes, setTempCustomNotes] = useState<CustomNote[]>(
    step.customNotes || [],
  );
  const categories = getCategories();

  const handleSelect = (patternId: string | null) => {
    // Apply pattern along with root note and arpeggiate settings
    onStepChange({
      ...step,
      patternId,
      customNotes: undefined, // Clear custom notes when selecting pattern
      rootNote: tempRootNote,
      arpeggiate: tempArpeggiate,
    });
    onClose();
  };

  const handleApplySettings = () => {
    if (mode === "custom") {
      // Apply custom notes
      onStepChange({
        ...step,
        patternId: null, // Clear pattern when using custom notes
        customNotes: tempCustomNotes,
        rootNote: tempRootNote,
      });
    } else {
      // Apply only root note and arpeggiate settings without changing pattern
      onStepChange({
        ...step,
        rootNote: tempRootNote,
        arpeggiate: tempArpeggiate,
      });
    }
    onClose();
  };

  const handleNoteSelect = (noteName: string) => {
    setTempRootNote(noteName);
  };

  const handlePreview = (noteName: string) => {
    onPreviewNote?.(noteName);
  };

  const handleCustomNotesChange = (notes: CustomNote[]) => {
    setTempCustomNotes(notes);
  };

  const filteredPatterns = searchQuery
    ? PATTERN_CELLS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : PATTERN_CELLS;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "20px",
          maxWidth: "500px",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Select Pattern & Settings</h2>

        {/* Mode Toggle */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => setMode("pattern")}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: mode === "pattern" ? "#4CAF50" : "#f5f5f5",
              color: mode === "pattern" ? "white" : "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: mode === "pattern" ? "bold" : "normal",
            }}
          >
            Select Pattern
          </button>
          <button
            onClick={() => setMode("custom")}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: mode === "custom" ? "#4CAF50" : "#f5f5f5",
              color: mode === "custom" ? "white" : "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: mode === "custom" ? "bold" : "normal",
            }}
          >
            Draw Notes
          </button>
        </div>

        {/* Piano Keyboard for Root Note Selection */}
        <PianoKeyboard
          selectedNote={tempRootNote}
          onNoteSelect={handleNoteSelect}
          onPreview={handlePreview}
        />

        {mode === "pattern" ? (
          <>
            {/* Arpeggiate Control */}
            <div
              style={{
                marginBottom: "16px",
                padding: "12px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "14px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={tempArpeggiate}
                  onChange={(e) => setTempArpeggiate(e.target.checked)}
                  style={{
                    marginRight: "8px",
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                  }}
                />
                Random Arpeggiation (for multi-note patterns)
              </label>
            </div>

            {/* Apply Settings Button */}
            <button
              onClick={handleApplySettings}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "16px",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              ✓ Apply Settings (Keep Current Pattern)
            </button>

            {/* Search */}
            <input
              type="text"
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />

            {/* Clear button */}
            <button
              onClick={() => handleSelect(null)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Clear (Empty Step)
            </button>

            {/* Pattern list by category */}
            {!searchQuery ? (
              // Grouped by category
              categories.map((category) => {
                const patterns = getPatternsByCategory(category);
                if (patterns.length === 0) return null;

                return (
                  <div key={category} style={{ marginBottom: "20px" }}>
                    <h3
                      style={{
                        fontSize: "12px",
                        textTransform: "uppercase",
                        color: "#666",
                        marginBottom: "8px",
                      }}
                    >
                      {category}
                    </h3>
                    {patterns.map((pattern) => (
                      <PatternButton
                        key={pattern.id}
                        pattern={pattern}
                        selected={pattern.id === step.patternId}
                        onClick={() => handleSelect(pattern.id)}
                      />
                    ))}
                  </div>
                );
              })
            ) : (
              // Search results (flat list)
              <div>
                {filteredPatterns.length === 0 ? (
                  <p style={{ color: "#999", textAlign: "center" }}>
                    No patterns found.
                  </p>
                ) : (
                  filteredPatterns.map((pattern) => (
                    <PatternButton
                      key={pattern.id}
                      pattern={pattern}
                      selected={pattern.id === step.patternId}
                      onClick={() => handleSelect(pattern.id)}
                    />
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Piano Roll for Custom Notes */}
            <PianoRoll
              rootNote={tempRootNote}
              customNotes={tempCustomNotes}
              onChange={handleCustomNotesChange}
            />

            {/* Apply Custom Notes Button */}
            <button
              onClick={handleApplySettings}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "16px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              ✓ Apply Custom Notes ({tempCustomNotes.length} notes)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PatternButton({
  pattern,
  selected,
  onClick,
}: {
  pattern: PatternCell;
  selected: boolean;
  onClick: () => void;
}) {
  const [isHover, setIsHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      style={{
        width: "100%",
        padding: "10px 12px",
        marginBottom: "4px",
        border: selected ? "2px solid #2196F3" : "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: selected ? "#E3F2FD" : isHover ? "#F5F5F5" : "white",
        cursor: "pointer",
        textAlign: "left",
        fontSize: "14px",
        transition: "all 0.2s",
      }}
    >
      <div style={{ fontWeight: selected ? "bold" : "normal" }}>
        {pattern.name}
      </div>
      {pattern.description && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          {pattern.description}
        </div>
      )}
    </button>
  );
}
