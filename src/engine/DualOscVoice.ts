/**
 * Dual Oscillator Voice - Custom synthesizer voice for Tone.js
 *
 * Features two oscillators that can be mixed and detuned independently,
 * with internal filter and amplitude envelopes.
 */

import * as Tone from "tone";
import {
  Monophonic,
  MonophonicOptions,
} from "tone/build/esm/instrument/Monophonic";

// Temporary: Using old flat structure until migration complete
interface DualOscVoiceOptions extends MonophonicOptions {
  osc1Type?: "sine" | "square" | "sawtooth" | "triangle";
  osc1Octave?: number;
  osc1Semitone?: number;
  osc1Detune?: number;
  osc2Type?: "sine" | "square" | "sawtooth" | "triangle";
  osc2Octave?: number;
  osc2Semitone?: number;
  osc2Detune?: number;
  oscMix?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  filterType?: "lowpass" | "highpass" | "bandpass" | "notch";
  filterFreq?: number;
  filterQ?: number;
  filterAttack?: number;
  filterDecay?: number;
  filterSustain?: number;
  filterRelease?: number;
  filterBaseFreq?: number;
  filterOctaves?: number;
}

export class DualOscVoice extends Monophonic<DualOscVoiceOptions> {
  readonly name = "DualOscVoice";

  // Required by Monophonic base class
  readonly frequency: Tone.Signal<"frequency">;
  readonly detune: Tone.Signal<"cents">;

  private osc1: Tone.Oscillator;
  private osc2: Tone.Oscillator;
  private mixer: Tone.Gain;
  private envelope: Tone.AmplitudeEnvelope;
  private internalFilter: Tone.Filter;
  private filterEnvelope: Tone.FrequencyEnvelope;

  static getDefaults(): DualOscVoiceOptions {
    return Object.assign(Monophonic.getDefaults(), {
      osc1Type: "sine" as const,
      osc1Octave: 0,
      osc1Semitone: 0,
      osc1Detune: 0,
      osc2Type: "sine" as const,
      osc2Octave: 0,
      osc2Semitone: 0,
      osc2Detune: 0,
      oscMix: 0.5,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 1,
      filterType: "lowpass" as const,
      filterFreq: 1000,
      filterQ: 1,
      filterAttack: 0.01,
      filterDecay: 0.1,
      filterSustain: 0.5,
      filterRelease: 1,
      filterBaseFreq: 200,
      filterOctaves: 4,
    }) as DualOscVoiceOptions;
  }

  constructor(options?: Partial<DualOscVoiceOptions>) {
    super(options);

    const settings = { ...DualOscVoice.getDefaults(), ...options };

    // Create frequency and detune signals required by Monophonic
    this.frequency = new Tone.Signal({
      value: 440,
      units: "frequency",
    });

    this.detune = new Tone.Signal({
      value: 0,
      units: "cents",
    });

    // Calculate detune values for each oscillator
    const osc1DetuneTotal =
      (settings.osc1Octave || 0) * 1200 +
      (settings.osc1Semitone || 0) * 100 +
      (settings.osc1Detune || 0);

    const osc2DetuneTotal =
      (settings.osc2Octave || 0) * 1200 +
      (settings.osc2Semitone || 0) * 100 +
      (settings.osc2Detune || 0);

    // Create oscillators
    this.osc1 = new Tone.Oscillator({
      type: settings.osc1Type || "sine",
      detune: osc1DetuneTotal,
    }).start();

    this.osc2 = new Tone.Oscillator({
      type: settings.osc2Type || "sine",
      detune: osc2DetuneTotal,
    }).start();

    // Connect frequency and detune signals to oscillators
    this.frequency.connect(this.osc1.frequency);
    this.frequency.connect(this.osc2.frequency);
    this.detune.connect(this.osc1.detune);
    this.detune.connect(this.osc2.detune);

    // Use a gain node to mix oscillators
    const osc1Gain = new Tone.Gain(1 - (settings.oscMix || 0.5));
    const osc2Gain = new Tone.Gain(settings.oscMix || 0.5);

    this.osc1.connect(osc1Gain);
    this.osc2.connect(osc2Gain);

    // Mixer sums both oscillators
    this.mixer = new Tone.Gain(0.5);
    osc1Gain.connect(this.mixer);
    osc2Gain.connect(this.mixer);

    // Internal filter
    this.internalFilter = new Tone.Filter({
      type: settings.filterType || "lowpass",
      frequency: settings.filterFreq || 1000,
      Q: settings.filterQ || 1,
    });

    // Filter envelope
    this.filterEnvelope = new Tone.FrequencyEnvelope({
      attack: settings.filterAttack || 0.01,
      decay: settings.filterDecay || 0.1,
      sustain: settings.filterSustain || 0.5,
      release: settings.filterRelease || 1,
      baseFrequency: settings.filterBaseFreq || 200,
      octaves: settings.filterOctaves || 4,
    });
    this.filterEnvelope.connect(this.internalFilter.frequency);

    // Amp envelope
    this.envelope = new Tone.AmplitudeEnvelope({
      attack: settings.attack || 0.01,
      decay: settings.decay || 0.1,
      sustain: settings.sustain || 0.5,
      release: settings.release || 1,
    });

    // Connect signal chain to output
    this.mixer.chain(this.internalFilter, this.envelope, this.output);
  }

  protected _triggerEnvelopeAttack(
    time?: Tone.Unit.Time,
    velocity: number = 1,
  ): void {
    this.envelope.triggerAttack(time, velocity);
    this.filterEnvelope.triggerAttack(time);
  }

  protected _triggerEnvelopeRelease(time?: Tone.Unit.Time): void {
    this.envelope.triggerRelease(time);
    this.filterEnvelope.triggerRelease(time);

    const releaseDuration = Tone.Time(this.envelope.release).toSeconds() + 0.1;

    this.context.setTimeout(() => {
      const level = this.getLevelAtTime(this.now());
      if (level < 0.001 && this.onsilence) {
        this.onsilence(this);
      }
    }, releaseDuration);
  }

  getLevelAtTime(time: Tone.Unit.Time): number {
    return this.envelope.getValueAtTime(time);
  }

  dispose(): this {
    super.dispose();
    this.frequency.dispose();
    this.detune.dispose();
    this.osc1.dispose();
    this.osc2.dispose();
    this.mixer.dispose();
    this.envelope.dispose();
    this.internalFilter.dispose();
    this.filterEnvelope.dispose();
    return this;
  }
}
