export const colorNames = { amber: 'Ámbar', blue: 'Azul', green: 'Verde', plum: 'Ciruela' } as const;
export type ColorName = keyof typeof colorNames;
export type Stage = 'pending' | 'progress' | 'ready';
export type StageColors = Record<Stage, ColorName>;
export const defaultColors: StageColors = { pending: 'amber', progress: 'blue', ready: 'green' };
const key = 'rodrigo-crm-kanban-colors';
export function readColors(): StageColors {
  try {
    if (typeof window === 'undefined') return { ...defaultColors };
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return { ...defaultColors };
    const values = stored as Record<string, unknown>;
    return Object.fromEntries((Object.keys(defaultColors) as Stage[]).map(stage => [stage, typeof values[stage] === 'string' && Object.hasOwn(colorNames, values[stage] as string) ? values[stage] : defaultColors[stage]])) as StageColors;
  } catch { return { ...defaultColors }; }
}
export function saveColors(colors: StageColors): boolean {
  try { if (typeof window === 'undefined') return false; window.localStorage.setItem(key, JSON.stringify(colors)); return true; }
  catch { return false; }
}
