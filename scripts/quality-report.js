#!/usr/bin/env node
// 푸디세이 콘텐츠 품질 점검: 빌드된 페이지를 전부 읽어 9가지 항목을 0~100점으로 매기고, 점수가 낮은 하위 20%를 표시해요.
// 실행: node scripts/quality-report.js [--out 폴더] [--sources data/source-checks.json] [--today YYYY-MM-DD]
//  - --out 폴더를 주면 quality-scores.csv, quality-scores.md, quality-summary.json을 저장해요(저장소에는 넣지 않는 보고용 파일).
//  - 출처 대조(정확성)는 scripts/verify-sources.js가 만든 source-checks.json이 있으면 반영하고, 없으면 '미검증'으로 둬요.
// build.js도 마지막에 run()을 불러 '품질 미달 페이지 수'를 경고로 보여 줘요(빌드를 멈추지는 않아요).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = 'https://foodyssey.co.kr';
const WEIGHTS = { length: 15, unique: 15, accuracy: 20, source: 10, read: 8, value: 12, title: 8, links: 6, fresh: 6 };
const LABELS = { length: '분량', unique: '고유성', accuracy: '정확성', source: '출처·기준일', read: '가독성', value: '사용자 가치', title: '제목·설명', links: '내부 링크', fresh: '신선도' };
// 기사에 근거가 없을 때 흔히 나오는 추측·일반론 표현(걸리면 정확성 감점)
const SPECULATIVE = ['보통 ', '일반적으로', '대체로', '것으로 보여', '것으로 보인', '가능성이 있', '추천해요', '추천드려요', '인기 매장', '체감상', '핵심이에요', '안전해요', '누구나', '평소', '아마', '예상돼요'];
const FAIL_BELOW = 70;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'scripts', 'data'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const dec = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function articleOf(h) {
  const m = h.match(/<article>([\s\S]*?)<\/article>/);
  return m ? m[1] : (h.match(/<main>([\s\S]*?)<\/main>/) || [0, ''])[1];
}
function unitsOf(art) {
  let t = art.replace(/<nav class="crumbs"[\s\S]*?<\/nav>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  t = t.replace(/<\/(p|li|td|th|dd|dt|h1|h2|h3|div|tr|ul|table|aside|span|a|b|small)>/g, '\n').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '');
  return dec(t).split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
const sentencesOf = (units) => units.flatMap((u) => u.split(/(?<=[.!?。])\s+/)).map((x) => x.trim()).filter((x) => x.length >= 4);
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
function shingles(s, n) { const set = new Set(); const t = s.replace(/\s+/g, ''); for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n)); return set; }
function jaccard(a, b) { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); }

function loadData(root) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
  return ctx.window.FOODYSSEY;
}
function kstToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }

function run(root, opts) {
  opts = opts || {};
  const today = opts.today || kstToday();
  const D = loadData(root);
  let arc = {};
  try { arc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'archive.json'), 'utf8')); } catch (e) {}
  let checks = {};
  const sp = opts.sources || path.join(root, 'data', 'source-checks.json');
  try { checks = JSON.parse(fs.readFileSync(sp, 'utf8')); } catch (e) {}
  let sm = '';
  try { sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'); } catch (e) {}
  const smLocs = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURI(m[1])));

  const files = walk(root, []).filter((f) => !/[\\/]ig[\\/]/.test(f));
  const pages = files.map((f) => {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    const h = fs.readFileSync(f, 'utf8');
    const urlPath = rel === 'index.html' ? '/' : '/' + rel.replace(/\.html$/, '').replace(/\/index$/, '');
    const art = articleOf(h);
    const units = unitsOf(art);
    const text = units.join(' ');
    const type = rel.startsWith('menu/') ? 'menu' : rel.startsWith('brand/') ? 'brand' : rel.startsWith('cat/') ? 'cat' : rel.startsWith('season/') ? 'season' : rel.startsWith('new/') ? 'month' : rel.startsWith('guide/') ? 'guide' : rel === 'index.html' ? 'home' : 'static';
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(h);
    return { f, rel, h, urlPath, art, units, text, chars: text.replace(/\s+/g, ' ').length, type, noindex, inSitemap: smLocs.has(SITE + urlPath) || smLocs.has(SITE + urlPath + '/') };
  });
  // 빌드된 index.html은 자바스크립트로 그려서 article이 없어요: 본문 전체(main)를 써요.
  pages.forEach((p) => { if (p.type === 'home') { const m = p.h.match(/<main>([\s\S]*?)<\/main>/); const body = p.h.slice(Math.max(0, p.h.indexOf('<body'))); p.art = body; p.units = unitsOf(body); p.text = p.units.join(' '); p.chars = p.text.length; } });

  // 문장 단위 중복: 그 페이지의 브랜드·메뉴 이름과 숫자를 가려서, 이름만 바꾼 같은 틀의 문장이 같은 문장으로 세어지게 해요.
  const nameTokens = (p) => {
    const toks = new Set();
    const h1 = (p.art.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [0, ''])[1].replace(/<[^>]+>/g, '');
    if (h1) { toks.add(dec(h1).trim()); dec(h1).split(/\s+/).forEach((w) => { if (w.length >= 2) toks.add(w); }); }
    const kick = (p.art.match(/<p class="kicker">([^<]*)</) || [0, ''])[1];
    kick.split(/[·\s]+/).forEach((w) => { if (w.length >= 2) toks.add(dec(w)); });
    return [...toks].sort((a, b) => b.length - a.length);
  };
  const norm = (p, sent) => { let x = sent; (p._toks || (p._toks = nameTokens(p))).forEach((tk) => { x = x.split(tk).join('◇'); }); return x.replace(/[0-9][0-9,.]*/g, '#').replace(/[‘’'"“”]/g, ''); };
  const df = new Map();
  pages.forEach((p) => { p._ss = sentencesOf(p.units).map((x) => ({ raw: x, key: norm(p, x) })); const seen = new Set(p._ss.map((x) => x.key)); seen.forEach((k) => df.set(k, (df.get(k) || 0) + 1)); });
  pages.forEach((p) => {
    const ss = p._ss.map((x) => x.raw);
    const keys = p._ss.map((x) => x.key);
    const tot = ss.reduce((a, s) => a + s.length, 0) || 1;
    p.uniqueChars = p._ss.filter((x) => df.get(x.key) === 1).reduce((a, x) => a + x.raw.length, 0);
    p.boilerChars = p._ss.filter((x) => df.get(x.key) >= 4).reduce((a, x) => a + x.raw.length, 0);
    p.uniqueRatio = p.uniqueChars / tot;
    p.boilerRatio = p.boilerChars / tot;
  });
  // 같은 종류 페이지끼리 가장 비슷한 쌍(문장 틀만 다르고 이름만 바뀐 정도)
  const byType = {};
  pages.forEach((p) => { (byType[p.type] = byType[p.type] || []).push(p); p.sh = shingles(p._ss.filter((x) => df.get(x.key) <= 3).map((x) => x.key).join(' '), 6); });
  ['menu', 'brand'].forEach((t) => (byType[t] || []).forEach((p) => { let best = 0, who = ''; (byType[t] || []).forEach((q) => { if (q === p) return; const j = jaccard(p.sh, q.sh); if (j > best) { best = j; who = q.rel; } }); p.nearDup = best; p.nearWho = who; }));

  // 링크
  const inbound = new Map();
  pages.forEach((p) => { [...p.h.matchAll(/href="(\/[^"#?]*)/g)].forEach((m) => { let u; try { u = decodeURI(m[1]); } catch (e) { return; } u = u.replace(/\/$/, '') || '/'; if (u !== p.urlPath) inbound.set(u, (inbound.get(u) || 0) + 1); }); });

  const titles = new Map(), descs = new Map();
  pages.forEach((p) => { p.title = (p.h.match(/<title>([^<]*)<\/title>/) || [0, ''])[1]; p.desc = dec((p.h.match(/<meta name="description" content="([^"]*)"/) || [0, ''])[1]); titles.set(p.title, (titles.get(p.title) || 0) + 1); descs.set(p.desc, (descs.get(p.desc) || 0) + 1); });

  // 기록(archive) 매칭
  // 지금 data.js에 올라 있는 항목(slug)과 판매·진행 상태를 data.js에서 직접 계산해요(archive.json에는 '지금 올라 있음' 표시가 없어요).
  const slugOf = (s) => String(s).replace(/[·•/&+,()\[\]{}'"!?.:;~]/g, ' ').replace(/[^0-9A-Za-z가-힣\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').toLowerCase();
  const live = new Set();
  D.newItems.forEach((g) => g.items.forEach((it) => live.add(slugOf(g.brand + ' ' + it.name))));
  D.limited.forEach((x) => live.add(slugOf(x.brand + ' ' + x.title)));
  const rec = (p) => (p.type === 'menu' ? arc[decodeURIComponent(path.basename(p.rel, '.html'))] || arc[path.basename(p.rel, '.html')] : null);
  const updated = D.updated || '';
  const gapDays = updated ? Math.round((Date.parse(today) - Date.parse(updated)) / 86400000) : 99;

  const rows = pages.map((p) => {
    const r = rec(p);
    const sc = {}; const notes = []; const hard = [];
    // 1 분량
    const minChars = p.type === 'menu' ? 800 : 800;
    sc.length = clamp((p.chars / minChars) * 100);
    if (p.chars < minChars) notes.push(`분량 ${p.chars}자(<${minChars})`);
    // 2 고유성
    const needU = p.type === 'menu' ? 220 : 400;
    sc.unique = clamp(55 * Math.min(1, p.uniqueChars / needU) + 25 * Math.min(1, p.uniqueRatio / 0.35) + 20 * (1 - Math.min(1, (p.nearDup || 0) / 0.8)));
    if (p.uniqueChars < needU * 0.5) notes.push(`고유 문장 ${p.uniqueChars}자`);
    if ((p.nearDup || 0) >= 0.6) notes.push(`비슷한 페이지 ${Math.round(p.nearDup * 100)}%(${p.nearWho})`);
    // 3 정확성
    let acc = 100; let verified = false;
    const spec = SPECULATIVE.filter((w) => p.text.includes(w));
    if (spec.length) { acc -= 12 * spec.length; notes.push('추측·일반론 표현: ' + spec.join(',')); }
    if (r) {
      if (r.price && !r.src) { acc -= 40; hard.push('가격에 출처 없음'); }
      if ((r.date || r.end) && !r.src) { acc -= 30; hard.push('날짜에 출처 없음'); }
      const ck = r.src && checks[r.src.url];
      if (ck && ck.status === 'ok') {
        verified = true;
        const it = (ck.items || {})[r.name];
        const fl = [];
        if (r.price && ck.priceFound && ck.priceFound[r.price] === false) { acc -= 40; fl.push('가격 원문 불일치'); }
        if (ck.dateFound && r.kind === 'new' && ck.dateFound[r.date] === false) { acc -= 20; fl.push('출시·발표일 원문 불일치'); }
        if (r.end && ck.endFound && ck.endFound[r.end] === false) { acc -= 25; fl.push('종료일 원문 불일치'); }
        if (it === false) { acc -= 10; fl.push('메뉴명 원문 없음'); }
        if (fl.length) { notes.push(fl.join(',')); hard.push(fl.join(',')); }
      }
    }
    if (!verified && p.type === 'menu') { acc = Math.min(acc, 75); notes.push('출처 원문 미대조'); }
    sc.accuracy = clamp(acc);
    p.verified = verified;
    // 4 출처·기준일
    if (p.type === 'menu') {
      sc.source = clamp((/class="src"/.test(p.h) ? 40 : 0) + (/등록일/.test(p.text) ? 25 : 0) + (/사이트 마지막 업데이트/.test(p.text) ? 15 : 0) + (r && r.src ? 20 : 0));
    } else if (p.type === 'static') sc.source = clamp(/기준|시행일|최종|업데이트/.test(p.text) ? 100 : 80);
    else sc.source = clamp((/기준일|마지막 업데이트/.test(p.text) ? 60 : 0) + (/출처|<a href="https?:/.test(p.art) ? 40 : 0));
    if (sc.source < 80) notes.push('출처·기준일 표기 부족');
    // 5 가독성
    const paras = [...p.art.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => dec(m[1].replace(/<[^>]+>/g, '')).length);
    const longest = paras.length ? Math.max(...paras) : 0;
    const h2 = (p.art.match(/<h2/g) || []).length;
    const tables = (p.art.match(/<table/g) || []).length;
    const labelled = (p.art.match(/<td data-label=/g) || []).length;
    let rd = 100;
    if (longest > 260) rd -= Math.min(30, (longest - 260) / 6);
    if (p.chars > 900 && h2 < 2) rd -= 20;
    if (tables && !labelled) rd -= 15;
    sc.read = clamp(rd);
    if (sc.read < 85) notes.push(`가독성(가장 긴 문단 ${longest}자, 소제목 ${h2}개)`);
    // 6 사용자 가치
    if (p.type === 'menu' && r) {
      const what = (r.desc && r.desc.length >= 40) || (r.group && r.group.length > 1) || (r.lines && r.lines.length) || ((r.note || '').length >= 30);
      const when = !!(r.date || r.when || r.period || r.end || r.open);
      const priceOrNone = !!r.price || /확인 안 됨|가격/.test(p.text);
      const cmp = /class="rel"/.test(p.h) && /<h2>/.test(p.art);
      sc.value = clamp(25 * what + 25 * when + 20 * priceOrNone + 30 * cmp);
      if (!what) notes.push('메뉴가 무엇인지 설명 부족');
      if (!cmp) notes.push('비교·연결 정보 없음');
    } else if (p.type === 'brand' || p.type === 'cat') {
      sc.value = clamp((/class="compare"/.test(p.art) ? 40 : 0) + (/<p>[^<]{60,}/.test(p.art) ? 30 : 0) + (/class="dl"/.test(p.art) ? 30 : 0));
    } else sc.value = clamp(p.chars >= 800 ? 100 : (p.chars / 800) * 100);
    // 7 제목·설명
    let tt = 100;
    if (p.title.length < 12 || p.title.length > 70) { tt -= 15; notes.push('제목 길이 ' + p.title.length); }
    if (titles.get(p.title) > 1) { tt -= 30; notes.push('제목 중복'); }
    if (descs.get(p.desc) > 1) { tt -= 25; notes.push('설명 중복'); }
    if (p.desc.length < 60) { tt -= 20; notes.push('설명 짧음 ' + p.desc.length); }
    if (p.desc.length >= 150 && !/[.요다]$|[0-9]$/.test(p.desc.trim())) { tt -= 12; notes.push('설명이 문장 중간에서 잘림'); }
    const h1 = dec((p.art.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [0, ''])[1].replace(/<[^>]+>/g, ''));
    if (p.type === 'menu' && r && !p.title.includes(r.name.split(' ')[0].slice(0, 3))) { tt -= 20; notes.push('제목에 메뉴명 없음'); }
    if (p.type !== 'home' && h1 && !p.title.replace(/\s/g, '').includes(h1.replace(/\s/g, '').slice(0, 4))) tt -= 5;
    sc.title = clamp(tt);
    // 8 내부 링크
    const inb = inbound.get(p.urlPath) || 0;
    const outb = new Set([...p.art.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1])).size;
    sc.links = clamp(30 * Math.min(1, inb / 4) + 40 * Math.min(1, outb / 8) + (/class="crumbs"/.test(p.art) || p.type === 'home' ? 15 : 0) + (/href="\/(brand|cat|season|guide|new|updates)/.test(p.art) ? 15 : 0));
    if (inb < 2) notes.push(`들어오는 링크 ${inb}개`);
    if (outb < 5) notes.push(`나가는 내부 링크 ${outb}개`);
    // 9 신선도
    let fr = 100;
    if (p.type === 'menu' && r) {
      const last = r.endLate || r.end;
      const isLive = live.has(decodeURIComponent(path.basename(p.rel, '.html')));
      const ended = r.kind === 'new' ? !isLive : (!!(last && last < today) || !isLive);
      const said = /판매 종료|이벤트 종료|지난 신메뉴/.test(p.text);
      if (ended && !said && !/마감|종료/.test(p.text)) { fr -= 60; hard.push('끝난 항목인데 종료 표시 없음'); }
      if (!ended && /판매 종료|이벤트 종료/.test((p.h.match(/<span class="badge off"[^>]*>[^<]*/) || [''])[0])) { fr -= 40; hard.push('진행 중인데 종료 표시'); }
      if (r.kind === 'new' && r.date && (Date.parse(today) - Date.parse(r.date)) / 86400000 > 42 && !/지난 신메뉴/.test(p.text)) { fr -= 10; notes.push('출시 6주 경과'); }
    }
    if (p.type !== 'static' && /마지막 업데이트/.test(p.text) && updated && !p.text.includes(updated.slice(0, 4) + '년 ' + Number(updated.slice(5, 7)) + '월 ' + Number(updated.slice(8, 10)) + '일')) { fr -= 25; hard.push('마지막 업데이트 날짜 불일치'); }
    if (gapDays >= 2) { fr -= Math.min(30, gapDays * 5); if (p.type === 'home') notes.push(`데이터 업데이트가 ${gapDays}일 전(${updated})`); }
    sc.fresh = clamp(fr);
    let total = 0; Object.keys(WEIGHTS).forEach((k) => { total += (sc[k] * WEIGHTS[k]) / 100; });
    total = Math.round(total);
    const hangul = (p.text.match(/[가-힣]/g) || []).length;
    return { rel: p.rel, hangul, url: p.urlPath, type: p.type, noindex: p.noindex, inSitemap: p.inSitemap, chars: p.chars, uniqueChars: p.uniqueChars, boiler: Math.round(p.boilerRatio * 100), nearDup: Math.round((p.nearDup || 0) * 100), verified: p.verified, scores: sc, total, notes, hard };
  });
  // 하위 20%
  const sorted = rows.slice().sort((a, b) => a.total - b.total);
  const cut = sorted[Math.max(0, Math.floor(rows.length * 0.2) - 1)].total;
  rows.forEach((r) => { r.bottom20 = r.total <= cut; r.fail = r.total < FAIL_BELOW || r.hard.length > 0; });
  // 유형별 미달 건수
  const failTypes = {};
  rows.filter((r) => r.fail).forEach((r) => { const keys = new Set(); r.hard.forEach((h) => keys.add('치명:' + h)); Object.keys(r.scores).forEach((k) => { if (r.scores[k] < 60) keys.add(LABELS[k]); }); if (r.total < FAIL_BELOW) keys.add('총점<' + FAIL_BELOW); keys.forEach((k) => { failTypes[k] = (failTypes[k] || 0) + 1; }); });
  return { today, updated, gapDays, rows, cut, failCount: rows.filter((r) => r.fail).length, bottomCount: rows.filter((r) => r.bottom20).length, failTypes, verifiedPages: rows.filter((r) => r.verified).length };
}

function write(out, res) {
  fs.mkdirSync(out, { recursive: true });
  const ks = Object.keys(WEIGHTS);
  const esc = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  const csv = ['URL,유형,색인,사이트맵,본문자수,한글자수,고유문장자수,반복문장%,최대유사%,출처대조,' + ks.map((k) => LABELS[k]).join(',') + ',총점,하위20%,미달,메모'].concat(res.rows.sort((a, b) => a.total - b.total).map((r) => [r.url, r.type, r.noindex ? 'noindex' : 'index', r.inSitemap ? 'Y' : 'N', r.chars, r.hangul, r.uniqueChars, r.boiler, r.nearDup, r.verified ? '대조됨' : '미검증'].concat(ks.map((k) => r.scores[k]), [r.total, r.bottom20 ? 'Y' : '', r.fail ? 'Y' : '', esc(r.hard.concat(r.notes).join(' / '))]).join(','))).join('\n');
  fs.writeFileSync(path.join(out, 'quality-scores.csv'), '\ufeff' + csv + '\n');
  const avg = (rs, k) => (rs.length ? Math.round(rs.reduce((a, r) => a + (k ? r.scores[k] : r.total), 0) / rs.length) : '-');
  const types = [...new Set(res.rows.map((r) => r.type))];
  let md = `# 푸디세이 콘텐츠 품질 점수표\n\n- 기준일: ${res.today} (data.js 업데이트 ${res.updated}, ${res.gapDays}일 전)\n- 점검 페이지: ${res.rows.length}개 · 미달: ${res.failCount}개 · 하위 20%(총점 ≤ ${res.cut}): ${res.bottomCount}개 · 출처 원문 대조됨: ${res.verifiedPages}개\n- 미달 기준: 총점 ${FAIL_BELOW} 미만 또는 치명 문제(출처 없는 가격·날짜, 원문 불일치, 종료 표시 오류 등)\n- 항목 가중치: ${ks.map((k) => LABELS[k] + ' ' + WEIGHTS[k]).join(', ')}\n\n## 유형별 평균\n\n| 유형 | 페이지 | 총점 | ${ks.map((k) => LABELS[k]).join(' | ')} |\n|---|---|---|${ks.map(() => '---').join('|')}|\n`;
  types.forEach((t) => { const rs = res.rows.filter((r) => r.type === t); md += `| ${t} | ${rs.length} | ${avg(rs)} | ${ks.map((k) => avg(rs, k)).join(' | ')} |\n`; });
  md += `\n## 미달 유형별 건수\n\n${Object.keys(res.failTypes).length ? Object.entries(res.failTypes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}개`).join('\n') : '- 없음'}\n\n## 하위 20% (우선 보강 대상)\n\n| 총점 | URL | 유형 | 메모 |\n|---|---|---|---|\n`;
  res.rows.filter((r) => r.bottom20).sort((a, b) => a.total - b.total).forEach((r) => { md += `| ${r.total} | ${r.url} | ${r.type} | ${(r.hard.concat(r.notes).join(' / ') || '-').replace(/\|/g, '/')} |\n`; });
  fs.writeFileSync(path.join(out, 'quality-scores.md'), md);
  fs.writeFileSync(path.join(out, 'quality-summary.json'), JSON.stringify({ today: res.today, pages: res.rows.length, fail: res.failCount, bottom20: res.bottomCount, cut: res.cut, failTypes: res.failTypes }, null, 1));
}


// 콘텐츠 가치 게이트(2026-11 애드센스 '가치가 별로 없는 콘텐츠' 사전 차단): 색인 대상 페이지는 본문 한글 1,000자 이상이어야 해요.
// 메뉴 상세 페이지는 한 가지 메뉴에 대한 기사 근거가 한정돼 있어 글자 수를 억지로 채우지 않고(반복 문장 금지), 경고로만 알려요.
// 그 밖의 유형(홈·허브·가이드·월별·시즌·정적)은 미달이면 빌드를 실패시켜요. 아직 보강 중인 페이지는 data/value-exceptions.json에 사유·기한과 함께 적어요.
const VALUE_MIN_HANGUL = 1000;
function valueGate(rows, root) {
  let ex = {};
  try { ex = JSON.parse(fs.readFileSync(path.join(root, 'data', 'value-exceptions.json'), 'utf8')); } catch (e) {}
  const errs = [], warns = [], stale = [];
  rows.filter((r) => !r.noindex).forEach((r) => {
    const low = r.hangul < VALUE_MIN_HANGUL;
    if (r.type === 'menu') { if (low) warns.push(r); return; }
    if (low && !ex[r.rel]) errs.push(r.url + ': 본문 한글 ' + r.hangul + '자(1,000자 미만) — 보강하거나 data/value-exceptions.json에 사유·기한을 적어요');
    if (!low && ex[r.rel]) stale.push(r.rel);
  });
  return { errs, warns, stale, exceptions: Object.keys(ex).length };
}

module.exports = { valueGate, VALUE_MIN_HANGUL, run, write, WEIGHTS, LABELS, FAIL_BELOW };

if (require.main === module) {
  const a = process.argv.slice(2); const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const root = path.resolve(__dirname, '..');
  const res = run(root, { today: get('--today'), sources: get('--sources') });
  if (get('--out')) write(get('--out'), res);
  console.log(`품질 점검: 페이지 ${res.rows.length}개, 미달 ${res.failCount}개, 하위 20% ${res.bottomCount}개(총점 ≤ ${res.cut}), 출처 대조 ${res.verifiedPages}개`);
  console.log('미달 유형:', JSON.stringify(res.failTypes));
  res.rows.slice().sort((a, b) => a.total - b.total).slice(0, 12).forEach((r) => console.log(String(r.total).padStart(3), r.url, '|', r.hard.concat(r.notes).slice(0, 3).join(' / ')));
}
