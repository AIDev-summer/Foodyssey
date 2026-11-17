#!/usr/bin/env node
// data.js 구조 점검(자동 병합 전 필수): 불러올 수 있는지, limited·newItems 키가 한 번씩만 있는지, 항목 수가 갑자기 줄지 않았는지 확인해요.
// 사용: node scripts/check-data.js [이전 data.js 경로]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const file = path.resolve(__dirname, '..', 'data.js');
const src = fs.readFileSync(file, 'utf8');
const errs = [];
['newItems', 'limited', 'cats', 'hotNew', 'hotLimited'].forEach((k) => {
  const n = (src.match(new RegExp('^  ' + k + ':', 'gm')) || []).length;
  if (n !== 1) errs.push(`'${k}' 키가 ${n}번 있어요(1번이어야 해요)`);
});
let D;
try { const ctx = { window: {} }; vm.runInNewContext(src, ctx, { filename: 'data.js' }); D = ctx.window.FOODYSSEY; } catch (e) { errs.push('data.js를 불러오지 못했어요: ' + e.message); }
const count = (d) => ({ n: d.newItems.reduce((a, g) => a + g.items.length, 0), l: d.limited.length });
if (D) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(D.updated || '')) errs.push('updated 날짜 형식이 이상해요: ' + D.updated);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  if (D.updated > today) errs.push('updated가 오늘(' + today + ')보다 미래예요: ' + D.updated);
  D.newItems.forEach((g, i) => { if (!g.brand || !g.cat || !g.items || !g.items.length) errs.push('newItems[' + i + '] 구조 오류'); if (g.date && g.date > today) errs.push(`newItems ${g.brand}: 날짜가 미래예요 ${g.date}`); if (!g.src || !g.src.url) errs.push(`newItems ${g.brand}: 출처가 없어요`); });
  D.limited.forEach((x, i) => { if (!x.brand || !x.kind || !(x.title || x.name)) errs.push('limited[' + i + '] 구조 오류'); if (!x.src || !x.src.url) errs.push(`limited ${x.brand} ${x.title}: 출처가 없어요`); if (x.start && x.end && x.start > x.end) errs.push(`limited ${x.brand} ${x.title}: 시작일이 종료일보다 늦어요`); });
  const prev = process.argv[2];
  if (prev && fs.existsSync(prev)) {
    try { const c2 = { window: {} }; vm.runInNewContext(fs.readFileSync(prev, 'utf8'), c2, { filename: 'prev' }); const a = count(c2.window.FOODYSSEY), b = count(D); if (b.n < a.n * 0.7 || b.l < a.l * 0.6) errs.push(`항목 수가 갑자기 줄었어요: 신메뉴 ${a.n}→${b.n}, 한정 ${a.l}→${b.l}`); } catch (e) {}
  }
  console.log('data.js 점검: 신메뉴 ' + count(D).n + '개, 한정·이벤트 ' + count(D).l + '개, updated ' + D.updated);
}
if (errs.length) { console.error('data.js 점검 실패 ' + errs.length + '건'); errs.forEach((e) => console.error(' - ' + e)); process.exit(1); }
