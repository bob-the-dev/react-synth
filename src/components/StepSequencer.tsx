import { RefObject, useEffect, useRef, useState } from "react";
import GridVisualizer from "./GridVisualizer";

interface Note {
  name: string;
  freq: number;
}

interface StepSequencerProps {
  onPlayNote: (
    note: string,
    frequency: number,
    waveType: OscillatorType,
  ) => void;
  onStopNote: (note: string) => void;
  notes: Note[];
  grid: (Note | null)[][];
  audioContextRef: RefObject<AudioContext | null>;
}

type TupletRatio = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7";

type SequenceStep = TupletRatio[];

function StepSequencer({
  onPlayNote,
  onStopNote,
  notes,
  grid,
  audioContextRef,
}: StepSequencerProps) {
  const [bpm, setBpm] = useState<number>(60);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [sequence, setSequence] = useState<SequenceStep[]>(() => {
    // 8 steps, 3 tracks per step
    const tupletOptions: TupletRatio[] = ["2", "3", "4", "5"];

    // Initialize with sparse pattern - mainly track 0 with a few notes
    return Array(8)
      .fill(null)
      .map((_, stepIndex) => {
        const step: TupletRatio[] = ["0", "0", "0"]; // All empty by default

        // Fill track 0 with some tuplets (about 4-5 out of 8 steps)
        if (
          stepIndex === 0 ||
          stepIndex === 2 ||
          stepIndex === 4 ||
          stepIndex === 6
        ) {
          step[0] =
            tupletOptions[Math.floor(Math.random() * tupletOptions.length)];
        }

        // Add occasional notes in other tracks (1-2 notes total)
        if (stepIndex === 3) {
          step[1] =
            tupletOptions[Math.floor(Math.random() * tupletOptions.length)];
        }

        return step;
      });
  });

  const nextStepTimeRef = useRef<number>(0);
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScheduleStepRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const sequenceRef = useRef<SequenceStep[]>(sequence);
  const currentBpmRef = useRef<number>(bpm); // Actual BPM used in scheduling
  const targetBpmRef = useRef<number>(bpm); // Target BPM from UI
  
  // Track arpeggio position and direction for each track (3 tracks)
  const arpeggioStateRef = useRef<{
    index: number;
    direction: number;
  }[]>([{ index: 0, direction: 1 }, { index: 0, direction: 1 }, { index: 0, direction: 1 }]);

  const stepsPerBar = 8; // 8 quarter notes (2 bars of 4/4)

  // Generate melodic pattern with arpeggiated notes with randomization
  const getMelodyPattern = (
    rootNote: Note,
    tupletCount: number,
    trackIndex: number,
  ): Note[] => {
    const pattern: Note[] = [];

    // Major scale intervals (in semitones from root: 0, 2, 4, 5, 7, 9, 11, 12)
    const majorScaleSemitones = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
    const semitoneRatio = Math.pow(2, 1 / 12); // Equal temperament

    // Build scale frequencies from root
    const scaleFreqs = majorScaleSemitones.map(
      (semitones) => rootNote.freq * Math.pow(semitoneRatio, semitones),
    );

    // Get current arpeggio state for this track
    const state = arpeggioStateRef.current[trackIndex];
    let currentIndex = state.index;
    let direction = state.direction;

    for (let i = 0; i < tupletCount; i++) {
      // 70% chance to continue arpeggio, 30% chance to jump randomly
      if (Math.random() < 0.7) {
        // Arpeggio: move 1-3 steps in current direction
        const step = 1 + Math.floor(Math.random() * 3);
        currentIndex += step * direction;

        // Wrap around if out of bounds
        currentIndex =
          ((currentIndex % scaleFreqs.length) + scaleFreqs.length) %
          scaleFreqs.length;
      } else {
        // Random jump to add variety
        currentIndex = Math.floor(Math.random() * scaleFreqs.length);
      }

      pattern.push({
        name: `${rootNote.name}_note${i}`,
        freq: scaleFreqs[currentIndex],
      });
    }

    // Update arpeggio state for this track
    arpeggioStateRef.current[trackIndex] = { index: currentIndex, direction };

    return pattern;
  };

  // Play metronome click for timing reference
  const playMetronomeClick = (time: number, isDownbeat: boolean) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Higher pitch for downbeat (step 0, 4), lower for others
    osc.frequency.value = isDownbeat ? 1200 : 800;
    osc.type = "sine";

    // Louder, short click
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(isDownbeat ? 0.15 : 0.1, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    osc.start(time);
    osc.stop(time + 0.03);
  };

  const scheduleNote = (time: number, step: number) => {
    const stepData = sequenceRef.current[step];
    const ctx = audioContextRef.current;

    if (!ctx) {
      console.error("[Sequencer] AudioContext is null");
      return;
    }

    // Smooth BPM interpolation at step boundaries
    const bpmDiff = targetBpmRef.current - currentBpmRef.current;
    if (Math.abs(bpmDiff) > 0.1) {
      // Interpolate by 10% of the difference per step for smooth transition
      currentBpmRef.current += bpmDiff * 0.1;
    } else {
      currentBpmRef.current = targetBpmRef.current;
    }

    const delay = (time - ctx.currentTime) * 1000;
    const secondsPerBeat = 60.0 / currentBpmRef.current;

    console.log(
      `[Sequencer] Scheduling step ${step + 1}, delay: ${delay.toFixed(2)}ms, BPM: ${currentBpmRef.current.toFixed(1)}`,
    );

    if (delay < 0) {
      console.warn(
        `[Sequencer] Negative delay detected: ${delay}ms - skipping step ${step + 1}`,
      );
      return;
    }

    // Schedule metronome clicks: 2 subdivisions per step (half steps)
    const subdivisions = 2;
    const subdivisionInterval = secondsPerBeat / subdivisions;
    for (let i = 0; i < subdivisions; i++) {
      const clickTime = time + i * subdivisionInterval;
      const isDownbeat = step % 4 === 0 && i === 0; // First subdivision of steps 0, 4
      playMetronomeClick(clickTime, isDownbeat);
    }

    let notesScheduled = 0;

    // Process each track in the step
    stepData.forEach((tupletRatio, trackIndex) => {
      const n = Number(tupletRatio);
      if (n === 0) return; // Skip empty tracks

      // Pick a random root note from the available notes
      const rootNote = notes[Math.floor(Math.random() * notes.length)];
      if (!rootNote) return;

      const stepDuration = secondsPerBeat; // Single step = 1 beat (fixed)
      const noteInterval = stepDuration / n; // Divide step evenly by number of notes

      // Generate melodic pattern (maintaining arpeggio state per track)
      const melodyPattern = getMelodyPattern(rootNote, n, trackIndex);

      // Schedule each note in the tuplet sequentially
      melodyPattern.forEach((note, index) => {
        const noteDelay = delay + noteInterval * index * 1000;

        // Staccato duration: short, fixed length with randomization
        const baseDuration = 120; // 120ms base duration (short and punchy)

        // Add human randomization: ±20% variation
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const actualDuration = baseDuration * randomFactor;

        notesScheduled++;

        console.log(
          `[Sequencer] Scheduling note ${index + 1}/${n}: ${note.name} at ${note.freq.toFixed(1)}Hz, delay: ${noteDelay.toFixed(2)}ms, duration: ${actualDuration.toFixed(0)}ms`,
        );

        // Schedule note start with sawtooth for synthy sound
        setTimeout(() => {
          console.log(`[Sequencer] Playing note ${note.name}`);
          onPlayNote(note.name, note.freq, "sawtooth");
        }, noteDelay);

        // Schedule note stop
        setTimeout(() => {
          console.log(`[Sequencer] Stopping note ${note.name}`);
          onStopNote(note.name);
        }, noteDelay + actualDuration);
      });
    });

    if (notesScheduled === 0) {
      console.log(`[Sequencer] No notes scheduled for step ${step + 1}`);
    }

    // Update visual feedback
    setTimeout(() => {
      setCurrentStep(step);
    }, delay);
  };

  const scheduler = () => {
    if (!isPlayingRef.current) {
      console.log("[Sequencer] Scheduler stopped - not playing");
      return;
    }
    if (!audioContextRef.current) {
      console.log("[Sequencer] Scheduler stopped - context missing");
      return;
    }

    const secondsPerBeat = 60.0 / currentBpmRef.current;
    const lookahead = 0.1; // Schedule 100ms ahead
    const scheduleAheadTime = 0.2;

    let stepsScheduled = 0;
    while (
      nextStepTimeRef.current <
      audioContextRef.current.currentTime + scheduleAheadTime
    ) {
      scheduleNote(nextStepTimeRef.current, currentScheduleStepRef.current);
      stepsScheduled++;

      nextStepTimeRef.current += secondsPerBeat;
      currentScheduleStepRef.current =
        (currentScheduleStepRef.current + 1) % stepsPerBar;
    }

    if (stepsScheduled > 0) {
      console.log(`[Sequencer] Scheduled ${stepsScheduled} step(s) this cycle`);
    }

    timerIdRef.current = setTimeout(scheduler, lookahead * 1000);
  };

  const start = () => {
    console.log("[Sequencer] Starting...");

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      console.log("[Sequencer] Created new AudioContext");
    } else {
      console.log("[Sequencer] Using shared AudioContext");
    }

    console.log(
      `[Sequencer] AudioContext state: ${audioContextRef.current.state}`,
    );
    console.log(`[Sequencer] BPM: ${bpm}, Steps: ${stepsPerBar}`);
    console.log("[Sequencer] Default sequence:", sequence);

    isPlayingRef.current = true;
    setIsPlaying(true);
    currentScheduleStepRef.current = 0;
    setCurrentStep(0);
    nextStepTimeRef.current = audioContextRef.current.currentTime;

    console.log(`[Sequencer] Start time: ${nextStepTimeRef.current}`);
    scheduler();
  };

  const stop = () => {
    console.log("[Sequencer] Stopping...");
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(0);
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        marginTop: "30px",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h2>Step Sequencer</h2>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          onClick={isPlaying ? stop : start}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: isPlaying ? "#f44336" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {isPlaying ? "Stop" : "Start"}
        </button>

        <label>
          BPM:
          <input
            type="number"
            value={bpm}
            onChange={(e) => {
              const newBpm = Number(e.target.value);
              setBpm(newBpm);
              targetBpmRef.current = newBpm;
              // Instantly update BPM when not playing
              if (!isPlaying) {
                currentBpmRef.current = newBpm;
              }
            }}
            min="20"
            max="240"
            style={{ marginLeft: "10px", padding: "5px", width: "60px" }}
          />
        </label>
      </div>

      {/* 3x3 Grid Visualizer */}
      <GridVisualizer grid={grid} currentStep={currentStep} />

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Note</th>
              {Array(stepsPerBar)
                .fill(null)
                .map((_, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      backgroundColor:
                        currentStep === i && isPlaying ? "#ffeb3b" : "#f5f5f5",
                      minWidth: "40px",
                    }}
                  >
                    {i + 1}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((trackIndex) => (
              <tr key={trackIndex}>
                <td
                  style={{
                    padding: "8px",
                    border: "1px solid #ddd",
                    fontWeight: "bold",
                  }}
                >
                  Track {trackIndex + 1}
                </td>
                {Array(stepsPerBar)
                  .fill(null)
                  .map((_, step) => {
                    const tupletValue = sequence[step][trackIndex];

                    return (
                      <td
                        key={step}
                        style={{
                          padding: "4px",
                          border: "1px solid #ddd",
                          textAlign: "center",
                          backgroundColor:
                            currentStep === step && isPlaying
                              ? "#fff9c4"
                              : "white",
                        }}
                      >
                        {/* Tuplet count dropdown */}
                        <select
                          value={tupletValue}
                          onChange={(e) => {
                            setSequence((prev) => {
                              const newSequence = [...prev];
                              newSequence[step][trackIndex] = e.target
                                .value as TupletRatio;
                              sequenceRef.current = newSequence;
                              return newSequence;
                            });
                          }}
                          style={{
                            fontSize: "11px",
                            padding: "4px",
                            width: "60px",
                          }}
                        >
                          <option value="0">-</option>
                          <option value="1">×1</option>
                          <option value="2">×2</option>
                          <option value="3">×3</option>
                          <option value="4">×4</option>
                          <option value="5">×5</option>
                          <option value="6">×6</option>
                          <option value="7">×7</option>
                        </select>
                      </td>
                    );
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StepSequencer;
