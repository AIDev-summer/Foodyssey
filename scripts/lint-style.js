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
// 합쇼체 통일(2026-11-22): 본문 문장이 해요체(~요)로 끝나면 경고. 제목(h1~h3)·상품명·앱 이름은 제외해요.
const PROTECT = ['도우와줘요', '도와줘요', '홍고추마요', '고추마요', '마요', '필요', '도요', '세요', '땡겨요', '요기요'];
const HAEYO = /(?<![가-힣])([가-힣]+요)(?![가-힣])(?!\?)/g;
function run(root) {
  const hits = [];
  const haeyo = [];
  const btn = [];
  walk(root, []).forEach((f) => {
    const h = fs.readFileSync(f, 'utf8');
    const m = h.match(/<main[\s\S]*<\/main>/);
    let t = (m ? m[0] : h).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<td[^>]*>\s*—\s*<\/td>/g, '<td></td>').replace(/<[^>]+>/g, ' ');
    const rel = path.relative(root, f).split(path.sep).join('/');
    const plain = (m ? m[0] : h).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<h[1-3][\s\S]*?<\/h[1-3]>/g, ' ').replace(/“[^”]*”/g, ' ').replace(/<[^>]+>/g, ' ');
    const hy = [...plain.matchAll(HAEYO)].map((x) => x[1]).filter((x) => !PROTECT.includes(x));
    if (hy.length) haeyo.push(rel + ': 해요체 ' + hy.length + '곳(' + [...new Set(hy)].slice(0, 4).join(', ') + ')');
    for (const b of (m ? m[0] : h).replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/<(a|button)[^>]*>([\s\S]*?)<\/>/g)) {
      const tx = b[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (tx.length > 3 && /(요|니다)[.!]?$/.test(tx) && !PROTECT.some((p) => tx.endsWith(p))) btn.push(rel + ': 버튼·링크 문구가 서술형 "' + tx.slice(0, 30) + '"(~하기로 끝내기)');
    }
    const found = BANNED.map((b) => [b, t.split(b).length - 1]).filter(([, n]) => n > 0);
    const dash = t.split('—').length - 1;
    if (dash) found.push(['—', dash]);
    const total = found.reduce((a, [, n]) => a + n, 0);
    if (total >= 2) hits.push(rel + ': ' + found.map(([b, n]) => b + ' ' + n).join(', '));
  });
  return hits.concat(haeyo).concat(btn);
}
module.exports = { run, BANNED };
if (require.main === module) { const h = run(path.resolve(process.argv[2] || '.')); console.log('문체 점검: 경고 ' + h.length + '쪽'); h.forEach((x) => console.log(' ! ' + x)); }
