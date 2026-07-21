// ─── Design Tokens ────────────────────────────────────────────────────────────
// Dark forest aesthetic: deep greens, amber accents, neon overlays.
// All colours are defined here — no inline hex strings elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Background ──────────────────────────────────────────────────────────────
  bg:           '#0A1A0A', // Deep forest black
  bgCard:       '#111F11', // Slightly lighter panels
  bgOverlay:    'rgba(10, 26, 10, 0.75)', // Semi-transparent HUD background

  // ── Primary / Brand ─────────────────────────────────────────────────────────
  primary:      '#22C55E', // Vivid leaf green
  primaryDark:  '#16A34A', // Deeper green (button press)
  primaryLight: '#86EFAC', // Mint (secondary text, icons)
  primaryGlow:  'rgba(34, 197, 94, 0.25)', // Soft glow

  // ── CV Overlay Colours ───────────────────────────────────────────────────────
  cardOverlay:  '#F59E0B', // Amber — card corners / outline
  trunkLeft:    '#3B82F6', // Blue — left trunk edge line
  trunkRight:   '#60A5FA', // Lighter blue — right trunk edge line
  trunkFill:    'rgba(59, 130, 246, 0.10)', // Transparent blue fill between edges

  // ── Status ───────────────────────────────────────────────────────────────────
  success:      '#22C55E',
  warning:      '#F59E0B',
  error:        '#EF4444',
  neutral:      '#6B7280',

  // ── Text ─────────────────────────────────────────────────────────────────────
  textPrimary:  '#F0FDF4', // Near-white with green tint
  textSecondary:'#86EFAC', // Mint
  textMuted:    '#4B5563', // Dark grey
  textOnPrimary:'#0A1A0A', // Dark on green buttons

  // ── Borders / Dividers ───────────────────────────────────────────────────────
  border:       '#1E3A1E',
  borderActive: '#22C55E',

  // ── Shadows ──────────────────────────────────────────────────────────────────
  shadow:       '#000000',
} as const;

export type ColorKey = keyof typeof colors;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  sm:   6,
  md:   12,
  lg:   20,
  xl:   32,
  full: 9999,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const fontSizes = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   18,
  xl:   24,
  xxl:  32,
  hero: 56,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  black:   '900' as const,
};
