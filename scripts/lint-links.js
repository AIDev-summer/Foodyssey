// 링크 구조 검사(2026-11-19 PULSE 검색 전략): 색인 대상(사이트맵) 페이지가 다른 페이지에서 한 번도 링크되지 않은 '고아 페이지'가 없어야 하고,
// 본문 링크 글자가 '여기·클릭·링크' 같은 설명 없는 말이면 안 돼요. 위반하면 빌드가 멈춰요.
const fs = require('fs');
const path = require('path');

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'scripts') return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.html')) out.push(p);
  });
  return out;
}
const norm = (u) => {
  let x = u.split('#')[0].split('?')[0];
  x = x.replace(/^https:\/\/foodyssey\.co\.kr/, '');
  try { x = decodeURI(x); } catch (e) {}
  if (x.length > 1 && x.endsWith('.html')) x = x.slice(0, -5);
  if (x.endsWith('/index')) x = x.slice(0, -5);
  return x;
};
const WEAK = /^(여기|여기를|클릭|클릭하세요|링크|이곳|바로가기|자세히|더보기)$/;

function run(root) {
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const targets = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => norm(m[1]));
  const inbound = {};
  const weak = [];
  walk(root, []).forEach((f) => {
    const rel = '/' + path.relative(root, f).split(path.sep).join('/');
    const self = norm(rel);
    const h = fs.readFileSync(f, 'utf8');
    const body = (h.match(/<main[\s\S]*<\/main>/) || [h])[0];
    // 이 쪽에서 나가는 모든 내부 링크(머리글·바닥글 포함)를 세요
    for (const m of h.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const href = m[1];
      if (!/^\/|^https:\/\/foodyssey\.co\.kr/.test(href) || /^\/\//.test(href)) continue;
      const to = norm(href);
      if (to !== self) { (inbound[to] = inbound[to] || new Set()).add(self); }
    }
    for (const m of body.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
      const txt = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (WEAK.test(txt)) weak.push(self + ': "' + txt + '"');
    }
  });
  const orphans = targets.filter((t) => t !== '/' && !(inbound[t] && inbound[t].size));
  return { indexable: targets.length, orphans, weak };
}
module.exports = { run };
if (require.main === module) {
  const r = run(path.resolve(process.argv[2] || '.'));
  console.log(`링크 구조: 색인 대상 ${r.indexable}쪽, 고아 ${r.orphans.length}쪽, 설명 없는 링크 ${r.weak.length}곳`);
  r.orphans.forEach((x) => console.log(' - 고아: ' + x)); r.weak.forEach((x) => console.log(' - 약한 링크: ' + x));
  process.exit(r.orphans.length || r.weak.length ? 1 : 0);
}
