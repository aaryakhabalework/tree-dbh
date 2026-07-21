// ─── DBH Calculator ───────────────────────────────────────────────────────────
// Pure, side-effect-free function that converts pixel measurements to real-world
// diameter. All inputs come from the CV pipeline; this module never generates
// mock values.
// ─────────────────────────────────────────────────────────────────────────────

import { CARD_WIDTH_MM, CARD_HEIGHT_MM } from './CalibrationRef';
import type { CardDetectionResult, TrunkDetectionResult, DBHResult } from '../types';

/**
 * Computes DBH from raw pixel measurements.
 *
 * Formula:
 *   pixels_per_mm = card_width_px / CARD_WIDTH_MM
 *   diameter_mm   = trunk_width_px / pixels_per_mm
 *   diameter_cm   = diameter_mm / 10
 *
 * Cross-validated using card HEIGHT as well; the two estimates are averaged
 * for improved robustness against minor detection jitter.
 *
 * @param card  - Result from card detection pipeline
 * @param trunk - Result from trunk detection pipeline
 * @param processingTimeMs - Total time the frame processor took
 * @returns DBHResult or null if inputs are invalid
 */
export function calculateDBH(
  card: CardDetectionResult,
  trunk: TrunkDetectionResult,
  processingTimeMs: number,
): DBHResult | null {
  if (!card.found || !trunk.found) return null;
  if (card.cardWidthPx <= 0 || trunk.trunkWidthPx <= 0) return null;

  // Primary calibration: card WIDTH
  const ppmFromWidth = card.cardWidthPx / CARD_WIDTH_MM;

  // Cross-validation: card HEIGHT (if detected)
  const ppmFromHeight =
    card.cardHeightPx > 0 ? card.cardHeightPx / CARD_HEIGHT_MM : ppmFromWidth;

  // Weighted average (width is typically more reliably measured)
  const pixelsPerMm = (ppmFromWidth * 0.7 + ppmFromHeight * 0.3);

  const diameterMm = trunk.trunkWidthPx / pixelsPerMm;
  const diameterCm = diameterMm / 10;

  // Composite confidence: geometric mean of card + trunk confidence
  const confidence = Math.sqrt(card.confidence * trunk.confidence);

  return {
    diameterCm: Math.round(diameterCm * 10) / 10, // 1 decimal place
    pixelsPerMm: Math.round(pixelsPerMm * 100) / 100,
    cardWidthPx: Math.round(card.cardWidthPx),
    trunkWidthPx: Math.round(trunk.trunkWidthPx),
    processingTimeMs: Math.round(processingTimeMs),
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Formats a DBH value for display.
 * Returns e.g. "42.8 cm"
 */
export function formatDBH(diameterCm: number): string {
  return `${diameterCm.toFixed(1)} cm`;
}
