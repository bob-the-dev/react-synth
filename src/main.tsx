import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Tone from "tone";
import StepSequencerNew from "./components/StepSequencerNew";
import SynthControls from "./components/SynthControls";
import { getPresetByName } from "./presets/instrumentPresets";
import { AudioTrack } from "./types/AudioTypes";
import { createAudioTrack, disposeAudioTrack } from "./engine/AudioContext";
import * as StorageService from "./services/StorageService";

/**
   Definitions:

   A voice: 
    - Is an instance of a synthesizer sound generator (e.g. a dual oscillator voice)
    - It can be triggered to play a note with specific settings (e.g. pitch, velocity)
    - It has parameters that can be controlled in real-time (e.g. filter cutoff, envelope)

   An instrument:
    - Has a name and a preset (which defines the sound)
    - It controls the settings for a synthesizer voice in real-time (e.g. oscillator type, envelope settings)

   A note:
    - Is a specific pitch that can be played by a voice
    - It has a MIDI note number (e.g. 60 for C4) ?? is this the case with Tone.js? I think it can also be a frequency in Hz
          synth.triggerAttackRelease("C4", "8n");         // Interpreted as scientific pitch notation ("C4", "A#3")
          synth.triggerAttackRelease(60, "8n");           // Number < 128: Interpreted as MIDI note number (0-127 range)
          synth.triggerAttackRelease(261.63, "8n");       // Number >= 128: Interpreted as frequency in Hz
    - It can be triggered with a specific velocity (how hard the note is played)
    - It can be released (stopped) after being triggered, which allows for sustained notes

   A loop: 
    - Is a repeating section of music that can contain multiple tracks
    - It has a defined length (e.g. 8 steps) and tempo (BPM)  
    - It can be started and stopped, and it will play the notes defined in its tracks according to the sequence

   A track: 
    - Contains a sequence of, usually 8, steps, that define when notes are played

   A step:
    - Defines what to be played at a position in the sequence (e.g. step 1, step 2, etc., up to 8) of one specific track
    - It can be active or inactive for each track, determining what notes are played at that step.
    - The step can be configured to just play tuples (e.g. 3 notes in the time of 2) instead of a single note, which adds rhythmic complexity and variation to the sequence.
    - Or to play a preconfigured sequence of notes (e.g. an arpeggio pattern) instead of a single note, which adds melodic variation to the sequence.
    - These steps are defined by a building block. 

  A building block:
    - Contains a set of steps that can be used to define the sequence for a track.
    - It can be a simple pattern (e.g. play on steps 1, 3, 5, 7) or a more complex pattern (e.g. play a triplet on step 2, an arpeggio on step 4, etc.)
    - It can be reused across multiple tracks and steps to create cohesive patterns in the music.

  



   */

// Configure number of tracks (change this to add/remove tracks)
const NUM_TRACKS = 4;

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
  const tracksRef = useRef<AudioTrack[]>(
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
    return StorageService.getTrackSettings().length > 0
      ? StorageService.getTrackSettings()
      : [
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
  const [trackVolumes, setTrackVolumes] = useState<number[]>(() =>
    StorageService.getTrackVolumes(NUM_TRACKS),
  );

  const [trackMutes, setTrackMutes] = useState<boolean[]>(() =>
    StorageService.getTrackMutes(NUM_TRACKS),
  );

  const [isSynthControlsOpen, setIsSynthControlsOpen] =
    useState<boolean>(false);
  const [activeTrack, setActiveTrack] = useState<number>(1); // Which track's synth to configure

  // Initialize all tracks dynamically
  useEffect(() => {
    // Check if already initialized
    if (tracksRef.current[0].synth) return;

    // Create synth and effects for each track using AudioContext factory
    for (let i = 0; i < NUM_TRACKS; i++) {
      const settings = trackSettings[i];
      tracksRef.current[i] = createAudioTrack(settings);

      // Apply volume from state
      if (tracksRef.current[i].synth) {
        tracksRef.current[i].synth!.volume.value = trackVolumes[i];
      }

      console.log(`[Track ${i + 1}] Synth created with maxPolyphony: 128`);
    }

    // Log successful initialization
    console.log("✅ All tracks initialized successfully");
    console.log("Audio context state:", Tone.getContext().state);

    return () => {
      // Clean up all tracks using AudioContext factory
      tracksRef.current.forEach((track) => {
        disposeAudioTrack(track);
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
    StorageService.setTrackSettings(trackSettings);
  }, [trackSettings]);

  // Save track volumes to localStorage
  useEffect(() => {
    StorageService.setTrackVolumes(trackVolumes);
  }, [trackVolumes]);

  // Save track mutes to localStorage
  useEffect(() => {
    StorageService.setTrackMutes(trackMutes);
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

      {/* Step Sequencer */}
      <StepSequencerNew
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
