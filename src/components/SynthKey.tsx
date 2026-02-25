interface SynthKeyProps {
  note: string;
  frequency: number;
  onStart: (note: string, frequency: number) => void;
  onStop: (note: string) => void;
}

function SynthKey({ note, frequency, onStart, onStop }: SynthKeyProps) {
  return (
    <button
      onMouseDown={() => onStart(note, frequency)}
      onMouseUp={() => onStop(note)}
      onMouseLeave={() => onStop(note)}
      style={{
        width: "100px",
        height: "100px",
        fontSize: "18px",
        cursor: "pointer",
        backgroundColor: "#fff",
        border: "2px solid #000",
        borderRadius: "4px",
      }}
    >
      {note}
    </button>
  );
}

export default SynthKey;
