import { describe, expect, test } from 'bun:test';
import {
  formatIsoToUruguayan,
  formatMonthYearEs,
  getCalendarGrid,
  isValidIsoDate,
  parseUruguayanDate,
  todayIsoLocal,
} from './date';

describe('date utilities (Uruguayan dd/mm/aaaa & timezone-safe YYYY-MM-DD)', () => {
  test('todayIsoLocal uses local year/month/day without UTC day shift', () => {
    // 2026-11-19 23:30 local time should stay 2026-11-19 even when UTC is already next day
    const lateNightLocal = new Date(2026, 10, 19, 23, 45, 0);
    expect(todayIsoLocal(lateNightLocal)).toBe('2026-11-19');
    const janFirst = new Date(2026, 0, 1, 0, 5, 0);
    expect(todayIsoLocal(janFirst)).toBe('2026-01-01');
  });

  test('formatIsoToUruguayan formats valid YYYY-MM-DD as dd/mm/aaaa', () => {
    expect(formatIsoToUruguayan('2026-11-19')).toBe('19/11/2026');
    expect(formatIsoToUruguayan('2026-01-05')).toBe('05/01/2026');
    expect(formatIsoToUruguayan('')).toBe('');
    expect(formatIsoToUruguayan('2026-02-30')).toBe('');
  });

  test('parseUruguayanDate parses valid dd/mm/aaaa and rejects invalid calendar dates', () => {
    expect(parseUruguayanDate('19/11/2026')).toBe('2026-11-19');
    expect(parseUruguayanDate('5/1/2026')).toBe('2026-01-05');
    expect(parseUruguayanDate('29/02/2024')).toBe('2024-02-29'); // leap year
    expect(parseUruguayanDate('29/02/2026')).toBeNull(); // non-leap year
    expect(parseUruguayanDate('31/04/2026')).toBeNull(); // April has 30 days
    expect(parseUruguayanDate('00/11/2026')).toBeNull();
    expect(parseUruguayanDate('19/13/2026')).toBeNull();
    expect(parseUruguayanDate('2026-11-19')).toBeNull();
    expect(parseUruguayanDate('abc')).toBeNull();
  });

  test('isValidIsoDate validates strict Gregorian dates', () => {
    expect(isValidIsoDate('2026-11-19')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-11-31')).toBe(false);
    expect(isValidIsoDate('19/11/2026')).toBe(false);
  });

  test('getCalendarGrid starts weeks on Monday (L..D) and marks current month & today accurately', () => {
    // November 2026 starts on Sunday Nov 1 -> Monday-first grid has 6 leading days from October (Oct 26..31)
    const grid = getCalendarGrid(2026, 10, '2026-11-19');
    expect(grid.length % 7).toBe(0);
    expect(grid[0]).toMatchObject({ iso: '2026-10-26', day: 26, inMonth: false, isToday: false });
    expect(grid[6]).toMatchObject({ iso: '2026-11-01', day: 1, inMonth: true, isToday: false });
    const nov19 = grid.find((cell) => cell.iso === '2026-11-19');
    expect(nov19).toMatchObject({ iso: '2026-11-19', day: 19, inMonth: true, isToday: true });
    const nov30 = grid.find((cell) => cell.iso === '2026-11-30');
    expect(nov30).toMatchObject({ iso: '2026-11-30', day: 30, inMonth: true });
  });

  test('formatMonthYearEs returns capitalized Spanish month and year', () => {
    expect(formatMonthYearEs(2026, 10)).toBe('Noviembre 2026');
    expect(formatMonthYearEs(2026, 0)).toBe('Enero 2026');
  });
});
