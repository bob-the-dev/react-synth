/**
 * Synthesizer settings types - refactored from 46 flat properties to nested groups
 *
 * This replaces the duplicate interfaces:
 * - TrackSettings in main.tsx
 * - SynthParams in SynthControls.tsx
 * - settings in InstrumentPreset
 */

/**
 * Oscillator configuration
 */
export interface OscillatorSettings {
  type: "sine" | "square" | "sawtooth" | "triangle";
  octave: number; // -3 to +3
  semitone: number; // -12 to +12
  detune: number; // Fine tuning in cents (-100 to +100)
  shape: number; // Waveform shape modulation (0-1)
}

/**
 * Oscillator mix and modulation
 */
export interface OscillatorMixSettings {
  mix: number; // 0 = only osc1, 1 = only osc2
  ringMod: number; // Ring modulation amount (0-1)
}

/**
 * Amplitude envelope (ADSR)
 */
export interface EnvelopeSettings {
  attack: number; // Seconds
  decay: number; // Seconds
  sustain: number; // Level (0-1)
  release: number; // Seconds
}

/**
 * Filter configuration
 */
export interface FilterSettings {
  type: "lowpass" | "highpass" | "bandpass" | "notch";
  frequency: number; // Cutoff frequency in Hz
  Q: number; // Resonance (0.1-30)
  keyTracking: number; // How much filter follows note pitch (0-1)
}

/**
 * Filter envelope
 */
export interface FilterEnvelopeSettings {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  baseFrequency: number; // Starting frequency
  octaves: number; // Envelope range in octaves
  amount: number; // Envelope depth (0-1)
}

/**
 * Amplifier settings
 */
export interface AmpSettings {
  volume: number; // dB (-60 to +6)
  drive: number; // Distortion amount (0-1)
}

/**
 * Portamento (pitch glide)
 */
export interface PortamentoSettings {
  time: number; // Glide time in seconds
  mode: "always" | "legato" | "off";
}

/**
 * LFO (Low Frequency Oscillator) settings
 */
export interface LFOSettings {
  rate: number; // Frequency in Hz
  depth: number; // Overall depth (0-1)
  type: "sine" | "square" | "sawtooth" | "triangle";

  // Modulation targets
  osc1Amount: number; // Pitch modulation for osc1 (0-1)
  osc2Amount: number; // Pitch modulation for osc2 (0-1)
  filterAmount: number; // Filter cutoff modulation (0-1)
  ampAmount: number; // Amplitude modulation (0-1)
}

/**
 * Delay effect settings
 */
export interface DelaySettings {
  time: number; // Delay time in seconds
  feedback: number; // Feedback amount (0-1)
  wet: number; // Dry/wet mix (0-1)
}

/**
 * Reverb effect settings
 */
export interface ReverbSettings {
  decay: number; // Decay time
  wet: number; // Dry/wet mix (0-1)
  size: number; // Room size (0-1)
  stereo: number; // Stereo width (0-1)
  damping: number; // High frequency damping (0-1)
}

/**
 * Complete track settings - replaces the 46-property flat interface
 */
export interface TrackSettings {
  // Oscillators
  oscillator1: OscillatorSettings;
  oscillator2: OscillatorSettings;
  oscillatorMix: OscillatorMixSettings;

  // Envelopes
  ampEnvelope: EnvelopeSettings;
  filterEnvelope: FilterEnvelopeSettings;

  // Filter
  filter: FilterSettings;

  // Amp
  amp: AmpSettings;

  // Modulation
  portamento: PortamentoSettings;
  lfo: LFOSettings;

  // Effects
  delay: DelaySettings;
  reverb: ReverbSettings;
}

/**
 * Helper to create default settings
 */
export function createDefaultSettings(): TrackSettings {
  return {
    oscillator1: {
      type: "sine",
      octave: 0,
      semitone: 0,
      detune: 0,
      shape: 0,
    },
    oscillator2: {
      type: "sine",
      octave: 0,
      semitone: 0,
      detune: 0,
      shape: 0,
    },
    oscillatorMix: {
      mix: 0.5,
      ringMod: 0,
    },
    ampEnvelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 1,
    },
    filterEnvelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 1,
      baseFrequency: 200,
      octaves: 4,
      amount: 0.5,
    },
    filter: {
      type: "lowpass",
      frequency: 1000,
      Q: 1,
      keyTracking: 0,
    },
    amp: {
      volume: 0,
      drive: 0,
    },
    portamento: {
      time: 0,
      mode: "off",
    },
    lfo: {
      rate: 4,
      depth: 0,
      type: "sine",
      osc1Amount: 0,
      osc2Amount: 0,
      filterAmount: 0,
      ampAmount: 0,
    },
    delay: {
      time: 0.25,
      feedback: 0.3,
      wet: 0,
    },
    reverb: {
      decay: 1.5,
      wet: 0,
      size: 0.5,
      stereo: 0.5,
      damping: 0.5,
    },
  };
}
