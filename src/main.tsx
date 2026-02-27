import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Tone from "tone";
import StepSequencer from "./components/StepSequencer";
import SynthControls from "./components/SynthControls";
import { getPresetByName } from "./presets/instrumentPresets";

// Configure number of tracks (change this to add/remove tracks)
const NUM_TRACKS = 4;

// Track configurations - each track has its own unique settings
const TRACK_CONFIGS = [
  {
    // Track 1 - Bass
    oscillatorType: "sine" as const,
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.8 },
  },
  {
    // Track 2 - Piano (Default)
    oscillatorType: "triangle" as const,
    envelope: { attack: 0.002, decay: 0.15, sustain: 0.2, release: 0.8 },
  },
  {
    // Track 3 - Hi-hat
    oscillatorType: "square" as const,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.05 },
  },
  {
    // Track 4 - Toms
    oscillatorType: "sine" as const,
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.2 },
  },
];

interface Track {
  synth: Tone.PolySynth | null;
  reverb: Tone.JCReverb | null;
  lfo: Tone.LFO | null;
  delay: Tone.FeedbackDelay | null;
  filter: Tone.Filter | null;
  distortion: Tone.Distortion | null;
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
      getPresetByName("Acoustic Bass")!.settings,
      // Track 2 - Piano
      getPresetByName("Acoustic Grand Piano")!.settings,
      // Track 3 - Hi-hat
      getPresetByName("Hi-Hat")!.settings,
      // Track 4 - Toms
      getPresetByName("Toms")!.settings,
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
      const config = TRACK_CONFIGS[i] || TRACK_CONFIGS[0]; // Fallback to first config
      const settings = trackSettings[i]; // Get track-specific settings

      // Calculate detune from octave and semitone
      const osc1DetuneTotal =
        settings.osc1Octave * 1200 +
        settings.osc1Semitone * 100 +
        settings.osc1Detune;

      // Create filter for this track (independent instance)
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

      // Create synth with track-specific config
      // Note: Full dual oscillator support requires custom voice implementation
      // Currently using osc1 settings as primary oscillator
      const synth = new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: {
          type: settings.osc1Type,
        },
        envelope: config.envelope,
        volume: settings.volume,
        portamento: settings.portamento,
        detune: osc1DetuneTotal,
        filterEnvelope: {
          attack: settings.filterAttack,
          decay: settings.filterDecay,
          sustain: settings.filterSustain,
          release: settings.filterRelease,
          baseFrequency: settings.filterBaseFreq,
          octaves: settings.filterOctaves,
        },
      }).connect(distortion);

      // Create LFO for this track (starts stopped, will be controlled by SynthControls)
      const lfo = new Tone.LFO({
        frequency: settings.lfoRate,
        min: 0,
        max: 0, // Depth controlled separately
        type: settings.lfoType,
      });

      tracksRef.current[i] = { synth, reverb, lfo, delay, filter, distortion };
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
