import { describe, expect, test } from 'bun:test';
import { formatOrderNotes, parseOrderNotes, WARRANTY_NOTE_PREFIX } from './warranty';

describe('warranty notes helpers', () => {
  test('parses empty or standard notes without warranty marker', () => {
    expect(parseOrderNotes('')).toEqual({ isWarrantyManagement: false, noteText: '' });
    expect(parseOrderNotes('  Cambiar correa\nRevisar bomba  ')).toEqual({
      isWarrantyManagement: false,
      noteText: 'Cambiar correa\nRevisar bomba',
    });
  });

  test('formats and parses warranty management notes cleanly', () => {
    const onlyWarranty = formatOrderNotes(true, '   ');
    expect(onlyWarranty).toBe(WARRANTY_NOTE_PREFIX);
    expect(parseOrderNotes(onlyWarranty)).toEqual({
      isWarrantyManagement: true,
      noteText: '',
    });

    const withNote = formatOrderNotes(true, 'Se cambió placa sin cargo');
    expect(withNote).toBe(`${WARRANTY_NOTE_PREFIX}\nSe cambió placa sin cargo`);
    expect(parseOrderNotes(withNote)).toEqual({
      isWarrantyManagement: true,
      noteText: 'Se cambió placa sin cargo',
    });

    expect(parseOrderNotes(withNote.toLowerCase())).toEqual({
      isWarrantyManagement: true,
      noteText: 'se cambió placa sin cargo',
    });
  });

  test('disabling warranty keeps only the trimmed free-text note', () => {
    expect(formatOrderNotes(false, '  Nota normal  ')).toBe('Nota normal');
    expect(formatOrderNotes(false, '   ')).toBe('');
  });
});
