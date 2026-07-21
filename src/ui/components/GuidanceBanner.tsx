// ─── Guidance Banner ─────────────────────────────────────────────────────────
// Displays contextual guidance text based on the current quality report.
// Animates in/out as the guidance message changes.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme/colors';
import type { QualityReport } from '../../types';
import { qualityEmoji } from '../../opencv/quality/qualityChecks';

interface GuidanceBannerProps {
  quality: QualityReport;
}

export const GuidanceBanner: React.FC<GuidanceBannerProps> = ({ quality }) => {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const prevText  = useRef('');

  // Animate whenever guidance text changes
  useEffect(() => {
    if (prevText.current === quality.guidance) return;
    prevText.current = quality.guidance;

    // Fade + slide up
    opacity.setValue(0);
    translateY.setValue(8);

    Animated.parallel([
      Animated.spring(opacity,    { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }),
    ]).start();
  }, [quality.guidance, opacity, translateY]);

  const bgColor = quality.ok
    ? `${colors.success}22`
    : `${colors.error}22`;

  const borderColor = quality.ok ? colors.success : colors.error;
  const textColor   = quality.ok ? colors.success : colors.error;

  const emoji = qualityEmoji(quality.issue);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor, opacity,
          transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.text, { color: textColor }]}>
        {quality.guidance}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.sm,
    borderRadius:     radius.md,
    borderWidth:      1,
    paddingVertical:  spacing.sm,
    paddingHorizontal:spacing.md,
    marginHorizontal: spacing.md,
  },
  emoji: {
    fontSize: fontSizes.lg,
  },
  text: {
    fontSize:   fontSizes.sm,
    fontWeight: fontWeights.semibold,
    flex:       1,
    flexWrap:   'wrap',
  },
});
