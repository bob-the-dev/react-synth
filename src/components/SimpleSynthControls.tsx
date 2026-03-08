/**
 * Simplified Synth Controls for Simple Instruments
 * Only shows controls that are actually available on each track
 */

import { useEffect, useState, useCallback } from "react";
import * as Tone from "tone";

interface SimpleSynthControlsProps {
  synth: Tone.PolySynth | null;
  reverb: Tone.JCReverb | Tone.Reverb | null;
  delay: Tone.FeedbackDelay | null;
  filter: Tone.Filter | null;
  distortion: Tone.Distortion | null;
  trackNumber: number;
  trackName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (trackIndex: number, settings: any) => void;
}

export default function SimpleSynthControls({
  synth,
  reverb,
  delay,
  filter,
  distortion,
  trackNumber,
  trackName,
  isOpen,
  onClose,
  onSave,
}: SimpleSynthControlsProps) {
  const [params, setParams] = useState({
    // Oscillator
    oscType: "sine" as "sine" | "square" | "sawtooth" | "triangle",
    oscDetune: 0,

    // Envelope
    attack: 0.01,
    decay: 0.1,
    sustain: 0.3,
    release: 1.0,

    // Volume
    volume: 0,

    // Filter (if exists)
    filterType: "lowpass" as "lowpass" | "highpass" | "bandpass" | "notch",
    filterFreq: 1000,
    filterQ: 1,

    // Distortion (if exists)
    drive: 0,

    // Delay (if exists)
    delayTime: 0.25,
    delayFeedback: 0.3,
    delayWet: 0,

    // Reverb (if exists)
    reverbDecay: 2,
    reverbWet: 0,
  });

  // Load current settings from synth when opened
  useEffect(() => {
    if (!isOpen || !synth) return;

    try {
      const voices = (synth as any)._voices;
      if (voices && voices.length > 0) {
        const voice = voices[0];

        setParams((prev) => ({
          ...prev,
          oscType: voice.oscillator?.type?.replace(/\d+$/, "") || prev.oscType,
          oscDetune: voice.detune?.value || 0,
          attack: voice.envelope?.attack || prev.attack,
          decay: voice.envelope?.decay || prev.decay,
          sustain: voice.envelope?.sustain || prev.sustain,
          release: voice.envelope?.release || prev.release,
          volume: synth.volume.value || 0,
          filterType: (filter?.type || prev.filterType) as
            | "lowpass"
            | "highpass"
            | "bandpass"
            | "notch",
          filterFreq: Number(filter?.frequency.value) || prev.filterFreq,
          filterQ: Number(filter?.Q.value) || prev.filterQ,
          drive: distortion?.distortion || 0,
          delayTime: Number(delay?.delayTime.value) || prev.delayTime,
          delayFeedback: Number(delay?.feedback.value) || prev.delayFeedback,
          delayWet: Number(delay?.wet.value) || prev.delayWet,
          reverbDecay: (reverb as any)?.decay || prev.reverbDecay,
          reverbWet: Number(reverb?.wet.value) || prev.reverbWet,
        }));
      }
    } catch (error) {
      console.warn("Failed to load synth settings:", error);
    }
  }, [isOpen, synth, filter, distortion, delay, reverb]);

  const handleChange = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = useCallback(() => {
    if (!synth) return;

    try {
      // Apply oscillator and envelope settings
      synth.set({
        oscillator: { type: params.oscType },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
        detune: params.oscDetune,
        volume: params.volume,
      });

      // Apply filter settings if available
      if (filter) {
        filter.type = params.filterType;
        filter.frequency.value = params.filterFreq;
        filter.Q.value = params.filterQ;
      }

      // Apply distortion settings if available
      if (distortion) {
        distortion.distortion = params.drive;
        distortion.wet.value = params.drive > 0 ? 1 : 0;
      }

      // Apply delay settings if available
      if (delay) {
        delay.delayTime.value = params.delayTime;
        delay.feedback.value = params.delayFeedback;
        delay.wet.value = params.delayWet;
      }

      // Apply reverb settings if available
      if (reverb) {
        reverb.wet.value = params.reverbWet;
        if ("decay" in reverb) {
          (reverb as any).decay = params.reverbDecay;
        }
      }

      console.log(`✅ Applied settings to ${trackName}`);
    } catch (error) {
      console.error("Error applying settings:", error);
    }
  }, [synth, filter, distortion, delay, reverb, params, trackName]);

  const handleSave = () => {
    handleApply();

    // Notify parent that settings were saved
    if (onSave) {
      onSave(trackNumber - 1, params); // Convert 1-based to 0-based index
    }

    onClose();
  };

  const playPreview = async () => {
    if (!synth) return;

    handleApply();
    await Tone.start();
    synth.triggerAttackRelease("C4", "8n");
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
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "8px",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>
          {trackName} - Track {trackNumber}
        </h2>

        {/* Oscillator Section */}
        <Section title="Oscillator">
          <Control
            label="Wave Type"
            value={params.oscType}
            onChange={(v) => handleChange("oscType", v)}
            type="select"
            options={["sine", "square", "sawtooth", "triangle"]}
          />
          <Control
            label="Detune"
            value={params.oscDetune}
            onChange={(v) => handleChange("oscDetune", v)}
            min={-100}
            max={100}
            step={1}
            displayValue={`${params.oscDetune.toFixed(0)} cents`}
          />
        </Section>

        {/* Envelope Section */}
        <Section title="Envelope (ADSR)">
          <Control
            label="Attack"
            value={params.attack}
            onChange={(v) => handleChange("attack", v)}
            min={0.001}
            max={2}
            step={0.001}
            displayValue={`${(params.attack * 1000).toFixed(0)} ms`}
          />
          <Control
            label="Decay"
            value={params.decay}
            onChange={(v) => handleChange("decay", v)}
            min={0.001}
            max={2}
            step={0.001}
            displayValue={`${(params.decay * 1000).toFixed(0)} ms`}
          />
          <Control
            label="Sustain"
            value={params.sustain}
            onChange={(v) => handleChange("sustain", v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${(params.sustain * 100).toFixed(0)}%`}
          />
          <Control
            label="Release"
            value={params.release}
            onChange={(v) => handleChange("release", v)}
            min={0.001}
            max={5}
            step={0.001}
            displayValue={`${(params.release * 1000).toFixed(0)} ms`}
          />
        </Section>

        {/* Volume Section */}
        <Section title="Volume">
          <Control
            label="Volume"
            value={params.volume}
            onChange={(v) => handleChange("volume", v)}
            min={-24}
            max={12}
            step={1}
            displayValue={`${params.volume.toFixed(0)} dB`}
          />
        </Section>

        {/* Filter Section (only if available) */}
        {filter && (
          <Section title="Filter">
            <Control
              label="Type"
              value={params.filterType}
              onChange={(v) => handleChange("filterType", v)}
              type="select"
              options={["lowpass", "highpass", "bandpass", "notch"]}
            />
            <Control
              label="Frequency"
              value={params.filterFreq}
              onChange={(v) => handleChange("filterFreq", v)}
              min={20}
              max={20000}
              step={10}
              displayValue={`${params.filterFreq.toFixed(0)} Hz`}
            />
            <Control
              label="Resonance (Q)"
              value={params.filterQ}
              onChange={(v) => handleChange("filterQ", v)}
              min={0.1}
              max={20}
              step={0.1}
              displayValue={params.filterQ.toFixed(1)}
            />
          </Section>
        )}

        {/* Distortion Section (only if available) */}
        {distortion && (
          <Section title="Distortion">
            <Control
              label="Drive"
              value={params.drive}
              onChange={(v) => handleChange("drive", v)}
              min={0}
              max={1}
              step={0.01}
              displayValue={`${(params.drive * 100).toFixed(0)}%`}
            />
          </Section>
        )}

        {/* Delay Section (only if available) */}
        {delay && (
          <Section title="Delay">
            <Control
              label="Time"
              value={params.delayTime}
              onChange={(v) => handleChange("delayTime", v)}
              min={0}
              max={1}
              step={0.01}
              displayValue={`${(params.delayTime * 1000).toFixed(0)} ms`}
            />
            <Control
              label="Feedback"
              value={params.delayFeedback}
              onChange={(v) => handleChange("delayFeedback", v)}
              min={0}
              max={0.95}
              step={0.01}
              displayValue={`${(params.delayFeedback * 100).toFixed(0)}%`}
            />
            <Control
              label="Wet"
              value={params.delayWet}
              onChange={(v) => handleChange("delayWet", v)}
              min={0}
              max={1}
              step={0.01}
              displayValue={`${(params.delayWet * 100).toFixed(0)}%`}
            />
          </Section>
        )}

        {/* Reverb Section (only if available) */}
        {reverb && (
          <Section title="Reverb">
            <Control
              label="Decay"
              value={params.reverbDecay}
              onChange={(v) => handleChange("reverbDecay", v)}
              min={0.1}
              max={10}
              step={0.1}
              displayValue={`${params.reverbDecay.toFixed(1)} s`}
            />
            <Control
              label="Wet"
              value={params.reverbWet}
              onChange={(v) => handleChange("reverbWet", v)}
              min={0}
              max={1}
              step={0.01}
              displayValue={`${(params.reverbWet * 100).toFixed(0)}%`}
            />
          </Section>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button
            onClick={playPreview}
            style={{
              padding: "10px 20px",
              backgroundColor: "#9C27B0",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🔊 Preview
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            ✓ Save & Close
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "#757575",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ marginBottom: "10px", fontSize: "16px", color: "#333" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Control({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  displayValue,
  type = "range",
  options = [],
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  min?: number;
  max?: number;
  step?: number;
  displayValue?: string;
  type?: "range" | "select";
  options?: string[];
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
          fontSize: "13px",
        }}
      >
        <label style={{ color: "#555" }}>{label}</label>
        <span style={{ color: "#888", fontFamily: "monospace" }}>
          {displayValue || value}
        </span>
      </div>
      {type === "range" ? (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "6px",
            fontSize: "13px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
