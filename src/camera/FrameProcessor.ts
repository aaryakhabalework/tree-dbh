// ─── Frame Processor ──────────────────────────────────────────────────────────
// The core measurement hook. Runs on the VisionCamera frame processor thread.
// Calls card detection, trunk detection, quality checks, and DBH calculation
// on every processed frame. Results are passed back to JS via runOnJS.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useFrameOutput } from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';

import { detectCard } from '../opencv/card_detection/cardDetectionPipeline';
import { detectTrunk } from '../opencv/trunk_detection/trunkDetectionPipeline';
import { runQualityChecks } from '../opencv/quality/qualityChecks';
import { calculateDBH } from '../measurement/DBHCalculator';
import { clearBuffers } from '../opencv/OpenCVBridge';

import type {
  FrameProcessingResult,
  CardDetectionResult,
  TrunkDetectionResult,
} from '../types';
import { EMPTY_CARD_RESULT, EMPTY_TRUNK_RESULT } from '../types';

// ─── Processing constants ─────────────────────────────────────────────────────

/**
 * Target FPS for the CV pipeline (throttled for battery + performance).
 * The pure-JS CV pipeline is heavy — keep this low.
 */
const PROCESSING_FPS = 3;

/**
 * Resized frame dimensions for OpenCV processing.
 * Reduced from 640×480 to 320×240 to avoid 4-5s lag on mobile.
 */
const PROC_WIDTH  = 320;
const PROC_HEIGHT = 240;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Custom hook that creates a VisionCamera frame processor.
 *
 * @param onResult - Called from JS thread whenever a frame is processed
 * @param enabled  - Whether to run the processor (false = skip all processing)
 */
export function useMeasurementFrameProcessor(
  onResult: (result: FrameProcessingResult) => void,
  enabled: boolean = true,
  debug: boolean = false,
) {
  // Use Reanimated shared values for FPS tracking and throttling (worklet-safe)
  const lastProcessedTime = useSharedValue(0);
  const fpsFrameCount     = useSharedValue(0);
  const fpsLastTime       = useSharedValue(0);
  const fpsValue          = useSharedValue(0);

  // Stable callback that doesn't change identity on each render
  const handleResult = useCallback(
    (result: FrameProcessingResult) => {
      onResult(result);
    },
    [onResult],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      if (!enabled) {
        frame.dispose();
        return;
      }

      // Throttling: run frame processing at target FPS
      const now = Date.now();
      const intervalMs = 1000 / PROCESSING_FPS;
      if (now - lastProcessedTime.value < intervalMs) {
        frame.dispose();
        return;
      }
      lastProcessedTime.value = now;

      try {
        const startMs = Date.now();

        // ── FPS counter (inline, worklet-safe) ────────────────────────────
        fpsFrameCount.value += 1;
        const fpsNow = Date.now();
        if (fpsLastTime.value === 0) {
          fpsLastTime.value = fpsNow;
        }
        if (fpsNow - fpsLastTime.value >= 1000) {
          fpsValue.value      = fpsFrameCount.value;
          fpsFrameCount.value = 0;
          fpsLastTime.value   = fpsNow;
        }

        // ── 1. Access Frame Buffer (Planar YUV vs. Contiguous RGB) ────────
        const isPlanar = frame.isPlanar;
        const planes = isPlanar ? frame.getPlanes() : [];

        let frameBuffer: ArrayBuffer;
        let bytesPerRow: number;
        let origWidth: number;
        let origHeight: number;

        if (isPlanar) {
          if (planes.length === 0) {
            return;
          }
          const yPlane = planes[0];
          frameBuffer = yPlane.getPixelBuffer();
          bytesPerRow = yPlane.bytesPerRow;
          origWidth = yPlane.width;
          origHeight = yPlane.height;
        } else {
          frameBuffer = frame.getPixelBuffer();
          bytesPerRow = frame.bytesPerRow;
          origWidth = frame.width;
          origHeight = frame.height;
        }

        // ── 2. Downsample Y-channel directly to Grayscale ─────────────────
        const buffer = new Uint8Array(PROC_WIDTH * PROC_HEIGHT);
        const yData = new Uint8Array(frameBuffer);

        const scaleX = origWidth / PROC_WIDTH;
        const scaleY = origHeight / PROC_HEIGHT;

        for (let y = 0; y < PROC_HEIGHT; y++) {
          const srcY = Math.floor(y * scaleY);
          const srcRowOffset = srcY * bytesPerRow; // accounted for stride padding
          const destRowOffset = y * PROC_WIDTH;

          for (let x = 0; x < PROC_WIDTH; x++) {
            const srcX = Math.floor(x * scaleX);
            buffer[destRowOffset + x] = yData[srcRowOffset + srcX];
          }
        }

        // ── 3. Card detection ─────────────────────────────────────────────
        let card: CardDetectionResult = EMPTY_CARD_RESULT;
        try {
          card = detectCard(buffer, PROC_WIDTH, PROC_HEIGHT, debug);
        } catch (_e) {
          // Detection failed — continue with empty result
        }

        // Scale card pixel measurements back to original frame coordinates
        if (card.found) {
          const sx = origWidth  / PROC_WIDTH;
          const sy = origHeight / PROC_HEIGHT;
          card = {
            found: card.found,
            cardWidthPx:  card.cardWidthPx  * sx,
            cardHeightPx: card.cardHeightPx * sy,
            corners: [
              { x: card.corners[0].x * sx, y: card.corners[0].y * sy },
              { x: card.corners[1].x * sx, y: card.corners[1].y * sy },
              { x: card.corners[2].x * sx, y: card.corners[2].y * sy },
              { x: card.corners[3].x * sx, y: card.corners[3].y * sy },
            ] as typeof card.corners,
            confidence: card.confidence,
            tiltDegrees: card.tiltDegrees,
          };
        }

        // ── 4. Trunk detection ────────────────────────────────────────────
        let trunk: TrunkDetectionResult = EMPTY_TRUNK_RESULT;
        try {
          trunk = detectTrunk(buffer, PROC_WIDTH, PROC_HEIGHT, card, origWidth);
        } catch (_e) {
          // Detection failed
        }

        // ── 5. Quality checks ─────────────────────────────────────────────
        let quality;
        try {
          quality = runQualityChecks(buffer, PROC_WIDTH, PROC_HEIGHT, card, trunk);
        } catch (_e) {
          quality = {
            ok: false as const,
            issue: 'NO_CARD' as const,
            guidance: 'Point camera at card placed against tree trunk',
            sharpness: 0,
            brightness: 128,
          };
        }

        // ── 6. DBH calculation ────────────────────────────────────────────
        const processingMs = Date.now() - startMs;
        let dbh = null;
        try {
          dbh = quality.ok ? calculateDBH(card, trunk, processingMs) : null;
        } catch (_e) {
          dbh = null;
        }

        // ── 7. Clean up OpenCV buffers ────────────────────────────────────
        clearBuffers();

        // ── 8. Return results to JS thread ────────────────────────────────
        const result: FrameProcessingResult = {
          card,
          trunk,
          quality,
          dbh,
          frameWidth:   PROC_WIDTH,
          frameHeight:  PROC_HEIGHT,
          fps:          fpsValue.value,
          processingMs,
        };

        runOnJS(handleResult)(result);
      } finally {
        frame.dispose();
      }
    }
  });

  return frameOutput;
}
