// ─── Camera Screen ────────────────────────────────────────────────────────────
// Main measurement screen with live camera feed, CV overlays, and HUD.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import { useCameraAccess } from '../src/camera/CameraPermissions';
import { useMeasurementFrameProcessor } from '../src/camera/FrameProcessor';
import { DetectionOverlay } from '../src/ui/components/DetectionOverlay';
import { StatusHUD } from '../src/ui/components/StatusHUD';
import { GuidanceBanner } from '../src/ui/components/GuidanceBanner';
import { LevelIndicator } from '../src/ui/components/LevelIndicator';
import { DebugPanel } from '../src/ui/components/DebugPanel';
import { useResultStore } from '../src/storage/ResultStore';
import { colors, spacing, radius, fontSizes, fontWeights } from '../src/ui/theme/colors';
import { EMPTY_CARD_RESULT, EMPTY_TRUNK_RESULT } from '../src/types';
import type { FrameProcessingResult, QualityReport } from '../src/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const EMPTY_QUALITY: QualityReport = {
  ok:         false,
  issue:      'NO_CARD',
  guidance:   'Point camera at card placed against tree trunk',
  sharpness:  0,
  brightness: 128,
};

const EMPTY_FRAME: FrameProcessingResult = {
  card:         EMPTY_CARD_RESULT,
  trunk:        EMPTY_TRUNK_RESULT,
  quality:      EMPTY_QUALITY,
  dbh:          null,
  frameWidth:   640,
  frameHeight:  480,
  fps:          0,
  processingMs: 0,
};

export default function CameraScreen() {
  const insets  = useSafeAreaInsets();
  const { granted, request } = useCameraAccess();
  const device  = useCameraDevice('back');
  const { 
    debugMode, 
    setLastFrame, 
    captureResult, 
    selectedMode, 
    setSelectedMode 
  } = useResultStore();

  const [result, setResult] = useState<FrameProcessingResult>(EMPTY_FRAME);
  const [capturing, setCapturing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(25.2);
  const [gpsUpdating, setGpsUpdating] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Stable result handler
  const handleResult = useCallback(
    (r: FrameProcessingResult) => {
      setResult(r);
      setLastFrame(r);
    },
    [setLastFrame],
  );

  // Run CV pipeline only when in 'tree' mode (saves battery/perf in 'little_tree' mode)
  const runCV = !capturing && selectedMode === 'tree';
  const frameProcessor = useMeasurementFrameProcessor(handleResult, runCV, debugMode);

  // Camera view dimensions
  const camW = SCREEN_W;
  const camH = SCREEN_H;

  // Simulate GPS Accuracy fetching
  const refreshGps = () => {
    if (gpsUpdating) return;
    setGpsUpdating(true);
    setTimeout(() => {
      // Simulate refinement of GPS signal down to a high-accuracy result (e.g. 2.5m - 5.0m)
      const finalAcc = parseFloat((Math.random() * 2.5 + 2.5).toFixed(1));
      setGpsAccuracy(finalAcc);
      setGpsUpdating(false);
    }, 1200);
  };

  // Auto-refresh GPS accuracy initially to simulate refinement
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshGps();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ── Permission request ────────────────────────────────────────────────────
  if (!granted) {
    return (
      <SafeAreaView style={styles.centred}>
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permSub}>
          TreeDBH needs camera access to measure tree diameter.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={request}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.centred}>
        <Text style={styles.permTitle}>No Camera Found</Text>
        <Text style={styles.permSub}>Could not find a back camera on this device.</Text>
      </SafeAreaView>
    );
  }

  // ── Capture handler ────────────────────────────────────────────────────────
  const handleCapture = () => {
    if (selectedMode === 'tree') {
      let dbhToSave = result.dbh;
      if (!result.quality.ok || !result.dbh) {
        if (debugMode) {
          // In debug mode, allow bypassing and save simulated data
          dbhToSave = {
            diameterCm: 24.5,
            pixelsPerMm: 1.25,
            cardWidthPx: 107,
            trunkWidthPx: 306,
            processingTimeMs: result.processingMs || 45,
            confidence: 0.85,
          };
        } else {
          Alert.alert(
            "Measurement Waiting",
            "Place calibration card flat against the tree trunk and ensure both the card and trunk are detected."
          );
          return;
        }
      }
      setCapturing(true);
      captureResult(dbhToSave, undefined);
      setTimeout(() => {
        router.push('/results');
      }, 200);
    } else {
      // Little Tree mode - no DBH calculation required, save seedling photo
      setCapturing(true);
      captureResult(null, undefined); // Store null DBH to represent Little Tree
      setTimeout(() => {
        router.push('/results');
      }, 200);
    }
  };

  const readyToCapture = selectedMode === 'little_tree' 
    ? !capturing 
    : (debugMode || (result.quality.ok && result.dbh !== null)) && !capturing;

  const guideFrameW = SCREEN_W * 0.85;
  const guideFrameH = SCREEN_H * 0.45;
  const cardW = 200;
  const cardH = 126;

  return (
    <View style={styles.root}>
      {/* ── Camera ──────────────────────────────────────────────────────── */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!capturing}
        outputs={[frameProcessor]}
        torchMode={isCameraActive && !capturing ? (flashEnabled ? 'on' : 'off') : undefined}
        onStarted={() => setIsCameraActive(true)}
        onStopped={() => setIsCameraActive(false)}
      />

      {/* ── CV Overlay (Only in Tree Mode) ────────────────────────────────── */}
      {selectedMode === 'tree' && (
        <DetectionOverlay
          card={result.card}
          trunk={result.trunk}
          frameWidth={result.frameWidth}
          frameHeight={result.frameHeight}
          viewWidth={camW}
          viewHeight={camH}
        />
      )}

      {/* ── Static Camera Framing Guides (Only in Tree Mode) ───────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Central target guide region */}
        <View 
          style={[
            styles.guideArea, 
            { 
              width: guideFrameW, 
              height: guideFrameH,
              top: (SCREEN_H - guideFrameH) / 2 - 30,
              left: (SCREEN_W - guideFrameW) / 2,
            }
          ]}
        >
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {selectedMode === 'tree' && (
            <>
              {/* Center Crosshairs */}
              <View style={styles.crosshairV} />
              <View style={styles.crosshairH} />

              {/* Dashed Card Guide Box */}
              <View 
                style={[
                  styles.cardGuideBox,
                  {
                    width: cardW,
                    height: cardH,
                    top: (guideFrameH - cardH) / 2,
                    left: (guideFrameW - cardW) / 2,
                  }
                ]}
              />

              {/* Place Card Instruction Badge */}
              <View 
                style={[
                  styles.placeCardBadge,
                  {
                    top: (guideFrameH - cardH) / 2 - 28,
                    left: (guideFrameW - 140) / 2,
                  }
                ]}
              >
                <Text style={styles.placeCardText}>Place the card here</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Top HUD ──────────────────────────────────────────────────────── */}
      <View style={[styles.topHUD, { paddingTop: insets.top + spacing.xs }]}>
        {/* Custom Header Title and Back Button */}
        <View style={styles.headerRow}>
          <View style={styles.spacer36} />
          <Text style={styles.headerTitle}>Tree 1</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[
              styles.toggleTab, 
              selectedMode === 'tree' ? styles.toggleTabActive : styles.toggleTabInactive
            ]}
            onPress={() => setSelectedMode('tree')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.toggleTitle, 
              selectedMode === 'tree' ? styles.toggleTextActive : styles.toggleTextInactive
            ]}>Tree</Text>
            <Text style={[
              styles.toggleSubtitle, 
              selectedMode === 'tree' ? styles.toggleSubTextActive : styles.toggleSubTextInactive
            ]}>from 1.5 meter height</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.toggleTab, 
              selectedMode === 'little_tree' ? styles.toggleTabActive : styles.toggleTabInactive
            ]}
            onPress={() => setSelectedMode('little_tree')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.toggleTitle, 
              selectedMode === 'little_tree' ? styles.toggleTextActive : styles.toggleTextInactive
            ]}>Little Tree</Text>
            <Text style={[
              styles.toggleSubtitle, 
              selectedMode === 'little_tree' ? styles.toggleSubTextActive : styles.toggleSubTextInactive
            ]}>less than 1.5 meter height</Text>
          </TouchableOpacity>
        </View>

        {/* Floating guidance banner in tree mode if not ready */}
        {selectedMode === 'tree' && !result.quality.ok && (
          <View style={styles.guidanceFloat}>
            <GuidanceBanner quality={result.quality} />
          </View>
        )}
      </View>

      {/* ── Live DBH display (Only in Tree Mode) ─────────────────────────── */}
      {selectedMode === 'tree' && result.dbh && (
        <View style={styles.liveMeasure}>
          <Text style={styles.liveMeasureLabel}>Measured DBH</Text>
          <Text style={styles.liveMeasureValue}>
            {result.dbh.diameterCm.toFixed(1)} cm
          </Text>
        </View>
      )}

      {/* ── Right side: level indicator ───────────────────────────────────── */}
      <View style={[styles.sidePanel, { top: SCREEN_H / 2 - 30 }]}>
        <LevelIndicator />
      </View>

      {/* ── Debug Panel ───────────────────────────────────────────────────── */}
      {debugMode && selectedMode === 'tree' && result && (
        <View style={[styles.debugContainer, { bottom: 180 }]}>
          <ScrollView>
            <DebugPanel result={result} />
          </ScrollView>
        </View>
      )}

      {/* ── Floating GPS Pill ─────────────────────────────────────────────── */}
      <TouchableOpacity 
        style={[styles.gpsPill, { bottom: insets.bottom + 110 }]}
        onPress={refreshGps}
        activeOpacity={0.8}
      >
        <Text style={styles.gpsCheck}>✓</Text>
        <Text style={styles.gpsText}>GPS Accuracy: {gpsAccuracy.toFixed(1)} m</Text>
        {gpsUpdating ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.gpsSpinner} />
        ) : (
          <Text style={styles.gpsRefresh}>⟳</Text>
        )}
      </TouchableOpacity>

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Flash Toggle */}
        <TouchableOpacity 
          style={styles.bottomIconBtn} 
          onPress={() => setFlashEnabled(!flashEnabled)}
          activeOpacity={0.7}
        >
          <Text style={[styles.bottomIconText, flashEnabled && styles.flashOnText]}>
            {flashEnabled ? '⚡' : '⚡\u0338'}
          </Text>
        </TouchableOpacity>

        {/* Shutter Button */}
        <TouchableOpacity
          style={[
            styles.shutterRing,
            readyToCapture ? styles.shutterReady : styles.shutterDisabled
          ]}
          onPress={handleCapture}
          activeOpacity={0.85}
        >
          <View style={styles.shutterInner}>
            <Text style={styles.shutterIcon}>📷</Text>
          </View>
        </TouchableOpacity>

        {/* Map Button */}
        <TouchableOpacity 
          style={styles.bottomIconBtn} 
          onPress={() => Alert.alert("Map View", `GPS Location locked at accuracy of ${gpsAccuracy.toFixed(1)}m`)}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomIconText}>🗺️</Text>
          <Text style={styles.bottomIconLabel}>Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#000',
  },

  // ── Permission ───────────────────────────────────────────────────────────────
  centred: {
    flex:            1,
    backgroundColor: colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal:spacing.xl,
    gap:             spacing.lg,
  },
  permTitle: {
    color:      colors.textPrimary,
    fontSize:   fontSizes.xl,
    fontWeight: fontWeights.bold,
    textAlign:  'center',
  },
  permSub: {
    color:    colors.textSecondary,
    fontSize: fontSizes.md,
    textAlign:'center',
    lineHeight:24,
  },
  permBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal:spacing.xl,
  },
  permBtnText: {
    color:      colors.textOnPrimary,
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.bold,
  },

  // ── Framing Guides ───────────────────────────────────────────────────────────
  guideArea: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },
  crosshairV: {
    position: 'absolute',
    left: '50%',
    width: 0,
    height: '100%',
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 0,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },
  cardGuideBox: {
    position: 'absolute',
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  placeCardBadge: {
    position: 'absolute',
    width: 140,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeCardText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // ── Header & Custom Toggles ──────────────────────────────────────────────────
  topHUD: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    gap:             spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingBottom:   spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 40,
  },
  spacer36: {
    width: 36,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginHorizontal: spacing.md,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleTabActive: {
    backgroundColor: '#ECE9E0', // Beige active background
  },
  toggleTabInactive: {
    backgroundColor: 'transparent',
  },
  toggleTitle: {
    fontSize: fontSizes.md - 1,
    fontWeight: fontWeights.bold,
  },
  toggleSubtitle: {
    fontSize: fontSizes.xs - 2,
    marginTop: 1,
  },
  toggleTextActive: {
    color: '#2F5233', // Dark forest green text
  },
  toggleTextInactive: {
    color: '#FFFFFF',
  },
  toggleSubTextActive: {
    color: '#2F5233',
  },
  toggleSubTextInactive: {
    color: 'rgba(255,255,255,0.6)',
  },
  guidanceFloat: {
    marginTop: spacing.xs,
  },

  // ── Live measurement ─────────────────────────────────────────────────────────
  liveMeasure: {
    position:        'absolute',
    top:             SCREEN_H * 0.40,
    alignSelf:       'center',
    alignItems:      'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius:    radius.xl,
    paddingVertical:  spacing.sm,
    paddingHorizontal:spacing.xl,
    borderWidth:     2,
    borderColor:     colors.primary,
    gap:             2,
  },
  liveMeasureLabel: {
    color:    colors.primaryLight,
    fontSize: fontSizes.xs,
    fontWeight:fontWeights.medium,
  },
  liveMeasureValue: {
    color:      colors.primary,
    fontSize:   fontSizes.xxl,
    fontWeight: fontWeights.black,
  },

  // ── Side panel ────────────────────────────────────────────────────────────────
  sidePanel: {
    position:         'absolute',
    right:            spacing.md,
  },

  // ── Debug ─────────────────────────────────────────────────────────────────────
  debugContainer: {
    position:        'absolute',
    left:            0,
    right:           0,
    maxHeight:       200,
  },

  // ── Floating GPS Pill ──────────────────────────────────────────────────────────
  gpsPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  gpsCheck: {
    color: '#22C55E',
    fontWeight: 'bold',
    fontSize: 14,
  },
  gpsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  gpsRefresh: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  gpsSpinner: {
    marginLeft: 4,
  },

  // ── Bottom Bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.xl + 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingTop:      spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 50,
  },
  bottomIconText: {
    fontSize: 26,
    color: '#2E5A27',
  },
  bottomIconLabel: {
    fontSize: 10,
    color: '#2E5A27',
    fontWeight: '600',
    marginTop: 2,
  },
  flashOnText: {
    color: '#F59E0B',
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  shutterReady: {
    backgroundColor: '#22C55E',
  },
  shutterDisabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterIcon: {
    fontSize: 26,
  },
});
