import type { CSSProperties } from 'react';

export type Stage = 'pending' | 'progress' | 'ready';
export type StageColors = Record<Stage, string>;

export type ColorPaletteOption = {
  id: string;
  name: string;
  hex: string;
  softBg: string;
};

export type StageColorTokens = {
  primary: string;
  softBg: string;
  accent: string;
  headerText: string;
  border: string;
  checkInk: string;
};

export const STAGE_META: ReadonlyArray<{ id: Stage; label: string }> = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'progress', label: 'En proceso' },
  { id: 'ready', label: 'Listos' },
];

export const BOARD_COLOR_PALETTE: readonly ColorPaletteOption[] = [
  { id: 'amber', name: 'Ámbar', hex: '#D97706', softBg: '#FFF3DD' },
  { id: 'terracotta', name: 'Terracota', hex: '#EA580C', softBg: '#FFF1E6' },
  { id: 'crimson', name: 'Carmesí', hex: '#DC2626', softBg: '#FEEEEE' },
  { id: 'rose', name: 'Frambuesa', hex: '#DB2777', softBg: '#FCEBF4' },
  { id: 'violet', name: 'Lavanda', hex: '#7C3AED', softBg: '#F2ECFE' },
  { id: 'indigo', name: 'Índigo', hex: '#4F46E5', softBg: '#EEF0FF' },
  { id: 'blue', name: 'Azul', hex: '#2563EB', softBg: '#EAF1FF' },
  { id: 'sky', name: 'Cielo', hex: '#0284C7', softBg: '#E8F5FD' },
  { id: 'teal', name: 'Turquesa', hex: '#0D9488', softBg: '#E6F7F5' },
  { id: 'green', name: 'Verde', hex: '#15803D', softBg: '#E8F6ED' },
  { id: 'olive', name: 'Oliva', hex: '#65A30D', softBg: '#F1F8E5' },
  { id: 'slate', name: 'Pizarra', hex: '#475569', softBg: '#EEF1F5' },
];

export const defaultColors: StageColors = {
  pending: '#D97706',
  progress: '#2563EB',
  ready: '#15803D',
};

const LEGACY_PRESET_HEX: Record<string, string> = {
  amber: '#D97706',
  blue: '#2563EB',
  green: '#15803D',
  plum: '#7C3AED',
};

const STORAGE_KEY = 'rodrigo-crm-kanban-colors';
const HEADER_INK = '#181924';
const WHITE = '#FFFFFF';
const DARK_INK = '#14151F';

const PALETTE_BY_HEX = new Map(
  BOARD_COLOR_PALETTE.map((item) => [item.hex.toUpperCase(), item]),
);

export function normalizeHexColor(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const match = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

export function resolveStoredStageColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const legacyKey = value.trim().toLowerCase();
  if (Object.hasOwn(LEGACY_PRESET_HEX, legacyKey)) {
    return LEGACY_PRESET_HEX[legacyKey];
  }
  return normalizeHexColor(value) ?? fallback;
}

export function readColors(): StageColors {
  try {
    if (typeof window === 'undefined') return { ...defaultColors };
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      return { ...defaultColors };
    }
    const values = stored as Record<string, unknown>;
    return {
      pending: resolveStoredStageColor(values.pending, defaultColors.pending),
      progress: resolveStoredStageColor(values.progress, defaultColors.progress),
      ready: resolveStoredStageColor(values.ready, defaultColors.ready),
    };
  } catch {
    return { ...defaultColors };
  }
}

export function saveColors(colors: StageColors): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const normalized: StageColors = {
      pending: normalizeHexColor(colors.pending) ?? defaultColors.pending,
      progress: normalizeHexColor(colors.progress) ?? defaultColors.progress,
      ready: normalizeHexColor(colors.ready) ?? defaultColors.ready,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function stageColorsEqual(a: StageColors, b: StageColors): boolean {
  return (
    (normalizeHexColor(a.pending) ?? a.pending) === (normalizeHexColor(b.pending) ?? b.pending) &&
    (normalizeHexColor(a.progress) ?? a.progress) === (normalizeHexColor(b.progress) ?? b.progress) &&
    (normalizeHexColor(a.ready) ?? a.ready) === (normalizeHexColor(b.ready) ?? b.ready)
  );
}

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };
export type Hsv = { h: number; s: number; v: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHexColor(hex) ?? '#475569';
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toByte = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`.toUpperCase();
}

function mixHex(hexA: string, hexB: string, weightA: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = clamp(weightA, 0, 1);
  return rgbToHex({
    r: a.r * w + b.r * (1 - w),
    g: a.g * w + b.g * (1 - w),
    b: a.b * w + b.b * (1 - w),
  });
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;

  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) [rp, gp, bp] = [c, x, 0];
  else if (hue < 120) [rp, gp, bp] = [x, c, 0];
  else if (hue < 180) [rp, gp, bp] = [0, c, x];
  else if (hue < 240) [rp, gp, bp] = [0, x, c];
  else if (hue < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

export function hexToHsv(hex: string): Hsv {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) [rp, gp, bp] = [c, x, 0];
  else if (hue < 120) [rp, gp, bp] = [x, c, 0];
  else if (hue < 180) [rp, gp, bp] = [0, c, x];
  else if (hue < 240) [rp, gp, bp] = [0, x, c];
  else if (hue < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return rgbToHex({
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  });
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = getRelativeLuminance(hexA);
  const l2 = getRelativeLuminance(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function resolveStageColorTokens(rawHex: string): StageColorTokens {
  const primary = normalizeHexColor(rawHex) ?? defaultColors.pending;
  const preset = PALETTE_BY_HEX.get(primary);

  let softBg = preset ? preset.softBg : mixHex(primary, WHITE, 0.13);
  if (getRelativeLuminance(softBg) < 0.85) {
    softBg = mixHex(primary, WHITE, 0.08);
  }

  let accent = primary;
  if (getContrastRatio(accent, softBg) < 4.5) {
    const hsl = rgbToHsl(hexToRgb(primary));
    const isNearNeutral = hsl.s < 0.08;
    const targetHue = isNearNeutral ? 220 : hsl.h;
    const targetSat = isNearNeutral ? 0.16 : clamp(hsl.s, 0.35, 0.86);

    let candidate = accent;
    for (let l = Math.min(hsl.l, 0.56); l >= 0.14; l -= 0.02) {
      candidate = rgbToHex(hslToRgb({ h: targetHue, s: targetSat, l }));
      if (getContrastRatio(candidate, softBg) >= 4.7) {
        break;
      }
    }
    accent = getContrastRatio(candidate, softBg) >= 4.5 ? candidate : HEADER_INK;
  }

  const borderSeed = getRelativeLuminance(primary) > 0.7 ? accent : primary;
  const border = mixHex(borderSeed, '#E2E1EC', 0.28);

  const whiteContrast = getContrastRatio(WHITE, primary);
  const darkContrast = getContrastRatio(DARK_INK, primary);
  const checkInk = whiteContrast >= 4.5 || whiteContrast >= darkContrast ? WHITE : DARK_INK;

  return {
    primary,
    softBg,
    accent,
    headerText: HEADER_INK,
    border,
    checkInk,
  };
}

export function getPaletteMatch(hex: string): ColorPaletteOption | undefined {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return undefined;
  return PALETTE_BY_HEX.get(normalized);
}

export function getStageColumnStyle(hex: string): CSSProperties {
  const tokens = resolveStageColorTokens(hex);
  return {
    '--ob-hdr-bg': tokens.softBg,
    '--ob-hdr-accent': tokens.accent,
    '--ob-hdr-text': tokens.headerText,
    '--ob-hdr-border': tokens.border,
  } as CSSProperties;
}
