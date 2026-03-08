/**
 * Storage Service - Centralized LocalStorage management
 *
 * Provides type-safe getters/setters for all persisted data with
 * error handling and schema versioning
 */

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = "synth-v" + STORAGE_VERSION + "-";

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  BPM: `${STORAGE_PREFIX}bpm`,
  METRONOME: `${STORAGE_PREFIX}metronome`,
  VELOCITY: `${STORAGE_PREFIX}velocity`,
  SEQUENCE: `${STORAGE_PREFIX}sequence`,
  TRACKS: `${STORAGE_PREFIX}tracks`,
  TRACK_SETTINGS: `${STORAGE_PREFIX}track-settings`,
  TRACK_VOLUMES: `${STORAGE_PREFIX}track-volumes`,
  TRACK_MUTES: `${STORAGE_PREFIX}track-mutes`,
  SCALE: `${STORAGE_PREFIX}scale`,
} as const;

/**
 * Get item from localStorage with error handling
 */
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage with error handling
 */
function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set ${key} in localStorage:`, error);
  }
}

/**
 * Get BPM
 */
export function getBPM(): number {
  return getItem(STORAGE_KEYS.BPM, 120);
}

/**
 * Set BPM
 */
export function setBPM(bpm: number): void {
  setItem(STORAGE_KEYS.BPM, bpm);
}

/**
 * Get metronome enabled state
 */
export function getMetronomeEnabled(): boolean {
  return getItem(STORAGE_KEYS.METRONOME, true);
}

/**
 * Set metronome enabled state
 */
export function setMetronomeEnabled(enabled: boolean): void {
  setItem(STORAGE_KEYS.METRONOME, enabled);
}

/**
 * Get velocity
 */
export function getVelocity(): number {
  return getItem(STORAGE_KEYS.VELOCITY, 80);
}

/**
 * Set velocity
 */
export function setVelocity(velocity: number): void {
  setItem(STORAGE_KEYS.VELOCITY, velocity);
}

/**
 * Get sequence (manual load only)
 */
export function getSequence(): any {
  // Return null without loading from storage
  return null;
}

/**
 * Load sequence from storage (manual)
 */
export function loadSequence(): any {
  return getItem(STORAGE_KEYS.SEQUENCE, null);
}

/**
 * Set sequence
 */
export function setSequence(sequence: any): void {
  setItem(STORAGE_KEYS.SEQUENCE, sequence);
}

/**
 * Get track settings (manual load only)
 */
export function getTrackSettings(): any[] {
  // Return empty array without loading from storage
  return [];
}

/**
 * Load track settings from storage (manual)
 */
export function loadTrackSettings(): any[] {
  return getItem(STORAGE_KEYS.TRACK_SETTINGS, []);
}

/**
 * Set track settings
 */
export function setTrackSettings(settings: any[]): void {
  setItem(STORAGE_KEYS.TRACK_SETTINGS, settings);
}

/**
 * Get track volumes (manual load only)
 */
export function getTrackVolumes(numTracks: number): number[] {
  // Return defaults without loading from storage
  return Array(numTracks).fill(-3); // -3 dB is clearly audible
}

/**
 * Load track volumes from storage (manual)
 */
export function loadTrackVolumes(numTracks: number): number[] {
  return getItem(STORAGE_KEYS.TRACK_VOLUMES, Array(numTracks).fill(-3));
}

/**
 * Set track volumes
 */
export function setTrackVolumes(volumes: number[]): void {
  setItem(STORAGE_KEYS.TRACK_VOLUMES, volumes);
}

/**
 * Get track mutes (manual load only)
 */
export function getTrackMutes(numTracks: number): boolean[] {
  // Return defaults without loading from storage
  return Array(numTracks).fill(false);
}

/**
 * Load track mutes from storage (manual)
 */
export function loadTrackMutes(numTracks: number): boolean[] {
  return getItem(STORAGE_KEYS.TRACK_MUTES, Array(numTracks).fill(false));
}

/**
 * Set track mutes
 */
export function setTrackMutes(mutes: boolean[]): void {
  setItem(STORAGE_KEYS.TRACK_MUTES, mutes);
}

/**
 * Get musical scale
 */
export function getScale(): number[] {
  // Default: C major scale (C4 to C5)
  return getItem(STORAGE_KEYS.SCALE, [60, 62, 64, 65, 67, 69, 71, 72]);
}

/**
 * Set musical scale
 */
export function setScale(scale: number[]): void {
  setItem(STORAGE_KEYS.SCALE, scale);
}

/**
 * Clear all storage (useful for reset)
 */
export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  });
}

/**
 * Get storage info for debugging
 */
export function getStorageInfo(): {
  version: number;
  keys: string[];
  totalSize: number;
} {
  const keys = Object.values(STORAGE_KEYS);
  let totalSize = 0;

  keys.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      totalSize += value.length;
    }
  });

  return {
    version: STORAGE_VERSION,
    keys,
    totalSize,
  };
}
