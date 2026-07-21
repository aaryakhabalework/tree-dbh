// ─── Debug Panel ─────────────────────────────────────────────────────────────
// Shows raw processing metrics when debug mode is active.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme/colors';
import type { FrameProcessingResult } from '../../types';

interface DebugPanelProps {
  result: FrameProcessingResult;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

export const DebugPanel: React.FC<DebugPanelProps> = ({ result }) => {
  const { card, trunk, quality, dbh, fps, processingMs } = result;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DEBUG</Text>
      <Row label="FPS"         value={`${fps}`} />
      <Row label="Process ms"  value={`${processingMs}`} />
      <Row label="Sharpness"   value={quality.sharpness.toFixed(0)} />
      <Row label="Brightness"  value={quality.brightness.toFixed(0)} />
      <Row label="Card W px"   value={card.found  ? card.cardWidthPx.toFixed(0)   : '—'} />
      <Row label="Card H px"   value={card.found  ? card.cardHeightPx.toFixed(0)  : '—'} />
      <Row label="Card conf."  value={card.found  ? `${(card.confidence * 100).toFixed(0)}%` : '—'} />
      <Row label="Card tilt"   value={card.found  ? `${card.tiltDegrees.toFixed(1)}°` : '—'} />
      <Row label="Trunk W px"  value={trunk.found ? trunk.trunkWidthPx.toFixed(0) : '—'} />
      <Row label="Trunk L"     value={trunk.found ? trunk.leftEdgeX.toFixed(0)    : '—'} />
      <Row label="Trunk R"     value={trunk.found ? trunk.rightEdgeX.toFixed(0)   : '—'} />
      <Row label="Trunk conf." value={trunk.found ? `${(trunk.confidence * 100).toFixed(0)}%` : '—'} />
      <Row label="px/mm"       value={dbh ? dbh.pixelsPerMm.toFixed(2)    : '—'} />
      <Row label="DBH cm"      value={dbh ? dbh.diameterCm.toFixed(1)     : '—'} />
      <Row label="Issue"       value={quality.issue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.80)',
    borderRadius:    radius.md,
    padding:         spacing.sm,
    marginHorizontal:spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  title: {
    color:          colors.primaryLight,
    fontSize:       fontSizes.xs,
    fontWeight:     fontWeights.black,
    letterSpacing:  2,
    marginBottom:   spacing.xs,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingVertical:2,
  },
  label: {
    color:      colors.textMuted,
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.medium,
    fontFamily: 'monospace',
  },
  value: {
    color:      colors.primaryLight,
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.bold,
    fontFamily: 'monospace',
  },
});
