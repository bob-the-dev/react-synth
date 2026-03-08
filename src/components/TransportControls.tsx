/**
 * Transport Controls - Playback controls for the sequencer
 *
 * Provides play/stop, BPM, metronome, and other global controls
 */

interface TransportControlsProps {
  /** Current BPM */
  bpm: number;

  /** Whether sequencer is playing */
  isPlaying: boolean;

  /** Whether metronome is enabled */
  metronomeEnabled: boolean;

  /** Callback when play/stop is clicked */
  onPlayStop: () => void;

  /** Callback when BPM changes */
  onBPMChange: (bpm: number) => void;

  /** Callback when metronome is toggled */
  onMetronomeToggle: () => void;
}

export default function TransportControls({
  bpm,
  isPlaying,
  metronomeEnabled,
  onPlayStop,
  onBPMChange,
  onMetronomeToggle,
}: TransportControlsProps) {
  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      {/* Play/Stop Button */}
      <button
        onClick={onPlayStop}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          fontWeight: "bold",
          backgroundColor: isPlaying ? "#F44336" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          minWidth: "100px",
        }}
      >
        {isPlaying ? "⏸ Stop" : "▶ Play"}
      </button>

      {/* BPM Control */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <label style={{ fontWeight: "bold", fontSize: "14px" }}>BPM:</label>
        <input
          type="number"
          min="30"
          max="300"
          step="1"
          value={bpm}
          onChange={(e) => onBPMChange(Number(e.target.value))}
          style={{
            width: "60px",
            padding: "6px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />
        <input
          type="range"
          min="30"
          max="300"
          step="1"
          value={bpm}
          onChange={(e) => onBPMChange(Number(e.target.value))}
          style={{
            width: "150px",
          }}
        />
      </div>

      {/* Metronome Toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        <input
          type="checkbox"
          checked={metronomeEnabled}
          onChange={onMetronomeToggle}
          style={{
            cursor: "pointer",
            width: "18px",
            height: "18px",
          }}
        />
        Metronome
      </label>
    </div>
  );
}
