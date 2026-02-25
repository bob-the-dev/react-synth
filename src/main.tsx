import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import StepSequencer from "./components/StepSequencer";

interface Note {
  name: string;
  freq: number;
}

interface ActiveOscillator {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  filter: BiquadFilterNode;
}

function SynthKeyboard() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeOscillators = useRef<Record<string, ActiveOscillator>>({});

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
  }, []);

  const startNote = (
    note: string,
    frequency: number,
    _waveType: OscillatorType = "sine",
  ) => {
    if (activeOscillators.current[note]) return; // Already playing

    if (!audioContextRef.current) {
      console.error("[Synth] AudioContext not initialized");
      return;
    }

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create multiple oscillators for harmonics (piano has rich harmonics)
    const fundamental = ctx.createOscillator();
    const harmonic2 = ctx.createOscillator(); // Octave
    const harmonic3 = ctx.createOscillator(); // Fifth above octave
    const harmonic4 = ctx.createOscillator(); // Two octaves
    const harmonic5 = ctx.createOscillator(); // Major third above two octaves

    // Create individual gain nodes for each harmonic
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();
    const gain4 = ctx.createGain();
    const gain5 = ctx.createGain();

    // Create a master gain for overall envelope
    const masterGain = ctx.createGain();

    // Create a low-pass filter for warmth (simulates piano body resonance)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3000 + frequency * 0.5; // Higher notes = brighter
    filter.Q.value = 1;

    // Set harmonic frequencies (based on piano harmonic series)
    fundamental.frequency.value = frequency;
    harmonic2.frequency.value = frequency * 2; // Octave
    harmonic3.frequency.value = frequency * 3; // Fifth above octave
    harmonic4.frequency.value = frequency * 4; // Two octaves
    harmonic5.frequency.value = frequency * 5; // Major third

    // Use triangle wave for fundamental (rounder than sine, less harsh than square)
    fundamental.type = "triangle";
    harmonic2.type = "sine";
    harmonic3.type = "sine";
    harmonic4.type = "sine";
    harmonic5.type = "sine";

    // Set harmonic amplitudes (decreasing with higher harmonics)
    // Piano has strong fundamental, then decreasing harmonics
    gain1.gain.value = 0.4; // Fundamental (strong)
    gain2.gain.value = 0.25; // Octave (moderate)
    gain3.gain.value = 0.15; // Fifth (subtle)
    gain4.gain.value = 0.08; // Two octaves (very subtle)
    gain5.gain.value = 0.04; // High harmonic (barely audible)

    // Connect harmonics through their gains
    fundamental.connect(gain1);
    harmonic2.connect(gain2);
    harmonic3.connect(gain3);
    harmonic4.connect(gain4);
    harmonic5.connect(gain5);

    // All gains connect to filter
    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);
    gain4.connect(filter);
    gain5.connect(filter);

    // Filter connects to master gain
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Piano-style ADSR envelope
    // Attack: very fast (piano hammer strike)
    // Decay: quick drop to sustain
    // Sustain: moderate level
    // Release: long, natural fade

    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.8, now + 0.003); // 3ms attack (hammer strike)
    masterGain.gain.exponentialRampToValueAtTime(0.4, now + 0.05); // 50ms decay
    masterGain.gain.exponentialRampToValueAtTime(0.3, now + 0.2); // Sustain level

    // Add brightness sweep (filter envelope) - piano starts bright then mellows
    filter.frequency.setValueAtTime(3000 + frequency * 0.8, now);
    filter.frequency.exponentialRampToValueAtTime(
      2000 + frequency * 0.3,
      now + 0.5,
    );

    // Start all oscillators
    const oscillators = [
      fundamental,
      harmonic2,
      harmonic3,
      harmonic4,
      harmonic5,
    ];
    oscillators.forEach((osc) => osc.start(now));

    activeOscillators.current[note] = {
      oscillators,
      gains: [gain1, gain2, gain3, gain4, gain5, masterGain],
      filter,
    };
  };

  const stopNote = (note: string) => {
    const nodes = activeOscillators.current[note];
    if (!nodes) return;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = nodes.gains[5]; // Last gain is master

    // Piano release: exponential fade over ~500ms
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    // Also darken the filter during release
    nodes.filter.frequency.cancelScheduledValues(now);
    nodes.filter.frequency.setValueAtTime(nodes.filter.frequency.value, now);
    nodes.filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    // Stop all oscillators after release
    nodes.oscillators.forEach((osc) => {
      try {
        osc.stop(now + 0.5);
      } catch (e) {
        // Oscillator might already be stopped
      }
    });

    // Clean up
    setTimeout(() => {
      delete activeOscillators.current[note];
    }, 600);
  };

  // 3x3 grid layout with center empty (one octave lower)
  const grid: (Note | null)[][] = [
    [
      { name: "1", freq: 130.81 },
      { name: "2", freq: 146.83 },
      { name: "3", freq: 164.81 },
    ],
    [
      { name: "4", freq: 174.61 },
      null, // empty center
      { name: "5", freq: 196.0 },
    ],
    [
      { name: "6", freq: 220.0 },
      { name: "7", freq: 246.94 },
      { name: "8", freq: 261.63 },
    ],
  ];

  // Flat list of all notes for the sequencer
  const allNotes: Note[] = grid
    .flat()
    .filter((note): note is Note => note !== null);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Synth Sequencer</h1>

      <StepSequencer
        onPlayNote={startNote}
        onStopNote={stopNote}
        notes={allNotes}
        grid={grid}
        audioContextRef={audioContextRef}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<SynthKeyboard />);
