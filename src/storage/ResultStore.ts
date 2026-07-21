// ─── Result Store ─────────────────────────────────────────────────────────────
// Zustand store for the current measurement session.
// Persists last result in memory; no network / database.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { DBHResult, FrameProcessingResult } from '../types';

interface ResultState {
  /** The last fully-computed DBH result (null until first valid measurement) */
  lastDBH:   DBHResult | null;
  /** The last raw frame processing result */
  lastFrame: FrameProcessingResult | null;
  /** URI of the captured photo for the results screen */
  capturedImageUri: string | null;
  /** Whether debug mode is active */
  debugMode: boolean;
  /** Selected mode: 'tree' or 'little_tree' */
  selectedMode: 'tree' | 'little_tree';

  // ── Actions ──────────────────────────────────────────────────────────────
  setLastFrame: (result: FrameProcessingResult) => void;
  captureResult: (dbh: DBHResult | null, imageUri?: string) => void;
  clearResult: () => void;
  toggleDebug: () => void;
  setDebugMode: (val: boolean) => void;
  setSelectedMode: (mode: 'tree' | 'little_tree') => void;
}

export const useResultStore = create<ResultState>((set) => ({
  lastDBH:          null,
  lastFrame:        null,
  capturedImageUri: null,
  debugMode:        false,
  selectedMode:     'tree',

  setLastFrame: (result) =>
    set({ lastFrame: result, lastDBH: result.dbh ?? null }),

  captureResult: (dbh, imageUri) =>
    set({ lastDBH: dbh, capturedImageUri: imageUri ?? null }),

  clearResult: () =>
    set({ lastDBH: null, lastFrame: null, capturedImageUri: null }),

  toggleDebug: () =>
    set((s) => ({ debugMode: !s.debugMode })),

  setDebugMode: (val) =>
    set({ debugMode: val }),

  setSelectedMode: (mode) =>
    set({ selectedMode: mode }),
}));
