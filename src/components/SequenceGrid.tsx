/**
 * Sequence Grid - Main grid layout for all tracks and steps
 *
 * Coordinates all TrackRow components and manages grid-level state
 */

import { Track, Step } from "../types/SequenceTypes";
import TrackRow from "./TrackRow";

interface SequenceGridProps {
  /** All tracks in the sequence */
  tracks: Track[];

  /** Current playing step for visual feedback */
  currentStep: number;

  /** Number of steps per bar (usually 8) */
  stepsPerBar: number;

  /** Callback when tracks change */
  onTracksChange: (tracks: Track[]) => void;

  /** Callback when track header is clicked (for synth controls) */
  onTrackHeaderClick?: (trackIndex: number) => void;
}

export default function SequenceGrid({
  tracks,
  currentStep,
  stepsPerBar,
  onTracksChange,
  onTrackHeaderClick,
}: SequenceGridProps) {
  const handleTrackChange = (trackIndex: number, updatedTrack: Track) => {
    const newTracks = [...tracks];
    newTracks[trackIndex] = updatedTrack;
    onTracksChange(newTracks);
  };

  const handleStepChange = (
    trackIndex: number,
    stepIndex: number,
    updatedStep: Step,
  ) => {
    const newTracks = [...tracks];
    const newSteps = [...newTracks[trackIndex].steps];
    newSteps[stepIndex] = updatedStep;
    newTracks[trackIndex] = {
      ...newTracks[trackIndex],
      steps: newSteps,
    };
    onTracksChange(newTracks);
  };

  return (
    <div
      style={{
        overflowX: "auto",
        marginBottom: "20px",
      }}
    >
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          backgroundColor: "white",
          border: "1px solid #ddd",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "12px",
                backgroundColor: "#2196F3",
                color: "white",
                textAlign: "left",
                borderRight: "2px solid #ddd",
              }}
            >
              Track
            </th>
            {Array.from({ length: stepsPerBar }).map((_, i) => (
              <th
                key={i}
                style={{
                  padding: "8px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  minWidth: "60px",
                }}
              >
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, trackIndex) => (
            <TrackRow
              key={track.id}
              track={track}
              currentStep={currentStep}
              onTrackChange={(updatedTrack) =>
                handleTrackChange(trackIndex, updatedTrack)
              }
              onStepChange={(stepIndex, updatedStep) =>
                handleStepChange(trackIndex, stepIndex, updatedStep)
              }
              trackIndex={trackIndex}
              onHeaderClick={
                onTrackHeaderClick
                  ? () => onTrackHeaderClick(trackIndex)
                  : undefined
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
