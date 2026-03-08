import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Tone from "tone";
import StepSequencerNew from "./components/StepSequencerNew";
import SimpleSynthControls from "./components/SimpleSynthControls";
import { AudioTrack } from "./types/AudioTypes";
import {
  createSimpleTracks,
  disposeSimpleTracks,
} from "./engine/SimpleInstruments";
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

function SynthKeyboard() {
  // Simple array of tracks - each has a hardcoded instrument
  // Track 1: Piano, Track 2: Bass, Track 3: Hi-hat, Track 4: Drone
  const tracksRef = useRef<AudioTrack[]>([]);

  // Track volume and mute controls
  const [trackVolumes, setTrackVolumes] = useState<number[]>(() =>
    StorageService.getTrackVolumes(NUM_TRACKS),
  );

  const [trackMutes, setTrackMutes] = useState<boolean[]>(() =>
    StorageService.getTrackMutes(NUM_TRACKS),
  );

  // Instrument settings for each track
  const [instrumentSettings, setInstrumentSettings] = useState<any[]>(() =>
    Array(NUM_TRACKS).fill(null),
  );

  // Synth controls modal state
  const [isSynthControlsOpen, setIsSynthControlsOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0); // 0-indexed

  const trackNames = ["🎹 Piano", "🔊 Bass", "🥁 Hi-hat", "🌊 Drone"];

  // Initialize all tracks with simple, hardcoded instruments
  useEffect(() => {
    // Check if already initialized
    if (tracksRef.current.length > 0 && tracksRef.current[0].synth) return;

    // Create simple tracks (Piano, Bass, Hi-hat, Drone) - async for reverb generation
    createSimpleTracks().then((tracks) => {
      tracksRef.current = tracks;

      // Apply volume from state
      tracksRef.current.forEach((track, i) => {
        if (track.synth) {
          track.synth.volume.value = trackVolumes[i];
        }
      });

      console.log("✅ Simple tracks initialized:");
      console.log("  Track 1: Piano (melodic)");
      console.log("  Track 2: Bass (punchy)");
      console.log("  Track 3: Hi-hat (percussive)");
      console.log("  Track 4: Drone (sustained pad)");
      console.log("Audio context state:", Tone.getContext().state);
    });

    return () => {
      // Clean up all tracks
      disposeSimpleTracks(tracksRef.current);
      tracksRef.current = [];
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

  // Helper function to apply instrument settings to a track
  const applyInstrumentSettings = (trackIndex: number, settings: any) => {
    const track = tracksRef.current[trackIndex];
    if (!track?.synth || !settings) return;

    try {
      // Apply oscillator and envelope settings
      track.synth.set({
        oscillator: { type: settings.oscType },
        envelope: {
          attack: settings.attack,
          decay: settings.decay,
          sustain: settings.sustain,
          release: settings.release,
        },
        detune: settings.oscDetune,
        volume: settings.volume,
      });

      // Apply filter settings if available
      if (track.filter && settings.filterType !== undefined) {
        track.filter.type = settings.filterType;
        track.filter.frequency.value = settings.filterFreq;
        track.filter.Q.value = settings.filterQ;
      }

      // Apply distortion settings if available
      if (track.distortion && settings.drive !== undefined) {
        track.distortion.distortion = settings.drive;
        track.distortion.wet.value = settings.drive > 0 ? 1 : 0;
      }

      // Apply delay settings if available
      if (track.delay && settings.delayTime !== undefined) {
        track.delay.delayTime.value = settings.delayTime;
        track.delay.feedback.value = settings.delayFeedback;
        track.delay.wet.value = settings.delayWet;
      }

      // Apply reverb settings if available
      if (track.reverb && settings.reverbWet !== undefined) {
        track.reverb.wet.value = settings.reverbWet;
        if ("decay" in track.reverb && settings.reverbDecay !== undefined) {
          (track.reverb as any).decay = settings.reverbDecay;
        }
      }

      console.log(`✅ Applied saved settings to ${trackNames[trackIndex]}`);
    } catch (error) {
      console.error(`Failed to apply settings to track ${trackIndex}:`, error);
    }
  };

  // Load saved instrument settings on mount (but don't auto-apply, only when Load is clicked)
  useEffect(() => {
    // This effect intentionally does nothing on mount
    // Settings are only loaded when user clicks "Load Settings"
  }, []);

  // Manual save function
  const handleSaveSettings = () => {
    StorageService.setTrackVolumes(trackVolumes);
    StorageService.setTrackMutes(trackMutes);
    StorageService.setTrackSettings(instrumentSettings);
    alert("Settings saved!");
  };

  // Manual load function
  const handleLoadSettings = () => {
    const loadedVolumes = StorageService.loadTrackVolumes(NUM_TRACKS);
    const loadedMutes = StorageService.loadTrackMutes(NUM_TRACKS);
    const loadedSettings = StorageService.loadTrackSettings();

    setTrackVolumes(loadedVolumes);
    setTrackMutes(loadedMutes);

    // Apply instrument settings to each track
    if (loadedSettings && loadedSettings.length > 0) {
      setInstrumentSettings(loadedSettings);
      loadedSettings.forEach((settings, index) => {
        if (settings && index < NUM_TRACKS) {
          applyInstrumentSettings(index, settings);
        }
      });
    }

    alert("Settings loaded!");
  };

  // Handle instrument settings save from SimpleSynthControls
  const handleInstrumentSettingsSave = (trackIndex: number, settings: any) => {
    setInstrumentSettings((prev) => {
      const updated = [...prev];
      updated[trackIndex] = settings;
      return updated;
    });
    console.log(`💾 Saved instrument settings for ${trackNames[trackIndex]}`);
  };

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

      {/* Save/Load Controls */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleSaveSettings}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          💾 Save Settings
        </button>
        <button
          onClick={handleLoadSettings}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📂 Load Settings
        </button>
        <span style={{ fontSize: "12px", color: "#999", marginLeft: "10px" }}>
          Settings are not saved automatically
        </span>
      </div>

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
        onTrackSelect={(trackIndex) => {
          setActiveTrack(trackIndex - 1); // Convert 1-based to 0-indexed
          setIsSynthControlsOpen(true);
        }}
        onPreviewNote={async (trackIndex, noteName) => {
          // Preview a note on the specified track
          await Tone.start();
          const track = tracksRef.current[trackIndex];
          if (track?.synth) {
            track.synth.triggerAttackRelease(noteName, "8n");
          }
        }}
      />

      {/* Synth Controls Modal */}
      <SimpleSynthControls
        synth={tracksRef.current[activeTrack]?.synth || null}
        reverb={tracksRef.current[activeTrack]?.reverb || null}
        delay={tracksRef.current[activeTrack]?.delay || null}
        filter={tracksRef.current[activeTrack]?.filter || null}
        distortion={tracksRef.current[activeTrack]?.distortion || null}
        trackNumber={activeTrack + 1}
        trackName={trackNames[activeTrack]}
        isOpen={isSynthControlsOpen}
        onClose={() => setIsSynthControlsOpen(false)}
        onSave={handleInstrumentSettingsSave}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<SynthKeyboard />);
