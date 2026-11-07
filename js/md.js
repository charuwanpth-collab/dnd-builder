// แปลง markdown (ข้อความ SRD) เป็น HTML แบบเบา ๆ
import { esc } from './util.js';

function inline(s) {
  return esc(s)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<i>$2</i>')
    .replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<i>$2</i>');
}

const isSep = l => /^\|[\s:|\-—]+\|?\s*$/.test(l);
const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

export function md(src) {
  const lines = String(src || '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,6})\s+(.*)/))) {
      out.push(`<h5 class="md-h">${inline(m[2])}</h5>`); i++; continue;
    }
    if (l.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter(r => !isSep(r)).map(cells);
      const head = body.shift() || [];
      out.push('<div class="md-tbl"><table><thead><tr>' + head.map(c => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' + body.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ord = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      out.push(`<${ord ? 'ol' : 'ul'}>` + items.map(t => `<li>${inline(t)}</li>`).join('') + `</${ord ? 'ol' : 'ul'}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) para.push(lines[i++]);
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    else i++;
  }
  return out.join('');
}
