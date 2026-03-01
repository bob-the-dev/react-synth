import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Tone from "tone";
import {
  Monophonic,
  MonophonicOptions,
} from "tone/build/esm/instrument/Monophonic";
import StepSequencer from "./components/StepSequencer";
import SynthControls from "./components/SynthControls";
import { getPresetByName } from "./presets/instrumentPresets";

// Configure number of tracks (change this to add/remove tracks)
const NUM_TRACKS = 4;

interface Track {
  synth: Tone.PolySynth<any> | null;
  reverb: Tone.JCReverb | null;
  lfo: Tone.LFO | null;
  delay: Tone.FeedbackDelay | null;
  filter: Tone.Filter | null;
  distortion: Tone.Distortion | null;
}

// Custom voice class for dual oscillator synthesis
class DualOscVoice extends Monophonic<MonophonicOptions> {
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

  static getDefaults() {
    return Object.assign(Monophonic.getDefaults(), {
      osc1Type: "sine",
      osc1Octave: 0,
      osc1Semitone: 0,
      osc1Detune: 0,
      osc2Type: "sine",
      osc2Octave: 0,
      osc2Semitone: 0,
      osc2Detune: 0,
      oscMix: 0.5,
      ringMod: 0,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 1,
      filterType: "lowpass",
      filterFreq: 1000,
      filterQ: 1,
      filterAttack: 0.01,
      filterDecay: 0.1,
      filterSustain: 0.5,
      filterRelease: 1,
      filterBaseFreq: 200,
      filterOctaves: 4,
    });
  }

  constructor(options?: Partial<TrackSettings>) {
    super(options);

    const settings = options as TrackSettings;

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
      (settings?.osc1Octave || 0) * 1200 +
      (settings?.osc1Semitone || 0) * 100 +
      (settings?.osc1Detune || 0);

    const osc2DetuneTotal =
      (settings?.osc2Octave || 0) * 1200 +
      (settings?.osc2Semitone || 0) * 100 +
      (settings?.osc2Detune || 0);

    // Create oscillators
    this.osc1 = new Tone.Oscillator({
      type: settings?.osc1Type || "sine",
      detune: osc1DetuneTotal,
    }).start();

    this.osc2 = new Tone.Oscillator({
      type: settings?.osc2Type || "sine",
      detune: osc2DetuneTotal,
    }).start();

    // Connect frequency and detune signals to oscillators
    this.frequency.connect(this.osc1.frequency);
    this.frequency.connect(this.osc2.frequency);
    this.detune.connect(this.osc1.detune);
    this.detune.connect(this.osc2.detune);

    // Use a gain node to mix oscillators
    // oscMix: 0 = only osc1, 1 = only osc2
    const osc1Gain = new Tone.Gain(1 - (settings?.oscMix || 0.5));
    const osc2Gain = new Tone.Gain(settings?.oscMix || 0.5);

    this.osc1.connect(osc1Gain);
    this.osc2.connect(osc2Gain);

    // Mixer sums both oscillators
    this.mixer = new Tone.Gain(0.5); // Reduce overall level to prevent clipping
    osc1Gain.connect(this.mixer);
    osc2Gain.connect(this.mixer);

    // Internal filter (separate from track-level filter)
    this.internalFilter = new Tone.Filter({
      type: settings?.filterType || "lowpass",
      frequency: settings?.filterFreq || 1000,
      Q: settings?.filterQ || 1,
    });

    // Filter envelope
    this.filterEnvelope = new Tone.FrequencyEnvelope({
      attack: settings?.filterAttack || 0.01,
      decay: settings?.filterDecay || 0.1,
      sustain: settings?.filterSustain || 0.5,
      release: settings?.filterRelease || 1,
      baseFrequency: settings?.filterBaseFreq || 200,
      octaves: settings?.filterOctaves || 4,
    });
    this.filterEnvelope.connect(this.internalFilter.frequency);

    // Amp envelope
    this.envelope = new Tone.AmplitudeEnvelope({
      attack: settings?.attack || 0.01,
      decay: settings?.decay || 0.1,
      sustain: settings?.sustain || 0.5,
      release: settings?.release || 1,
    });

    // Connect signal chain to output (output is provided by Monophonic base class)
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

    // Schedule onsilence callback after release completes
    // Add a small buffer to ensure envelope is fully released
    const releaseDuration = Tone.Time(this.envelope.release).toSeconds() + 0.1;

    this.context.setTimeout(() => {
      // Check if voice is actually silent before calling onsilence
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

interface TrackSettings {
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
}

function SynthKeyboard() {
  // Dynamic arrays for synths and reverbs
  const tracksRef = useRef<Track[]>(
    Array(NUM_TRACKS)
      .fill(null)
      .map(() => ({
        synth: null,
        reverb: null,
        lfo: null,
        delay: null,
        filter: null,
        distortion: null,
      })),
  );

  // Store settings per track to prevent sharing
  // Initialize with preset instruments or load from localStorage
  const [trackSettings, setTrackSettings] = useState<TrackSettings[]>(() => {
    const saved = localStorage.getItem("synth-track-settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved track settings:", e);
      }
    }
    return [
      // Track 1 - Bass
      getPresetByName("Bass")!.settings,
      // Track 2 - Piano
      getPresetByName("Piano")!.settings,
      // Track 3 - Pad
      getPresetByName("Pad")!.settings,
      // Track 4 - Lead
      getPresetByName("Lead")!.settings,
    ];
  });

  // Track volume and mute controls (separate from synth settings)
  const [trackVolumes, setTrackVolumes] = useState<number[]>(() => {
    const saved = localStorage.getItem("synth-track-volumes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved track volumes:", e);
      }
    }
    return Array(NUM_TRACKS).fill(0); // 0 dB default
  });

  const [trackMutes, setTrackMutes] = useState<boolean[]>(() => {
    const saved = localStorage.getItem("synth-track-mutes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved track mutes:", e);
      }
    }
    return Array(NUM_TRACKS).fill(false);
  });

  const [error, setError] = useState<string | null>(null);
  const [isSynthControlsOpen, setIsSynthControlsOpen] =
    useState<boolean>(false);
  const [activeTrack, setActiveTrack] = useState<number>(1); // Which track's synth to configure

  // Initialize all tracks dynamically
  useEffect(() => {
    // Check if already initialized
    if (tracksRef.current[0].synth) return;

    // Create synth and effects for each track
    for (let i = 0; i < NUM_TRACKS; i++) {
      const settings = trackSettings[i]; // Get track-specific settings

      // Create filter for this track (independent instance for external effects)
      const filter = new Tone.Filter({
        type: settings.filterType,
        frequency: settings.filterFreq,
        Q: settings.filterQ,
      });

      // Create distortion for this track
      const distortion = new Tone.Distortion({
        distortion: settings.drive,
        wet: settings.drive > 0 ? 1 : 0, // Full wet when drive enabled
      });

      // Create delay for this track
      const delay = new Tone.FeedbackDelay({
        delayTime: settings.delayTime,
        feedback: settings.delayFeedback,
        wet: settings.delayWet,
      });

      // Create reverb for this track
      const reverb = new Tone.JCReverb({
        roomSize: settings.reverbSize,
        wet: settings.reverbWet,
      });

      // Chain: synth -> distortion -> filter -> delay -> reverb -> destination
      distortion.connect(filter);
      filter.connect(delay);
      delay.connect(reverb);
      reverb.toDestination();

      // Create synth with dual oscillator voice
      const synth = new Tone.PolySynth(DualOscVoice, {
        // Pass all settings to the voice constructor
        ...settings,
      }).connect(distortion);

      // Set max polyphony - very high to avoid voice stealing
      synth.maxPolyphony = 128;

      // Apply synth-level settings separately
      synth.volume.value = settings.volume;
      if (settings.portamento > 0) {
        synth.set({ portamento: settings.portamento });
      }

      // Log synth setup
      console.log(
        `[Track ${i + 1}] Synth created with maxPolyphony: ${synth.maxPolyphony}`,
      );

      // Create LFO for this track (starts stopped, will be controlled by SynthControls)
      const lfo = new Tone.LFO({
        frequency: settings.lfoRate,
        min: 0,
        max: 0, // Depth controlled separately
        type: settings.lfoType,
      });

      tracksRef.current[i] = { synth, reverb, lfo, delay, filter, distortion };
    }

    // Log successful initialization
    console.log("✅ All tracks initialized successfully");
    console.log("Audio context state:", Tone.getContext().state);

    // Test that audio works with a simple beep on first track (for debugging)
    if (Tone.getContext().state === "running") {
      console.log("🔊 Audio context is running");
    } else {
      console.log("⚠️ Audio context not running - user interaction needed");
    }

    return () => {
      // Clean up all tracks
      tracksRef.current.forEach((track) => {
        if (track.synth) {
          track.synth.dispose();
        }
        if (track.reverb) {
          track.reverb.dispose();
        }
        if (track.lfo) {
          track.lfo.dispose();
        }
        if (track.delay) {
          track.delay.dispose();
        }
        if (track.filter) {
          track.filter.dispose();
        }
        if (track.distortion) {
          track.distortion.dispose();
        }
      });
      // Reset refs
      tracksRef.current = Array(NUM_TRACKS)
        .fill(null)
        .map(() => ({
          synth: null,
          reverb: null,
          lfo: null,
          delay: null,
          filter: null,
          distortion: null,
        }));
    };
  }, []);

  // Apply track volume and mute settings
  useEffect(() => {
    tracksRef.current.forEach((track, i) => {
      if (track.synth) {
        // Apply volume (convert to decibels)
        track.synth.volume.value = trackMutes[i] ? -Infinity : trackVolumes[i];
      }
    });
  }, [trackVolumes, trackMutes]);

  // Save track settings to localStorage
  useEffect(() => {
    localStorage.setItem("synth-track-settings", JSON.stringify(trackSettings));
  }, [trackSettings]);

  // Save track volumes to localStorage
  useEffect(() => {
    localStorage.setItem("synth-track-volumes", JSON.stringify(trackVolumes));
  }, [trackVolumes]);

  // Save track mutes to localStorage
  useEffect(() => {
    localStorage.setItem("synth-track-mutes", JSON.stringify(trackMutes));
  }, [trackMutes]);

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>🎹 Step Sequencer Synthesizer</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Create musical sequences with the step sequencer.
      </p>

      {error && (
        <div
          style={{
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "4px",
            color: "#c62828",
          }}
        >
          {error}
        </div>
      )}

      {/* Step Sequencer */}
      <StepSequencer
        tracks={tracksRef.current}
        numTracks={NUM_TRACKS}
        trackVolumes={trackVolumes}
        trackMutes={trackMutes}
        onVolumeChange={(trackIndex, volume) => {
          setTrackVolumes((prev) => {
            const updated = [...prev];
            updated[trackIndex] = volume;
            return updated;
          });
        }}
        onMuteToggle={(trackIndex) => {
          setTrackMutes((prev) => {
            const updated = [...prev];
            updated[trackIndex] = !updated[trackIndex];
            return updated;
          });
        }}
        onTrackSelect={(track) => {
          setActiveTrack(track);
          setIsSynthControlsOpen(true);
        }}
      />

      {/* Synth Controls Modal */}
      <SynthControls
        synth={tracksRef.current[activeTrack - 1]?.synth || null}
        reverb={tracksRef.current[activeTrack - 1]?.reverb || null}
        lfo={tracksRef.current[activeTrack - 1]?.lfo || null}
        delay={tracksRef.current[activeTrack - 1]?.delay || null}
        filter={tracksRef.current[activeTrack - 1]?.filter || null}
        distortion={tracksRef.current[activeTrack - 1]?.distortion || null}
        trackNumber={activeTrack}
        isOpen={isSynthControlsOpen}
        onClose={() => setIsSynthControlsOpen(false)}
        initialSettings={trackSettings[activeTrack - 1]}
        onSettingsChange={(newSettings) => {
          setTrackSettings((prev) => {
            const updated = [...prev];
            updated[activeTrack - 1] = newSettings;
            return updated;
          });
        }}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<SynthKeyboard />);
