/**
 * Track Row - One horizontal row in the sequencer grid
 *
 * Contains track header (name, controls) and all step cells for this track
 */

import { Track, Step } from "../types/SequenceTypes";
import StepCell from "./StepCell";

interface TrackRowProps {
  /** Track data including steps */
  track: Track;

  /** Current playing step for visual feedback */
  currentStep: number;

  /** Callback when track settings change */
  onTrackChange: (track: Track) => void;

  /** Callback when a step changes */
  onStepChange: (stepIndex: number, step: Step) => void;

  /** Track index in the grid */
  trackIndex: number;

  /** Callback when track header is clicked (for opening synth controls) */
  onHeaderClick?: () => void;
}

export default function TrackRow({
  track,
  currentStep,
  onTrackChange,
  onStepChange,
  trackIndex,
  onHeaderClick,
}: TrackRowProps) {
  const handleVolumeChange = (volume: number) => {
    onTrackChange({ ...track, volume });
  };

  const handleMuteToggle = () => {
    onTrackChange({ ...track, muted: !track.muted });
  };

  const handleSoloToggle = () => {
    onTrackChange({ ...track, solo: !track.solo });
  };

  return (
    <tr>
      {/* Track Header */}
      <td
        style={{
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRight: "2px solid #ddd",
          minWidth: "150px",
          verticalAlign: "top",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <div
            onClick={onHeaderClick}
            style={{
              fontWeight: "bold",
              marginBottom: "4px",
              cursor: onHeaderClick ? "pointer" : "default",
              color: onHeaderClick ? "#2196F3" : "inherit",
            }}
            title={onHeaderClick ? "Click to edit synth" : ""}
          >
            {track.name || `Track ${trackIndex + 1}`}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#666",
            }}
          >
            {track.instrumentPresetId}
          </div>
        </div>

        {/* Volume slider */}
        <div style={{ marginBottom: "8px" }}>
          <label
            style={{
              fontSize: "11px",
              color: "#666",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Volume: {track.volume.toFixed(0)} dB
          </label>
          <input
            type="range"
            min="-60"
            max="6"
            step="1"
            value={track.volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        {/* Mute and Solo buttons */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={handleMuteToggle}
            style={{
              flex: 1,
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: track.muted ? "#FF5252" : "#fff",
              color: track.muted ? "#fff" : "#000",
              border: "1px solid #ddd",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            M
          </button>
          <button
            onClick={handleSoloToggle}
            style={{
              flex: 1,
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: track.solo ? "#FFD600" : "#fff",
              color: track.solo ? "#000" : "#000",
              border: "1px solid #ddd",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            S
          </button>
        </div>
      </td>

      {/* Step Cells */}
      {track.steps.map((step, stepIndex) => (
        <StepCell
          key={stepIndex}
          step={step}
          onChange={(newStep) => onStepChange(stepIndex, newStep)}
          isActive={stepIndex === currentStep}
          trackIndex={trackIndex}
          stepIndex={stepIndex}
        />
      ))}
    </tr>
  );
}
