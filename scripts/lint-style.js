// 문체 점검(2026-11-22 PULSE 지시): AI 글처럼 보이는 상투 표현이 페이지당 2회 이상이면 경고해요(빌드는 멈추지 않아요).
// 긴 줄표(—)는 표의 빈 칸 표시(셀에 '—'만 있는 경우)를 빼고 센 뒤 1회까지만 허용해요.
const fs = require('fs');
const path = require('path');
const BANNED = ['정리했어요', '정리해 봤어요', '짚어 봤어요', '볼게요', '한 번쯤', '다들', '생각보다', '훨씬', '깔끔하게', '마음 편', '정답은 없어요', '이 페이지는', '이럴 때 쓰기 좋아요', '같이 읽어 볼 글'];
function walk(d, o) {
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'scripts') return;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, o); else if (e.name.endsWith('.html')) o.push(p);
  });
  return o;
}
function run(root) {
  const hits = [];
  walk(root, []).forEach((f) => {
    const h = fs.readFileSync(f, 'utf8');
    const m = h.match(/<main[\s\S]*<\/main>/);
    let t = (m ? m[0] : h).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<td[^>]*>\s*—\s*<\/td>/g, '<td></td>').replace(/<[^>]+>/g, ' ');
    const rel = path.relative(root, f).split(path.sep).join('/');
    const found = BANNED.map((b) => [b, t.split(b).length - 1]).filter(([, n]) => n > 0);
    const dash = t.split('—').length - 1;
    if (dash) found.push(['—', dash]);
    const total = found.reduce((a, [, n]) => a + n, 0);
    if (total >= 2) hits.push(rel + ': ' + found.map(([b, n]) => b + ' ' + n).join(', '));
  });
  return hits;
}
module.exports = { run, BANNED };
if (require.main === module) { const h = run(path.resolve(process.argv[2] || '.')); console.log('문체 점검: 경고 ' + h.length + '쪽'); h.forEach((x) => console.log(' ! ' + x)); }
