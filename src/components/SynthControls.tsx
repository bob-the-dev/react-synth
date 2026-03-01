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

      // Release any stuck notes first
      synth.releaseAll();

      // Check voice availability
      console.log(
        `[SynthControls] Playing preview. Synth polyphony: ${synth.maxPolyphony}, Active voices: ${synth.activeVoices}`,
      );

      // Play a middle C note with a short duration
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

  // Helper component for control sections
  const ControlSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div
      style={{
        marginBottom: "20px",
        padding: "15px",
        background: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)",
        borderRadius: "8px",
        border: "1px solid #ddd",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: "15px",
          fontSize: "14px",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "#333",
          borderBottom: "2px solid #999",
          paddingBottom: "8px",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "15px",
        }}
      >
        {children}
      </div>
    </div>
  );

  const ControlInput = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
    type = "range",
    options,
    displayValue,
  }: {
    label: string;
    value: any;
    onChange: (val: any) => void;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    type?: "range" | "select";
    options?: { value: string; label: string }[];
    displayValue?: string;
  }) => (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "5px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {label}
        {displayValue && `: ${displayValue}`}
      </label>
      {type === "range" ? (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: "6px", fontSize: "12px" }}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );

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
          maxWidth: "1200px",
          width: "95%",
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
          <h2 style={{ margin: 0 }}>🎛️ Track {trackNumber} Settings</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setShowPresetBrowser(true)}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
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
                fontSize: "14px",
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
                fontSize: "14px",
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

        {/* Oscillator 1 */}
        <ControlSection title="🌊 Oscillator 1">
          <ControlInput
            label="Waveform"
            value={params.osc1Type}
            onChange={(v) => handleChange("osc1Type", v)}
            type="select"
            options={[
              { value: "sine", label: "∿ Sine" },
              { value: "triangle", label: "△ Triangle" },
              { value: "sawtooth", label: "⟋ Sawtooth" },
              { value: "square", label: "⊓ Square" },
            ]}
          />
          <ControlInput
            label="Octave"
            value={params.osc1Octave}
            onChange={(v) => handleChange("osc1Octave", v)}
            min={-3}
            max={3}
            step={1}
            displayValue={params.osc1Octave.toString()}
          />
          <ControlInput
            label="Semitone"
            value={params.osc1Semitone}
            onChange={(v) => handleChange("osc1Semitone", v)}
            min={-12}
            max={12}
            step={1}
            displayValue={params.osc1Semitone.toString()}
          />
          <ControlInput
            label="Detune"
            value={params.osc1Detune}
            onChange={(v) => handleChange("osc1Detune", v)}
            min={-100}
            max={100}
            step={1}
            displayValue={`${params.osc1Detune.toFixed(0)} cents`}
          />
          <ControlInput
            label="Shape"
            value={params.osc1Shape}
            onChange={(v) => handleChange("osc1Shape", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={params.osc1Shape.toFixed(2)}
          />
        </ControlSection>

        {/* Oscillator 2 */}
        <ControlSection title="🌊 Oscillator 2">
          <ControlInput
            label="Waveform"
            value={params.osc2Type}
            onChange={(v) => handleChange("osc2Type", v)}
            type="select"
            options={[
              { value: "sine", label: "∿ Sine" },
              { value: "triangle", label: "△ Triangle" },
              { value: "sawtooth", label: "⟋ Sawtooth" },
              { value: "square", label: "⊓ Square" },
            ]}
          />
          <ControlInput
            label="Octave"
            value={params.osc2Octave}
            onChange={(v) => handleChange("osc2Octave", v)}
            min={-3}
            max={3}
            step={1}
            displayValue={params.osc2Octave.toString()}
          />
          <ControlInput
            label="Semitone"
            value={params.osc2Semitone}
            onChange={(v) => handleChange("osc2Semitone", v)}
            min={-12}
            max={12}
            step={1}
            displayValue={params.osc2Semitone.toString()}
          />
          <ControlInput
            label="Detune"
            value={params.osc2Detune}
            onChange={(v) => handleChange("osc2Detune", v)}
            min={-100}
            max={100}
            step={1}
            displayValue={`${params.osc2Detune.toFixed(0)} cents`}
          />
          <ControlInput
            label="Shape"
            value={params.osc2Shape}
            onChange={(v) => handleChange("osc2Shape", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={params.osc2Shape.toFixed(2)}
          />
        </ControlSection>

        {/* Oscillator Mix */}
        <ControlSection title="🎚️ Oscillator Mix">
          <ControlInput
            label="OSC 1 / OSC 2"
            value={params.oscMix}
            onChange={(v) => handleChange("oscMix", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.oscMix * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Ring Mod"
            value={params.ringMod}
            onChange={(v) => handleChange("ringMod", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.ringMod * 100).toFixed(0)}%`}
          />
        </ControlSection>

        {/* Amp Envelope */}
        <ControlSection title="📊 Amp Envelope">
          <ControlInput
            label="Attack"
            value={params.attack}
            onChange={(v) => handleChange("attack", v)}
            min={0.001}
            max={2}
            step={0.001}
            displayValue={`${(params.attack * 1000).toFixed(0)}ms`}
          />
          <ControlInput
            label="Decay"
            value={params.decay}
            onChange={(v) => handleChange("decay", v)}
            min={0.001}
            max={2}
            step={0.001}
            displayValue={`${(params.decay * 1000).toFixed(0)}ms`}
          />
          <ControlInput
            label="Sustain"
            value={params.sustain}
            onChange={(v) => handleChange("sustain", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={params.sustain.toFixed(2)}
          />
          <ControlInput
            label="Release"
            value={params.release}
            onChange={(v) => handleChange("release", v)}
            min={0.001}
            max={5}
            step={0.001}
            displayValue={`${(params.release * 1000).toFixed(0)}ms`}
          />
        </ControlSection>

        {/* Amp */}
        <ControlSection title="🔊 Amp">
          <ControlInput
            label="Volume"
            value={params.volume}
            onChange={(v) => handleChange("volume", v)}
            min={-40}
            max={6}
            step={0.1}
            displayValue={`${params.volume.toFixed(1)}dB`}
          />
          <ControlInput
            label="Drive"
            value={params.drive}
            onChange={(v) => handleChange("drive", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.drive * 100).toFixed(0)}%`}
          />
        </ControlSection>

        {/* Filter (Combined with Filter Envelope) */}
        <ControlSection title="🔈 Filter">
          <ControlInput
            label="Type"
            value={params.filterType}
            onChange={(v) => handleChange("filterType", v)}
            type="select"
            options={[
              { value: "lowpass", label: "Lowpass" },
              { value: "highpass", label: "Highpass" },
              { value: "bandpass", label: "Bandpass" },
              { value: "notch", label: "Notch" },
            ]}
          />
          <ControlInput
            label="Resonance"
            value={params.filterQ}
            onChange={(v) => handleChange("filterQ", v)}
            min={0.1}
            max={20}
            step={0.1}
            displayValue={params.filterQ.toFixed(1)}
          />
          <ControlInput
            label="Cutoff"
            value={params.filterFreq}
            onChange={(v) => handleChange("filterFreq", v)}
            min={20}
            max={20000}
            step={1}
            displayValue={`${params.filterFreq.toFixed(0)}Hz`}
          />
          <ControlInput
            label="Key Track"
            value={params.filterKeyTrack}
            onChange={(v) => handleChange("filterKeyTrack", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.filterKeyTrack * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Env Amt"
            value={params.filterEnvAmount}
            onChange={(v) => handleChange("filterEnvAmount", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.filterEnvAmount * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Attack"
            value={params.filterAttack}
            onChange={(v) => handleChange("filterAttack", v)}
            min={0.001}
            max={2}
            step={0.001}
            displayValue={`${(params.filterAttack * 1000).toFixed(0)}ms`}
          />
          <ControlInput
            label="Decay"
            value={params.filterDecay}
            onChange={(v) => handleChange("filterDecay", v)}
            min={0.001}
            max={2}
            step={0.001}
            displayValue={`${(params.filterDecay * 1000).toFixed(0)}ms`}
          />
          <ControlInput
            label="Sustain"
            value={params.filterSustain}
            onChange={(v) => handleChange("filterSustain", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={params.filterSustain.toFixed(2)}
          />
          <ControlInput
            label="Release"
            value={params.filterRelease}
            onChange={(v) => handleChange("filterRelease", v)}
            min={0.001}
            max={5}
            step={0.001}
            displayValue={`${(params.filterRelease * 1000).toFixed(0)}ms`}
          />
          <ControlInput
            label="Base Freq"
            value={params.filterBaseFreq}
            onChange={(v) => handleChange("filterBaseFreq", v)}
            min={20}
            max={5000}
            step={1}
            displayValue={`${params.filterBaseFreq.toFixed(0)}Hz`}
          />
          <ControlInput
            label="Octaves"
            value={params.filterOctaves}
            onChange={(v) => handleChange("filterOctaves", v)}
            min={0}
            max={7}
            step={0.1}
            displayValue={params.filterOctaves.toFixed(1)}
          />
        </ControlSection>

        {/* Portamento */}
        <ControlSection title="🎹 Portamento">
          <ControlInput
            label="Time"
            value={params.portamento}
            onChange={(v) => handleChange("portamento", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.portamento * 1000).toFixed(0)}ms`}
          />
          <ControlInput
            label="Mode"
            value={params.portamentoMode}
            onChange={(v) => handleChange("portamentoMode", v)}
            type="select"
            options={[
              { value: "off", label: "Off" },
              { value: "legato", label: "Legato" },
              { value: "always", label: "Always" },
            ]}
          />
        </ControlSection>

        {/* LFO */}
        <ControlSection title="〰️ LFO">
          <ControlInput
            label="Waveform"
            value={params.lfoType}
            onChange={(v) => handleChange("lfoType", v)}
            type="select"
            options={[
              { value: "sine", label: "∿ Sine" },
              { value: "triangle", label: "△ Triangle" },
              { value: "sawtooth", label: "⟋ Sawtooth" },
              { value: "square", label: "⊓ Square" },
            ]}
          />
          <ControlInput
            label="Speed"
            value={params.lfoRate}
            onChange={(v) => handleChange("lfoRate", v)}
            min={0}
            max={20}
            step={0.1}
            displayValue={`${params.lfoRate.toFixed(1)}Hz`}
          />
          <ControlInput
            label="OSC 1"
            value={params.lfoOsc1Amount}
            onChange={(v) => handleChange("lfoOsc1Amount", v)}
            min={0}
            max={1}
            step={0.001}
            displayValue={`${(params.lfoOsc1Amount * 100).toFixed(1)}%`}
          />
          <ControlInput
            label="OSC 2"
            value={params.lfoOsc2Amount}
            onChange={(v) => handleChange("lfoOsc2Amount", v)}
            min={0}
            max={1}
            step={0.001}
            displayValue={`${(params.lfoOsc2Amount * 100).toFixed(1)}%`}
          />
          <ControlInput
            label="Filter"
            value={params.lfoFilterAmount}
            onChange={(v) => handleChange("lfoFilterAmount", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.lfoFilterAmount * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Amp"
            value={params.lfoAmpAmount}
            onChange={(v) => handleChange("lfoAmpAmount", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.lfoAmpAmount * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Depth"
            value={params.lfoDepth}
            onChange={(v) => handleChange("lfoDepth", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.lfoDepth * 100).toFixed(0)}%`}
          />
        </ControlSection>

        {/* Delay */}
        <ControlSection title="⏱️ Delay">
          <ControlInput
            label="Time"
            value={params.delayTime}
            onChange={(v) => handleChange("delayTime", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.delayTime * 1000).toFixed(0)}ms`}
          />
          <ControlInput
            label="Feedback"
            value={params.delayFeedback}
            onChange={(v) => handleChange("delayFeedback", v)}
            min={0}
            max={0.95}
            step={0.01}
            displayValue={`${(params.delayFeedback * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Wet"
            value={params.delayWet}
            onChange={(v) => handleChange("delayWet", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.delayWet * 100).toFixed(0)}%`}
          />
        </ControlSection>

        {/* Reverb */}
        <ControlSection title="🌌 Reverb">
          <ControlInput
            label="Amount"
            value={params.reverbWet}
            onChange={(v) => handleChange("reverbWet", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.reverbWet * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Size"
            value={params.reverbSize}
            onChange={(v) => handleChange("reverbSize", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.reverbSize * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Stereo"
            value={params.reverbStereo}
            onChange={(v) => handleChange("reverbStereo", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.reverbStereo * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Damping"
            value={params.reverbDamping}
            onChange={(v) => handleChange("reverbDamping", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.reverbDamping * 100).toFixed(0)}%`}
          />
          <ControlInput
            label="Decay"
            value={params.reverbDecay}
            onChange={(v) => handleChange("reverbDecay", v)}
            min={0.1}
            max={10}
            step={0.1}
            displayValue={`${params.reverbDecay.toFixed(1)}s`}
          />
        </ControlSection>
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
