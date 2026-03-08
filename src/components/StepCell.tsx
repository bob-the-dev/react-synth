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

  /** All steps in the track (for finding nearest defaults) */
  allSteps: Step[];

  /** Callback when step changes */
  onChange: (step: Step) => void;

  /** Whether this step is currently playing */
  isActive: boolean;

  /** Track index (for visual styling) */
  trackIndex: number;

  /** Step index (for visual styling) */
  stepIndex: number;

  /** Callback to preview a note */
  onPreviewNote?: (noteName: string) => void;
}

export default function StepCell({
  step,
  allSteps,
  onChange,
  isActive,
  stepIndex,
  onPreviewNote,
}: StepCellProps) {
  const [showPicker, setShowPicker] = useState(false);

  const currentPattern = step.patternId ? getPatternCell(step.patternId) : null;

  const handleStepChange = (newStep: Step) => {
    onChange(newStep);
  };

  /**
   * Find the nearest step with settings (rootNote or arpeggiate set)
   * Searches backwards first, then forwards
   */
  const findNearestStepWithSettings = (): Step | null => {
    // Search backwards from current position
    for (let i = stepIndex - 1; i >= 0; i--) {
      if (allSteps[i].rootNote || allSteps[i].arpeggiate) {
        return allSteps[i];
      }
    }

    // Search forwards from current position
    for (let i = stepIndex + 1; i < allSteps.length; i++) {
      if (allSteps[i].rootNote || allSteps[i].arpeggiate) {
        return allSteps[i];
      }
    }

    return null;
  };

  /**
   * Get default step settings based on nearest neighbor
   */
  const getDefaultStep = (): Step => {
    const nearestStep = findNearestStepWithSettings();

    if (nearestStep) {
      // Use settings from nearest step, but keep current pattern
      return {
        ...step,
        rootNote: nearestStep.rootNote || step.rootNote,
        arpeggiate: nearestStep.arpeggiate || step.arpeggiate,
      };
    }

    // No nearby steps with settings, use current step as-is
    return step;
  };

  const backgroundColor = isActive
    ? "#FFF9C4"
    : step.muted
      ? "#E0E0E0"
      : step.customNotes && step.customNotes.length > 0
        ? "#E3F2FD" // Light blue for custom notes
        : currentPattern
          ? "#E8F5E9" // Light green for patterns
          : "white";

  const hasCustomNotes = step.customNotes && step.customNotes.length > 0;

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
        title={
          hasCustomNotes
            ? `Custom notes (${step.customNotes!.length})`
            : currentPattern?.description || "Click to select pattern"
        }
      >
        {/* Pattern name or custom notes indicator */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: hasCustomNotes || currentPattern ? "bold" : "normal",
            color: hasCustomNotes
              ? "#1565C0"
              : currentPattern
                ? "#2E7D32"
                : "#999",
            marginBottom: "2px",
          }}
        >
          {hasCustomNotes
            ? "♪ Custom"
            : currentPattern
              ? currentPattern.name
              : "—"}
        </div>

        {/* Custom note count */}
        {hasCustomNotes && (
          <div
            style={{
              fontSize: "9px",
              color: "#1976D2",
              fontWeight: "bold",
            }}
          >
            {step.customNotes!.length} notes
          </div>
        )}

        {/* Root note indicator */}
        {step.rootNote && (
          <div
            style={{
              fontSize: "9px",
              color: "#1976D2",
              fontWeight: "bold",
            }}
          >
            {step.rootNote}
          </div>
        )}

        {/* Arpeggiate indicator */}
        {step.arpeggiate && (
          <div
            style={{
              fontSize: "9px",
              color: "#9C27B0",
            }}
          >
            🎵 Arp
          </div>
        )}

        {/* Transpose modifier */}
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
          step={getDefaultStep()}
          onStepChange={handleStepChange}
          onClose={() => setShowPicker(false)}
          onPreviewNote={onPreviewNote}
        />
      )}
    </>
  );
}
