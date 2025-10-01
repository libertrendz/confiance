export function toCSV(rows: any[], sep = ',') {
  if (!rows || rows.length === 0) return 'sep=' + sep + '\n';

  const headers = Object.keys(rows[0]);

  const esc = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [
    'sep=' + sep,
    headers.join(sep),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(sep)),
  ];

  return lines.join('\n');
}
