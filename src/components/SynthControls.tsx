import { useEffect, useState, useRef, useCallback } from "react";
import * as Tone from "tone";
import PresetBrowser from "./PresetBrowser";
import type { InstrumentPreset } from "../presets/instrumentPresets";

interface SynthControlsProps {
  synth: Tone.PolySynth | null;
  reverb: Tone.JCReverb | null;
  lfo: Tone.LFO | null;
  delay: Tone.FeedbackDelay | null;
  filter: Tone.Filter | null;
  distortion: Tone.Distortion | null;
  trackNumber: number;
  isOpen: boolean;
  onClose: () => void;
  initialSettings: SynthParams;
  onSettingsChange: (settings: SynthParams) => void;
}

interface SynthParams {
  // Oscillator 1
  osc1Type: "sine" | "square" | "sawtooth" | "triangle";
  osc1Octave: number; // -3 to +3
  osc1Semitone: number; // -12 to +12
  osc1Detune: number; // -100 to +100 cents
  osc1Shape: number; // 0 to 1 (PWM for square, etc.)

  // Oscillator 2
  osc2Type: "sine" | "square" | "sawtooth" | "triangle";
  osc2Octave: number; // -3 to +3
  osc2Semitone: number; // -12 to +12
  osc2Detune: number; // -100 to +100 cents
  osc2Shape: number; // 0 to 1

  // Oscillator Mix
  oscMix: number; // 0 (Osc1 only) to 1 (Osc2 only)
  ringMod: number; // 0 to 1 (ring modulation amount)

  // Amp Envelope
  attack: number;
  decay: number;
  sustain: number;
  release: number;

  // Amp
  volume: number;
  drive: number; // 0 to 1 (saturation/distortion)

  // Filter
  filterType: "lowpass" | "highpass" | "bandpass" | "notch";
  filterFreq: number;
  filterQ: number;
  filterEnvAmount: number;
  filterKeyTrack: number; // 0 to 1 (how much filter follows note pitch)

  // Filter Envelope
  filterAttack: number;
  filterDecay: number;
  filterSustain: number;
  filterRelease: number;
  filterBaseFreq: number;
  filterOctaves: number;

  // Portamento
  portamento: number;
  portamentoMode: "always" | "legato" | "off";

  // LFO
  lfoRate: number;
  lfoDepth: number;
  lfoType: "sine" | "square" | "sawtooth" | "triangle";
  lfoOsc1Amount: number; // 0 to 1
  lfoOsc2Amount: number; // 0 to 1
  lfoFilterAmount: number; // 0 to 1
  lfoAmpAmount: number; // 0 to 1

  // Delay
  delayTime: number;
  delayFeedback: number;
  delayWet: number;

  // Reverb
  reverbDecay: number;
  reverbWet: number;
  reverbSize: number; // 0 to 1
  reverbStereo: number; // 0 to 1
  reverbDamping: number; // 0 to 1

  // Legacy (for backwards compatibility)
  oscType?: "sine" | "square" | "sawtooth" | "triangle";
  lfoTarget?: "filter" | "volume" | "pitch";
}

function SynthControls({
  synth,
  reverb,
  lfo,
  delay,
  filter,
  distortion,
  trackNumber,
  isOpen,
  onClose,
  initialSettings,
  onSettingsChange,
}: SynthControlsProps) {
  const [params, setParams] = useState<SynthParams>(initialSettings);
  const [showPresetBrowser, setShowPresetBrowser] = useState(false);

  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPlayedInitialPreview = useRef(false);

  // Refs for LFO scaling nodes to prevent memory leaks
  const lfoScaleNodesRef = useRef<Tone.Scale[]>([]);

  // Update params when initialSettings change (e.g., switching tracks)
  useEffect(() => {
    setParams(initialSettings);
  }, [initialSettings, trackNumber]);

  // Play preview note
  const playPreview = useCallback(async () => {
    if (!synth || !filter || !lfo || !delay || !reverb || !distortion) return;

    try {
      // Temporarily apply current params for preview
      const osc1DetuneTotal =
        params.osc1Octave * 1200 +
        params.osc1Semitone * 100 +
        params.osc1Detune;

      synth.set({
        oscillator: {
          type: params.osc1Type,
        },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
        portamento: params.portamentoMode === "off" ? 0 : params.portamento,
        volume: params.volume,
        detune: osc1DetuneTotal,
      });

      // Apply filter envelope to individual voices
      const voices = (synth as any)._voices as Tone.MonoSynth[];
      voices.forEach((voice) => {
        if (voice && voice.filterEnvelope) {
          voice.filterEnvelope.attack = params.filterAttack;
          voice.filterEnvelope.decay = params.filterDecay;
          voice.filterEnvelope.sustain = params.filterSustain;
          voice.filterEnvelope.release = params.filterRelease;
          voice.filterEnvelope.baseFrequency = params.filterBaseFreq;
          voice.filterEnvelope.octaves = params.filterOctaves;
        }
      });

      filter.type = params.filterType;
      filter.frequency.value = params.filterFreq;
      filter.Q.value = params.filterQ;

      reverb.roomSize.value = params.reverbSize;
      reverb.wet.value = params.reverbWet;

      delay.delayTime.value = params.delayTime;
      delay.feedback.value = params.delayFeedback;
      delay.wet.value = params.delayWet;

      distortion.distortion = params.drive;
      distortion.wet.value = params.drive > 0 ? 1 : 0;

      // Ensure Tone.js is started
      await Tone.start();

      // Play a middle C note
      synth.triggerAttackRelease("C4", "8n");
    } catch (error) {
      console.error("Error playing preview:", error);
    }
  }, [synth, filter, lfo, delay, reverb, distortion, params]);

  // Reset preview flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasPlayedInitialPreview.current = false;
    }
  }, [isOpen]);

  // Apply parameters to synth
  // Cleanup LFO scale nodes on unmount
  useEffect(() => {
    return () => {
      lfoScaleNodesRef.current.forEach((node) => node.dispose());
      lfoScaleNodesRef.current = [];
    };
  }, []);

  // Play preview when parameters change (debounced)
  useEffect(() => {
    // Clear existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Don't play on initial render or when modal is closed
    if (!isOpen) return;

    // Schedule preview after 300ms of no changes
    previewTimeoutRef.current = setTimeout(() => {
      playPreview();
    }, 300);

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [params, isOpen, playPreview]);

  const handleChange = (key: keyof SynthParams, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle Save button - apply all settings at once
  const handleSave = useCallback(() => {
    if (!synth || !filter || !reverb || !delay || !distortion || !lfo) {
      onClose();
      return;
    }

    try {
      // Calculate total detune from octave, semitone, and detune
      const osc1DetuneTotal =
        params.osc1Octave * 1200 +
        params.osc1Semitone * 100 +
        params.osc1Detune;

      // Apply synth parameters
      synth.set({
        oscillator: {
          type: params.osc1Type,
        },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
        portamento: params.portamentoMode === "off" ? 0 : params.portamento,
        volume: params.volume,
        detune: osc1DetuneTotal,
      });

      // Apply filter envelope to individual voices
      const voices = (synth as any)._voices as Tone.MonoSynth[];
      voices.forEach((voice) => {
        if (voice && voice.filterEnvelope) {
          voice.filterEnvelope.attack = params.filterAttack;
          voice.filterEnvelope.decay = params.filterDecay;
          voice.filterEnvelope.sustain = params.filterSustain;
          voice.filterEnvelope.release = params.filterRelease;
          voice.filterEnvelope.baseFrequency = params.filterBaseFreq;
          voice.filterEnvelope.octaves = params.filterOctaves;
        }
      });

      // Apply filter parameters
      filter.type = params.filterType;
      filter.frequency.value = params.filterFreq;
      filter.Q.value = params.filterQ;

      // Apply reverb parameters
      reverb.roomSize.value = params.reverbSize;
      reverb.wet.value = params.reverbWet;

      // Apply delay parameters
      delay.delayTime.value = params.delayTime;
      delay.feedback.value = params.delayFeedback;
      delay.wet.value = params.delayWet;

      // Apply drive (distortion) parameters
      distortion.distortion = params.drive;
      distortion.wet.value = params.drive > 0 ? 1 : 0;

      // Apply LFO parameters
      // Clean up existing scale nodes
      lfoScaleNodesRef.current.forEach((node) => node.dispose());
      lfoScaleNodesRef.current = [];

      lfo.frequency.value = params.lfoRate;
      lfo.type = params.lfoType;
      lfo.disconnect();

      const hasAnyTarget =
        params.lfoFilterAmount > 0 ||
        params.lfoAmpAmount > 0 ||
        params.lfoOsc1Amount > 0 ||
        params.lfoOsc2Amount > 0;

      if (hasAnyTarget && params.lfoRate > 0) {
        lfo.min = -1;
        lfo.max = 1;

        if (params.lfoFilterAmount > 0 && filter) {
          const modulationRange = params.filterFreq * params.lfoFilterAmount;
          const filterLFO = new Tone.Scale({
            min: Math.max(20, params.filterFreq - modulationRange),
            max: Math.min(20000, params.filterFreq + modulationRange),
          });
          lfoScaleNodesRef.current.push(filterLFO);
          lfo.connect(filterLFO);
          filterLFO.connect(filter.frequency);
        }

        if (params.lfoAmpAmount > 0) {
          const volumeRange = 10 * params.lfoAmpAmount;
          const ampLFO = new Tone.Scale({
            min: params.volume - volumeRange,
            max: params.volume,
          });
          lfoScaleNodesRef.current.push(ampLFO);
          lfo.connect(ampLFO);
          ampLFO.connect(synth.volume);
        }

        if (params.lfoOsc1Amount > 0) {
          const centsRange = 50 * params.lfoOsc1Amount;
          const pitchLFO = new Tone.Scale({
            min: -centsRange,
            max: centsRange,
          });
          lfoScaleNodesRef.current.push(pitchLFO);
          lfo.connect(pitchLFO);

          const voices = (synth as any)._voices as Tone.MonoSynth[];
          voices.forEach((voice) => {
            if (voice && voice.detune) {
              pitchLFO.connect(voice.detune);
            }
          });
        }

        if (lfo.state !== "started") {
          lfo.start();
        }
      } else {
        if (lfo.state === "started") {
          lfo.stop();
        }
      }

      // Save to parent state
      onSettingsChange(params);
    } catch (error) {
      console.error("Error applying settings:", error);
    }

    // Close modal
    onClose();
  }, [
    params,
    synth,
    filter,
    reverb,
    delay,
    distortion,
    lfo,
    onSettingsChange,
    onClose,
  ]);

  // Apply preset from preset browser
  const handleLoadPreset = (preset: InstrumentPreset) => {
    const presetSettings = preset.settings;
    setParams(presetSettings);
    // Don't call onSettingsChange - wait for user to Save
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "20px",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0 }}>
            🎛️ Track {trackNumber} / Channel {trackNumber} Settings
          </h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setShowPresetBrowser(true)}
              style={{
                padding: "8px 16px",
                fontSize: "16px",
                cursor: "pointer",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              📂 Load Preset
            </button>
            <button
              onClick={() => playPreview()}
              style={{
                padding: "8px 16px",
                fontSize: "16px",
                cursor: "pointer",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              🔊 Test Sound
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "8px 16px",
                fontSize: "16px",
                cursor: "pointer",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              ✓ Save
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "10px 15px",
            marginBottom: "15px",
            backgroundColor: "#e3f2fd",
            border: "1px solid #2196F3",
            borderRadius: "4px",
            fontSize: "13px",
            color: "#1565c0",
          }}
        >
          💡 <strong>Live Preview:</strong> Adjust any parameter to hear a
          preview note. Click "🔊 Test Sound" to test manually.{" "}
          <strong>Press Save to apply changes to the track.</strong>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {/* Oscillator Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>🌊 Oscillator</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Waveform
              </label>
              <select
                value={params.oscType}
                onChange={(e) =>
                  handleChange(
                    "oscType",
                    e.target.value as SynthParams["oscType"],
                  )
                }
                style={{ width: "100%", padding: "8px" }}
              >
                <option value="sine">Sine</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>

          {/* Amp Envelope Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>📊 Amp Envelope</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Attack: {(params.attack * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.001"
                max="2"
                step="0.001"
                value={params.attack}
                onChange={(e) =>
                  handleChange("attack", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Decay: {(params.decay * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.001"
                max="2"
                step="0.001"
                value={params.decay}
                onChange={(e) =>
                  handleChange("decay", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Sustain: {params.sustain.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.sustain}
                onChange={(e) =>
                  handleChange("sustain", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Release: {(params.release * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.001"
                max="5"
                step="0.001"
                value={params.release}
                onChange={(e) =>
                  handleChange("release", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Filter Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>🔊 Filter</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Type
              </label>
              <select
                value={params.filterType}
                onChange={(e) =>
                  handleChange(
                    "filterType",
                    e.target.value as SynthParams["filterType"],
                  )
                }
                style={{ width: "100%", padding: "8px" }}
              >
                <option value="lowpass">Lowpass</option>
                <option value="highpass">Highpass</option>
                <option value="bandpass">Bandpass</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Frequency: {params.filterFreq.toFixed(0)}Hz
              </label>
              <input
                type="range"
                min="20"
                max="20000"
                step="1"
                value={params.filterFreq}
                onChange={(e) =>
                  handleChange("filterFreq", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Resonance (Q): {params.filterQ.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={params.filterQ}
                onChange={(e) =>
                  handleChange("filterQ", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Filter Envelope Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>📈 Filter Envelope</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Base Freq: {params.filterBaseFreq.toFixed(0)}Hz
              </label>
              <input
                type="range"
                min="20"
                max="5000"
                step="1"
                value={params.filterBaseFreq}
                onChange={(e) =>
                  handleChange("filterBaseFreq", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Octaves: {params.filterOctaves.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="7"
                step="0.1"
                value={params.filterOctaves}
                onChange={(e) =>
                  handleChange("filterOctaves", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Attack: {(params.filterAttack * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.001"
                max="2"
                step="0.001"
                value={params.filterAttack}
                onChange={(e) =>
                  handleChange("filterAttack", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Decay: {(params.filterDecay * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.001"
                max="2"
                step="0.001"
                value={params.filterDecay}
                onChange={(e) =>
                  handleChange("filterDecay", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Sustain: {params.filterSustain.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.filterSustain}
                onChange={(e) =>
                  handleChange("filterSustain", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Release: {(params.filterRelease * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.001"
                max="5"
                step="0.001"
                value={params.filterRelease}
                onChange={(e) =>
                  handleChange("filterRelease", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Volume & Portamento Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>🔉 Volume & Glide</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Volume: {params.volume.toFixed(1)}dB
              </label>
              <input
                type="range"
                min="-40"
                max="6"
                step="0.1"
                value={params.volume}
                onChange={(e) =>
                  handleChange("volume", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Portamento: {(params.portamento * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.portamento}
                onChange={(e) =>
                  handleChange("portamento", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* LFO Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>〰️ LFO</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Target
              </label>
              <select
                value={params.lfoTarget}
                onChange={(e) =>
                  handleChange(
                    "lfoTarget",
                    e.target.value as SynthParams["lfoTarget"],
                  )
                }
                style={{ width: "100%", padding: "8px" }}
              >
                <option value="filter">Filter</option>
                <option value="volume">Volume</option>
                <option value="pitch">Pitch</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Waveform
              </label>
              <select
                value={params.lfoType}
                onChange={(e) =>
                  handleChange(
                    "lfoType",
                    e.target.value as SynthParams["lfoType"],
                  )
                }
                style={{ width: "100%", padding: "8px" }}
              >
                <option value="sine">Sine</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Rate: {params.lfoRate.toFixed(1)}Hz
              </label>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={params.lfoRate}
                onChange={(e) =>
                  handleChange("lfoRate", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Depth: {params.lfoDepth.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.lfoDepth}
                onChange={(e) =>
                  handleChange("lfoDepth", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Delay Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>⏱️ Delay</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Time: {(params.delayTime * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={params.delayTime}
                onChange={(e) =>
                  handleChange("delayTime", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Feedback: {(params.delayFeedback * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="0.95"
                step="0.01"
                value={params.delayFeedback}
                onChange={(e) =>
                  handleChange("delayFeedback", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Wet: {(params.delayWet * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.delayWet}
                onChange={(e) =>
                  handleChange("delayWet", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Reverb Section */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>🌌 Reverb</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Decay: {params.reverbDecay.toFixed(1)}s
              </label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={params.reverbDecay}
                onChange={(e) =>
                  handleChange("reverbDecay", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Wet: {(params.reverbWet * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.reverbWet}
                onChange={(e) =>
                  handleChange("reverbWet", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preset Browser Modal */}
      {showPresetBrowser && (
        <PresetBrowser
          onSelectPreset={handleLoadPreset}
          onClose={() => setShowPresetBrowser(false)}
        />
      )}
    </div>
  );
}

export default SynthControls;
