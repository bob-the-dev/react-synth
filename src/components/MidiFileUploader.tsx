import { ChangeEvent, useRef } from "react";
import { Midi } from "@tonejs/midi";

interface MidiFileUploaderProps {
  onMidiLoaded: (midiData: any) => void;
  onError?: (error: string) => void;
}

function MidiFileUploader({ onMidiLoaded, onError }: MidiFileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".mid") && !file.name.endsWith(".midi")) {
      if (onError) {
        onError("Please select a valid MIDI file (.mid or .midi)");
      }
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      // Convert MIDI object to events
      const events: any[] = [];
      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          events.push({
            time: note.time,
            note: note.name,
            duration: note.duration,
            velocity: note.velocity,
          });
        });
      });

      onMidiLoaded({ events, originalMidi: midi });
    } catch (error) {
      if (onError) {
        onError(`Failed to parse MIDI file: ${(error as Error).message}`);
      }
      console.error("MIDI parsing error:", error);
    }

    // Reset input so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button
        onClick={handleClick}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        📁 Load MIDI File
      </button>
    </div>
  );
}

export default MidiFileUploader;
