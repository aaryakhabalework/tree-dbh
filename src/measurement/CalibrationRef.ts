// ─── Calibration Reference Constants ─────────────────────────────────────────
// ISO/IEC 7810 ID-1 standard: bank / credit / debit card dimensions.
// This is the ONLY physical reference used for DBH calibration.
//
// Modular design: swap these constants (or the entire module) to use a custom
// TreeO calibration card, ArUco marker, or any other known-size reference.
// ─────────────────────────────────────────────────────────────────────────────

/** Physical width of a standard ISO/IEC 7810 ID-1 card in millimetres */
export const CARD_WIDTH_MM = 85.60;

/** Physical height of a standard ISO/IEC 7810 ID-1 card in millimetres */
export const CARD_HEIGHT_MM = 53.98;

/** Exact aspect ratio (width / height) of an ID-1 card */
export const CARD_ASPECT_RATIO = CARD_WIDTH_MM / CARD_HEIGHT_MM; // ≈ 1.5858

/** Acceptable tolerance for aspect ratio matching (±15% for perspective tilt/occlusion) */
export const CARD_ASPECT_TOLERANCE = 0.15;

/** Minimum accepted aspect ratio */
export const CARD_ASPECT_MIN = CARD_ASPECT_RATIO * (1 - CARD_ASPECT_TOLERANCE);

/** Maximum accepted aspect ratio */
export const CARD_ASPECT_MAX = CARD_ASPECT_RATIO * (1 + CARD_ASPECT_TOLERANCE);

/** Maximum acceptable card tilt angle from horizontal (degrees) */
export const MAX_CARD_TILT_DEGREES = 30;

// ─── Reference object descriptor (for future swappability) ───────────────────

export interface ReferenceObject {
  name: string;
  widthMm: number;
  heightMm: number;
  aspectRatio: number;
  aspectMin: number;
  aspectMax: number;
  aspectTolerance: number;
  maxTiltDegrees: number;
}

/** The active reference object used for calibration */
export const ACTIVE_REFERENCE: ReferenceObject = {
  name: 'ISO/IEC 7810 ID-1 Credit Card',
  widthMm: CARD_WIDTH_MM,
  heightMm: CARD_HEIGHT_MM,
  aspectRatio: CARD_ASPECT_RATIO,
  aspectMin: CARD_ASPECT_MIN,
  aspectMax: CARD_ASPECT_MAX,
  aspectTolerance: CARD_ASPECT_TOLERANCE,
  maxTiltDegrees: MAX_CARD_TILT_DEGREES,
};
