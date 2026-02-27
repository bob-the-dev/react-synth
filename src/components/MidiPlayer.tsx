import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

interface MidiPlayerProps {
  midiData: Tone.ToneEvent[] | null;
  isPlaying: boolean;
  onPlaybackEnd?: () => void;
  channel?: number;
  velocity?: number;
}

function MidiPlayer({
  midiData,
  isPlaying,
  onPlaybackEnd,
  channel = 1,
  velocity = 80,
}: MidiPlayerProps) {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize synthesizer
  useEffect(() => {
    if (!synthRef.current) {
      // Create a PolySynth with triangle oscillators to match the original timbre
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.003,
          decay: 0.05,
          sustain: 0.3,
          release: 0.5,
        },
      }).toDestination();

      setIsInitialized(true);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
    };
  }, []);

  // Handle MIDI playback
  useEffect(() => {
    if (!isInitialized || !synthRef.current || !midiData) return;

    // Clean up existing part
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }

    // Create new part from MIDI data
    partRef.current = new Tone.Part((time, note: any) => {
      const normalizedVelocity = velocity / 127;
      if (synthRef.current) {
        synthRef.current.triggerAttackRelease(
          note.note,
          note.duration,
          time,
          normalizedVelocity,
        );
      }
    }, midiData);

    partRef.current.loop = false;

    return () => {
      if (partRef.current) {
        partRef.current.dispose();
        partRef.current = null;
      }
    };
  }, [midiData, isInitialized, velocity]);

  // Handle play/stop
  useEffect(() => {
    if (!partRef.current) return;

    const handleTransportEnd = () => {
      if (onPlaybackEnd) {
        onPlaybackEnd();
      }
    };

    if (isPlaying) {
      Tone.Transport.start();
      partRef.current.start(0);
      Tone.Transport.once("stop", handleTransportEnd);
    } else {
      Tone.Transport.stop();
      partRef.current.stop();
    }

    return () => {
      Tone.Transport.off("stop", handleTransportEnd);
    };
  }, [isPlaying, onPlaybackEnd]);

  // Update synth volume based on channel (simple implementation)
  useEffect(() => {
    if (synthRef.current) {
      // Simple volume adjustment based on channel (can be expanded)
      const volumeDb = -12 + (channel / 16) * 6; // Range from -12dB to -6dB
      synthRef.current.volume.value = volumeDb;
    }
  }, [channel]);

  return null; // This is a headless component (no UI)
}

export default MidiPlayer;
