// ─── Home Screen ──────────────────────────────────────────────────────────────
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, fontSizes, fontWeights } from '../src/ui/theme/colors';
import { useResultStore } from '../src/storage/ResultStore';

export default function HomeScreen() {
  const { debugMode, toggleDebug, lastDBH } = useResultStore();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo area */}
        <View style={styles.heroArea}>
          <View style={styles.logoRing}>
            <Text style={styles.logoIcon}>🌲</Text>
          </View>
          <Text style={styles.appName}>TreeDBH</Text>
          <Text style={styles.appTagline}>Diameter at Breast Height Measurement</Text>
        </View>

        {/* Feature cards */}
        <View style={styles.featuresRow}>
          {[
            { icon: '💳', label: 'Card\nCalibration' },
            { icon: '📸', label: 'Vision\nCamera' },
            { icon: '📏', label: 'Real DBH\nMeasurement' },
          ].map(({ icon, label }) => (
            <View key={label} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* How-it-works brief */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoSteps}>
            {[
              'Place your bank card against the tree trunk at chest height',
              'Open the camera and frame both card and trunk',
              'The app detects the card and uses it to calibrate scale',
              'It then measures the trunk width and calculates DBH',
            ].map((step, i) => (
              <View key={i} style={styles.infoStep}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Last measurement badge */}
        {lastDBH && (
          <Pressable
            style={styles.lastResult}
            onPress={() => router.push('/results')}
          >
            <Text style={styles.lastResultLabel}>Last Measurement</Text>
            <Text style={styles.lastResultValue}>
              {lastDBH.diameterCm.toFixed(1)} cm
            </Text>
            <Text style={styles.lastResultSub}>Tap to view details →</Text>
          </Pressable>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/instructions')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Start Measurement</Text>
        </TouchableOpacity>

        {/* Debug toggle */}
        <Pressable style={styles.debugRow} onPress={toggleDebug}>
          <View style={[styles.debugToggle, debugMode && styles.debugToggleOn]} />
          <Text style={styles.debugLabel}>Debug Mode</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow:          1,
    paddingHorizontal: spacing.lg,
    paddingBottom:     spacing.xxl,
    alignItems:        'center',
    gap:               spacing.lg,
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroArea: {
    alignItems:   'center',
    paddingTop:   spacing.xxl,
    gap:          spacing.sm,
  },
  logoRing: {
    width:           100,
    height:          100,
    borderRadius:    50,
    borderWidth:     3,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: `${colors.primary}15`,
    shadowColor:     colors.primary,
    shadowOpacity:   0.5,
    shadowRadius:    20,
    elevation:       10,
    marginBottom:    spacing.sm,
  },
  logoIcon: {
    fontSize: 48,
  },
  appName: {
    color:          colors.textPrimary,
    fontSize:       fontSizes.xxl + 4,
    fontWeight:     fontWeights.black,
    letterSpacing:  1,
  },
  appTagline: {
    color:     colors.textSecondary,
    fontSize:  fontSizes.sm,
    textAlign: 'center',
  },

  // ── Feature Cards ────────────────────────────────────────────────────────────
  featuresRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    width:         '100%',
  },
  featureCard: {
    flex:            1,
    backgroundColor: colors.bgCard,
    borderRadius:    radius.md,
    padding:         spacing.md,
    alignItems:      'center',
    gap:             spacing.xs,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureLabel: {
    color:     colors.textSecondary,
    fontSize:  fontSizes.xs,
    textAlign: 'center',
    fontWeight:fontWeights.medium,
  },

  // ── Info Card ───────────────────────────────────────────────────────────────
  infoCard: {
    width:           '100%',
    backgroundColor: colors.bgCard,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing.md,
  },
  infoTitle: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  infoSteps: {
    gap: spacing.sm,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  stepNum: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
    marginTop:       1,
  },
  stepNumText: {
    color:      colors.textOnPrimary,
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  stepText: {
    color:    colors.textSecondary,
    fontSize: fontSizes.sm,
    flex:     1,
    lineHeight:20,
  },

  // ── Last Result ──────────────────────────────────────────────────────────────
  lastResult: {
    width:           '100%',
    backgroundColor: `${colors.primary}15`,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     colors.primary,
    alignItems:      'center',
    gap:             spacing.xs,
  },
  lastResultLabel: {
    color:     colors.primaryLight,
    fontSize:  fontSizes.sm,
    fontWeight:fontWeights.medium,
  },
  lastResultValue: {
    color:      colors.primary,
    fontSize:   fontSizes.hero,
    fontWeight: fontWeights.black,
    lineHeight: fontSizes.hero * 1.1,
  },
  lastResultSub: {
    color:    colors.textMuted,
    fontSize: fontSizes.xs,
  },

  // ── CTA Button ───────────────────────────────────────────────────────────────
  primaryBtn: {
    width:           '100%',
    backgroundColor: colors.primary,
    borderRadius:    radius.xl,
    paddingVertical: spacing.lg,
    alignItems:      'center',
    shadowColor:     colors.primary,
    shadowOpacity:   0.4,
    shadowRadius:    16,
    elevation:       8,
  },
  primaryBtnText: {
    color:         colors.textOnPrimary,
    fontSize:      fontSizes.lg,
    fontWeight:    fontWeights.bold,
    letterSpacing: 0.5,
  },

  // ── Debug ────────────────────────────────────────────────────────────────────
  debugRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  debugToggle: {
    width:           36,
    height:          20,
    borderRadius:    10,
    backgroundColor: colors.border,
    borderWidth:     1,
    borderColor:     colors.textMuted,
  },
  debugToggleOn: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
  },
  debugLabel: {
    color:    colors.textMuted,
    fontSize: fontSizes.sm,
  },
});
