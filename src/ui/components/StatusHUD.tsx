// ─── Status HUD ───────────────────────────────────────────────────────────────
// Shows detection badges for card, trunk, and overall quality at the top of
// the camera screen.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme/colors';
import type { CardDetectionResult, TrunkDetectionResult, QualityReport } from '../../types';

interface StatusHUDProps {
  card:    CardDetectionResult;
  trunk:   TrunkDetectionResult;
  quality: QualityReport;
  fps?:    number;
}

type BadgeStatus = 'ok' | 'partial' | 'none';

function Badge({
  label,
  status,
  detail,
}: {
  label: string;
  status: BadgeStatus;
  detail?: string;
}) {
  const badgeColor =
    status === 'ok'      ? colors.success  :
    status === 'partial' ? colors.warning  :
                           colors.error;

  const icon =
    status === 'ok'      ? '✓' :
    status === 'partial' ? '~' :
                           '✗';

  return (
    <View style={[styles.badge, { borderColor: badgeColor }]}>
      <Text style={[styles.badgeIcon, { color: badgeColor }]}>{icon}</Text>
      <View>
        <Text style={styles.badgeLabel}>{label}</Text>
        {detail ? (
          <Text style={[styles.badgeDetail, { color: badgeColor }]}>{detail}</Text>
        ) : null}
      </View>
    </View>
  );
}

export const StatusHUD: React.FC<StatusHUDProps> = ({
  card,
  trunk,
  quality,
  fps,
}) => {
  const cardStatus: BadgeStatus =
    !card.found          ? 'none'    :
    card.confidence < 0.5 ? 'partial' :
                            'ok';

  const trunkStatus: BadgeStatus =
    !trunk.found            ? 'none'    :
    trunk.confidence < 0.5  ? 'partial' :
                              'ok';

  const confidencePct = Math.round(
    ((card.confidence + trunk.confidence) / 2) * 100,
  );

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <Badge
          label="Card"
          status={cardStatus}
          detail={card.found ? `${Math.round(card.confidence * 100)}%` : 'Not found'}
        />

        <View style={styles.divider} />

        <Badge
          label="Trunk"
          status={trunkStatus}
          detail={trunk.found ? `${Math.round(trunk.confidence * 100)}%` : 'Not found'}
        />

        {fps !== undefined && (
          <>
            <View style={styles.divider} />
            <Text style={styles.fps}>{fps} fps</Text>
          </>
        )}
      </View>

      {/* Confidence bar */}
      {(card.found || trunk.found) && (
        <View style={styles.confRow}>
          <Text style={styles.confLabel}>Confidence</Text>
          <View style={styles.confBarBg}>
            <View
              style={[
                styles.confBarFill,
                {
                  width:           `${Math.min(100, confidencePct)}%`,
                  backgroundColor: confidencePct > 70 ? colors.success :
                                   confidencePct > 40 ? colors.warning  :
                                                        colors.error,
                },
              ]}
            />
          </View>
          <Text style={styles.confPct}>{confidencePct}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop:        spacing.sm,
    gap:               spacing.sm,
  },
  hud: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  colors.bgOverlay,
    borderRadius:     radius.lg,
    paddingVertical:  spacing.sm,
    paddingHorizontal:spacing.md,
    borderWidth:      1,
    borderColor:      colors.border,
    gap:              spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    borderRadius:  radius.sm,
    borderWidth:   1,
    paddingVertical:   3,
    paddingHorizontal: spacing.sm,
  },
  badgeIcon: {
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  badgeLabel: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  badgeDetail: {
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  divider: {
    width:           1,
    height:          32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  fps: {
    color:      colors.textMuted,
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.medium,
    marginLeft: 'auto',
  },
  confRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  confLabel: {
    color:      colors.textSecondary,
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.medium,
    width:      72,
  },
  confBarBg: {
    flex:            1,
    height:          6,
    backgroundColor: colors.bgCard,
    borderRadius:    radius.full,
    overflow:        'hidden',
  },
  confBarFill: {
    height:       6,
    borderRadius: radius.full,
  },
  confPct: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.xs,
    fontWeight: fontWeights.bold,
    width:      32,
    textAlign:  'right',
  },
});
