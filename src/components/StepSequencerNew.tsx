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
}: StepSequencerProps) {
  // Playback state
  const [bpm, setBpm] = useState(() => StorageService.getBPM());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(() =>
    StorageService.getMetronomeEnabled(),
  );

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

  // Persist BPM changes
  useEffect(() => {
    StorageService.setBPM(bpm);
    if (schedulerRef.current) {
      schedulerRef.current.setBPM(bpm);
    }
  }, [bpm]);

  // Persist metronome changes
  useEffect(() => {
    StorageService.setMetronomeEnabled(metronomeEnabled);
  }, [metronomeEnabled]);

  // Persist sequence changes
  useEffect(() => {
    StorageService.setSequence(sequenceTracks);
  }, [sequenceTracks]);

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
  // Try loading from storage first
  const saved = StorageService.getSequence();
  if (saved && Array.isArray(saved) && saved.length === numTracks) {
    return saved;
  }

  // Create default tracks with empty steps
  return Array.from({ length: numTracks }, (_, i) => ({
    id: `track-${i}`,
    name: `Track ${i + 1}`,
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
    volume: 0,
    solo: false,
  }));
}

/**
 * Get default instrument preset for track
 */
function getDefaultInstrumentForTrack(trackIndex: number): string {
  const defaults = ["Bass", "Piano", "Pad", "Lead", "Synth"];
  return defaults[trackIndex] || "Piano";
}
