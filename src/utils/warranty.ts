export const WARRANTY_NOTE_PREFIX = 'Tipo de gestión: Reparación de garantía (sin costo)';

export type ParsedOrderNotes = {
  isWarrantyManagement: boolean;
  noteText: string;
};

/**
 * Extracts the warranty management marker and the remaining free-text note
 * from an order's `diagnosis` string without altering unrelated lines.
 */
export function parseOrderNotes(diagnosis: string): ParsedOrderNotes {
  const raw = diagnosis ?? '';
  if (!raw.trim()) {
    return { isWarrantyManagement: false, noteText: '' };
  }

  const normalizedPrefix = WARRANTY_NOTE_PREFIX.toLowerCase();
  const lines = raw.split(/\r?\n/);
  let isWarrantyManagement = false;
  const remaining: string[] = [];

  for (const line of lines) {
    if (line.trim().toLowerCase() === normalizedPrefix) {
      isWarrantyManagement = true;
    } else {
      remaining.push(line);
    }
  }

  return {
    isWarrantyManagement,
    noteText: remaining.join('\n').trim(),
  };
}

/**
 * Formats the order `diagnosis` string from the management type and free-text note.
 */
export function formatOrderNotes(isWarrantyManagement: boolean, noteText: string): string {
  const cleanNote = noteText.trim();
  if (!isWarrantyManagement) return cleanNote;
  return cleanNote ? `${WARRANTY_NOTE_PREFIX}\n${cleanNote}` : WARRANTY_NOTE_PREFIX;
}
