// ─── Shared TypeScript Types ─────────────────────────────────────────────────
// All measurement-related types used across the application.
// ─────────────────────────────────────────────────────────────────────────────

/** A 2-D point in pixel space */
export interface Point2D {
  x: number;
  y: number;
}

/** The four corners of a detected rectangle, in TL→TR→BR→BL order */
export type Quadrilateral = [Point2D, Point2D, Point2D, Point2D];

// ─── Card Detection ───────────────────────────────────────────────────────────

export interface CardDetectionResult {
  found: boolean;
  /** Width of card measured in source frame pixels */
  cardWidthPx: number;
  /** Height of card measured in source frame pixels */
  cardHeightPx: number;
  /** Ordered corners: TL, TR, BR, BL */
  corners: Quadrilateral;
  /** 0–1 confidence score */
  confidence: number;
  /** Tilt from horizontal in degrees */
  tiltDegrees: number;
}

export const EMPTY_CARD_RESULT: CardDetectionResult = {
  found: false,
  cardWidthPx: 0,
  cardHeightPx: 0,
  corners: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  confidence: 0,
  tiltDegrees: 0,
};

// ─── Trunk Detection ──────────────────────────────────────────────────────────

export interface TrunkDetectionResult {
  found: boolean;
  /** Width of detected trunk in source frame pixels */
  trunkWidthPx: number;
  /** X coordinate of left trunk edge (in resized frame) */
  leftEdgeX: number;
  /** X coordinate of right trunk edge (in resized frame) */
  rightEdgeX: number;
  /** 0–1 confidence score */
  confidence: number;
}

export const EMPTY_TRUNK_RESULT: TrunkDetectionResult = {
  found: false,
  trunkWidthPx: 0,
  leftEdgeX: 0,
  rightEdgeX: 0,
  confidence: 0,
};

// ─── Quality Checks ───────────────────────────────────────────────────────────

export type QualityIssue =
  | 'BLUR'
  | 'TOO_DARK'
  | 'TOO_BRIGHT'
  | 'LOW_CONTRAST'
  | 'CARD_TILT'
  | 'CARD_PARTIAL'
  | 'NO_CARD'
  | 'NO_TRUNK'
  | 'MULTIPLE_TRUNKS'
  | 'OK';

export interface QualityReport {
  ok: boolean;
  issue: QualityIssue;
  /** Human-readable guidance message */
  guidance: string;
  /** Laplacian variance (sharpness metric) */
  sharpness: number;
  /** Mean image brightness 0–255 */
  brightness: number;
}

// ─── DBH Measurement ─────────────────────────────────────────────────────────

export interface DBHResult {
  /** Diameter at breast height in centimetres */
  diameterCm: number;
  /** Derived calibration: pixels per millimetre */
  pixelsPerMm: number;
  cardWidthPx: number;
  trunkWidthPx: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Composite confidence 0–1 */
  confidence: number;
}

// ─── Frame Processing ─────────────────────────────────────────────────────────

/** Everything the frame processor returns on each processed frame */
export interface FrameProcessingResult {
  card: CardDetectionResult;
  trunk: TrunkDetectionResult;
  quality: QualityReport;
  dbh: DBHResult | null;
  /** Width of the resized processing frame */
  frameWidth: number;
  /** Height of the resized processing frame */
  frameHeight: number;
  /** FPS counter */
  fps: number;
  processingMs: number;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type DetectionStatus = 'idle' | 'searching' | 'partial' | 'ready' | 'captured';

export interface CameraScreenState {
  detectionStatus: DetectionStatus;
  lastResult: FrameProcessingResult | null;
  capturedImageUri: string | null;
  debugMode: boolean;
}

// ─── Navigation Params ────────────────────────────────────────────────────────

export interface ResultsScreenParams {
  dbhCm: number;
  confidence: number;
  pixelsPerMm: number;
  cardWidthPx: number;
  trunkWidthPx: number;
  processingTimeMs: number;
  imageUri?: string;
}
