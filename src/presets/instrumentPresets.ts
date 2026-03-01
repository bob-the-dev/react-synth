// Instrument Preset Library
// Provides a collection of synthesizer presets optimized for dual oscillator voice

export interface InstrumentPreset {
  name: string;
  category: string;
  settings: {
    // Oscillator 1
    osc1Type: "sine" | "square" | "sawtooth" | "triangle";
    osc1Octave: number;
    osc1Semitone: number;
    osc1Detune: number;
    osc1Shape: number;

    // Oscillator 2
    osc2Type: "sine" | "square" | "sawtooth" | "triangle";
    osc2Octave: number;
    osc2Semitone: number;
    osc2Detune: number;
    osc2Shape: number;

    // Oscillator Mix
    oscMix: number;
    ringMod: number;

    // Amp Envelope
    attack: number;
    decay: number;
    sustain: number;
    release: number;

    // Amp
    volume: number;
    drive: number;

    // Filter
    filterType: "lowpass" | "highpass" | "bandpass" | "notch";
    filterFreq: number;
    filterQ: number;
    filterEnvAmount: number;
    filterKeyTrack: number;

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
    lfoOsc1Amount: number;
    lfoOsc2Amount: number;
    lfoFilterAmount: number;
    lfoAmpAmount: number;

    // Delay
    delayTime: number;
    delayFeedback: number;
    delayWet: number;

    // Reverb
    reverbDecay: number;
    reverbWet: number;
    reverbSize: number;
    reverbStereo: number;
    reverbDamping: number;
  };
}

// Category labels for UI display
export const PRESET_CATEGORIES = {
  bass: "Bass",
  keys: "Keys",
  synth: "Synth",
} as const;

// Core preset library optimized for dual oscillator synthesis
export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  // ========== BASS ==========
  {
    name: "Bass",
    category: "bass",
    settings: {
      // Oscillator 1: Warm sawtooth wave
      osc1Type: "sawtooth",
      osc1Octave: -1,
      osc1Semitone: 0,
      osc1Detune: 0,
      osc1Shape: 0,

      // Oscillator 2: Sub bass (sine wave one octave lower)
      osc2Type: "sine",
      osc2Octave: -2,
      osc2Semitone: 0,
      osc2Detune: 0,
      osc2Shape: 0,

      // Mix: Mostly osc1 with some sub bass from osc2
      oscMix: 0.3, // 0 = all osc1, 1 = all osc2
      ringMod: 0,

      // Amp Envelope: Quick attack, medium decay
      attack: 0.01,
      decay: 0.15,
      sustain: 0.7,
      release: 0.3,

      // Amp: Punchy with slight drive
      volume: -6,
      drive: 0.15,

      // Filter: Lowpass to tame brightness
      filterType: "lowpass",
      filterFreq: 800,
      filterQ: 1.0,
      filterEnvAmount: 0.5,
      filterKeyTrack: 0.3,

      // Filter Envelope: Quick pluck sound
      filterAttack: 0.01,
      filterDecay: 0.2,
      filterSustain: 0.3,
      filterRelease: 0.3,
      filterBaseFreq: 400,
      filterOctaves: 2.5,

      // Portamento: Slight glide for legato playing
      portamento: 0.05,
      portamentoMode: "legato",

      // LFO: Off
      lfoRate: 0,
      lfoDepth: 0,
      lfoType: "sine",
      lfoOsc1Amount: 0,
      lfoOsc2Amount: 0,
      lfoFilterAmount: 0,
      lfoAmpAmount: 0,

      // Delay: Off
      delayTime: 0,
      delayFeedback: 0,
      delayWet: 0,

      // Reverb: Minimal room ambience
      reverbDecay: 1.0,
      reverbWet: 0.1,
      reverbSize: 0.4,
      reverbStereo: 0.3,
      reverbDamping: 0.5,
    },
  },

  // ========== PIANO ==========
  {
    name: "Piano",
    category: "keys",
    settings: {
      // Oscillator 1: Triangle wave for fundamental
      osc1Type: "triangle",
      osc1Octave: 0,
      osc1Semitone: 0,
      osc1Detune: 0,
      osc1Shape: 0,

      // Oscillator 2: Sine wave for harmonic richness
      osc2Type: "sine",
      osc2Octave: 1,
      osc2Semitone: 0,
      osc2Detune: -3,
      osc2Shape: 0,

      // Mix: Mostly osc1, subtle osc2
      oscMix: 0.25,
      ringMod: 0,

      // Amp Envelope: Fast attack, natural decay
      attack: 0.005,
      decay: 0.4,
      sustain: 0.15,
      release: 0.6,

      // Amp: Clean sound
      volume: -8,
      drive: 0,

      // Filter: Open lowpass
      filterType: "lowpass",
      filterFreq: 4000,
      filterQ: 0.7,
      filterEnvAmount: 0.3,
      filterKeyTrack: 0.5,

      // Filter Envelope: Quick bright attack, natural fade
      filterAttack: 0.001,
      filterDecay: 0.3,
      filterSustain: 0.2,
      filterRelease: 0.5,
      filterBaseFreq: 1000,
      filterOctaves: 3.5,

      // Portamento: Off
      portamento: 0,
      portamentoMode: "off",

      // LFO: Off
      lfoRate: 0,
      lfoDepth: 0,
      lfoType: "sine",
      lfoOsc1Amount: 0,
      lfoOsc2Amount: 0,
      lfoFilterAmount: 0,
      lfoAmpAmount: 0,

      // Delay: Off
      delayTime: 0,
      delayFeedback: 0,
      delayWet: 0,

      // Reverb: Medium hall ambience
      reverbDecay: 2.0,
      reverbWet: 0.25,
      reverbSize: 0.7,
      reverbStereo: 0.6,
      reverbDamping: 0.4,
    },
  },

  // ========== PAD ==========
  {
    name: "Pad",
    category: "synth",
    settings: {
      // Oscillator 1: Sawtooth wave
      osc1Type: "sawtooth",
      osc1Octave: 0,
      osc1Semitone: 0,
      osc1Detune: -5,
      osc1Shape: 0,

      // Oscillator 2: Sawtooth detuned for thickness
      osc2Type: "sawtooth",
      osc2Octave: 0,
      osc2Semitone: 0,
      osc2Detune: 5,
      osc2Shape: 0,

      // Mix: Equal blend of both oscillators
      oscMix: 0.5,
      ringMod: 0,

      // Amp Envelope: Slow attack and release for pad
      attack: 0.3,
      decay: 0.2,
      sustain: 0.8,
      release: 1.0,

      // Amp: Warm and smooth
      volume: -12,
      drive: 0,

      // Filter: Gentle lowpass
      filterType: "lowpass",
      filterFreq: 2000,
      filterQ: 0.5,
      filterEnvAmount: 0.4,
      filterKeyTrack: 0.5,

      // Filter Envelope: Slow opening
      filterAttack: 0.4,
      filterDecay: 0.3,
      filterSustain: 0.6,
      filterRelease: 1.0,
      filterBaseFreq: 800,
      filterOctaves: 3,

      // Portamento: Smooth glide
      portamento: 0.15,
      portamentoMode: "always",

      // LFO: Subtle vibrato
      lfoRate: 4,
      lfoDepth: 0,
      lfoType: "sine",
      lfoOsc1Amount: 0.002,
      lfoOsc2Amount: 0.002,
      lfoFilterAmount: 0,
      lfoAmpAmount: 0,

      // Delay: Off
      delayTime: 0,
      delayFeedback: 0,
      delayWet: 0,

      // Reverb: Large space
      reverbDecay: 3.0,
      reverbWet: 0.4,
      reverbSize: 0.9,
      reverbStereo: 0.8,
      reverbDamping: 0.3,
    },
  },

  // ========== LEAD ==========
  {
    name: "Lead",
    category: "synth",
    settings: {
      // Oscillator 1: Square wave for bite
      osc1Type: "square",
      osc1Octave: 0,
      osc1Semitone: 0,
      osc1Detune: 0,
      osc1Shape: 0,

      // Oscillator 2: Sawtooth for richness
      osc2Type: "sawtooth",
      osc2Octave: 0,
      osc2Semitone: 0,
      osc2Detune: 7,
      osc2Shape: 0,

      // Mix: Balanced mix
      oscMix: 0.45,
      ringMod: 0,

      // Amp Envelope: Snappy attack, sustained notes
      attack: 0.01,
      decay: 0.1,
      sustain: 0.8,
      release: 0.2,

      // Amp: Bright and present
      volume: -8,
      drive: 0.3,

      // Filter: Bright lowpass with resonance
      filterType: "lowpass",
      filterFreq: 3000,
      filterQ: 2.0,
      filterEnvAmount: 0.7,
      filterKeyTrack: 0.6,

      // Filter Envelope: Punchy filter sweep
      filterAttack: 0.02,
      filterDecay: 0.15,
      filterSustain: 0.4,
      filterRelease: 0.2,
      filterBaseFreq: 1200,
      filterOctaves: 4,

      // Portamento: Quick glide for expression
      portamento: 0.03,
      portamentoMode: "legato",

      // LFO: Vibrato
      lfoRate: 5.5,
      lfoDepth: 0,
      lfoType: "sine",
      lfoOsc1Amount: 0.005,
      lfoOsc2Amount: 0.005,
      lfoFilterAmount: 0,
      lfoAmpAmount: 0,

      // Delay: Short slap-back
      delayTime: 0.15,
      delayFeedback: 0.3,
      delayWet: 0.2,

      // Reverb: Medium space
      reverbDecay: 1.5,
      reverbWet: 0.15,
      reverbSize: 0.6,
      reverbStereo: 0.5,
      reverbDamping: 0.5,
    },
  },
];

// Helper functions for preset access
export function getPresetByName(name: string): InstrumentPreset | undefined {
  return INSTRUMENT_PRESETS.find((p) => p.name === name);
}

export function getPresetsByCategory(category: string): InstrumentPreset[] {
  return INSTRUMENT_PRESETS.filter((p) => p.category === category);
}

export function getAllPresetNames(): string[] {
  return INSTRUMENT_PRESETS.map((p) => p.name);
}

export function getCategoryList(): string[] {
  const categories = INSTRUMENT_PRESETS.map((p) => p.category);
  return Array.from(new Set(categories));
}
