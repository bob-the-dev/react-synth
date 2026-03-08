/**
 * Pattern Picker - Modal for selecting pattern cells
 *
 * Displays categorized list of available patterns with search and preview
 */

import { useState } from "react";
import { PatternCell } from "../types/SequenceTypes";
import {
  PATTERN_CELLS,
  getPatternsByCategory,
  getCategories,
} from "../patterns/PatternCells";

interface PatternPickerProps {
  /** Currently selected pattern ID */
  currentPatternId: string | null;

  /** Callback when pattern is selected */
  onSelect: (patternId: string | null) => void;

  /** Callback to close picker */
  onClose: () => void;
}

export default function PatternPicker({
  currentPatternId,
  onSelect,
  onClose,
}: PatternPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const categories = getCategories();

  const handleSelect = (patternId: string | null) => {
    onSelect(patternId);
    onClose();
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
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Select Pattern</h2>

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
          autoFocus
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
                    selected={pattern.id === currentPatternId}
                    onClick={() => handleSelect(pattern.id)}
                  />
                ))}
              </div>
            );
          })
        ) : (
          // Search results (ungrouped)
          <div>
            {filteredPatterns.length === 0 ? (
              <p style={{ color: "#666", textAlign: "center" }}>
                No patterns found
              </p>
            ) : (
              filteredPatterns.map((pattern) => (
                <PatternButton
                  key={pattern.id}
                  pattern={pattern}
                  selected={pattern.id === currentPatternId}
                  onClick={() => handleSelect(pattern.id)}
                />
              ))
            )}
          </div>
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
