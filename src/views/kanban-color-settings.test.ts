import { afterEach, describe, expect, test } from 'bun:test';
import {
  BOARD_COLOR_PALETTE,
  defaultColors,
  getContrastRatio,
  getStageColumnStyle,
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  readColors,
  resolveStageColorTokens,
  saveColors,
  stageColorsEqual,
  type StageColors,
} from './kanban-color-settings';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    // @ts-expect-error test cleanup
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

describe('kanban-color-settings', () => {
  test('exposes recommended default colors and exact recommended soft backgrounds', () => {
    expect(defaultColors).toEqual({
      pending: '#D97706',
      progress: '#2563EB',
      ready: '#15803D',
    });

    expect(resolveStageColorTokens('#D97706').softBg).toBe('#FFF3DD');
    expect(resolveStageColorTokens('#2563EB').softBg).toBe('#EAF1FF');
    expect(resolveStageColorTokens('#15803D').softBg).toBe('#E8F6ED');
    expect(BOARD_COLOR_PALETTE.length).toBeGreaterThanOrEqual(10);
  });

  test('normalizes valid 6-digit HEX strings and rejects malformed values', () => {
    expect(normalizeHexColor('#d97706')).toBe('#D97706');
    expect(normalizeHexColor('2563eb')).toBe('#2563EB');
    expect(normalizeHexColor('  #15803d  ')).toBe('#15803D');

    expect(normalizeHexColor('')).toBeNull();
    expect(normalizeHexColor('#123')).toBeNull();
    expect(normalizeHexColor('#GGGGGG')).toBeNull();
    expect(normalizeHexColor('#1234567')).toBeNull();
    expect(normalizeHexColor('blue')).toBeNull();
  });

  test('migrates legacy preset names stored in localStorage without losing preferences', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'rodrigo-crm-kanban-colors',
      JSON.stringify({ pending: 'plum', progress: 'amber', ready: 'blue' }),
    );
    // @ts-expect-error minimal browser mock
    globalThis.window = { localStorage: storage };

    const loaded = readColors();
    expect(loaded.pending).toMatch(/^#[0-9A-F]{6}$/);
    expect(loaded.progress).toBe('#D97706');
    expect(loaded.ready).toBe('#2563EB');
    expect(loaded.pending).not.toBe(defaultColors.pending);
  });

  test('persists custom HEX colors and falls back per-stage on invalid stored values', () => {
    const storage = createMemoryStorage();
    // @ts-expect-error minimal browser mock
    globalThis.window = { localStorage: storage };

    const custom: StageColors = {
      pending: '#9333EA',
      progress: '#0891B2',
      ready: '#166534',
    };
    expect(saveColors(custom)).toBe(true);
    expect(readColors()).toEqual(custom);

    // Corrupt one stage only — valid stages are preserved
    storage.setItem(
      'rodrigo-crm-kanban-colors',
      JSON.stringify({ pending: 'not-a-color', progress: '#0891b2', ready: 42 }),
    );
    expect(readColors()).toEqual({
      pending: defaultColors.pending,
      progress: '#0891B2',
      ready: defaultColors.ready,
    });
  });

  test('returns false when localStorage write fails', () => {
    // @ts-expect-error minimal throwing storage mock
    globalThis.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      },
    };
    expect(saveColors(defaultColors)).toBe(false);
  });

  test('guarantees WCAG AA contrast for extreme light, saturated, and dark custom HEX colors', () => {
    const edgeCases = [
      '#FFFFFF',
      '#FACC15',
      '#FEF08A',
      '#38BDF8',
      '#F472B6',
      '#D97706',
      '#2563EB',
      '#15803D',
      '#0F172A',
      '#000000',
    ];

    for (const hex of edgeCases) {
      const tokens = resolveStageColorTokens(hex);
      expect(getContrastRatio(tokens.headerText, tokens.softBg)).toBeGreaterThanOrEqual(7);
      expect(getContrastRatio(tokens.accent, tokens.softBg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(tokens.checkInk, tokens.primary)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('round-trips HEX <-> HSV cleanly and builds stage CSS variables', () => {
    for (const hex of ['#D97706', '#2563EB', '#15803D', '#7C3AED', '#DC2626']) {
      const hsv = hexToHsv(hex);
      const back = hsvToHex(hsv.h, hsv.s, hsv.v);
      expect(back).toMatch(/^#[0-9A-F]{6}$/);
    }

    const style = getStageColumnStyle('#2563EB') as Record<string, string>;
    expect(style['--ob-hdr-bg']).toBe('#EAF1FF');
    expect(style['--ob-hdr-accent']).toMatch(/^#[0-9A-F]{6}$/);
    expect(style['--ob-hdr-text']).toMatch(/^#[0-9A-F]{6}$/);
    expect(style['--ob-hdr-border']).toMatch(/^#[0-9A-F]{6}$/);

    expect(stageColorsEqual(defaultColors, { ...defaultColors })).toBe(true);
    expect(stageColorsEqual(defaultColors, { ...defaultColors, pending: '#DC2626' })).toBe(false);
  });
});
