import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import GridVisualizer from "./GridVisualizer";

interface Track {
  synth: Tone.PolySynth | null;
  reverb: Tone.JCReverb | null;
  lfo: Tone.LFO | null;
  delay: Tone.FeedbackDelay | null;
  filter: Tone.Filter | null;
  distortion: Tone.Distortion | null;
}

interface StepSequencerProps {
  tracks: Track[];
  numTracks: number;
  trackVolumes: number[];
  trackMutes: boolean[];
  onVolumeChange: (trackIndex: number, volume: number) => void;
  onMuteToggle: (trackIndex: number) => void;
  onTrackSelect?: (track: number) => void;
}

type TupletRatio = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

type SequenceStep = TupletRatio[];

// MIDI note numbers for a major scale (C4 to C5)
const majorScaleMidi = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];

function StepSequencer({
  tracks,
  numTracks,
  trackVolumes,
  trackMutes,
  onVolumeChange,
  onMuteToggle,
  onTrackSelect,
}: StepSequencerProps) {
  const [bpm, setBpm] = useState<number>(() => {
    const saved = localStorage.getItem("synth-bpm");
    return saved ? Number(saved) : 60;
  });
  const [velocity, setVelocity] = useState<number>(() => {
    const saved = localStorage.getItem("synth-velocity");
    return saved ? Number(saved) : 80;
  });
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("synth-metronome");
    return saved ? saved === "true" : true;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [sequence, setSequence] = useState<SequenceStep[]>(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem("synth-sequence");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved sequence:", e);
      }
    }

    // Default initialization: 8 steps, dynamic number of tracks per step
    const tupletOptions: TupletRatio[] = ["2", "3", "4", "5"];

    // Initialize with sparse pattern - mainly track 0 with a few notes
    return Array(8)
      .fill(null)
      .map((_, stepIndex) => {
        const step: TupletRatio[] = Array(numTracks).fill("0"); // All tracks start silent

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
        if (stepIndex === 3 && numTracks > 1) {
          step[1] =
            tupletOptions[Math.floor(Math.random() * tupletOptions.length)];
        }

        return step;
      });
  });

  const sequenceRef = useRef<SequenceStep[]>(sequence);
  const partsRef = useRef<Tone.Part[]>([]);
  const metronomeSynthRef = useRef<Tone.Synth | null>(null);

  // Track arpeggio position and direction for each track (dynamic)
  const arpeggioStateRef = useRef<
    {
      index: number;
      direction: number;
    }[]
  >(
    Array(numTracks)
      .fill(null)
      .map(() => ({ index: 0, direction: 1 })),
  );

  const stepsPerBar = 8; // 8 quarter notes (2 bars of 4/4)

  // Save BPM to localStorage\n  useEffect(() => {\n    localStorage.setItem('synth-bpm', bpm.toString());\n  }, [bpm]);\n\n  // Save sequence to localStorage\n  useEffect(() => {\n    localStorage.setItem('synth-sequence', JSON.stringify(sequence));\n  }, [sequence]);\n\n  // Generate melodic pattern with arpeggiated MIDI notes
  const getMelodyPattern = (
    tupletCount: number,
    trackIndex: number,
  ): number[] => {
    const pattern: number[] = [];

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
          ((currentIndex % majorScaleMidi.length) + majorScaleMidi.length) %
          majorScaleMidi.length;
      } else {
        // Random jump to add variety
        currentIndex = Math.floor(Math.random() * majorScaleMidi.length);
      }

      pattern.push(majorScaleMidi[currentIndex]);
    }

    // Update arpeggio state for this track
    arpeggioStateRef.current[trackIndex] = { index: currentIndex, direction };

    return pattern;
  };

  // Initialize metronome synth
  useEffect(() => {
    if (!metronomeSynthRef.current) {
      metronomeSynthRef.current = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.001,
          decay: 0.029,
          sustain: 0,
          release: 0.029,
        },
      }).toDestination();
      metronomeSynthRef.current.volume.value = -12; // Quieter metronome
    }

    return () => {
      if (metronomeSynthRef.current) {
        metronomeSynthRef.current.dispose();
        metronomeSynthRef.current = null;
      }
    };
  }, []);

  // Create Tone.js Parts from sequence
  const createParts = () => {
    // Clean up existing parts
    partsRef.current.forEach((part) => part.dispose());
    partsRef.current = [];

    // Check if all tracks have synths initialized
    const allSynthsReady = tracks.every((track) => track.synth !== null);
    if (!allSynthsReady) return;

    const secondsPerBeat = 60.0 / bpm;

    // Process each step
    sequenceRef.current.forEach((stepData, stepIndex) => {
      const stepTime = stepIndex * secondsPerBeat;

      // Add metronome clicks (2 subdivisions per step) - only if enabled
      if (metronomeEnabled) {
        const subdivisions = 2;
        const subdivisionInterval = secondsPerBeat / subdivisions;
        for (let i = 0; i < subdivisions; i++) {
          const clickTime = stepTime + i * subdivisionInterval;
          const isDownbeat = stepIndex % 4 === 0 && i === 0;
          const clickNote = isDownbeat ? "F6" : "C6"; // Higher pitch for downbeat

          const clickPart = new Tone.Part(
            (time) => {
              if (metronomeSynthRef.current) {
                metronomeSynthRef.current.triggerAttackRelease(
                  clickNote,
                  "32n",
                  time,
                  0.5,
                );
              }
            },
            [[clickTime, null]],
          );
          clickPart.loop = true;
          clickPart.loopEnd = stepsPerBar * secondsPerBeat;
          partsRef.current.push(clickPart);
        }
      }

      // Process each track in the step
      stepData.forEach((tupletRatio, trackIndex) => {
        const n = Number(tupletRatio);
        if (n === 0) return; // Skip silent steps

        const noteInterval = secondsPerBeat / n;
        const melodyPattern = getMelodyPattern(n, trackIndex);

        // Use the corresponding synth for this track
        const synthForTrack = tracks[trackIndex]?.synth;
        if (!synthForTrack) return; // Skip if synth not initialized
        const normalizedVelocity = velocity / 127;

        // Schedule each note in the tuplet
        melodyPattern.forEach((midiNote, noteIndex) => {
          const noteTime = stepTime + noteInterval * noteIndex;
          const baseDuration = 0.12; // 120ms base duration
          const randomFactor = 0.8 + Math.random() * 0.4;
          const actualDuration = baseDuration * randomFactor;

          // Create individual parts per track so we can use different synths
          const notePart = new Tone.Part(
            (time) => {
              const noteName = Tone.Frequency(midiNote, "midi").toNote();
              synthForTrack.triggerAttackRelease(
                noteName,
                actualDuration,
                time,
                normalizedVelocity,
              );
            },
            [[noteTime, null]],
          );
          notePart.loop = true;
          notePart.loopEnd = stepsPerBar * secondsPerBeat;
          partsRef.current.push(notePart);
        });
      });
    });

    // Update visual feedback
    const visualPart = new Tone.Part(
      (time, step) => {
        Tone.Draw.schedule(() => {
          setCurrentStep(step);
        }, time);
      },
      Array.from({ length: stepsPerBar }, (_, i) => [i * secondsPerBeat, i]),
    );

    visualPart.loop = true;
    visualPart.loopEnd = stepsPerBar * secondsPerBeat;
    partsRef.current.push(visualPart);
  };

  const start = async () => {
    const allSynthsReady = tracks.every((track) => track.synth !== null);
    if (!allSynthsReady) {
      console.error("[Sequencer] Synths not initialized");
      return;
    }

    // Ensure Tone.js is started (required after user interaction)
    await Tone.start();

    // Set BPM
    Tone.Transport.bpm.value = bpm;

    // Create and start parts
    createParts();
    partsRef.current.forEach((part) => part.start(0));

    // Start transport
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stop = () => {
    // Stop and dispose parts first (before stopping transport)
    partsRef.current.forEach((part) => {
      try {
        part.stop(0); // Stop immediately at time 0
      } catch (e) {
        // Ignore timing errors when stopping
        console.warn("Part stop error (ignored):", e);
      }
      part.dispose();
    });
    partsRef.current = [];

    // Then stop transport
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    setIsPlaying(false);
    setCurrentStep(0);
  };

  // Update BPM when changed
  useEffect(() => {
    if (isPlaying) {
      Tone.Transport.bpm.value = bpm;
    }
  }, [bpm, isPlaying]);

  // Recreate parts when sequence changes
  useEffect(() => {
    sequenceRef.current = sequence;
    if (isPlaying) {
      // Update parts without restarting - just recreate them
      // Clean up old parts
      partsRef.current.forEach((part) => {
        if (part.state === "started") {
          part.stop(0);
        }
        part.dispose();
      });
      partsRef.current = [];

      // Create new parts with updated sequence
      createParts();

      // Start all new parts
      partsRef.current.forEach((part) => {
        part.start(0);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up parts on unmount
      partsRef.current.forEach((part) => {
        try {
          if (part.state === "started") {
            part.stop(0);
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
        part.dispose();
      });
      partsRef.current = [];

      // Stop transport if it's running
      if (Tone.Transport.state === "started") {
        Tone.Transport.stop();
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
          disabled={!tracks.every((t) => t.synth !== null)}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: tracks.every((t) => t.synth !== null)
              ? "pointer"
              : "not-allowed",
            backgroundColor: isPlaying ? "#f44336" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            opacity: tracks.every((t) => t.synth !== null) ? 1 : 0.5,
          }}
        >
          {isPlaying ? "⏹ Stop" : "▶ Start"}
        </button>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          BPM:
          <input
            type="number"
            value={bpm}
            onChange={(e) => {
              const newBpm = Number(e.target.value);
              setBpm(newBpm);
            }}
            min="20"
            max="240"
            style={{ padding: "5px", width: "60px" }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          Velocity:
          <input
            type="range"
            min="1"
            max="127"
            value={velocity}
            onChange={(e) => setVelocity(Number(e.target.value))}
            style={{ width: "100px" }}
          />
          <span style={{ minWidth: "30px", fontSize: "14px" }}>
            {velocity}
          </span>
        </label>

        <button
          onClick={() => setMetronomeEnabled(!metronomeEnabled)}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: metronomeEnabled ? "#4CAF50" : "#9E9E9E",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {metronomeEnabled ? "🔔" : "🔕"} Metronome
        </button>
      </div>

      {/* 3x3 Grid Visualizer */}
      <GridVisualizer currentStep={currentStep} isPlaying={isPlaying} />

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                Track
              </th>
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
            {Array.from({ length: numTracks }, (_, trackIndex) => (
              <tr key={trackIndex}>
                <td
                  style={{
                    padding: "8px",
                    border: "1px solid #ddd",
                    fontWeight: "bold",
                    backgroundColor:
                      trackIndex % 2 === 0 ? "#fafafa" : "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      minWidth: "120px",
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                      Track {trackIndex + 1}
                    </div>

                    {/* Volume Slider */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span style={{ fontSize: "10px", minWidth: "25px" }}>
                        Vol:
                      </span>
                      <input
                        type="range"
                        min="-40"
                        max="10"
                        step="1"
                        value={trackVolumes[trackIndex]}
                        onChange={(e) =>
                          onVolumeChange(trackIndex, Number(e.target.value))
                        }
                        style={{ width: "70px" }}
                        title={`${trackVolumes[trackIndex]} dB`}
                      />
                      <span style={{ fontSize: "9px", minWidth: "30px" }}>
                        {trackVolumes[trackIndex]}dB
                      </span>
                    </div>

                    {/* Mute Button and Edit Button */}
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                      }}
                    >
                      <button
                        onClick={() => onMuteToggle(trackIndex)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "10px",
                          cursor: "pointer",
                          backgroundColor: trackMutes[trackIndex]
                            ? "#f44336"
                            : "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          flex: 1,
                        }}
                        title={trackMutes[trackIndex] ? "Unmute" : "Mute"}
                      >
                        {trackMutes[trackIndex] ? "🔇" : "🔊"}
                      </button>
                      {onTrackSelect && (
                        <button
                          onClick={() => onTrackSelect(trackIndex + 1)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "10px",
                            cursor: "pointer",
                            backgroundColor: "#673AB7",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            flex: 1,
                          }}
                          title="Edit synth settings"
                        >
                          🎛️
                        </button>
                      )}
                    </div>
                  </div>
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
                              : trackIndex % 2 === 0
                                ? "#fafafa"
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
                          <option value="8">×8</option>
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
