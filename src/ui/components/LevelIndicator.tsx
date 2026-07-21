// ─── Level Indicator ─────────────────────────────────────────────────────────
// Shows a virtual bubble level using the device accelerometer.
// Warns the user when the phone is tilted more than ±10° from level.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme/colors';

const LEVEL_THRESHOLD_DEG = 10; // Within this → green "Level"
const BUBBLE_RANGE_PX     = 28; // Max bubble travel in pixels

interface LevelIndicatorProps {
  style?: object;
}

export const LevelIndicator: React.FC<LevelIndicatorProps> = ({ style }) => {
  const bubbleX = useRef(new Animated.Value(0)).current;
  const bubbleY = useRef(new Animated.Value(0)).current;
  const [isLevel, setIsLevel] = useState(true);
  const [tiltDeg, setTiltDeg] = useState(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      // x: tilt left/right (-1 = left, +1 = right)
      // y: tilt forward/back (-1 = forward, +1 = back)
      const tiltX = Math.max(-1, Math.min(1, x));
      const tiltY = Math.max(-1, Math.min(1, y));

      // Convert to angle
      const angleDeg = Math.sqrt(
        Math.pow(tiltX * 90, 2) + Math.pow(tiltY * 90, 2),
      );

      setTiltDeg(Math.round(angleDeg));
      setIsLevel(angleDeg < LEVEL_THRESHOLD_DEG);

      Animated.spring(bubbleX, {
        toValue:         tiltX  * BUBBLE_RANGE_PX,
        useNativeDriver: true,
        tension:         80,
        friction:        8,
      }).start();

      Animated.spring(bubbleY, {
        toValue:         -tiltY * BUBBLE_RANGE_PX,
        useNativeDriver: true,
        tension:         80,
        friction:        8,
      }).start();
    });

    return () => sub.remove();
  }, [bubbleX, bubbleY]);

  return (
    <View style={[styles.container, style]}>
      {/* Outer ring */}
      <View style={[styles.ring, isLevel && styles.ringLevel]}>
        {/* Cross-hair */}
        <View style={styles.crossH} />
        <View style={styles.crossV} />

        {/* Bubble */}
        <Animated.View
          style={[
            styles.bubble,
            isLevel && styles.bubbleLevel,
            { transform: [{ translateX: bubbleX }, { translateY: bubbleY }] },
          ]}
        />
      </View>

      {/* Label */}
      <Text style={[styles.label, isLevel ? styles.labelOk : styles.labelWarn]}>
        {isLevel ? 'Level' : `${tiltDeg}°`}
      </Text>
    </View>
  );
};

const RING_SIZE   = 56;
const BUBBLE_SIZE = 18;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap:        spacing.xs,
  },
  ring: {
    width:           RING_SIZE,
    height:          RING_SIZE,
    borderRadius:    RING_SIZE / 2,
    borderWidth:     2,
    borderColor:     colors.neutral,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.bgOverlay,
    overflow:        'hidden',
  },
  ringLevel: {
    borderColor: colors.success,
  },
  crossH: {
    position:        'absolute',
    width:           '100%',
    height:          1,
    backgroundColor: `${colors.neutral}44`,
  },
  crossV: {
    position:        'absolute',
    width:           1,
    height:          '100%',
    backgroundColor: `${colors.neutral}44`,
  },
  bubble: {
    width:           BUBBLE_SIZE,
    height:          BUBBLE_SIZE,
    borderRadius:    BUBBLE_SIZE / 2,
    backgroundColor: colors.warning,
  },
  bubbleLevel: {
    backgroundColor: colors.success,
  },
  label: {
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  labelOk: {
    color: colors.success,
  },
  labelWarn: {
    color: colors.warning,
  },
});
