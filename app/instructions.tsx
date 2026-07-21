// ─── Instructions Screen ─────────────────────────────────────────────────────
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, fontSizes, fontWeights } from '../src/ui/theme/colors';

const STEPS = [
  {
    icon: '👔',
    title: 'Choose tree height',
    body: 'Stand at the tree. Breast height is approximately 1.3 m from the ground.',
  },
  {
    icon: '💳',
    title: 'Place calibration card',
    body: 'Hold or tape a standard bank/credit card flat against the trunk at breast height. The card must be parallel to the camera.',
  },
  {
    icon: '📐',
    title: 'Stand back',
    body: 'Stand 1–2 metres away. Keep the full trunk width and the entire card visible in frame.',
  },
  {
    icon: '📱',
    title: 'Hold phone level',
    body: 'Hold your phone horizontally (landscape not required). The camera should be at the same height as the card. Watch the bubble-level indicator.',
  },
  {
    icon: '✅',
    title: 'Wait for detection',
    body: 'Green badges appear when both the card and trunk are detected. The Measure button then becomes active.',
  },
  {
    icon: '📊',
    title: 'Review results',
    body: 'The app displays DBH in centimetres with calibration details. No internet required.',
  },
];

export default function InstructionsScreen() {
  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instructions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>🌳</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Credit card calibration</Text>
            <Text style={styles.bannerSub}>
              Place a standard bank card (85.60 × 53.98 mm) against the trunk.
              The app uses its known dimensions to compute real-world diameter.
            </Text>
          </View>
        </View>

        {/* Steps */}
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepLeft}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeNum}>{i + 1}</Text>
              </View>
              {i < STEPS.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <View style={styles.stepTextBlock}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.body}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Warning note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>⚠️</Text>
          <Text style={styles.noteText}>
            For accurate measurements, the card and camera must be at the same
            perpendicular distance from the trunk. Do not tilt the card more than 15°.
          </Text>
        </View>

        {/* Proceed button */}
        <TouchableOpacity
          style={styles.proceedBtn}
          onPress={() => router.push('/camera')}
          activeOpacity={0.85}
        >
          <Text style={styles.proceedBtnText}>Open Camera →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal:spacing.lg,
    paddingVertical:  spacing.md,
    borderBottomWidth:1,
    borderBottomColor:colors.border,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.bgCard,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.border,
  },
  backArrow: {
    color:    colors.textPrimary,
    fontSize: fontSizes.lg,
  },
  headerTitle: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.lg,
    fontWeight: fontWeights.bold,
  },

  content: {
    flexGrow:          1,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.lg,
    gap:               spacing.md,
  },

  // ── Banner ───────────────────────────────────────────────────────────────────
  banner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.md,
    backgroundColor: `${colors.primary}15`,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     `${colors.primary}44`,
  },
  bannerIcon: {
    fontSize: 32,
  },
  bannerText: {
    flex: 1,
    gap:  spacing.xs,
  },
  bannerTitle: {
    color:      colors.primary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  bannerSub: {
    color:    colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight:20,
  },

  // ── Steps ────────────────────────────────────────────────────────────────────
  stepCard: {
    flexDirection: 'row',
    gap:           spacing.md,
  },
  stepLeft: {
    alignItems: 'center',
    width:       32,
  },
  stepBadge: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  stepBadgeNum: {
    color:      colors.textOnPrimary,
    fontSize:   fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  stepLine: {
    width:           2,
    flex:            1,
    backgroundColor: colors.border,
    marginTop:       spacing.xs,
    marginBottom:    spacing.xs,
    minHeight:       24,
  },
  stepBody: {
    flex:          1,
    flexDirection: 'row',
    gap:           spacing.sm,
    paddingBottom: spacing.md,
  },
  stepIcon: {
    fontSize: 22,
    width:    28,
  },
  stepTextBlock: {
    flex: 1,
    gap:  spacing.xs,
  },
  stepTitle: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  stepDesc: {
    color:    colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight:20,
  },

  // ── Note ─────────────────────────────────────────────────────────────────────
  noteCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.sm,
    backgroundColor: `${colors.warning}15`,
    borderRadius:    radius.md,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     `${colors.warning}44`,
  },
  noteIcon: {
    fontSize: 18,
  },
  noteText: {
    flex:     1,
    color:    colors.warning,
    fontSize: fontSizes.sm,
    lineHeight:20,
  },

  // ── Proceed Button ────────────────────────────────────────────────────────────
  proceedBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.xl,
    paddingVertical: spacing.lg,
    alignItems:      'center',
    shadowColor:     colors.primary,
    shadowOpacity:   0.4,
    shadowRadius:    16,
    elevation:       8,
    marginTop:       spacing.md,
  },
  proceedBtnText: {
    color:         colors.textOnPrimary,
    fontSize:      fontSizes.lg,
    fontWeight:    fontWeights.bold,
    letterSpacing: 0.5,
  },
});
