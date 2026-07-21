// ─── Card Detection Pipeline ──────────────────────────────────────────────────
// Detects a standard ISO/IEC 7810 ID-1 credit/bank card from a pixel buffer.
//
// Pipeline:
//   BGR buffer → grayscale → GaussianBlur → Canny → dilate → findContours
//   → approxPolyDP (4-vertex filter) → aspect ratio validation
//   → corner ordering → card width in pixels
//
// All code here is worklet-safe (runs on the VisionCamera frame thread).
// ─────────────────────────────────────────────────────────────────────────────

import {
  bufferToMat,
  bgrToGray,
  gaussianBlur,
  canny,
  dilate,
  findContours,
  approxPolyDP,
  clearBuffers,
} from '../OpenCVBridge';

import {
  CARD_ASPECT_MIN,
  CARD_ASPECT_MAX,
  CARD_ASPECT_RATIO,
  CARD_ASPECT_TOLERANCE,
  MAX_CARD_TILT_DEGREES,
} from '../../measurement/CalibrationRef';

import type { CardDetectionResult, Quadrilateral, Point2D } from '../../types';
import { EMPTY_CARD_RESULT } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Contour area using the shoelace formula (worklet-safe) */
function contourArea(pts: Array<{ x: number; y: number }>): number {
  'worklet';
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Sorts 4 corners into TL, TR, BR, BL order using sum and difference of coordinates.
 * Uses manual min/max finding instead of .sort() to avoid non-worklet lambda issues.
 */
function orderCorners(pts: Array<{ x: number; y: number }>): Quadrilateral {
  'worklet';
  if (pts.length !== 4) {
    return [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
  }

  // Compute sums and diffs
  const sums = [
    pts[0].x + pts[0].y,
    pts[1].x + pts[1].y,
    pts[2].x + pts[2].y,
    pts[3].x + pts[3].y,
  ];
  const diffs = [
    pts[0].x - pts[0].y,
    pts[1].x - pts[1].y,
    pts[2].x - pts[2].y,
    pts[3].x - pts[3].y,
  ];

  // Find min/max sum indices manually
  let minSumIdx = 0;
  let maxSumIdx = 0;
  let minDiffIdx = 0;
  let maxDiffIdx = 0;

  for (let i = 1; i < 4; i++) {
    if (sums[i] < sums[minSumIdx]) minSumIdx = i;
    if (sums[i] > sums[maxSumIdx]) maxSumIdx = i;
    if (diffs[i] < diffs[minDiffIdx]) minDiffIdx = i;
    if (diffs[i] > diffs[maxDiffIdx]) maxDiffIdx = i;
  }

  // TL has min sum, BR has max sum
  const tl = pts[minSumIdx];
  const br = pts[maxSumIdx];
  // BL has min diff (y−x is largest → x−y is smallest), TR has max diff
  const bl = pts[minDiffIdx];
  const tr = pts[maxDiffIdx];

  return [tl, tr, br, bl];
}

/**
 * Computes the Euclidean distance between two points.
 */
function dist(a: Point2D, b: Point2D): number {
  'worklet';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes tilt angle of an ordered quadrilateral from horizontal.
 * Returns degrees (0 = perfectly horizontal).
 */
function quadTiltDegrees(corners: Quadrilateral): number {
  'worklet';
  // Use the top edge (TL → TR)
  const tl = corners[0];
  const tr = corners[1];
  const dx = tr.x - tl.x;
  const dy = tr.y - tl.y;
  return Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
}

/**
 * Computes horizontal width of a quad (distance from left midpoint to right midpoint).
 * More robust than just TL→TR distance for perspective-skewed cards.
 */
function quadWidth(corners: Quadrilateral): number {
  'worklet';
  const tl = corners[0];
  const tr = corners[1];
  const br = corners[2];
  const bl = corners[3];
  // Top edge
  const topW = dist(tl, tr);
  // Bottom edge
  const botW = dist(bl, br);
  return (topW + botW) / 2;
}

/**
 * Computes vertical height of a quad.
 */
function quadHeight(corners: Quadrilateral): number {
  'worklet';
  const tl = corners[0];
  const tr = corners[1];
  const br = corners[2];
  const bl = corners[3];
  const leftH  = dist(tl, bl);
  const rightH = dist(tr, br);
  return (leftH + rightH) / 2;
}

/**
 * Checks that all 4 corners are inside the frame with a margin.
 */
function allCornersInside(
  corners: Quadrilateral,
  frameW: number,
  frameH: number,
  margin: number = 5,
): boolean {
  'worklet';
  for (let i = 0; i < 4; i++) {
    const cx = corners[i].x;
    const cy = corners[i].y;
    if (cx < margin || cx > frameW - margin || cy < margin || cy > frameH - margin) {
      return false;
    }
  }
  return true;
}

// ─── Main Detection Function ──────────────────────────────────────────────────

/**
 * Detects a credit card in a BGR pixel buffer.
 *
 * @param buffer  - Uint8Array from vision-camera-resize-plugin (BGR, uint8)
 * @param width   - Buffer frame width
 * @param height  - Buffer frame height
 */
export function detectCard(
  buffer: Uint8Array,
  width: number,
  height: number,
  debug: boolean = false,
): CardDetectionResult {
  'worklet';

  const frameArea = width * height;

  // ─── Step 1: Convert buffer to Grayscale OpenCV Mat directly ──────────────
  const grayMat = bufferToMat(buffer, height, width, 1);
  const blurredMat = gaussianBlur(grayMat, 5);

  // ─── Step 3: Canny edge detection ─────────────────────────────────────────
  const edgesMat  = canny(blurredMat, 30, 120);

  // ─── Step 4: Dilate to close edge gaps ────────────────────────────────────
  const dilatedMat = dilate(edgesMat, 1);

  // ─── Step 5: Find contours ────────────────────────────────────────────────
  const { contours } = findContours(dilatedMat);

  // ─── Step 6: Filter and score quadrilaterals ──────────────────────────────
  let bestScore = 999;
  let bestCorners: Quadrilateral | null = null;
  let bestW = 0;
  let bestH = 0;

  if (debug && contours.length > 0) {
    console.log(`[CardDetect] Found ${contours.length} contours to inspect.`);
  }

  for (let ci = 0; ci < contours.length; ci++) {
    const contour = contours[ci];
    const area = contourArea(contour);

    // Reject tiny or full-frame contours (0.5% minimum area to support normal measurement distances)
    if (area < frameArea * 0.005 || area > frameArea * 0.95) {
      if (debug) {
        console.log(`[CardDetect] Reject contour ${ci}: area ${area.toFixed(0)} out of bounds (${(frameArea * 0.005).toFixed(0)} - ${(frameArea * 0.95).toFixed(0)})`);
      }
      continue;
    }

    // Approximate polygon with dynamic simplification to smooth out bumps (like a thumb)
    let poly = approxPolyDP(contour, 0.02, true);
    if (poly.length !== 4) {
      for (let eps = 0.03; eps <= 0.06; eps += 0.01) {
        const testPoly = approxPolyDP(contour, eps, true);
        if (testPoly.length === 4) {
          poly = testPoly;
          break;
        }
      }
    }

    // Must be exactly 4 vertices
    if (poly.length !== 4) {
      if (debug) {
        console.log(`[CardDetect] Reject contour ${ci}: area ${area.toFixed(0)}, poly vertices count ${poly.length} != 4`);
      }
      continue;
    }

    // Order corners
    const ordered = orderCorners(poly);

    // Measure width and height
    const w = quadWidth(ordered);
    const h = quadHeight(ordered);
    if (w <= 0 || h <= 0) continue;

    // Compute aspect ratio
    const longSide = w > h ? w : h;
    const shortSide = w > h ? h : w;
    const aspect = longSide / shortSide;

    // Score: how close to credit card ratio
    const score = Math.abs(aspect - CARD_ASPECT_RATIO);

    if (debug) {
      console.log(`[CardDetect] Contour ${ci}: area ${area.toFixed(0)}, aspect ${aspect.toFixed(4)} (min: ${CARD_ASPECT_MIN.toFixed(4)}, max: ${CARD_ASPECT_MAX.toFixed(4)}), score: ${score.toFixed(4)}`);
    }

    if (aspect >= CARD_ASPECT_MIN && aspect <= CARD_ASPECT_MAX && score < bestScore) {
      bestScore = score;
      bestCorners = ordered;
      bestW = w;
      bestH = h;
    }
  }

  // No valid candidate found
  if (bestCorners === null) {
    clearBuffers();
    return EMPTY_CARD_RESULT;
  }

  // ─── Step 7: Validate corner visibility ───────────────────────────────────
  if (!allCornersInside(bestCorners, width, height, 5)) {
    clearBuffers();
    return EMPTY_CARD_RESULT;
  }

  // ─── Step 8: Check tilt ───────────────────────────────────────────────────
  const tiltDegrees = quadTiltDegrees(bestCorners);
  if (tiltDegrees > MAX_CARD_TILT_DEGREES) {
    clearBuffers();
    return EMPTY_CARD_RESULT;
  }

  // ─── Step 9: Confidence ───────────────────────────────────────────────────
  // Confidence = 1 − (normalized aspect score)
  const confidence = Math.max(
    0,
    1 - bestScore / CARD_ASPECT_TOLERANCE,
  );

  // Use the larger dimension as width (card can be held either way)
  const cardWidthPx  = bestW > bestH ? bestW : bestH;
  const cardHeightPx = bestW > bestH ? bestH : bestW;

  clearBuffers();

  return {
    found: true,
    cardWidthPx,
    cardHeightPx,
    corners: bestCorners,
    confidence,
    tiltDegrees,
  };
}
