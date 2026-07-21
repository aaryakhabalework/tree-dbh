// ─── Detection Overlay ────────────────────────────────────────────────────────
// Skia canvas that draws card corners and trunk edge lines over the camera feed.
// Renders in a transparent View positioned absolutely over the Camera component.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Line,
  Rect,
  RoundedRect,
  Paint,
  vec,
  Skia,
} from '@shopify/react-native-skia';

import { colors } from '../theme/colors';
import type { CardDetectionResult, TrunkDetectionResult, Point2D } from '../../types';

interface DetectionOverlayProps {
  card:        CardDetectionResult;
  trunk:       TrunkDetectionResult;
  frameWidth:  number;
  frameHeight: number;
  viewWidth:   number;
  viewHeight:  number;
}

/**
 * Scales a coordinate from frame space to view space.
 */
function scalePoint(
  p: Point2D,
  frameW: number,
  frameH: number,
  viewW:  number,
  viewH:  number,
): { x: number; y: number } {
  return {
    x: (p.x / frameW) * viewW,
    y: (p.y / frameH) * viewH,
  };
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  card,
  trunk,
  frameWidth,
  frameHeight,
  viewWidth,
  viewHeight,
}) => {
  const scale = (p: Point2D) =>
    scalePoint(p, frameWidth, frameHeight, viewWidth, viewHeight);

  // ── Card outline ──────────────────────────────────────────────────────────
  const cardPath = React.useMemo(() => {
    if (!card.found || !card.corners) return null;
    const path = Skia.Path.Make();
    const [tl, tr, br, bl] = card.corners.map(scale);
    path.moveTo(tl.x, tl.y);
    path.lineTo(tr.x, tr.y);
    path.lineTo(br.x, br.y);
    path.lineTo(bl.x, bl.y);
    path.close();
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.found, card.corners, viewWidth, viewHeight]);

  // ── Corner brackets ───────────────────────────────────────────────────────
  const cornerBrackets = React.useMemo(() => {
    if (!card.found || !card.corners) return [];
    const bracketLen = 20;
    return card.corners.map(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.found, card.corners, viewWidth, viewHeight]);

  // ── Trunk edges ───────────────────────────────────────────────────────────
  const trunkLeft  = trunk.found
    ? (trunk.leftEdgeX  / frameWidth)  * viewWidth
    : -1;
  const trunkRight = trunk.found
    ? (trunk.rightEdgeX / frameWidth) * viewWidth
    : -1;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Card outline */}
      {card.found && cardPath && (
        <>
          {/* Filled glow */}
          <Path
            path={cardPath}
            color={`${colors.cardOverlay}22`}
            style="fill"
          />
          {/* Stroke */}
          <Path
            path={cardPath}
            color={colors.cardOverlay}
            style="stroke"
            strokeWidth={2.5}
          />
        </>
      )}

      {/* Corner dots */}
      {card.found &&
        cornerBrackets.map((pt, idx) => (
          <React.Fragment key={idx}>
            <Rect
              x={pt.x - 5}
              y={pt.y - 5}
              width={10}
              height={10}
              color={colors.cardOverlay}
            />
          </React.Fragment>
        ))}

      {/* Trunk left edge */}
      {trunk.found && trunkLeft >= 0 && (
        <Line
          p1={vec(trunkLeft, 0)}
          p2={vec(trunkLeft, viewHeight)}
          color={colors.trunkLeft}
          strokeWidth={2.5}
        />
      )}

      {/* Trunk right edge */}
      {trunk.found && trunkRight >= 0 && (
        <Line
          p1={vec(trunkRight, 0)}
          p2={vec(trunkRight, viewHeight)}
          color={colors.trunkRight}
          strokeWidth={2.5}
        />
      )}

      {/* Trunk fill band */}
      {trunk.found && trunkLeft >= 0 && trunkRight >= 0 && (
        <Rect
          x={trunkLeft}
          y={0}
          width={trunkRight - trunkLeft}
          height={viewHeight}
          color={colors.trunkFill}
        />
      )}
    </Canvas>
  );
};
