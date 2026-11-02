/** Escape one untrusted CSV value and neutralize spreadsheet formulas. */
export function escapeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

/** Build a CSV string from a matrix; optional BOM improves Excel UTF-8 detection. */
export function buildCsv(rows, { bom = true } = {}) {
  const content = (Array.isArray(rows) ? rows : [])
    .map((row) => (Array.isArray(row) ? row : [row]).map(escapeCsvCell).join(","))
    .join("\r\n");
  return `${bom ? "\ufeff" : ""}${content}`;
}
