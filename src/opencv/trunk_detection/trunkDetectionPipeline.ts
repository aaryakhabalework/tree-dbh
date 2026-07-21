// ─── Trunk Detection Pipeline ─────────────────────────────────────────────────
// Detects tree trunk left and right edges using a column-histogram approach
// on the Sobel X-derivative edge map.
//
// Strategy: pure-JS column projection histogram on the raw pixel buffer.
// This avoids complex OpenCV Mat iteration APIs and runs efficiently as a
// worklet on the frame processor thread.
//
// Pipeline:
//   BGR buffer → grayscale (luminance) → Sobel X (manual, pure JS) →
//   column edge histogram → smooth → find two dominant peaks →
//   validate trunk width → return left/right edges
//
// All code is worklet-safe.
// ─────────────────────────────────────────────────────────────────────────────

import type { TrunkDetectionResult, CardDetectionResult } from '../../types';
import { EMPTY_TRUNK_RESULT } from '../../types';

// ─── Pure-JS Sobel X on raw BGR buffer ───────────────────────────────────────

/**
 * Computes a column-sum histogram of vertical-edge intensity using a
 * simplified Sobel X kernel applied to the grayscale version of the buffer.
 *
 * Works entirely on the Uint8Array from vision-camera-resize-plugin.
 *
 * @param buffer  - Grayscale Uint8Array (width * height bytes)
 * @param width   - Frame width
 * @param height  - Frame height
 * @param rowStart - First row to include (default: top 1/3)
 * @param rowEnd   - Last row to exclude (default: bottom 2/3)
 */
function computeEdgeColumnHistogram(
  buffer: Uint8Array,
  width: number,
  height: number,
  rowStart: number,
  rowEnd: number,
): number[] {
  'worklet';

  const histogram = new Array<number>(width).fill(0);

  // Simplified Sobel X: compare left and right neighbors
  // For each pixel at (x,y): edge ≈ |gray(x+1,y) - gray(x-1,y)|
  const stride = width; // 1 byte per pixel in grayscale

  for (let y = rowStart; y < rowEnd; y++) {
    const rowBase = y * stride;

    for (let x = 1; x < width - 1; x++) {
      const idxLeft  = rowBase + (x - 1);
      const idxRight = rowBase + (x + 1);

      const grayLeft  = buffer[idxLeft];
      const grayRight = buffer[idxRight];

      const edgeStrength = Math.abs(grayRight - grayLeft);

      // Only count strong edges (threshold = 25 / 255)
      if (edgeStrength > 25) {
        histogram[x] += edgeStrength;
      }
    }
  }

  return histogram;
}

/**
 * Applies a moving-average smoothing to the histogram.
 */
function smoothHistogram(histogram: number[], windowSize: number = 9): number[] {
  'worklet';
  const half   = Math.floor(windowSize / 2);
  const result = new Array<number>(histogram.length).fill(0);

  for (let i = half; i < histogram.length - half; i++) {
    let sum = 0;
    for (let k = -half; k <= half; k++) {
      sum += histogram[i + k];
    }
    result[i] = sum / windowSize;
  }

  return result;
}

/**
 * Finds the left and right trunk boundary columns from a smoothed edge histogram,
 * optionally ignoring columns that overlap with the detected card.
 *
 * Strategy: scan from left edge inward to find the first significant peak
 * (left trunk edge) and from right edge inward to find the second (right trunk edge).
 */
function findTrunkEdges(
  histogram: number[],
  width: number,
  cardResult: CardDetectionResult,
  frameScaleX: number,  // scaling factor from frame to resized buffer
): { leftEdge: number; rightEdge: number; confidence: number } {
  'worklet';

  // Find max value manually (avoid Math.max(...array) which uses spread)
  let maxVal = 0;
  for (let i = 0; i < histogram.length; i++) {
    if (histogram[i] > maxVal) maxVal = histogram[i];
  }

  if (maxVal < 10) {
    return { leftEdge: -1, rightEdge: -1, confidence: 0 };
  }

  const threshold = maxVal * 0.30; // 30% of peak

  // Card exclusion zone (scaled to resized-buffer coords)
  let cardXMin = -1;
  let cardXMax = -1;
  if (cardResult.found && cardResult.corners) {
    // Find min/max X of card corners manually (avoid .map() + Math.min(...))
    cardXMin = cardResult.corners[0].x * frameScaleX;
    cardXMax = cardXMin;
    for (let i = 1; i < 4; i++) {
      const cx = cardResult.corners[i].x * frameScaleX;
      if (cx < cardXMin) cardXMin = cx;
      if (cx > cardXMax) cardXMax = cx;
    }
    cardXMin -= 5;
    cardXMax += 5;
  }

  // Scan left → right for leftEdge
  let leftEdge = -1;
  for (let x = 2; x < width - 2; x++) {
    // Skip card region
    if (cardXMin >= 0 && x >= cardXMin && x <= cardXMax) continue;
    if (histogram[x] > threshold) {
      leftEdge = x;
      break;
    }
  }

  // Scan right → left for rightEdge
  let rightEdge = -1;
  for (let x = width - 3; x >= 2; x--) {
    if (cardXMin >= 0 && x >= cardXMin && x <= cardXMax) continue;
    if (histogram[x] > threshold) {
      rightEdge = x;
      break;
    }
  }

  if (leftEdge < 0 || rightEdge < 0 || rightEdge <= leftEdge) {
    return { leftEdge: -1, rightEdge: -1, confidence: 0 };
  }

  // Confidence: based on prominence of the two edge peaks relative to the midpoint
  const trunkWidth = rightEdge - leftEdge;
  const midX       = Math.floor((leftEdge + rightEdge) / 2);
  const midVal     = histogram[midX] ?? 0;

  // Good trunk: strong edges at boundaries, weaker in middle (uniform bark)
  const leftPeak  = histogram[leftEdge] ?? 0;
  const rightPeak = histogram[rightEdge] ?? 0;
  const peakAvg   = (leftPeak + rightPeak) / 2;

  // Confidence increases with edge prominence and decreases with trunk-relative width
  let confidence = peakAvg / maxVal;

  // Penalise if trunk spans >80% of frame (probably not a single trunk)
  if (trunkWidth > width * 0.8) confidence *= 0.3;

  // Penalise if trunk is very narrow (< 10% of frame)
  if (trunkWidth < width * 0.1) confidence *= 0.5;

  let finalConf = confidence;
  if (finalConf > 1) finalConf = 1;
  if (finalConf < 0) finalConf = 0;

  return {
    leftEdge,
    rightEdge,
    confidence: finalConf,
  };
}

// ─── Main Detection Function ──────────────────────────────────────────────────

/**
 * Detects tree trunk width in pixels from a BGR pixel buffer.
 *
 * @param buffer      - Uint8Array from vision-camera-resize-plugin (BGR, uint8)
 * @param width       - Buffer frame width
 * @param height      - Buffer frame height
 * @param cardResult  - Result from card detection (used to exclude card region)
 * @param origWidth   - Original camera frame width (for coordinate scaling)
 */
export function detectTrunk(
  buffer: Uint8Array,
  width: number,
  height: number,
  cardResult: CardDetectionResult,
  origWidth: number,
): TrunkDetectionResult {
  'worklet';

  // Analyse the middle third of the frame for trunk (avoids roots and canopy)
  const rowStart = Math.floor(height / 4);
  const rowEnd   = Math.floor((3 * height) / 4);

  // Compute edge histogram on the BGR buffer
  const rawHistogram = computeEdgeColumnHistogram(buffer, width, height, rowStart, rowEnd);

  // Smooth the histogram
  const smoothed = smoothHistogram(rawHistogram, 9);

  // Scale factor: card corners are in original frame coords → scale to buffer
  const frameScaleX = width / origWidth;

  // Find trunk edges
  const { leftEdge, rightEdge, confidence } = findTrunkEdges(
    smoothed,
    width,
    cardResult,
    frameScaleX,
  );

  if (leftEdge < 0 || rightEdge < 0) {
    return EMPTY_TRUNK_RESULT;
  }

  // Scale back to original frame pixels for DBH calculation
  const scaleFactor  = origWidth / width;
  const leftEdgeOrig = Math.round(leftEdge  * scaleFactor);
  const rightEdgeOrig = Math.round(rightEdge * scaleFactor);
  const trunkWidthPx = rightEdgeOrig - leftEdgeOrig;

  return {
    found: true,
    trunkWidthPx,
    leftEdgeX: leftEdgeOrig,
    rightEdgeX: rightEdgeOrig,
    confidence,
  };
}
