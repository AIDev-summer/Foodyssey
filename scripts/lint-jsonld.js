// 구조화 데이터(JSON-LD) 린트: 빌드가 끝난 HTML을 전부 읽어 금지 패턴이 있으면 빌드를 실패시켜요.
// 실행: node scripts/lint-jsonld.js   (build.js도 마지막에 자동으로 돌려요)
// 규칙은 README의 "구조화된 데이터 규칙"을 보세요.
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://foodyssey.co.kr';
// 메뉴 정보 사이트라 판매·평점·FAQ 같은 마크업은 쓰지 않아요(근거 없는 마크업은 구글 스팸 정책 위반).
const BANNED_TYPES = new Set(['Product', 'Offer', 'AggregateOffer', 'Review', 'AggregateRating', 'Rating', 'FAQPage', 'Question', 'Answer', 'HowTo', 'Recipe', 'MerchantReturnPolicy', 'OfferShippingDetails']);
const BANNED_KEYS = new Set(['review', 'reviews', 'aggregateRating', 'ratingValue', 'reviewCount', 'offers', 'price', 'priceCurrency', 'availability', 'hasMerchantReturnPolicy', 'shippingDetails', 'acceptedAnswer', 'mainEntity']);
const REQUIRED = {
  WebSite: ['name', 'url'],
  WebPage: ['name', 'url'],
  BreadcrumbList: ['itemListElement'],
  ItemList: ['name', 'itemListElement'],
  ListItem: ['position']
};

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'scripts') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function localFor(url, root) {
  // 우리 사이트 주소면 로컬 파일로 바꿔 줘요. 확장자 없는 페이지는 .html 또는 /index.html.
  if (!url.startsWith(SITE)) return null;
  let rel;
  try { rel = decodeURI(url.slice(SITE.length).split('#')[0].split('?')[0]); } catch (e) { return null; }
  if (rel === '' || rel === '/') return path.join(root, 'index.html');
  const cands = [rel, rel + '.html', rel + '/index.html'].map((r) => path.join(root, r));
  return cands.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || cands[0];
}

function check(node, where, errs, ctx) {
  if (Array.isArray(node)) { node.forEach((n, i) => check(n, where + '[' + i + ']', errs, ctx)); return; }
  if (node === null) { errs.push(where + ': 값이 null'); return; }
  if (typeof node === 'string') {
    const t = node.trim();
    if (t === '' ) errs.push(where + ': 빈 문자열');
    else if (/^(undefined|null|NaN)$/i.test(t) || /undefined|\[object Object\]/.test(t)) errs.push(where + ': 이상한 값 "' + t.slice(0, 30) + '"');
    return;
  }
  if (typeof node === 'number') { if (!Number.isFinite(node)) errs.push(where + ': 숫자가 아님'); return; }
  if (typeof node !== 'object') return;
  const types = [].concat(node['@type'] || []);
  types.forEach((t) => { if (BANNED_TYPES.has(t)) errs.push(where + ': 금지된 형식 ' + t); });
  Object.keys(node).forEach((k) => {
    if (BANNED_KEYS.has(k)) errs.push(where + ': 금지된 필드 ' + k);
    if (node[k] === undefined) errs.push(where + ': ' + k + ' 가 undefined');
  });
  types.forEach((t) => (REQUIRED[t] || []).forEach((k) => {
    const v = node[k];
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) errs.push(where + ': ' + t + ' 에 필수 필드 ' + k + ' 가 없어요');
  }));
  if (types.includes('ListItem') && !node.name && !node.url && !node.item) errs.push(where + ': ListItem 에 name/url/item 중 하나는 필요해요');
  if (types.includes('BreadcrumbList') && Array.isArray(node.itemListElement)) {
    node.itemListElement.forEach((li, i) => { if (!li.name || !li.item) errs.push(where + '.itemListElement[' + i + ']: name/item 필요'); });
  }
  // 이미지 계열 필드가 가리키는 파일이 있어야 해요(우리 사이트 파일만 직접 확인).
  ['image', 'logo', 'thumbnailUrl', 'url', 'item'].forEach((k) => {
    const v = node[k];
    if (typeof v === 'string' && v.startsWith(SITE)) {
      const f = localFor(v, ctx.root);
      if (f && !fs.existsSync(f)) errs.push(where + '.' + k + ': 가리키는 파일이 없어요 ' + v);
    }
    if ((k === 'image' || k === 'logo' || k === 'thumbnailUrl') && typeof v === 'string' && !v.startsWith(SITE)) errs.push(where + '.' + k + ': 외부 이미지 주소는 쓰지 않아요 ' + v.slice(0, 60));
  });
  Object.keys(node).forEach((k) => { if (k !== '@context' && typeof node[k] === 'object') check(node[k], where + '.' + k, errs, ctx); else if (typeof node[k] === 'string' && k !== '@context' && k !== '@type') check(node[k], where + '.' + k, errs, ctx); });
}

function lint(root) {
  const files = walk(root, []);
  const errs = [];
  const stat = {};
  files.forEach((f) => {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    const h = fs.readFileSync(f, 'utf8');
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let m, i = 0;
    while ((m = re.exec(h))) {
      i++;
      let j;
      try { j = JSON.parse(m[1]); } catch (e) { errs.push(rel + ' #' + i + ': JSON 파싱 오류 ' + e.message); continue; }
      const arr = Array.isArray(j) ? j : [j];
      arr.forEach((o) => {
        if (!o['@context']) errs.push(rel + ' #' + i + ': @context 없음');
        [].concat(o['@type'] || []).forEach((t) => { stat[t] = (stat[t] || 0) + 1; });
        check(o, rel + ' #' + i, errs, { root });
      });
    }
    // 대표 이미지 메타가 가리키는 파일
    ['og:image', 'twitter:image'].forEach((p) => {
      const mm = h.match(new RegExp('<meta (?:property|name)="' + p + '" content="([^"]*)"'));
      if (mm && mm[1]) {
        const f = localFor(mm[1].replace(/&amp;/g, '&'), root);
        if (f === null) errs.push(rel + ': ' + p + ' 가 우리 사이트 파일이 아니에요 ' + mm[1].slice(0, 70));
        else if (!fs.existsSync(f)) errs.push(rel + ': ' + p + ' 파일이 없어요 ' + mm[1]);
      } else if (mm) errs.push(rel + ': ' + p + ' 값이 비었어요');
    });
    // 화면에 없는 FAQ 방지: FAQ 마크업 자체를 금지했으니 본문에도 질문-답변 스키마 속성이 없어야 해요.
    if (/itemtype="https?:\/\/schema\.org\/(Product|FAQPage|Review|Offer)"/.test(h)) errs.push(rel + ': 마이크로데이터 Product/FAQ/Review/Offer 금지');
  });
  return { errs, stat, pages: files.length };
}

module.exports = { lint };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const r = lint(root);
  console.log('JSON-LD 린트: 페이지 ' + r.pages + '개, 형식별 개수 ' + JSON.stringify(r.stat));
  if (r.errs.length) {
    console.error('JSON-LD 린트 실패 ' + r.errs.length + '건');
    r.errs.slice(0, 40).forEach((e) => console.error(' - ' + e));
    process.exit(1);
  }
  console.log('JSON-LD 린트 통과');
}
