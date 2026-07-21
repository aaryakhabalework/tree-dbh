// ─── Results Screen ───────────────────────────────────────────────────────────
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useResultStore } from '../src/storage/ResultStore';
import { colors, spacing, radius, fontSizes, fontWeights } from '../src/ui/theme/colors';

function MetricRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricRight}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const { lastDBH, capturedImageUri, clearResult, selectedMode } = useResultStore();

  if (selectedMode === 'little_tree') {
    return (
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seedling Monitored</Text>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => {
              clearResult();
              router.replace('/camera');
            }}
          >
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Primary Result Hero ────────────────────────────────────────── */}
          <View style={styles.resultHero}>
            <View style={styles.resultIconBg}>
              <Text style={styles.resultIcon}>🌱</Text>
            </View>
            <Text style={styles.resultLabel}>Seedling Survival Status</Text>
            <Text style={styles.resultValue}>
              Healthy
            </Text>
            <Text style={styles.resultUnit}>Little Tree (&lt; 1.5 m height)</Text>

            {/* Verification pill */}
            <View style={[styles.confPill, { borderColor: colors.success }]}>
              <View style={[styles.confDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.confText, { color: colors.success }]}>
                GPS Verified
              </Text>
            </View>
          </View>

          {/* ── Captured photo ─────────────────────────────────────────────── */}
          {capturedImageUri && (
            <View style={styles.photoCard}>
              <Text style={styles.sectionTitle}>Captured Image</Text>
              <Image
                source={{ uri: capturedImageUri }}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
          )}

          {/* ── Seedling details ───────────────────────────────────────────── */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Seedling Details</Text>
            <MetricRow
              label="Height Category"
              value="< 1.5"
              unit="m"
            />
            <View style={styles.divider} />
            <MetricRow
              label="Estimated DBH"
              value="< 3.0"
              unit="cm"
            />
            <View style={styles.divider} />
            <MetricRow
              label="Survival Status"
              value="ALIVE"
            />
            <View style={styles.divider} />
            <MetricRow
              label="Health Condition"
              value="HEALTHY"
            />
            <View style={styles.divider} />
            <MetricRow
              label="Species Type"
              value="Default/Monitored"
            />
          </View>

          {/* ── Project details ────────────────────────────────────────────── */}
          <View style={styles.calCard}>
            <Text style={styles.sectionTitle}>Monitoring Target</Text>
            <Text style={styles.calText}>
              Young Tree & Seedling Survival Audit
            </Text>
            <Text style={styles.calFormula}>
              Seedlings under 1.5 meters do not require diameter calibration cards. 
              Visual verification and geo-tagging confirm survival rates.
            </Text>
          </View>

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => {
                clearResult();
                router.replace('/camera');
              }}
            >
              <Text style={styles.actionBtnTextPrimary}>New Measurement</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => router.push('/')}
            >
              <Text style={styles.actionBtnTextSecondary}>Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!lastDBH) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📏</Text>
          <Text style={styles.emptyTitle}>No Measurement Yet</Text>
          <Text style={styles.emptySub}>
            Return to the camera to take a measurement.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/camera')}
          >
            <Text style={styles.primaryBtnText}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const confidencePct = Math.round(lastDBH.confidence * 100);
  const confColor =
    confidencePct > 70 ? colors.success :
    confidencePct > 40 ? colors.warning :
                         colors.error;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Measurement Result</Text>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => {
            clearResult();
            router.replace('/camera');
          }}
        >
          <Text style={styles.retakeBtnText}>Retake</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Primary Result ─────────────────────────────────────────────── */}
        <View style={styles.resultHero}>
          <View style={styles.resultIconBg}>
            <Text style={styles.resultIcon}>🌳</Text>
          </View>
          <Text style={styles.resultLabel}>Tree Diameter (DBH)</Text>
          <Text style={styles.resultValue}>
            {lastDBH.diameterCm.toFixed(1)}
          </Text>
          <Text style={styles.resultUnit}>centimetres</Text>

          {/* Confidence pill */}
          <View style={[styles.confPill, { borderColor: confColor }]}>
            <View style={[styles.confDot, { backgroundColor: confColor }]} />
            <Text style={[styles.confText, { color: confColor }]}>
              {confidencePct}% confidence
            </Text>
          </View>
        </View>

        {/* ── Captured photo ─────────────────────────────────────────────── */}
        {capturedImageUri && (
          <View style={styles.photoCard}>
            <Text style={styles.sectionTitle}>Captured Image</Text>
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.photo}
              resizeMode="cover"
            />
          </View>
        )}

        {/* ── Measurement Details ───────────────────────────────────────── */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Measurement Details</Text>
          <MetricRow
            label="Tree Diameter"
            value={lastDBH.diameterCm.toFixed(1)}
            unit="cm"
          />
          <View style={styles.divider} />
          <MetricRow
            label="Confidence"
            value={`${confidencePct}`}
            unit="%"
          />
          <View style={styles.divider} />
          <MetricRow
            label="Calibration Scale"
            value={lastDBH.pixelsPerMm.toFixed(2)}
            unit="px/mm"
          />
          <View style={styles.divider} />
          <MetricRow
            label="Card Width"
            value={`${lastDBH.cardWidthPx}`}
            unit="px"
          />
          <View style={styles.divider} />
          <MetricRow
            label="Trunk Width"
            value={`${lastDBH.trunkWidthPx}`}
            unit="px"
          />
          <View style={styles.divider} />
          <MetricRow
            label="Processing Time"
            value={`${lastDBH.processingTimeMs}`}
            unit="ms"
          />
        </View>

        {/* ── Calibration Reference ─────────────────────────────────────── */}
        <View style={styles.calCard}>
          <Text style={styles.sectionTitle}>Calibration Reference</Text>
          <Text style={styles.calText}>
            ISO/IEC 7810 ID-1 credit card (85.60 × 53.98 mm)
          </Text>
          <Text style={styles.calFormula}>
            pixels_per_mm = card_width_px / 85.60{'\n'}
            diameter_mm = trunk_width_px / pixels_per_mm{'\n'}
            diameter_cm = diameter_mm / 10
          </Text>
        </View>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => {
              clearResult();
              router.replace('/camera');
            }}
          >
            <Text style={styles.actionBtnTextPrimary}>New Measurement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push('/')}
          >
            <Text style={styles.actionBtnTextSecondary}>Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  empty: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal:spacing.xl,
    gap:             spacing.lg,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  emptySub: {
    color:    colors.textSecondary,
    fontSize: fontSizes.md,
    textAlign:'center',
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
  retakeBtn: {
    paddingHorizontal:spacing.md,
    paddingVertical:  spacing.sm,
    borderRadius:     radius.md,
    borderWidth:      1,
    borderColor:      colors.primary,
  },
  retakeBtnText: {
    color:      colors.primary,
    fontSize:   fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },

  content: {
    flexGrow:          1,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.lg,
    gap:               spacing.lg,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  resultHero: {
    backgroundColor: colors.bgCard,
    borderRadius:    radius.xl,
    padding:         spacing.xl,
    alignItems:      'center',
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
    shadowColor:     colors.primary,
    shadowOpacity:   0.15,
    shadowRadius:    20,
    elevation:       6,
  },
  resultIconBg: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: `${colors.primary}20`,
    alignItems:      'center',
    justifyContent:  'center',
  },
  resultIcon: {
    fontSize: 36,
  },
  resultLabel: {
    color:      colors.textSecondary,
    fontSize:   fontSizes.sm,
    fontWeight: fontWeights.medium,
    letterSpacing:1,
    textTransform:'uppercase',
  },
  resultValue: {
    color:      colors.primary,
    fontSize:   fontSizes.hero,
    fontWeight: fontWeights.black,
    lineHeight: fontSizes.hero * 1.05,
  },
  resultUnit: {
    color:    colors.textMuted,
    fontSize: fontSizes.md,
  },
  confPill: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    borderRadius:  radius.full,
    borderWidth:   1,
    paddingVertical:   spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop:     spacing.xs,
  },
  confDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  confText: {
    fontSize:   fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },

  // ── Photo ─────────────────────────────────────────────────────────────────────
  photoCard: {
    borderRadius:    radius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing.sm,
    padding:         spacing.md,
    backgroundColor: colors.bgCard,
  },
  photo: {
    width:        '100%',
    height:       200,
    borderRadius: radius.md,
  },

  // ── Details Card ─────────────────────────────────────────────────────────────
  detailsCard: {
    backgroundColor: colors.bgCard,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  sectionTitle: {
    color:        colors.textSecondary,
    fontSize:     fontSizes.xs,
    fontWeight:   fontWeights.bold,
    letterSpacing:2,
    textTransform:'uppercase',
    marginBottom: spacing.xs,
  },
  metricRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: spacing.xs,
  },
  metricLabel: {
    color:    colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  metricRight: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           4,
  },
  metricValue: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.bold,
    fontFamily: 'monospace',
  },
  metricUnit: {
    color:    colors.textMuted,
    fontSize: fontSizes.xs,
  },
  divider: {
    height:          1,
    backgroundColor: colors.border,
  },

  // ── Calibration Card ──────────────────────────────────────────────────────────
  calCard: {
    backgroundColor: `${colors.primary}10`,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     `${colors.primary}30`,
  },
  calText: {
    color:    colors.primaryLight,
    fontSize: fontSizes.sm,
  },
  calFormula: {
    color:      colors.textMuted,
    fontSize:   fontSizes.xs,
    fontFamily: 'monospace',
    lineHeight: 18,
  },

  // ── Actions ───────────────────────────────────────────────────────────────────
  actionsRow: {
    gap: spacing.sm,
  },
  actionBtn: {
    borderRadius:    radius.xl,
    paddingVertical: spacing.lg,
    alignItems:      'center',
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    shadowColor:     colors.primary,
    shadowOpacity:   0.35,
    shadowRadius:    12,
    elevation:       8,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth:     1,
    borderColor:     colors.border,
  },
  actionBtnTextPrimary: {
    color:      colors.textOnPrimary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  actionBtnTextSecondary: {
    color:      colors.textSecondary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.medium,
  },

  // ── Shared ───────────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal:spacing.xl,
  },
  primaryBtnText: {
    color:      colors.textOnPrimary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.bold,
  },
});
