// ─── Quality Checks ───────────────────────────────────────────────────────────
// All quality validation runs on the worklet thread.
// Returns a QualityReport with a single most-important issue and guidance text.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  QualityReport,
  QualityIssue,
  CardDetectionResult,
  TrunkDetectionResult,
} from '../../types';

// ─── Thresholds (from OpenCV algorithm research) ──────────────────────────────

const BLUR_REJECT    = 60;   // Laplacian variance below this → motion blur
const BLUR_WARN      = 100;  // Below this → slightly blurry (warn but allow)
const DARK_THRESHOLD = 50;   // Mean brightness below this → too dark
const BRIGHT_THRESHOLD = 220;// Mean brightness above this → overexposed
const CONTRAST_MIN   = 15;   // StdDev of brightness below this → flat/foggy

// ─── Brightness / Contrast ────────────────────────────────────────────────────

/**
 * Computes mean brightness and contrast (stddev) from a grayscale Uint8Array.
 */
function computeBrightnessStats(
  buffer: Uint8Array,
  width: number,
  height: number,
): { mean: number; stddev: number } {
  'worklet';

  const total = width * height;
  if (total === 0) return { mean: 128, stddev: 30 };

  let sum  = 0;
  let sum2 = 0;

  // Sample every 4th pixel for performance
  const step = 4; // 1 channel
  let count = 0;

  for (let i = 0; i < buffer.length; i += step) {
    const gray = buffer[i];
    sum  += gray;
    sum2 += gray * gray;
    count++;
  }

  if (count === 0) return { mean: 128, stddev: 30 };

  const mean   = sum / count;
  const stddev = Math.sqrt(Math.max(0, sum2 / count - mean * mean));
  return { mean, stddev };
}

// ─── Sharpness (Laplacian variance, pure JS) ──────────────────────────────────

/**
 * Computes a Laplacian-like sharpness score on the grayscale representation.
 * Uses a 3×3 Laplacian kernel: [0,-1,0; -1,4,-1; 0,-1,0]
 * Returns variance of the Laplacian output (higher = sharper).
 */
function computeSharpness(
  buffer: Uint8Array,
  width: number,
  height: number,
): number {
  'worklet';

  let sum  = 0;
  let sum2 = 0;
  let n    = 0;

  const stride = width; // 1 channel

  // Sample every 3rd row and column for speed
  for (let y = 1; y < height - 1; y += 3) {
    for (let x = 1; x < width - 1; x += 3) {
      const cIdx = y * stride + x;
      const c = buffer[cIdx];

      const tIdx = (y - 1) * stride + x;
      const t = buffer[tIdx];

      const bIdx = (y + 1) * stride + x;
      const b2 = buffer[bIdx];

      const lIdx = y * stride + (x - 1);
      const l = buffer[lIdx];

      const rIdx = y * stride + (x + 1);
      const r2 = buffer[rIdx];

      const lap = 4 * c - t - b2 - l - r2;
      sum  += lap;
      sum2 += lap * lap;
      n++;
    }
  }

  if (n === 0) return 0;
  const mean = sum / n;
  return sum2 / n - mean * mean; // variance
}

// ─── Main Quality Check ───────────────────────────────────────────────────────

/**
 * Runs all quality checks and returns the highest-priority issue.
 *
 * Priority order:
 *   1. Blur (camera must be steady)
 *   2. Lighting
 *   3. Card not found / partial
 *   4. Card tilt
 *   5. Trunk not found
 *   6. OK
 */
export function runQualityChecks(
  buffer: Uint8Array,
  width: number,
  height: number,
  card: CardDetectionResult,
  trunk: TrunkDetectionResult,
): QualityReport {
  'worklet';

  // ─── Sharpness / blur ────────────────────────────────────────────────────
  const sharpness = computeSharpness(buffer, width, height);
  if (sharpness < BLUR_REJECT) {
    return {
      ok: false,
      issue: 'BLUR',
      guidance: 'Hold the camera still',
      sharpness,
      brightness: 128,
    };
  }

  // ─── Brightness / contrast ───────────────────────────────────────────────
  const { mean: brightness, stddev: contrast } = computeBrightnessStats(buffer, width, height);

  if (brightness < DARK_THRESHOLD) {
    return {
      ok: false,
      issue: 'TOO_DARK',
      guidance: 'Move to a brighter area or use the torch',
      sharpness,
      brightness,
    };
  }

  if (brightness > BRIGHT_THRESHOLD) {
    return {
      ok: false,
      issue: 'TOO_BRIGHT',
      guidance: 'Avoid direct sunlight on the card',
      sharpness,
      brightness,
    };
  }

  if (contrast < CONTRAST_MIN) {
    return {
      ok: false,
      issue: 'LOW_CONTRAST',
      guidance: 'Improve scene lighting — too flat',
      sharpness,
      brightness,
    };
  }

  // ─── Card checks ─────────────────────────────────────────────────────────
  if (!card.found) {
    return {
      ok: false,
      issue: 'NO_CARD',
      guidance: 'Point camera at card placed against tree trunk',
      sharpness,
      brightness,
    };
  }

  if (card.tiltDegrees > 15) {
    return {
      ok: false,
      issue: 'CARD_TILT',
      guidance: `Hold card more level (${Math.round(card.tiltDegrees)}° tilt detected)`,
      sharpness,
      brightness,
    };
  }

  if (card.confidence < 0.4) {
    return {
      ok: false,
      issue: 'CARD_PARTIAL',
      guidance: 'Keep the entire card visible in frame',
      sharpness,
      brightness,
    };
  }

  // ─── Trunk checks ────────────────────────────────────────────────────────
  if (!trunk.found) {
    return {
      ok: false,
      issue: 'NO_TRUNK',
      guidance: 'Centre the tree trunk in the frame',
      sharpness,
      brightness,
    };
  }

  if (trunk.confidence < 0.35) {
    return {
      ok: false,
      issue: 'NO_TRUNK',
      guidance: 'Move closer so the trunk fills more of the frame',
      sharpness,
      brightness,
    };
  }

  return {
    ok: true,
    issue: 'OK',
    guidance: 'Hold steady — measuring…',
    sharpness,
    brightness,
  };
}

/** Maps a QualityIssue to an emoji for the HUD */
export function qualityEmoji(issue: QualityIssue): string {
  'worklet';
  switch (issue) {
    case 'BLUR':          return '🤚';
    case 'TOO_DARK':      return '🌑';
    case 'TOO_BRIGHT':    return '☀️';
    case 'LOW_CONTRAST':  return '🌫️';
    case 'CARD_TILT':     return '↗️';
    case 'CARD_PARTIAL':  return '✂️';
    case 'NO_CARD':       return '💳';
    case 'NO_TRUNK':      return '🌳';
    case 'MULTIPLE_TRUNKS': return '🌲🌲';
    case 'OK':            return '✅';
    default:              return '❓';
  }
}
