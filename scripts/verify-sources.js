#!/usr/bin/env node
// 출처 원문 대조: data.js의 가격·출시일·종료일·메뉴 이름이 출처 기사 본문에 실제로 있는지 확인해요(네트워크 필요).
// 실행: node scripts/verify-sources.js [--only 주소일부] [--changed 이전커밋] [--out data/source-checks.json]
//  - 결과(status: ok | fetch-failed, priceFound/dateFound/endFound/items)를 data/source-checks.json에 합쳐 저장해요.
//  - 기사에서 못 찾은 값이 있으면 종료 코드 1로 끝나요(PR 확인용). 못 열린 기사(차단 등)는 실패로 세지 않고 '미검증'으로 둬요.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUT_DEFAULT = path.join(ROOT, 'data', 'source-checks.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function loadData(file) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file || path.join(ROOT, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
  return ctx.window.FOODYSSEY;
}
// 기사 본문 글자만 뽑기(광고·메뉴 글자는 섞여도 괜찮고, 값이 '있는지'만 봐요)
function textOf(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lsquo;|&rsquo;/g, "'").replace(/\s+/g, ' ');
}
const squash = (s) => s.replace(/[\s,·'"‘’“”()\[\]·\-_/]/g, '');
// 가격: '12,400원' → 12400원 / 1만2400원 / 12,400 등 여러 표기를 모두 인정
function priceForms(p) {
  const out = [];
  String(p).split(/[·,/]\s*(?=\d)/).forEach((part) => {
    const m = part.match(/([\d,]+)\s*원?/);
    if (m) { const n = Number(m[1].replace(/,/g, '')); if (n) { out.push(String(n)); if (n >= 10000) { const man = Math.floor(n / 10000), rest = n % 10000; out.push(man + '만' + (rest ? rest : '') + '원'); out.push(man + '만' + (rest ? String(rest) : '')); } } }
    const man = part.match(/(\d+)\s*만\s*원?대?/); if (man) out.push(man[1] + '만');
  });
  return [...new Set(out)];
}
function priceOk(text, p) {
  const t = squash(text);
  const parts = String(p).split('·');
  // '23,000·24,000원'처럼 하나의 표기에 여러 가격이 있으면 각각 확인
  const nums = String(p).match(/\d[\d,]*/g) || [];
  if (/만\s*원/.test(p) && !/,/.test(p)) return t.includes(squash(String(p).replace(/\s*원?대?$/, '')).replace('원', '')) || t.includes(squash(String(p)));
  return nums.every((n) => { const v = Number(n.replace(/,/g, '')); return t.includes(String(v)) || (v >= 10000 && (t.includes(Math.floor(v / 10000) + '만' + (v % 10000 ? v % 10000 : '')))); });
}
const md = (iso) => { const [, m, d] = iso.split('-').map(Number); return { m, d }; };
function dateOk(text, iso, pubIso) {
  const { m, d } = md(iso); const t = squash(text);
  const forms = [`${m}월${d}일`, `${m}.${d}`, `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`, `${m}/${d}`, `${d}일`, `${iso}`, iso.replace(/-/g, '.')];
  if (forms.some((f) => t.includes(squash(f)))) return true;
  if (pubIso) { const diff = Math.abs(Date.parse(pubIso) - Date.parse(iso)) / 86400000; if (diff <= 2) return true; }
  return false;
}
function pubDate(html) {
  const m = html.match(/(?:article:published_time|datePublished|pubdate|og:regDate)[^>]*content="(\d{4}-\d{2}-\d{2})/i) || html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/) || html.match(/(20\d\d)[.\-](\d{2})[.\-](\d{2})/);
  if (!m) return null;
  return m[2] && m.length > 3 ? `${m[1]}-${m[2]}-${m[3]}` : m[1];
}
const nameOk = (text, name) => { const t = squash(text); const base = name.replace(/\(.*?\)/g, ''); return t.includes(squash(base)) || base.split('·').every((x) => squash(x) && t.includes(squash(x))); };

async function fetchText(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 25000);
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' }, redirect: 'follow', signal: ac.signal });
      clearTimeout(tm);
      if (!r.ok) return { status: 'fetch-failed', code: r.status };
      const buf = Buffer.from(await r.arrayBuffer());
      let html = buf.toString('utf8');
      const cs = ((r.headers.get('content-type') || '').match(/charset=([\w-]+)/i) || html.slice(0, 3000).match(/charset=["']?([\w-]+)/i) || [0, 'utf-8'])[1].toLowerCase();
      if (/euc-?kr|ks_c_5601|cp949/.test(cs)) html = new TextDecoder('euc-kr').decode(buf);
      if (html.length < 800) return { status: 'fetch-failed', code: 'short' };
      return { status: 'ok', html };
    } catch (e) { if (i === 1) return { status: 'fetch-failed', code: String(e.message || e).slice(0, 40) }; }
  }
}

async function main() {
  const a = process.argv.slice(2); const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const outFile = get('--out') || OUT_DEFAULT; const only = get('--only'); const changedFrom = get('--changed');
  const D = loadData();
  const byUrl = new Map();
  const add = (src, rec) => { if (!src || !src.url) return; if (!byUrl.has(src.url)) byUrl.set(src.url, []); byUrl.get(src.url).push(rec); };
  // 가격 근거가 '공식 홈페이지'로 적힌 항목은 기사에서 값을 찾지 않고 표시만 해요(화면에도 그 출처를 밝히고 있어요).
  const officialPrice = (g, it) => /홈페이지|공식/.test((g.note || '') + ' ' + (it.desc || ''));
  D.newItems.forEach((g) => g.items.forEach((it) => add(g.src, { kind: 'new', brand: g.brand, name: it.name, price: officialPrice(g, it) ? '' : (it.price || ''), officialPrice: officialPrice(g, it) && !!it.price, date: g.date || '', end: '' })));
  D.limited.forEach((x) => add(x.src, { kind: x.kind, brand: x.brand, name: x.title, price: x.price || '', date: '', start: x.start || '', end: x.endLate ? '' : (x.end || ''), lines: x.lines || null }));
  if (D.hotNew && D.hotNew.src) add(D.hotNew.src, { kind: 'hot', brand: '', name: D.hotNew.name, price: D.hotNew.price || '', date: '', end: '' });
  let urls = [...byUrl.keys()];
  if (only) urls = urls.filter((u) => u.includes(only));
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch (e) {}
  if (changedFrom) { // 이전 data.js와 비교해 새로 생기거나 바뀐 출처만
    const { execSync } = require('child_process');
    try { const old = execSync(`git show ${changedFrom}:data.js`, { cwd: ROOT, encoding: 'utf8' }); const oldUrls = new Set([...old.matchAll(/url: "(https?:[^"]+)"/g)].map((m) => m[1])); urls = urls.filter((u) => !oldUrls.has(u)); } catch (e) {}
  }
  const res = Object.assign({}, prev);
  const failures = [];
  let idx = 0;
  const worker = async () => {
    while (idx < urls.length) {
      const u = urls[idx++];
      const r = await fetchText(u);
      const recs = byUrl.get(u);
      const entry = { checkedAt: new Date().toISOString().slice(0, 10), status: r.status };
      if (r.status !== 'ok') { entry.code = r.code; res[u] = entry; continue; }
      const text = textOf(r.html); const pub = pubDate(r.html);
      entry.published = pub || '';
      entry.priceFound = {}; entry.dateFound = {}; entry.endFound = {}; entry.items = {};
      recs.forEach((rc) => {
        if (rc.officialPrice) entry.officialPrice = (entry.officialPrice || 0) + 1;
        if (rc.price) { entry.priceFound[rc.price] = priceOk(text, rc.price); if (!entry.priceFound[rc.price]) failures.push(`${rc.brand} ${rc.name}: 가격 '${rc.price}'이 기사에 없어요 → ${u}`); }
        if (rc.kind === 'new' && rc.date) { entry.dateFound[rc.date] = dateOk(text, rc.date, pub); if (!entry.dateFound[rc.date]) failures.push(`${rc.brand} ${rc.name}: 날짜 ${rc.date}를 기사에서 못 찾았어요 → ${u}`); }
        if (rc.end) { entry.endFound[rc.end] = dateOk(text, rc.end, null); if (!entry.endFound[rc.end]) failures.push(`${rc.brand} ${rc.name}: 종료일 ${rc.end}를 기사에서 못 찾았어요 → ${u}`); }
        if (rc.kind === 'limited' || rc.kind === '메뉴' || rc.kind === '이벤트') { /* 제목은 기사 표현과 달라도 돼요 */ }
        if (rc.kind === 'new') { entry.items[rc.name] = nameOk(text, rc.name); if (!entry.items[rc.name]) failures.push(`${rc.brand} ${rc.name}: 메뉴 이름이 기사에 없어요(표기 차이일 수 있음) → ${u}`); }
      });
      res[u] = entry;
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const sorted = {}; Object.keys(res).sort().forEach((k) => { sorted[k] = res[k]; });
  fs.writeFileSync(outFile, JSON.stringify(sorted, null, 1) + '\n');
  const ok = urls.filter((u) => res[u].status === 'ok').length;
  console.log(`출처 대조: 기사 ${urls.length}건 중 열린 것 ${ok}건, 못 연 것 ${urls.length - ok}건, 값 불일치 ${failures.length}건`);
  failures.forEach((f) => console.log(' - ' + f));
  urls.filter((u) => res[u].status !== 'ok').forEach((u) => console.log(' ? 열리지 않음(' + res[u].code + '): ' + u));
  process.exit(failures.length ? 1 : 0);
}
if (require.main === module) main();
module.exports = { priceOk, dateOk, nameOk };
