const FORMULA_LEAD = /^[\s\u0000-\u001f]*[=+\-@]/;

export const csvCell = (value) => {
  const raw = String(value ?? '');
  const safe = FORMULA_LEAD.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsvRow = (cells) => cells.map(csvCell).join(',');

export const toCsvDocument = (rows) =>
  `\uFEFF${rows.map(toCsvRow).join('\r\n')}`;
