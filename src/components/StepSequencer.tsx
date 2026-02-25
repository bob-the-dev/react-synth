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

type TupletRatio = "1" | "2" | "3" | "4" | "5" | "6" | "7";

interface StepData {
  noteIndex: number | null; // index in notes array, or null if no note
  tuplet: TupletRatio;
}

type SequenceStep = StepData[];

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
    // 8 steps with randomized melodic pattern and tuplets
    const tupletOptions: TupletRatio[] = ["1", "2", "3", "4", "5", "6", "7"];
    const defaultSequence: SequenceStep[] = Array(8)
      .fill(null)
      .map(() => []);

    if (notes.length >= 3) {
      // Define rhythmic patterns (which steps get notes) - more dense patterns
      const rhythmPatterns = [
        [0, 1, 2, 4, 5, 6], // Busy pattern
        [0, 2, 3, 4, 5, 7], // Dense syncopated
        [0, 1, 2, 3, 5, 7], // Front-loaded
        [0, 1, 4, 5, 6, 7], // Grouped
        [0, 2, 3, 4, 6, 7], // Dense with gap
        [0, 1, 2, 3, 4, 5, 6, 7], // All steps (very busy)
      ];

      // Pick a random rhythm pattern
      const rhythm =
        rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)];

      // Create a melodic pattern using notes - use more notes
      const numNotesToUse = 3 + Math.floor(Math.random() * 3); // 3-5 notes
      const selectedNotes = notes
        .slice(0, Math.min(notes.length, 8))
        .sort(() => Math.random() - 0.5)
        .slice(0, numNotesToUse);

      // Assign notes and random tuplets to rhythm steps
      rhythm.forEach((step, index) => {
        const note = selectedNotes[index % selectedNotes.length];
        const noteIndex = notes.findIndex((n) => n?.name === note.name);
        const randomTuplet =
          tupletOptions[Math.floor(Math.random() * tupletOptions.length)];

        defaultSequence[step] = [
          {
            noteIndex,
            tuplet: randomTuplet,
          },
        ];
      });
    }

    return defaultSequence;
  });

  const nextStepTimeRef = useRef<number>(0);
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScheduleStepRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const sequenceRef = useRef<SequenceStep[]>(sequence);
  const currentBpmRef = useRef<number>(bpm); // Actual BPM used in scheduling
  const targetBpmRef = useRef<number>(bpm); // Target BPM from UI

  const stepsPerBar = 8; // 8 quarter notes (2 bars of 4/4)

  // Generate melodic pattern based on tuplet count using arpeggio (root-third-fifth)
  const getMelodyPattern = (rootNote: Note, tupletCount: number): Note[] => {
    const pattern: Note[] = [];
    const majorThirdRatio = 5 / 4; // Major third
    const perfectFifthRatio = 3 / 2; // Perfect fifth
    const octaveRatio = 2; // Octave

    // Generate arpeggio notes: root, third, fifth, octave, etc.
    const arpeggioFreqs = [
      rootNote.freq, // Root
      rootNote.freq * majorThirdRatio, // Third
      rootNote.freq * perfectFifthRatio, // Fifth
      rootNote.freq * octaveRatio, // Octave
      rootNote.freq * octaveRatio * majorThirdRatio, // Octave + third
      rootNote.freq * octaveRatio * perfectFifthRatio, // Octave + fifth
      rootNote.freq * octaveRatio * octaveRatio, // Double octave
    ];

    // Create pattern by cycling through arpeggio
    for (let i = 0; i < tupletCount; i++) {
      const freq = arpeggioFreqs[i % arpeggioFreqs.length];
      pattern.push({
        name: `${rootNote.name}_arp${i}`,
        freq,
      });
    }

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
    const noteDuration = 100; // 100ms note duration
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

    // Process each StepData in the array
    stepData.forEach((data) => {
      if (data.noteIndex === null) return;

      const rootNote = notes[data.noteIndex];
      if (!rootNote) return;

      // Parse tuplet ratio (single number = how many notes in this step)
      const n = Number(data.tuplet);
      const stepDuration = secondsPerBeat; // Single step = 1 beat (fixed)
      const noteInterval = stepDuration / n; // Divide step evenly by number of notes

      // Generate melodic pattern
      const melodyPattern = getMelodyPattern(rootNote, n);

      // Schedule each note in the tuplet
      melodyPattern.forEach((note, index) => {
        const noteDelay = delay + noteInterval * index * 1000; // Convert to ms
        notesScheduled++;

        console.log(
          `[Sequencer] Scheduling tuplet note ${index + 1}/${n} (${data.tuplet} notes): ${note.name} at ${note.freq}Hz, delay: ${noteDelay.toFixed(2)}ms`,
        );

        // Schedule note start
        setTimeout(() => {
          console.log(`[Sequencer] Playing tuplet note ${note.name}`);
          onPlayNote(note.name, note.freq, "sine");
        }, noteDelay);

        // Schedule note stop
        setTimeout(() => {
          console.log(`[Sequencer] Stopping tuplet note ${note.name}`);
          onStopNote(note.name);
        }, noteDelay + noteDuration);
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
              targetBpmRef.current = newBpm; // Smooth transition to new BPM
            }}
            min="40"
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
                    const stepData = sequence[step];
                    const trackData = stepData[trackIndex];

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
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {/* Note selection dropdown */}
                          <select
                            value={trackData?.noteIndex ?? ""}
                            onChange={(e) => {
                              setSequence((prev) => {
                                const newSequence = [...prev];
                                const value = e.target.value;
                                
                                if (value === "") {
                                  // Remove this track's data
                                  newSequence[step] = newSequence[step].filter(
                                    (_, idx) => idx !== trackIndex,
                                  );
                                } else {
                                  // Set or update this track's note
                                  const noteIndex = Number(value);
                                  const newData = {
                                    noteIndex,
                                    tuplet: (trackData?.tuplet || "1") as TupletRatio,
                                  };
                                  
                                  if (trackIndex < newSequence[step].length) {
                                    newSequence[step][trackIndex] = newData;
                                  } else {
                                    // Pad array if needed
                                    while (newSequence[step].length < trackIndex) {
                                      newSequence[step].push({ noteIndex: null, tuplet: "1" });
                                    }
                                    newSequence[step].push(newData);
                                  }
                                }
                                
                                sequenceRef.current = newSequence;
                                return newSequence;
                              });
                            }}
                            style={{
                              fontSize: "11px",
                              padding: "2px",
                              width: "70px",
                            }}
                          >
                            <option value="">-</option>
                            {notes.map((note, idx) => (
                              <option key={idx} value={idx}>
                                {note.name}
                              </option>
                            ))}
                          </select>

                          {/* Tuplet selection dropdown */}
                          {trackData?.noteIndex !== null && trackData?.noteIndex !== undefined && (
                            <select
                              value={trackData.tuplet}
                              onChange={(e) => {
                                setSequence((prev) => {
                                  const newSequence = [...prev];
                                  if (trackIndex < newSequence[step].length) {
                                    newSequence[step][trackIndex].tuplet = e
                                      .target.value as TupletRatio;
                                  }
                                  sequenceRef.current = newSequence;
                                  return newSequence;
                                });
                              }}
                              style={{
                                fontSize: "10px",
                                padding: "2px",
                                width: "70px",
                              }}
                            >
                              <option value="1">×1</option>
                              <option value="2">×2</option>
                              <option value="3">×3</option>
                              <option value="4">×4</option>
                              <option value="5">×5</option>
                              <option value="6">×6</option>
                              <option value="7">×7</option>
                            </select>
                          )}
                        </div>
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
