#!/usr/bin/env node
// 메뉴 이미지 점검: data.js의 img 주소가 (1) 브랜드 공식 도메인인지 (2) 지금도 열리는 이미지인지 확인하고, 크기(width/height)를 data/img-meta.json에 저장해요.
// 크기 정보가 있어야 화면이 밀리지 않게 width/height를 지정할 수 있고, 없는 이미지는 빌드가 싣지 않아요.
// 사용: node scripts/check-images.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
// 공식 도메인 목록: 브랜드 공식 홈페이지 또는 그 홈페이지가 쓰는 이미지 서버(해당 홈페이지의 HTML에서 확인된 것만)
const OFFICIAL = { 'mcdonalds.co.kr': '맥도날드', 'kyochon.com': '교촌치킨', 'ediya.com': '이디야커피', 'mega-mgccoffee.com': '메가MGC커피', 'd2afncas1tel3t.cloudfront.net': '파리바게뜨(paris.co.kr이 쓰는 이미지 서버)',
  // 브랜드 공식 홈페이지가 막혀 있을 때만: 회사가 직접 낸 보도자료(뉴스와이어 배포)에 실린 공식 사진. 언론사 기자가 찍은 사진·기사 이미지는 쓰지 않아요.
  'file.newswire.co.kr': '보도자료 공식 사진(뉴스와이어 배포)' };
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
const D = ctx.window.FOODYSSEY;
const urls = new Map();
D.newItems.forEach((g) => g.items.forEach((it) => { if (it.img) urls.set(it.img, g.brand + ' ' + it.name); }));
D.limited.forEach((x) => { if (x.img) urls.set(x.img, x.brand + ' ' + (x.title || x.name)); });
[D.hotNew, D.hotLimited].forEach((h) => { if (h && h.img) urls.set(h.img, (h.brand || '') + ' ' + (h.name || '')); });
function dims(buf) {
  if (buf.length > 24 && buf.slice(1, 4).toString() === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) { let i = 2; while (i < buf.length) { if (buf[i] !== 0xff) { i++; continue; } const m = buf[i + 1]; if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }; i += 2 + buf.readUInt16BE(i + 2); } }
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') { if (buf.slice(12, 16).toString() === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }; }
  return null;
}
(async () => {
  const meta = {}; const bad = [];
  for (const [u, name] of urls) {
    let host = ''; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) {}
    const known = Object.keys(OFFICIAL).find((k) => host === k || host.endsWith('.' + k));
    if (!known) { bad.push([name, '공식 도메인 목록에 없음: ' + host]); continue; }
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/130', 'Referer': 'https://foodyssey.co.kr/' } });
      if (!r.ok) { bad.push([name, 'HTTP ' + r.status]); continue; }
      const ct = r.headers.get('content-type') || '';
      if (!/^image\//.test(ct)) { bad.push([name, '이미지가 아님 ' + ct]); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      const d = dims(buf);
      if (!d) { bad.push([name, '크기를 읽지 못함']); continue; }
      meta[u] = { w: d.w, h: d.h, bytes: buf.length, host, official: OFFICIAL[known] };
    } catch (e) { bad.push([name, String(e.message).slice(0, 60)]); }
  }
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'img-meta.json'), JSON.stringify(meta, null, 1) + '\n');
  console.log('이미지 ' + urls.size + '개 중 사용 가능 ' + Object.keys(meta).length + '개, 제외 ' + bad.length + '개');
  bad.forEach((b) => console.log(' - ' + b[0] + ': ' + b[1]));
  const big = Object.entries(meta).filter(([, m]) => m.bytes > 400000);
  if (big.length) console.log('용량 큰 이미지(400KB 초과) ' + big.length + '개: ' + big.map(([u, m]) => Math.round(m.bytes / 1024) + 'KB').join(', '));
})();
