/**
 * Step Sequencer (Refactored) - Main orchestrator for the step sequencer
 *
 * This component coordinates:
 * - UI components (SequenceGrid, TransportControls)
 * - Audio scheduling (SequenceScheduler)
 * - State persistence (StorageService)
 * - Integration with parent audio tracks
 *
 * Reduced from 683 lines to ~250 lines through proper separation of concerns
 */

import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { AudioTrack } from "../types/AudioTypes";
import { Track, Step } from "../types/SequenceTypes";
import { SequenceScheduler } from "../engine/SequenceScheduler";
import SequenceGrid from "./SequenceGrid";
import TransportControls from "./TransportControls";
import GridVisualizer from "./GridVisualizer";
import * as StorageService from "../services/StorageService";

// Legacy interface for backward compatibility with main.tsx
interface StepSequencerProps {
  tracks: AudioTrack[];
  numTracks: number;
  trackVolumes: number[];
  trackMutes: boolean[];
  onVolumeChange: (trackIndex: number, volume: number) => void;
  onMuteToggle: (trackIndex: number) => void;
  onTrackSelect?: (track: number) => void;
  onPreviewNote?: (trackIndex: number, noteName: string) => void;
}

const STEPS_PER_BAR = 8;

export default function StepSequencer({
  tracks: audioTracks,
  numTracks,
  trackVolumes,
  trackMutes,
  onVolumeChange,
  onMuteToggle,
  onTrackSelect,
  onPreviewNote,
}: StepSequencerProps) {
  // Playback state
  const [bpm, setBpm] = useState(120); // Don't auto-load
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true); // Don't auto-load

  // Musical state
  const [scale] = useState(() => StorageService.getScale());

  // Sequence state - using new Track structure
  const [sequenceTracks, setSequenceTracks] = useState<Track[]>(() =>
    initializeSequenceTracks(numTracks),
  );

  // Refs
  const schedulerRef = useRef<SequenceScheduler | null>(null);

  // Initialize scheduler
  useEffect(() => {
    schedulerRef.current = new SequenceScheduler(scale);

    return () => {
      if (schedulerRef.current) {
        schedulerRef.current.destroy();
        schedulerRef.current = null;
      }
    };
  }, []);

  // Update BPM in scheduler when changed
  useEffect(() => {
    if (schedulerRef.current) {
      schedulerRef.current.setBPM(bpm);
    }
  }, [bpm]);

  // Sync volumes and mutes from parent
  useEffect(() => {
    setSequenceTracks((prev) =>
      prev.map((track, i) => ({
        ...track,
        volume: trackVolumes[i] || 0,
        muted: trackMutes[i] || false,
      })),
    );
  }, [trackVolumes, trackMutes]);

  // Handle play/stop
  const handlePlayStop = async () => {
    if (!schedulerRef.current) return;

    if (!isPlaying) {
      // Start playback
      await Tone.start();

      // Set transport BPM
      Tone.Transport.bpm.value = bpm;

      // Schedule tracks
      schedulerRef.current.scheduleTracks(
        sequenceTracks,
        audioTracks,
        bpm,
        STEPS_PER_BAR,
        metronomeEnabled,
        setCurrentStep,
      );

      // Start playback
      schedulerRef.current.start();
      setIsPlaying(true);
    } else {
      // Stop playback
      schedulerRef.current.stop();

      // Release all notes
      audioTracks.forEach((track) => {
        if (track.synth) {
          track.synth.releaseAll();
        }
      });

      setIsPlaying(false);
      setCurrentStep(0);
    }
  };

  // Update sequence while playing
  useEffect(() => {
    if (isPlaying && schedulerRef.current) {
      // Reschedule with new sequence
      schedulerRef.current.scheduleTracks(
        sequenceTracks,
        audioTracks,
        bpm,
        STEPS_PER_BAR,
        metronomeEnabled,
        setCurrentStep,
      );
      // Restart the parts (they were disposed by scheduleTracks)
      schedulerRef.current.start();
    }
  }, [sequenceTracks, bpm, metronomeEnabled]); // Remove isPlaying from deps to avoid double-scheduling on play

  const handleTracksChange = (updatedTracks: Track[]) => {
    setSequenceTracks(updatedTracks);

    // Sync volume/mute back to parent
    updatedTracks.forEach((track, i) => {
      if (track.volume !== trackVolumes[i]) {
        onVolumeChange(i, track.volume);
      }
      if (track.muted !== trackMutes[i]) {
        onMuteToggle(i);
      }
    });
  };

  const handleTrackHeaderClick = (trackIndex: number) => {
    if (onTrackSelect) {
      onTrackSelect(trackIndex + 1); // +1 for 1-based indexing
    }
  };

  // Manual save all settings
  const handleSaveAll = () => {
    StorageService.setBPM(bpm);
    StorageService.setMetronomeEnabled(metronomeEnabled);
    StorageService.setSequence(sequenceTracks);
    alert("Sequence saved!");
  };

  // Manual load all settings
  const handleLoadAll = () => {
    const loadedBpm = StorageService.getBPM();
    const loadedMetronome = StorageService.getMetronomeEnabled();
    const loadedSequence = StorageService.loadSequence();

    setBpm(loadedBpm);
    setMetronomeEnabled(loadedMetronome);
    if (
      loadedSequence &&
      Array.isArray(loadedSequence) &&
      loadedSequence.length === numTracks
    ) {
      setSequenceTracks(loadedSequence);
    }
    alert("Sequence loaded!");
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <h2 style={{ marginTop: 0 }}>Step Sequencer</h2>

      {/* Transport Controls */}
      <TransportControls
        bpm={bpm}
        isPlaying={isPlaying}
        metronomeEnabled={metronomeEnabled}
        onPlayStop={handlePlayStop}
        onBPMChange={setBpm}
        onMetronomeToggle={() => setMetronomeEnabled(!metronomeEnabled)}
      />

      {/* Save/Load Buttons */}
      <div
        style={{
          marginTop: "12px",
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleSaveAll}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          💾 Save Sequence
        </button>
        <button
          onClick={handleLoadAll}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          📂 Load Sequence
        </button>
        <span style={{ fontSize: "11px", color: "#999" }}>
          Sequence not saved automatically
        </span>
      </div>

      {/* Visual Grid Indicator */}
      <div style={{ marginBottom: "16px" }}>
        <GridVisualizer currentStep={currentStep} isPlaying={isPlaying} />
      </div>

      {/* Main Sequencer Grid */}
      <SequenceGrid
        tracks={sequenceTracks}
        currentStep={currentStep}
        stepsPerBar={STEPS_PER_BAR}
        onTracksChange={handleTracksChange}
        onTrackHeaderClick={handleTrackHeaderClick}
        onPreviewNote={onPreviewNote}
      />

      {/* Info */}
      <div
        style={{
          fontSize: "12px",
          color: "#666",
          marginTop: "8px",
        }}
      >
        Click cells to select patterns • Click track names to edit synth
        settings
      </div>
    </div>
  );
}

/**
 * Initialize sequence tracks with default empty steps
 */
function initializeSequenceTracks(numTracks: number): Track[] {
  // Don't auto-load - start fresh
  // Create default tracks with empty steps
  return Array.from({ length: numTracks }, (_, i) => ({
    id: `track-${i}`,
    name: getDefaultTrackName(i),
    instrumentPresetId: getDefaultInstrumentForTrack(i),
    steps: Array.from(
      { length: STEPS_PER_BAR },
      (): Step => ({
        patternId: null,
        transpose: 0,
        velocityMultiplier: 1.0,
        muted: false,
      }),
    ),
    muted: false,
    volume: -3, // -3 dB is clearly audible
    solo: false,
  }));
}

/**
 * Get default track name
 */
function getDefaultTrackName(trackIndex: number): string {
  const names = ["🎹 Piano", "🔊 Bass", "🥁 Hi-hat", "🌊 Drone"];
  return names[trackIndex] || `Track ${trackIndex + 1}`;
}

/**
 * Get default instrument preset for track
 */
function getDefaultInstrumentForTrack(trackIndex: number): string {
  const defaults = ["Piano", "Bass", "Hi-hat", "Drone"];
  return defaults[trackIndex] || "Piano";
}
