import { ChangeEvent } from "react";

interface MidiControlsProps {
  velocity: number;
  onVelocityChange: (velocity: number) => void;
}

function MidiControls({ velocity, onVelocityChange }: MidiControlsProps) {
  const handleVelocityChange = (e: ChangeEvent<HTMLInputElement>) => {
    onVelocityChange(parseInt(e.target.value, 10));
  };

  return (
    <div
      style={{
        marginBottom: "20px",
        padding: "15px",
        backgroundColor: "#f5f5f5",
        borderRadius: "4px",
      }}
    >
      <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
        <strong>3 Tracks / 3 Channels:</strong> Each track has its own
        synthesizer and can be configured independently.
      </div>
      <div>
        <label
          htmlFor="midi-velocity"
          style={{
            display: "block",
            marginBottom: "5px",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Global Velocity: {velocity}
        </label>
        <input
          id="midi-velocity"
          type="range"
          min="0"
          max="127"
          value={velocity}
          onChange={handleVelocityChange}
          style={{
            width: "100%",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#666",
            marginTop: "5px",
          }}
        >
          <span>0 (Silent)</span>
          <span>127 (Loud)</span>
        </div>
      </div>
    </div>
  );
}

export default MidiControls;
