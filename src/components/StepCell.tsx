/**
 * Step Cell - Single cell in the sequencer grid
 *
 * Displays the current pattern and allows pattern selection via modal
 */

import { useState } from "react";
import { Step } from "../types/SequenceTypes";
import { getPatternCell } from "../patterns/PatternCells";
import PatternPicker from "./PatternPicker";

interface StepCellProps {
  /** The step data */
  step: Step;

  /** Callback when step changes */
  onChange: (step: Step) => void;

  /** Whether this step is currently playing */
  isActive: boolean;

  /** Track index (for visual styling) */
  trackIndex: number;

  /** Step index (for visual styling) */
  stepIndex: number;
}

export default function StepCell({ step, onChange, isActive }: StepCellProps) {
  const [showPicker, setShowPicker] = useState(false);

  const currentPattern = step.patternId ? getPatternCell(step.patternId) : null;

  const handlePatternSelect = (patternId: string | null) => {
    onChange({ ...step, patternId });
  };

  const backgroundColor = isActive
    ? "#FFF9C4"
    : step.muted
      ? "#E0E0E0"
      : currentPattern
        ? "#E8F5E9"
        : "white";

  return (
    <>
      <td
        onClick={() => setShowPicker(true)}
        style={{
          padding: "8px",
          border: "1px solid #ddd",
          textAlign: "center",
          backgroundColor,
          cursor: "pointer",
          minWidth: "60px",
          maxWidth: "80px",
          position: "relative",
          transition: "background-color 0.1s",
          userSelect: "none",
        }}
        title={currentPattern?.description || "Click to select pattern"}
      >
        {/* Pattern name */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: currentPattern ? "bold" : "normal",
            color: currentPattern ? "#2E7D32" : "#999",
            marginBottom: "2px",
          }}
        >
          {currentPattern ? currentPattern.name : "—"}
        </div>

        {/* Modifiers */}
        {step.transpose !== undefined && step.transpose !== 0 && (
          <div
            style={{
              fontSize: "9px",
              color: "#666",
            }}
          >
            {step.transpose > 0 ? "+" : ""}
            {step.transpose}
          </div>
        )}

        {step.velocityMultiplier !== undefined &&
          step.velocityMultiplier !== 1.0 && (
            <div
              style={{
                fontSize: "9px",
                color: "#666",
              }}
            >
              ×{step.velocityMultiplier.toFixed(1)}
            </div>
          )}
      </td>

      {/* Pattern picker modal */}
      {showPicker && (
        <PatternPicker
          currentPatternId={step.patternId}
          onSelect={handlePatternSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
