#!/usr/bin/env node
// 푸디세이 정적 페이지 만들기: data.js를 읽어 메뉴별·브랜드별·업종별 HTML과 sitemap.xml을 만들어요.
// 실행: node scripts/build.js  (저장소 맨 위 폴더에서)
// - menu/<브랜드-메뉴>.html, brand/<브랜드>.html, cat/<업종>.html 을 새로 써요.
// - data/archive.json 에 한 번이라도 올라온 메뉴를 모두 기록해요. data.js에서 빠져도 페이지는 "판매 종료"로 남아요.
// - index.html 안의 <!-- build:directory --> 사이(브랜드별 메뉴 목록)와 <!-- build:jsonld --> 사이(구조화 데이터)를 다시 채워요.
// GitHub Actions(.github/workflows/build-pages.yml)가 data.js가 바뀔 때마다 자동으로 돌려요. updates.html(업데이트 내역)도 여기서 만들어요.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://foodyssey.co.kr';
const GA_ID = 'G-LN6SS7QZSR';
const ADS = 'ca-pub-3810068839288182';

// limited 항목엔 업종이 없어서 브랜드로 정해요. newItems에 같은 브랜드가 있으면 그쪽이 우선이에요.
const BRAND_CAT = {
  '맥도날드': 'burger', '버거킹': 'burger', '롯데리아': 'burger', '맘스터치': 'burger', '쉐이크쉑': 'burger', '노브랜드버거': 'burger', 'KFC': 'burger', '프랭크버거': 'burger',
  'bhc': 'chicken', '교촌치킨': 'chicken', 'BBQ': 'chicken', '굽네치킨': 'chicken', '푸라닭': 'chicken', '처갓집양념치킨': 'chicken', '60계치킨': 'chicken',
  '도미노피자': 'pizza', '피자헛': 'pizza', '파파존스': 'pizza', '미스터피자': 'pizza', '피자알볼로': 'pizza',
  '파리바게뜨': 'bakery', '뚜레쥬르': 'bakery', '성심당': 'bakery', '던킨': 'bakery', '크리스피크림': 'bakery',
  '삼첩분식': 'snack', '엽기떡볶이': 'snack', '신전떡볶이': 'snack', '배떡': 'snack', '청년다방': 'snack',
  '스타벅스': 'cafe', '이디야커피': 'cafe', '투썸플레이스': 'cafe', '메가MGC커피': 'cafe', '컴포즈커피': 'cafe', '빽다방': 'cafe', '할리스': 'cafe', '폴바셋': 'cafe', '공차': 'cafe', '배스킨라빈스': 'cafe'
};

// 가이드(/guide) 글: data.js 근거로 손으로 쓴 고정 HTML이라 sitemap에만 메타를 등록해요.
const GUIDES = [
  { slug: 'starbucks-frequency', updated: '2026-11-16', title: '스타벅스 겨울 e-프리퀀시 2026 정리: 17잔 조건·미션 음료·증정품·예약 요령', desc: '17잔 조건, 미션 음료 8가지, 증정품과 추가 증정품, 예약 취소 대기·적립 주의사항을 기사 근거로 정리했어요.' },
  { slug: 'christmas-cake-preorder', updated: '2026-11-16', title: '크리스마스 케이크 사전예약 비교 2026: 브랜드별 할인·예약 마감·수령 기간', desc: '파바·뚜레쥬르·투썸·배라·스타벅스·파스쿠찌의 사전예약 할인, 마감일, 수령 기간을 마감 임박 순으로 비교했어요.' },
  { slug: 'bigarch-duration', updated: '2026-11-08', title: '맥도날드 빅아치 판매기간·가격·크기 정리(종료일 계산)', desc: '빅아치 출시일·가격·무게와 한정 판매 4~6주로 계산한 종료 예상일을 기사 근거로 정리했어요.' },
  { slug: 'limited-menu-duration', updated: '', generated: true, title: '한정 메뉴·이벤트는 며칠 동안 할까: 푸디세이 기록으로 계산한 판매 기간', desc: '시작일과 종료일이 기사에 나온 항목만 골라 기간을 계산하고 브랜드별로 정리했어요.' },
  { slug: 'price-distribution', updated: '', generated: true, title: '프랜차이즈 신메뉴 가격대 분포: 푸디세이 기록 기준', desc: '가격이 기사에 확인된 신메뉴를 가격대별로 나눠 업종별 범위까지 계산했어요.' }
];

// ---------- 데이터 읽기 ----------
function loadData() {
  const code = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx, { filename: 'data.js' });
  if (!ctx.window.FOODYSSEY) throw new Error('data.js에서 window.FOODYSSEY를 찾지 못했어요');
  return ctx.window.FOODYSSEY;
}

function slug(s) {
  return String(s)
    .replace(/[·•/&+,()\[\]{}'"!?.:;~]/g, ' ')
    .replace(/[^0-9A-Za-z가-힣\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-')
    .toLowerCase();
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (p) => encodeURI(p);
const fmtDate = (s) => { if (!s) return ''; const [y, m, d] = s.split('-').map(Number); return `${y}년 ${m}월 ${d}일`; };
const short = (s) => { if (!s) return ''; const [, m, d] = s.split('-').map(Number); return `${m}.${d}`; };
// 받침이 있으면 '과', 없으면 '와'. 한글이 아닌 글자로 끝나면 '와'로 써요.
function josaWa(s) {
  const c = String(s).trim().replace(/[)\]\s]+$/, '').slice(-1).charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 ? '과' : '와';
  return '와';
}

function kstToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
// "4,900원" 하나일 때만 숫자로. "23,000·24,000원", "4만 원대"는 null.
function priceNum(p) {
  if (!p) return null;
  const m = String(p).match(/^\s*([\d,]+)\s*원\s*$/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

// data.js → 메뉴 레코드 목록
function collect(D) {
  const catName = {}; D.cats.forEach((c) => { catName[c.id] = c.name; });
  const brandCat = Object.assign({}, BRAND_CAT);
  D.newItems.forEach((g) => { brandCat[g.brand] = g.cat; });
  const hot = {};
  [D.hotNew, D.hotLimited].forEach((h) => { if (h && h.name) hot[h.name] = h; });

  const out = [];
  D.newItems.forEach((g) => {
    g.items.forEach((it) => {
      const h = hot[it.name];
      out.push({
        kind: 'new', brand: g.brand, cat: g.cat, name: it.name, tag: it.tag || '신메뉴',
        price: it.price || (h && h.price) || '', img: it.img || (h && h.img) || '', imgFrom: it.imgFrom || '',
        date: g.date || '', when: g.when || '', note: g.note || '', season: g.season || '',
        desc: it.desc || (h && h.desc) || '', specs: (h && h.specs) || null, priceNote: (h && h.priceNote) || '',
        group: g.items.length > 1 ? g.items.map((x) => x.name) : null,
        src: g.src || null
      });
    });
  });
  D.limited.forEach((x) => {
    const h = hot[x.title];
    out.push({
      kind: x.kind === '이벤트' ? 'event' : 'limited', brand: x.brand, cat: brandCat[x.brand] || '', name: x.title,
      tag: x.kind === '이벤트' ? '이벤트' : '한정 메뉴',
      price: x.price || '', img: x.img || (h && h.img) || '', imgFrom: x.imgFrom || '',
      start: x.start || '', end: x.end || '', endLate: x.endLate || '', open: x.open || '', period: x.period || '',
      desc: x.desc || (h && h.desc) || '', specs: (h && h.specs) || null, priceNote: (h && h.priceNote) || '',
      lines: x.lines || null, cups: x.cups || null, src: x.src || null, season: x.season || ''
    });
  });
  out.forEach((r) => { r.slug = slug(r.brand + ' ' + r.name); r.catName = catName[r.cat] || ''; });
  return { items: out, catName };
}

// ---------- 보관함 ----------
function mergeArchive(items, today) {
  const file = path.join(ROOT, 'data', 'archive.json');
  let arc = {};
  try { arc = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { arc = {}; }
  const live = new Set();
  items.forEach((r) => {
    live.add(r.slug);
    const prev = arc[r.slug];
    // lastSeen 같은 날짜는 넣지 않아요. 매일 바뀌면 PR과 충돌이 나기 쉬워서, 내용이 바뀔 때만 파일이 바뀌게 해요.
    arc[r.slug] = Object.assign({}, r, { firstSeen: (prev && prev.firstSeen) || today });
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sorted = {};
  Object.keys(arc).sort().forEach((k) => { sorted[k] = arc[k]; });
  fs.writeFileSync(file, JSON.stringify(sorted, null, 1) + '\n');
  return Object.values(sorted).map((r) => Object.assign({}, r, { live: live.has(r.slug) }));
}

// 상태: on(판매·진행 중), ended(종료), past(신상 목록에서 내려감)
function status(r, today) {
  if (r.kind === 'new') return r.live ? 'on' : 'past';
  const last = r.endLate || r.end;
  if (last && last < today) return 'ended';
  if (!r.live) return 'ended';
  return 'on';
}
function statusLabel(r, st) {
  if (st === 'on') return r.kind === 'event' ? '진행 중' : (r.kind === 'limited' ? '판매 중 · 기간 한정' : '판매 중');
  if (st === 'ended') return r.kind === 'event' ? '이벤트 종료' : '판매 종료';
  return '지난 신메뉴';
}

// 검색에 노출하지 않을 페이지: 끝난 이벤트, 가격·메뉴표 없이 고유 설명이 짧은 메뉴.
// (noindex,follow + sitemap·RSS 제외. 페이지는 지우지 않고 브랜드·업종·시즌 페이지에서 계속 연결해요.)
const FORCED = new Set();
// 틀이 같은 얇은 페이지 정리(data/consolidation.json, 사장님 승인 2026-11-12): 페이지는 남기고 noindex,follow + 사이트맵·RSS 제외.
let CONSOLIDATED = {};
try { CONSOLIDATED = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'consolidation.json'), 'utf8')); } catch (e) {}
const MENU_MIN = 650, HUB_MIN = 800;
// 임시 유예(2026-11-18): 반복 영역을 빼서 짧아진 메뉴 페이지는 until 날짜까지만 색인을 유지하고, 그 안에 고유 정보를 보강해요.
let GRACE = { until: '', slugs: [] };
try { GRACE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'menu-short-grace.json'), 'utf8')); } catch (e) {}
// 완성된 페이지의 눈에 보이는 글자 수(머리글·푸터·스크립트 제외)
function plainLen(h) {
  const t = h.replace(/<head>[\s\S]*?<\/head>|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<nav class="crumbs"[\s\S]*?<\/nav>/g, ' ').replace(/<[^>]+>/g, ' ');
  return t.replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().length;
}
// 본문 한글 글자 수(가치 게이트와 같은 기준): 새로 생긴 허브가 800자 미만이면 실패시키지 않고 자동으로 noindex,follow로 돌려요(보강되면 자동으로 색인 대상이 돼요).
let VALUE_EX = {};
try { VALUE_EX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'value-exceptions.json'), 'utf8')); } catch (e) {}
function hangulLen(h) {
  const a = h.match(/<article>([\s\S]*?)<\/article>/);
  const t = (a ? a[1] : h).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<nav class="crumbs"[\s\S]*?<\/nav>/g, '').replace(/<[^>]+>/g, ' ');
  return (t.match(/[가-힣]/g) || []).length;
}
function noindexReason(r, st) {
  if (FORCED.has(r.slug)) return 'short';
  if (CONSOLIDATED[r.slug]) return 'consolidated';
  if (r.kind === 'event' && st !== 'on') return 'ended-event';
  // 같은 묶음(group)의 메뉴는 묶음 공통 note가 아니라 메뉴 자기 설명(desc)만 고유 내용으로 쳐요.
  const own = r.group ? (r.desc || '') : [r.desc, r.note].filter(Boolean).join(' ');
  if (!r.price && !(r.lines && r.lines.length) && own.length < 40) return 'thin';
  return '';
}

let UPDATED = '';
let CATS = [];
const stampHtml = () => UPDATED ? `<p class="stamp">마지막 업데이트 <time datetime="${esc(UPDATED)}">${esc(fmtDate(UPDATED))}</time> · 매일 아침 기사를 확인해요 · <a href="/updates">업데이트 내역</a></p>` : '';
// 다음 페이지로 이어지는 링크 모음(업종·시즌·업데이트 내역)
// 월별 모음(/new/YYYY-MM): 신메뉴 출시월·한정 항목의 시작/종료월 중 하나라도 걸리는 달을 모아요.
function monthsOf(all, today) {
  const set = new Set([today.slice(0, 7)]);
  all.forEach((r) => {
    const d = r.kind === 'new' ? (r.date || r.firstSeen) : r.end;
    if (d && /^\d{4}-\d{2}/.test(d) && d.slice(0, 7) <= today.slice(0, 7)) set.add(d.slice(0, 7));
  });
  return [...set].sort();
}
const MONTHLY_LINKS = (all, today) => monthsOf(all, today).slice().reverse().slice(0, 2).map((m) => `<li><a href="/new/${m}">${esc(monthLabel(m))} 신메뉴·한정 메뉴 모음</a></li>`);
const monthLabel = (m) => { const [y, mm] = m.split('-').map(Number); return `${y}년 ${mm}월`; };
function exploreHtml(exceptCat) {
  const cats = CATS.filter((c) => c.id !== exceptCat).map((c) => `<a href="${href(catPath(c.id))}">${esc(c.name)}</a>`);
  return `<h2>더 둘러보기</h2><p class="explore">${cats.concat([`<a href="${href(seasonPath('christmas'))}">크리스마스·연말 메뉴</a>`, '<a href="/guide/">가이드</a>', '<a href="/new/">월별 모음</a>', '<a href="/updates">업데이트 내역</a>']).join(' · ')}</p>`;
}

// ---------- 공통 틀 ----------
function head({ title, desc, canonical, image, jsonld, robots }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#1f9370">
<meta property="og:type" content="website">
<meta property="og:site_name" content="푸디세이">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="${esc(image || SITE + '/icon-512.png')}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<script>
(function () {
  var t; try { t = localStorage.getItem('fd_theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
})();
</script>
<meta name="google-adsense-account" content="${ADS}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS}" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
(function () {
  var GA_ID = '${GA_ID}', KEY = 'fd_me', me = false;
  try { var ua = navigator.userAgent || ''; if (navigator.webdriver || /Headless|Lighthouse|PageSpeed|Electron|Playwright|Puppeteer|bot|crawl|spider|slurp/i.test(ua)) me = true; } catch (e) {}
  try {
    var q = location.search;
    if (/[?&]me=0(&|$)/.test(q)) localStorage.removeItem(KEY);
    else if (/[?&]me=1(&|$)/.test(q)) localStorage.setItem(KEY, '1');
    me = me || !!localStorage.getItem(KEY);
  } catch (e) {}
  if (me || !/foodyssey\\.co\\.kr$/.test(location.hostname)) window['ga-disable-' + GA_ID] = true;
})();
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');
(function () {
  // 사람 신호: 첫 스크롤·터치/마우스 이동·5초 이상 화면 가시 중 하나. 세션당 1회, 새 쿠키/개인정보 없음(sessionStorage 플래그만).
  var SKEY = 'fd_eh', fired = false;
  function send() {
    if (fired) return; fired = true;
    try { if (sessionStorage.getItem(SKEY)) return; sessionStorage.setItem(SKEY, '1'); } catch (e) {}
    gtag('event', 'engaged_human');
  }
  window.addEventListener('scroll', send, { passive: true, once: true });
  window.addEventListener('pointermove', send, { passive: true, once: true });
  window.addEventListener('touchstart', send, { passive: true, once: true });
  setTimeout(function () { if (!document.hidden) send(); }, 5000);
})();
</script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="alternate" type="application/rss+xml" title="푸디세이" href="/rss.xml">
<link rel="stylesheet" href="/pages.css">
</head>
<body>
<header><div class="wrap"><a class="logo" href="/"><span class="logo-name">푸디세이</span><span class="logo-sub"><span class="logo-en" lang="en">Food Odyssey</span><small>새 메뉴를 찾아 떠나는 여정</small></span></a><nav><a href="/#new">신상</a><a href="/#limited">한정</a><a href="/season/christmas">연말</a><a href="/guide/">가이드</a><a href="/updates">업데이트</a><button class="theme-btn" id="theme-btn" type="button" aria-label="다크모드 켜기"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button></nav></div></header>
`;
}
// '내 근처 매장 찾기'(2026-11-16 마케터 제안, 사장님 승인): 네이버 지도 검색을 새 창으로 여는 링크예요. 위치 권한·지도 임베드·API 키 없이, 누른 횟수만 GA4 이벤트 store_find로 세요.
const FEW_STORES = new Set(['성심당']);
function storeFind(brand, pageType) {
  const label = FEW_STORES.has(brand) ? `${esc(brand)} 매장 위치 보기` : `내 근처 ${esc(brand)} 매장 찾기`;
  const pin = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  return `<p class="store-find"><a href="https://map.naver.com/p/search/${encodeURIComponent(brand)}" target="_blank" rel="noopener" data-store-find="${esc(brand)}" data-page-type="${esc(pageType)}">${pin}<span>${label}</span></a><small>네이버 지도가 새 창으로 열려요</small></p>`;
}
function foot() {
  return `<footer><div class="wrap"><p>메뉴와 가격은 매장마다 다를 수 있어요. 주문 전에 브랜드 공식 앱이나 매장에서 한 번 더 확인해 주세요. 푸디세이는 각 브랜드와 관계없는 독립 사이트예요.</p><p class="links"><a href="/">홈</a><a href="/about">소개</a><a href="/guide/">가이드</a><a href="/updates">업데이트 내역</a><a href="/terms">이용약관</a><a href="/privacy">개인정보처리방침</a><a href="/contact">문의</a><a href="/rss.xml">RSS</a></p></div></footer>
<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[data-store-find]');
  if (!a) return;
  try { if (localStorage.getItem('fd_me')) return; } catch (x) {}
  if (typeof gtag === 'function') gtag('event', 'store_find', { brand: a.getAttribute('data-store-find'), page_type: a.getAttribute('data-page-type') });
});
</script>
<script src="/theme.js"></script>
</body>
</html>
`;
}
function crumbs(list) {
  const html = '<nav class="crumbs" aria-label="위치">' + list.map((c, i) => i === list.length - 1
    ? `<span aria-current="page">${esc(c.name)}</span>` : `<a href="${href(c.path)}">${esc(c.name)}</a>`).join('<span class="sep">›</span>') + '</nav>';
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE + href(c.path) })) };
  return { html, ld };
}
const menuPath = (r) => '/menu/' + r.slug;
const brandPath = (b) => '/brand/' + slug(b);
const catPath = (c) => '/cat/' + c;
const seasonPath = (s) => '/season/' + s;
// 시즌 모음 페이지: data.js의 season 값이 같은 항목을 한 페이지로 모아요.
const SEASONS = {
  christmas: { name: '크리스마스·연말', title: (y) => `크리스마스 케이크·연말 한정 메뉴 (${y}년) | 푸디세이`, h1: '크리스마스·연말 메뉴',
    intro: '프랜차이즈의 크리스마스 케이크와 시즌 음료, 연말 한정 메뉴·이벤트를 한곳에 모았어요. 예약 기간과 마감일은 기사에 나온 것만 적어요.' }
};

// 날짜·가격·남은 일수가 줄 중간에서 끊기지 않게 묶고, '11.5 발표 · ~ 11.29' 같은 표기를 '11월 5일 발표 · 11월 29일까지'로 바꿔요.
const mdKo = (s) => { if (!s) return ''; const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };
function natural(str) {
  let x = String(str || '');
  x = x.replace(/(\d{1,2})\.(\d{1,2})(\([월화수목금토일]\))?/g, (m, a, b, w) => `${a}월 ${b}일${w || ''}`);
  x = x.replace(/(일(?:\([월화수목금토일]\))?)\s?~\s?(?=\d)/g, '$1 ~ ');
  x = x.replace(/^~\s?(.+)$/, '$1까지');
  return x.replace(/\s+·\s+~\s?(\d{1,2}월 \d{1,2}일(?:\([월화수목금토일]\))?)/g, ' · $1까지');
}
const NW_RE = /(\d{4}년 \d{1,2}월 \d{1,2}일(?:\([월화수목금토일]\))?|\d{1,2}월 \d{1,2}일(?:\([월화수목금토일]\))?|\d[\d,~]*원(?:대)?|D-\d+)/g;
const nwTok = (html) => String(html).replace(NW_RE, '<span class="nw">$1</span>');
function menuH1(r, suffix) {
  const words = (r.brand + ' ' + r.name).split(/\s+/).filter(Boolean);
  const tailBase = words.length > 1 ? words.pop() : '';
  const tail = (tailBase ? tailBase + ' ' : '') + suffix;
  if (!words.length) return `<span class="nw">${esc(suffix ? r.brand + ' ' + r.name + ' ' + suffix : r.brand + ' ' + r.name)}</span>`;
  const headN = words.length > 3 ? 2 : 0;
  const head = words.slice(0, headN), mid = words.slice(headN);
  return (head.length ? `<span class="nw">${esc(head.join(' '))}</span> ` : '') + (mid.length ? esc(mid.join(' ')) + ' ' : '') + `<span class="nw">${esc(tail.trim())}</span>`;
}

function card(r, st) {
  const meta = [r.tag, r.price, natural(r.kind === 'new' ? r.when : r.period)].filter(Boolean).join(' · ');
  return `<li><a href="${href(menuPath(r))}"><span class="c-brand">${esc(r.brand)}</span><span class="c-name">${esc(r.name)}</span><span class="c-meta">${esc(meta)}</span>${st !== 'on' ? `<span class="badge off">${esc(statusLabel(r, st))}</span>` : ''}</a></li>`;
}


// ---------- 허브·메뉴 페이지용 요약(모두 data.js에서 계산한 사실만) ----------
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function wd(s) { const [y, m, d] = s.split('-').map(Number); return WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; }
const mdw = (s) => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일(${wd(s)})`; };
const whenOf = (r) => (r.kind === 'new' ? (r.when || (r.date ? short(r.date) : '')) : (r.period || r.open || ''));
const srcLabels = (list) => [...new Set(list.map((r) => r.src && r.src.label).filter(Boolean))];
const won = (n) => n.toLocaleString('en-US') + '원';

function dataTable(list, today, caption) {
  const live = list.filter((r) => status(r, today) === 'on');
  if (!live.length) return '';
  const dtHeads = ['메뉴', '구분', '출시·기간', '가격', '출처'];
  const rows = live.map((r) => trow([`<a href="${href(menuPath(r))}">${esc(r.name)}</a>${r.brandShow ? `<small> ${esc(r.brand)}</small>` : ''}`, esc(r.kind === 'new' ? r.tag : (r.kind === 'event' ? '이벤트' : '한정 메뉴')), esc(whenOf(r) || '-'), esc(r.price || '확인 안 됨'), r.src ? `<a href="${esc(r.src.url)}" target="_blank" rel="noopener nofollow">${esc(r.src.label)}</a>` : '-'], dtHeads)).join('');
  return `<h2>${esc(caption)}</h2><div class="tbl"><table class="compare"><thead><tr><th>메뉴</th><th>구분</th><th>출시·기간</th><th>가격</th><th>출처</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function brandSummary(list, today, brand) {
  const on = list.filter((r) => status(r, today) === 'on');
  const past = list.length - on.length;
  const nNew = on.filter((r) => r.kind === 'new').length, nLim = on.filter((r) => r.kind === 'limited').length, nEv = on.filter((r) => r.kind === 'event').length;
  const parts = [nNew && `새로 나온 메뉴 ${nNew}개`, nLim && `기간 한정 메뉴 ${nLim}개`, nEv && `이벤트 ${nEv}개`].filter(Boolean);
  const out = [];
  out.push(on.length ? `푸디세이에 올라 있는 ${brand}의 판매·진행 중 항목은 ${on.length}개예요${parts.length ? `(${parts.join(', ')})` : ''}.` : `${brand}의 판매·진행 중 항목은 지금 없고, 지난 메뉴만 남아 있어요.`);
  const dated = on.filter((r) => r.kind === 'new' && r.date).sort((a, c) => c.date.localeCompare(a.date));
  if (dated.length) out.push(`가장 최근에 나온 새 메뉴는 ${dated[0].when || fmtDate(dated[0].date)} 소식의 ‘${dated[0].name}’${dated[0].group && dated[0].group.length > 1 ? ` 등 ${dated[0].group.length}종` : ''}이에요.`);
  const priced = on.filter((r) => r.price);
  out.push(priced.length ? `기사나 공식 자료에서 가격이 확인된 메뉴는 ${priced.length}개예요: ${priced.slice(0, 4).map((r) => `${r.name} ${r.price}`).join(', ')}${priced.length > 4 ? ' 등' : ''}.` : '아직 기사에서 가격이 확인된 메뉴가 없어서 가격은 비워 뒀어요. 가격은 확인되는 대로 채워요.');
  const timed = on.filter((r) => r.kind !== 'new' && r.end).sort((a, c) => a.end.localeCompare(c.end));
  if (timed.length) out.push(`끝나는 날이 정해진 항목은 ${timed.slice(0, 3).map((r) => `‘${r.name}’ ${mdw(r.end)}까지`).join(', ')}예요${timed.length > 3 ? ' 등' : ''}.`);
  const open = on.filter((r) => r.kind !== 'new' && !r.end && r.open);
  if (open.length) out.push(`종료일이 아직 나오지 않은 항목은 ${open.map((r) => `‘${r.name}’`).join(', ')}예요. 종료일은 기사에 나오면 반영해요.`);
  const labels = srcLabels(list);
  if (labels.length) out.push(`정보는 ${labels.slice(0, 5).join(', ')}${labels.length > 5 ? ' 등' : ''} 기사 원문을 보고 정리했어요.`);
  if (past) out.push(`판매가 끝났거나 새 메뉴 목록에서 내려간 ${past}개는 아래 ‘지난 메뉴·끝난 이벤트’에 남겨 뒀어요.`);
  return `<p>${out.join(' ')}</p>`;
}

function descList(list, today) {
  // 묶음(group) 메뉴는 공통 note를 반복하지 않고 메뉴 자기 설명(desc)만 써요.
  const own = (r) => (r.group ? r.desc : (r.desc || r.note));
  const rows = list.filter((r) => status(r, today) === 'on' && own(r));
  if (!rows.length) return '';
  return `<h2>메뉴별 설명</h2><ul class="dl">${rows.map((r) => `<li><a href="${href(menuPath(r))}"><b>${esc(r.brand)} ${esc(r.name)}</b></a> — ${esc(own(r).replace(/\s+/g, ' '))}</li>`).join('')}</ul>`;
}

function catSummary(list, today, catName) {
  const on = list.filter((r) => status(r, today) === 'on');
  const bs = [...new Set(on.map((r) => r.brand))];
  const out = [];
  out.push(`${catName} 업종에는 지금 브랜드 ${bs.length}곳, 판매·진행 중 항목 ${on.length}개가 올라 있어요.`);
  const nums = on.filter((r) => priceNum(r.price)).map((r) => ({ r, n: priceNum(r.price) })).sort((a, c) => a.n - c.n);
  if (nums.length >= 2) out.push(`가격이 확인된 메뉴 ${nums.length}개 가운데 가장 싼 것은 ${nums[0].r.brand} ‘${nums[0].r.name}’ ${won(nums[0].n)}, 가장 비싼 것은 ${nums[nums.length - 1].r.brand} ‘${nums[nums.length - 1].r.name}’ ${won(nums[nums.length - 1].n)}이에요.`);
  else if (nums.length === 1) out.push(`가격이 확인된 메뉴는 ${nums[0].r.brand} ‘${nums[0].r.name}’ ${won(nums[0].n)} 하나예요.`);
  else out.push('이 업종은 기사에서 가격이 확인된 메뉴가 아직 없어요.');
  const dated = on.filter((r) => r.kind === 'new' && r.date).sort((a, c) => c.date.localeCompare(a.date));
  if (dated.length) out.push(`가장 최근 소식은 ${dated[0].brand}의 ‘${dated[0].name}’(${dated[0].when || fmtDate(dated[0].date)})이에요.`);
  const timed = on.filter((r) => r.kind !== 'new' && r.end).sort((a, c) => a.end.localeCompare(c.end));
  if (timed.length) out.push(`곧 끝나는 한정 항목은 ${timed.slice(0, 3).map((r) => `${r.brand} ‘${r.name}’ ${mdw(r.end)}까지`).join(', ')}예요.`);
  return `<p>${out.join(' ')}</p>`;
}

// 메뉴 페이지: 같은 시기·같은 업종의 메뉴와 견줄 수 있는 정보
function compareHtml(r, all, today) {
  const on = (x) => status(x, today) === 'on' && x.slug !== r.slug;
  let h = '';
  const n = priceNum(r.price);
  if (r.lines && r.lines.length) {
    const pl = r.lines.map((l) => ({ l, n: priceNum(l[1]) })).filter((x) => x.n).sort((a, c) => a.n - c.n);
    if (pl.length >= 2) h += `<h2>구성별 가격 비교</h2><p>이 묶음에서 가격이 확인된 ${pl.length}개 가운데 가장 싼 것은 ‘${esc(pl[0].l[0])}’ ${won(pl[0].n)}, 가장 비싼 것은 ‘${esc(pl[pl.length - 1].l[0])}’ ${won(pl[pl.length - 1].n)}이에요. 두 가격의 차이는 ${won(pl[pl.length - 1].n - pl[0].n)}이고, 모두 기사에 나온 단품 가격이에요.</p>`;
  }
  return h;
}


// ---------- 함께 보면 좋은 메뉴(내부 링크 블록 3종) ----------
// 같은 브랜드 다른 메뉴 / 비슷한 가격대 다른 브랜드(가격이 근거 있는 것만) / 이번 주(없으면 곧) 끝나는 한정 메뉴
function relatedSets(r, all, today) {
  const onOf = (x) => status(x, today) === 'on' && x.slug !== r.slug;
  const sibs = new Set(r.group || []);
  const key = (x) => String(x.date || x.end || x.firstSeen || '');
  const brand = all.filter((x) => onOf(x) && x.brand === r.brand)
    .sort((a, c) => ((sibs.has(a.name) ? 1 : 0) - (sibs.has(c.name) ? 1 : 0)) || key(c).localeCompare(key(a)));
  const rp = priceNum(r.price);
  const seenB = new Set();
  const price = rp ? all.filter((x) => onOf(x) && x.brand !== r.brand && priceNum(x.price) && Math.abs(priceNum(x.price) - rp) <= Math.max(1000, rp * 0.15))
    .sort((a, c) => Math.abs(priceNum(a.price) - rp) - Math.abs(priceNum(c.price) - rp))
    .filter((x) => (seenB.has(x.brand) ? false : (seenB.add(x.brand), true))) : [];
  const t0 = Date.parse(today);
  const dleft = (x) => Math.round((Date.parse(x.end) - t0) / 86400000);
  const endable = all.filter((x) => onOf(x) && x.kind !== 'new' && x.end && dleft(x) >= 0).sort((a, c) => a.end.localeCompare(c.end));
  let ending = endable.filter((x) => dleft(x) <= 7);
  let endTitle = '이번 주 끝나는 한정 메뉴';
  if (!ending.length) { ending = endable; endTitle = '곧 끝나는 한정 메뉴'; }
  return { brand, price, ending, endTitle };
}
function relTop(S, today) {
  if (!S.brand.length) return '';
  const when = (x) => (x.kind !== 'new' && x.end ? `${mdKo(x.end)}까지` : '판매 중');
  const li = S.brand.slice(0, 4).map((x) => `<li><a href="${href(menuPath(x))}">${esc(x.name)}</a><span>${esc(when(x))}</span></li>`).join('');
  return `<aside class="rel" aria-label="같은 브랜드 다른 메뉴"><h2>${esc(S.brand[0].brand)}의 다른 메뉴</h2><ul class="rel-list">${li}</ul></aside>`;
}
function relBottom(r, S) {
  const blk = (t, list) => (list.length ? `<h2>${esc(t)}</h2><ul class="cards">${list.slice(0, 5).map((x) => card(x, 'on')).join('')}</ul>` : '');
  return blk(`${r.brand}의 다른 메뉴`, S.brand) + blk('비슷한 가격대 다른 브랜드', S.price) + blk(S.endTitle, S.ending);
}


// ---------- 계산하는 가이드·월별 모음 (모두 data.js·archive.json의 값으로만 계산) ----------
const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const pageShell = ({ title, desc, canonical, crumbList, kicker, h1, body, jsonld }) => {
  const cr = crumbs(crumbList);
  return head({ title, desc, canonical: SITE + href(canonical), jsonld: [cr.ld].concat(jsonld || []) })
    + `<main><div class="wrap"><article>${cr.html}<p class="kicker">${esc(kicker)}</p><h1>${esc(h1)}</h1>${body}${exploreHtml('')}<p class="more"><a href="/">오늘의 새 메뉴·한정 메뉴 전체 보기 →</a></p></article></div></main>\n` + foot();
};
const trow = (cells, heads) => `<tr>${cells.map((c, i) => { const plain = String(c).replace(/<[^>]+>/g, ''); const cls = /^<a href="\/menu\//.test(c) ? 'nm' : (plain.length <= 14 ? 'nw' : ''); const lbl = heads && heads[i] ? ` data-label="${esc(heads[i])}"` : ''; return `<td${cls ? ` class="${cls}"` : ''}${lbl}>${c}</td>`; }).join('')}</tr>`;
const srcA = (r) => (r.src ? `<a href="${esc(r.src.url)}" target="_blank" rel="noopener nofollow">${esc(r.src.label)}</a>` : '-');
const menuA = (r) => `<a href="${href(menuPath(r))}">${esc(r.name)}</a>`;

function durationGuide(all, today) {
  const lim = all.filter((r) => r.kind !== 'new');
  const withStart = lim.filter((r) => r.start);
  const exact = withStart.filter((r) => r.end && !r.endLate && r.end >= r.start).map((r) => Object.assign({}, r, { days: dayDiff(r.start, r.end) + 1 }));
  const ranged = withStart.filter((r) => r.end && r.endLate);
  const openEnded = withStart.filter((r) => !r.end);
  const noStart = lim.filter((r) => !r.start);
  const ds = exact.map((r) => r.days);
  const byKind = (k) => exact.filter((r) => (k === 'event' ? r.kind === 'event' : r.kind === 'limited')).map((r) => r.days);
  const brands = [...new Set(exact.map((r) => r.brand))];
  const stat = ds.length ? `계산에 쓴 ${ds.length}건의 평균은 ${f1(mean(ds))}일, 가운데 값(중앙값)은 ${f1(median(ds))}일, 가장 짧은 것은 ${Math.min(...ds)}일, 가장 긴 것은 ${Math.max(...ds)}일이에요.` : '아직 계산에 쓸 수 있는 항목이 없어요.';
  const kindBits = [byKind('limited').length ? `한정 메뉴 ${byKind('limited').length}건 평균 ${f1(mean(byKind('limited')))}일` : '', byKind('event').length ? `이벤트·프로모션 ${byKind('event').length}건 평균 ${f1(mean(byKind('event')))}일` : ''].filter(Boolean).join(', ');
  const stOf = (r) => { const s = status(r, today); return s === 'on' ? '진행 중' : '종료'; };
  const exHeads = ['브랜드', '항목', '구분', '시작', '종료', '기간', '상태', '출처'];
  const rgHeads = ['브랜드', '항목', '시작', '종료 예상', '예상 기간', '출처'];
  const opHeads = ['브랜드', '항목', '시작', '판매 기간', '종료 표기', '출처'];
  const brHeads = ['브랜드', '건수', '평균 기간', '항목'];
  const exRows = exact.slice().sort((a, c) => a.days - c.days).map((r) => trow([esc(r.brand), menuA(r), r.kind === 'event' ? '이벤트' : '한정 메뉴', esc(fmtDate(r.start)), esc(fmtDate(r.end)), `<b>${r.days}일</b>`, stOf(r), srcA(r)], exHeads)).join('');
  const rgRows = ranged.map((r) => trow([esc(r.brand), menuA(r), esc(fmtDate(r.start)), `${esc(fmtDate(r.end))} ~ ${esc(fmtDate(r.endLate))}`, `${dayDiff(r.start, r.end) + 1}~${dayDiff(r.start, r.endLate) + 1}일`, srcA(r)], rgHeads)).join('');
  const opRows = openEnded.map((r) => trow([esc(r.brand), menuA(r), esc(fmtDate(r.start)), `${dayDiff(r.start, today) + 1}일째`, esc(r.open || '종료일 미정'), srcA(r)], opHeads)).join('');
  const brRows = brands.map((b) => { const xs = exact.filter((r) => r.brand === b); return trow([esc(b), `${xs.length}건`, xs.length > 1 ? `${f1(mean(xs.map((r) => r.days)))}일` : `${xs[0].days}일(1건이라 평균 아님)`, esc(xs.map((r) => r.name).join(', '))], brHeads); }).join('');
  const body = `<p class="meta">기준일 ${esc(fmtDate(today))} · 푸디세이 기록 ${all.length}개 가운데 한정·이벤트 ${lim.length}건 · 매일 자동으로 다시 계산해요</p>`
    + `<p>한정 메뉴나 이벤트가 “얼마나 오래 하는지”는 사려는 사람에게 가장 중요한 정보인데, 기사마다 표현이 달라 헷갈려요. 이 글은 푸디세이에 기록된 항목 중 <b>시작일과 종료일이 기사에 모두 나온 것만</b> 골라 기간을 직접 계산해요. 계산식은 <b>종료일 − 시작일 + 1일</b>(시작일과 종료일을 둘 다 센 기간)이에요. 기사에 없는 날짜는 추측하지 않고 계산에서 뺐어요.</p>`
    + `<h2>계산 결과 요약</h2><p>${esc(stat)}${kindBits ? ' 나눠 보면 ' + esc(kindBits) + '이에요.' : ''} 표본이 ${ds.length}건뿐이라 “프랜차이즈 한정 메뉴는 보통 이만큼 한다”고 일반화하기는 어려워요. 기록이 쌓일수록 숫자가 바뀌고, 그때마다 이 페이지가 같이 바뀌어요.</p>`
    + (exRows ? `<h2>시작·종료일이 모두 확인된 항목(짧은 순)</h2><div class="tbl"><table class="compare"><thead><tr><th>브랜드</th><th>항목</th><th>구분</th><th>시작</th><th>종료</th><th>기간</th><th>상태</th><th>출처</th></tr></thead><tbody>${exRows}</tbody></table></div>` : '')
    + (brRows ? `<h2>브랜드별 기간</h2><div class="tbl"><table class="compare"><thead><tr><th>브랜드</th><th>건수</th><th>평균 기간</th><th>항목</th></tr></thead><tbody>${brRows}</tbody></table></div><p class="table-note">브랜드별 건수가 1건이면 그 항목의 기간을 그대로 적었어요. 평균은 2건 이상일 때만 계산해요.</p>` : '')
    + (rgRows ? `<h2>종료일이 범위로만 나온 항목</h2><p>기사에 “4~6주 한정”처럼 범위로만 나온 항목은 평균에서 빼고 따로 적어요.</p><div class="tbl"><table class="compare"><thead><tr><th>브랜드</th><th>항목</th><th>시작</th><th>종료 예상</th><th>예상 기간</th><th>출처</th></tr></thead><tbody>${rgRows}</tbody></table></div>` : '')
    + (opRows ? `<h2>종료일이 아직 안 나온 항목</h2><p>시작일은 알지만 종료일이 기사에 없는 항목이에요. “○일째”는 시작일부터 기준일까지 센 날수(시작일 포함)이고, 종료일이 나오면 위 표로 옮겨 계산해요.</p><div class="tbl"><table class="compare"><thead><tr><th>브랜드</th><th>항목</th><th>시작</th><th>판매 기간</th><th>종료 표기</th><th>출처</th></tr></thead><tbody>${opRows}</tbody></table></div>` : '')
    + `<h2>계산에서 뺀 항목</h2><p>시작일이 기사에 나오지 않아 기간을 계산하지 않은 한정·이벤트 항목은 ${noStart.length}건이에요: ${esc(noStart.map((r) => r.brand + ' ' + r.name).join(', '))}. 이 항목들은 메뉴 페이지에서 종료일만 확인할 수 있어요.</p>`;
  return pageShell({ title: `한정 메뉴·이벤트 판매 기간 계산 (${ds.length}건, ${monthLabel(today.slice(0, 7))} 기준) | 푸디세이`, desc: `시작일과 종료일이 기사에 나온 한정 메뉴·이벤트 ${ds.length}건의 기간을 직접 계산했어요. ${stat}`.slice(0, 155), canonical: '/guide/limited-menu-duration', crumbList: [{ name: '홈', path: '/' }, { name: '가이드', path: '/guide/' }, { name: '한정 메뉴 판매 기간', path: '/guide/limited-menu-duration' }], kicker: '가이드 · 자체 계산', h1: GUIDES.find((g) => g.slug === 'limited-menu-duration').title, body });
}

function priceGuide(all, today) {
  const news = all.filter((r) => r.kind === 'new');
  const priced = news.filter((r) => priceNum(r.price)).map((r) => Object.assign({}, r, { n: priceNum(r.price) }));
  const multi = news.filter((r) => r.price && !priceNum(r.price)).length;
  const none = news.length - priced.length - multi;
  const B = [[0, 3999, '4,000원 미만'], [4000, 4999, '4,000~4,999원'], [5000, 6999, '5,000~6,999원'], [7000, 9999, '7,000~9,999원'], [10000, 1e9, '10,000원 이상']];
  const rows = B.map(([lo, hi, label]) => { const xs = priced.filter((r) => r.n >= lo && r.n <= hi).sort((a, c) => a.n - c.n); return { label, xs }; });
  const share = (n) => (priced.length ? Math.round((n / priced.length) * 100) : 0);
  const bRows = rows.map((b) => trow([esc(b.label), `<b>${b.xs.length}개</b>`, `${share(b.xs.length)}%`, b.xs.length ? esc(b.xs.slice(0, 6).map((r) => `${r.brand} ${r.name} ${r.price}`).join(' · ') + (b.xs.length > 6 ? ` 외 ${b.xs.length - 6}개` : '')) : '-'])).join('');
  const cats = [...new Set(priced.map((r) => r.catName).filter(Boolean))];
  const cRows = cats.map((c) => { const xs = priced.filter((r) => r.catName === c).map((r) => r.n); return trow([esc(c), `${xs.length}개`, esc(won(Math.min(...xs))), esc(won(median(xs))), esc(won(Math.max(...xs)))]); }).join('');
  const months = [...new Set(news.map((r) => (r.date || r.firstSeen || '').slice(0, 7)).filter(Boolean))].sort();
  const mRows = months.map((m) => { const xs = news.filter((r) => (r.date || r.firstSeen || '').startsWith(m)); const ps = xs.filter((r) => priceNum(r.price)).map((r) => priceNum(r.price)); return trow([`<a href="/new/${m}">${esc(monthLabel(m))}</a>`, `${xs.length}개`, `${ps.length}개`, ps.length ? esc(won(median(ps))) : '-']); }).join('');
  const all2 = priced.map((r) => r.n);
  const lead = priced.length ? `가격이 확인된 신메뉴 ${priced.length}개의 가운데 값(중앙값)은 ${won(median(all2))}, 가장 싼 것은 ${won(Math.min(...all2))}(${priced.slice().sort((a, c) => a.n - c.n)[0].brand} ${priced.slice().sort((a, c) => a.n - c.n)[0].name}), 가장 비싼 것은 ${won(Math.max(...all2))}(${priced.slice().sort((a, c) => c.n - a.n)[0].brand} ${priced.slice().sort((a, c) => c.n - a.n)[0].name})예요.` : '가격이 확인된 신메뉴가 아직 없어요.';
  const body = `<p class="meta">기준일 ${esc(fmtDate(today))} · 푸디세이 기록 신메뉴 ${news.length}개 · 매일 자동으로 다시 계산해요</p>`
    + `<p>새 메뉴가 나오면 “얼마쯤 하나”가 제일 궁금하지만, 기사에 가격이 없는 경우가 많아요. 이 글은 푸디세이에 기록된 신메뉴 중 <b>가격이 기사나 브랜드 공식 자료에 숫자 하나로 확인된 것만</b> 가격대별로 나눠 셌어요. 가격을 추측해 채우지 않았고, 가격이 두 개 이상(예: 16조각·20조각)이거나 없는 메뉴는 계산에서 뺐어요.</p>`
    + `<h2>한눈에 보기</h2><p>${esc(lead)} 신메뉴 ${news.length}개 중 가격이 하나로 확인된 것은 ${priced.length}개(${news.length ? Math.round((priced.length / news.length) * 100) : 0}%)이고, 가격이 여러 개라 뺀 것은 ${multi}개, 가격이 확인되지 않은 것은 ${none}개예요. 그래서 이 분포는 “전체 신메뉴의 가격대”가 아니라 “가격이 알려진 신메뉴의 가격대”예요.</p>`
    + `<h2>가격대별 개수</h2><div class="tbl"><table class="compare"><thead><tr><th>가격대</th><th>개수</th><th>비중</th><th>메뉴(싼 순)</th></tr></thead><tbody>${bRows}</tbody></table></div><p class="table-note">비중은 가격이 확인된 ${priced.length}개를 100%로 계산했어요.</p>`
    + (cRows ? `<h2>업종별 가격 범위</h2><div class="tbl"><table class="compare"><thead><tr><th>업종</th><th>개수</th><th>최저</th><th>중앙값</th><th>최고</th></tr></thead><tbody>${cRows}</tbody></table></div><p class="table-note">업종마다 단품·세트·한 마리 구성이 달라 업종끼리 가격을 직접 견주기는 어려워요. 같은 업종 안에서 범위를 보는 용도예요.</p>` : '')
    + (mRows ? `<h2>출시월별 현황</h2><div class="tbl"><table class="compare"><thead><tr><th>월</th><th>신메뉴</th><th>가격 확인</th><th>가격 중앙값</th></tr></thead><tbody>${mRows}</tbody></table></div>` : '')
    + `<h2>계산 방법과 한계</h2><ul><li>가격대 경계는 4,000·5,000·7,000·10,000원이에요. 구간을 바꾸면 개수가 달라질 수 있어요.</li><li>중앙값은 가격을 싼 순으로 늘어놓았을 때 가운데 값이에요(짝수 개면 가운데 두 값의 평균).</li><li>출시일 기준 월은 기사에 나온 출시·발표일이에요. 날짜가 “10월 출시”처럼 일까지 안 나오면 그달 1일로 적어요.</li><li>가격은 매장·지역·배달 여부에 따라 다를 수 있어요. 주문 전에 브랜드 공식 앱에서 확인해 주세요.</li></ul>`;
  return pageShell({ title: `프랜차이즈 신메뉴 가격대 분포 (${priced.length}개, ${monthLabel(today.slice(0, 7))} 기준) | 푸디세이`, desc: `기사에 가격이 확인된 신메뉴 ${priced.length}개를 가격대별로 나눠 셌어요. ${lead}`.slice(0, 155), canonical: '/guide/price-distribution', crumbList: [{ name: '홈', path: '/' }, { name: '가이드', path: '/guide/' }, { name: '신메뉴 가격대 분포', path: '/guide/price-distribution' }], kicker: '가이드 · 자체 계산', h1: GUIDES.find((g) => g.slug === 'price-distribution').title, body });
}

function guideIndex(all, today) {
  const news = all.filter((r) => r.kind === 'new');
  const lim = all.filter((r) => r.kind !== 'new');
  const priced = news.filter((r) => priceNum(r.price)).length;
  const both = lim.filter((r) => r.start && r.end && !r.endLate).length;
  const brands = new Set(all.map((r) => r.brand)).size;
  const body = `<p>푸디세이 가이드는 기사에 나온 사실과 푸디세이가 직접 모은 데이터로만 쓴 글이에요. 계산하는 글은 날짜와 계산식을 적고, 데이터가 바뀌면 자동으로 다시 계산해요.</p>`
    + `<ul class="dl">${GUIDES.map((g) => `<li><a href="/guide/${g.slug}"><b>${esc(g.title)}</b></a> — ${esc(g.desc)}</li>`).join('')}</ul>`
    + `<h2>이 가이드의 데이터 현황</h2><p>기준일 ${esc(fmtDate(today))} 현재 푸디세이에는 브랜드 ${brands}곳의 신메뉴 ${news.length}개와 한정 메뉴·이벤트 ${lim.length}건이 기록돼 있어요. 신메뉴 가운데 가격이 숫자 하나로 확인된 것은 ${priced}개, 한정 항목 가운데 시작일과 종료일이 모두 확인된 것은 ${both}건이에요. 계산 가이드는 이 확인된 값만 써서 만들기 때문에, 기사에서 값이 확인되지 않은 항목은 계산에 들어가지 않아요.</p>`
    + `<h2>가이드별 마지막 갱신일</h2><ul class="dl">${GUIDES.map((g) => `<li><a href="/guide/${g.slug}">${esc(g.title)}</a> — ${esc(fmtDate(g.updated || today))} 갱신${g.generated ? '(푸디세이 데이터로 매번 다시 계산해요)' : '(기사 원문을 다시 확인해 손으로 고쳐요)'}</li>`).join('')}</ul>`
    + `<h2>가이드를 쓰는 기준</h2><ul><li>가격·출시일·종료일은 기사 본문이나 브랜드 공식 자료에 있는 값만 써요.</li><li>계산하는 글은 기준일과 계산식을 글 안에 적어요.</li><li>값이 확인되지 않은 부분은 추측하지 않고 “확인 안 됨”이라고 적어요.</li></ul>`
    + `<h2>월별 모음</h2><p>달마다 새로 나온 메뉴와 마감 달력을 모았어요. 지난 달은 보관함으로 남아요. <a href="/new/">월별 모음 전체 보기</a></p>`
    + `<h2>함께 보면 좋은 곳</h2><p>크리스마스·연말 메뉴는 <a href="/season/christmas">시즌 모음</a>에, 날짜별 새 항목은 <a href="/updates">업데이트 내역</a>에, 업종별 정리는 각 업종 페이지에 있어요.</p>`;
  return pageShell({ title: '가이드 | 푸디세이', desc: '프랜차이즈 적립·예약·한정 메뉴 판매 기간·신메뉴 가격대를 기사 근거와 자체 데이터로 정리한 가이드 모음이에요.', canonical: '/guide/', crumbList: [{ name: '홈', path: '/' }, { name: '가이드', path: '/guide/' }], kicker: '가이드', h1: '가이드', body });
}

function monthPage(ym, all, today, months) {
  const inMonth = (d) => d && d.startsWith(ym);
  const arch = ym < today.slice(0, 7);
  const news = all.filter((r) => r.kind === 'new' && inMonth(r.date || r.firstSeen)).sort((a, c) => String(c.date || c.firstSeen).localeCompare(String(a.date || a.firstSeen)) || a.brand.localeCompare(c.brand, 'ko'));
  const ends = all.filter((r) => r.kind !== 'new' && inMonth(r.end)).sort((a, c) => a.end.localeCompare(c.end));
  const starts = all.filter((r) => r.kind !== 'new' && inMonth(r.start)).sort((a, c) => a.start.localeCompare(c.start));
  const openMs = all.filter((r) => r.kind !== 'new' && !r.end && inMonth(r.start || r.firstSeen) );
  const brands = [...new Set(news.map((r) => r.brand))];
  const ps = news.filter((r) => priceNum(r.price)).map((r) => priceNum(r.price));
  const stOf = (r) => statusLabel(r, status(r, today));
  const [y, mm] = ym.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, mm, 0)).getUTCDate();
  const sum = [`${monthLabel(ym)}에 푸디세이에 기록된 새 메뉴는 ${news.length}개(브랜드 ${brands.length}곳)예요.`];
  if (ps.length) sum.push(`그중 가격이 하나로 확인된 ${ps.length}개의 가격은 ${won(Math.min(...ps))}에서 ${won(Math.max(...ps))} 사이, 중앙값은 ${won(median(ps))}이에요.`); else sum.push('이 달 신메뉴는 기사에서 가격이 확인된 것이 아직 없어요.');
  if (ends.length) sum.push(`${monthLabel(ym)}에 끝나는 한정 메뉴·이벤트는 ${ends.length}건이고, 가장 이른 마감은 ${ends[0].brand} ‘${ends[0].name}’ ${mdw(ends[0].end)}이에요.`);
  if (starts.length) sum.push(`이 달에 시작한 한정 항목은 ${starts.length}건이에요.`);
  const newHeads = ['날짜', '브랜드', '메뉴', '구분', '가격', '상태', '출처'];
  const calHeads = ['마감일', '브랜드', '항목', '구분', '기간', '상태', '출처'];
  const stHeads = ['시작일', '브랜드', '항목', '구분', '종료', '출처'];
  const newRows = news.map((r) => trow([esc(r.date ? short(r.date) : '-'), esc(r.brand), menuA(r), esc(r.tag || '신메뉴'), esc(r.price || '확인 안 됨'), esc(stOf(r)), srcA(r)], newHeads)).join('');
  const calRows = ends.map((r) => trow([esc(`${short(r.end)}(${wd(r.end)})`), esc(r.brand), menuA(r), r.kind === 'event' ? '이벤트' : '한정 메뉴', esc(r.period || ''), esc(stOf(r)), srcA(r)], calHeads)).join('');
  const stRows = starts.map((r) => trow([esc(`${short(r.start)}(${wd(r.start)})`), esc(r.brand), menuA(r), r.kind === 'event' ? '이벤트' : '한정 메뉴', esc(r.end ? `${short(r.end)}까지` : (r.open || '종료일 미정')), srcA(r)], stHeads)).join('');
  const idx = months.indexOf(ym);
  const prev = months[idx - 1], next = months[idx + 1];
  const body = `<p class="meta">기준일 ${esc(fmtDate(today))} · ${arch ? '지난 달 보관함' : '이번 달'} · 날짜는 기사에 나온 출시·발표일, 마감일은 기사에 나온 종료일이에요</p>`
    + (arch ? `<p class="notice">지난 달 기록을 그대로 남긴 보관함이에요. 지금도 파는지는 각 메뉴 페이지의 상태와 브랜드 앱에서 확인해 주세요.</p>` : '')
    + `<h2>${esc(monthLabel(ym))} 요약</h2><p>${esc(sum.join(' '))}</p>`
    + (newRows ? `<h2>새로 나온 메뉴(최근 순)</h2><div class="tbl"><table class="compare"><thead><tr><th>날짜</th><th>브랜드</th><th>메뉴</th><th>구분</th><th>가격</th><th>상태</th><th>출처</th></tr></thead><tbody>${newRows}</tbody></table></div><p class="table-note">날짜가 “-”면 기사에 일까지 안 나온 메뉴예요. 가격은 기사에 있는 값만 적어요.</p>` : '')
    + (calRows ? `<h2>${esc(monthLabel(ym))} 마감 달력</h2><p>종료일이 이 달에 있는 한정 메뉴·이벤트를 날짜 순으로 모았어요(이 달은 ${lastDay}일까지예요). 마감일이 지난 항목은 ‘판매 종료’·‘이벤트 종료’로 남겨 둬요.</p><div class="tbl"><table class="compare"><thead><tr><th>마감일</th><th>브랜드</th><th>항목</th><th>구분</th><th>기간</th><th>상태</th><th>출처</th></tr></thead><tbody>${calRows}</tbody></table></div>` : '')
    + (stRows ? `<h2>${esc(monthLabel(ym))}에 시작한 한정 항목</h2><div class="tbl"><table class="compare"><thead><tr><th>시작일</th><th>브랜드</th><th>항목</th><th>구분</th><th>종료</th><th>출처</th></tr></thead><tbody>${stRows}</tbody></table></div>` : '')
    + `<h2>다른 달 보기</h2><p>${[prev ? `<a href="/new/${prev}">← ${esc(monthLabel(prev))}</a>` : '', next ? `<a href="/new/${next}">${esc(monthLabel(next))} →</a>` : '', '<a href="/new/">월별 모음 전체</a>'].filter(Boolean).join(' · ')}</p>`
    + `<h2>더 읽을거리</h2><p><a href="/guide/limited-menu-duration">한정 메뉴 판매 기간 계산</a> · <a href="/guide/price-distribution">신메뉴 가격대 분포</a> · <a href="${href(seasonPath('christmas'))}">크리스마스·연말 메뉴</a></p>`;
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: `${monthLabel(ym)} 신메뉴`, itemListElement: news.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + href(menuPath(r)), name: `${r.brand} ${r.name}` })) };
  return pageShell({ title: `${monthLabel(ym)} 프랜차이즈 신메뉴·한정 메뉴 모음 (${news.length}개)${arch ? ' · 보관함' : ''} | 푸디세이`, desc: sum.join(' ').slice(0, 155), canonical: '/new/' + ym, crumbList: [{ name: '홈', path: '/' }, { name: '월별 모음', path: '/new/' }, { name: monthLabel(ym), path: '/new/' + ym }], kicker: arch ? '월별 모음 · 보관함' : '월별 모음', h1: `${monthLabel(ym)} 신메뉴·한정 메뉴`, body, jsonld: news.length ? [ld] : [] });
}

function monthHub(all, today, months) {
  const rows = months.slice().reverse().map((m) => {
    const ns = all.filter((r) => r.kind === 'new' && (r.date || r.firstSeen || '').startsWith(m));
    const es = all.filter((r) => r.kind !== 'new' && (r.end || '').startsWith(m));
    return trow([`<a href="/new/${m}">${esc(monthLabel(m))}</a>${m < today.slice(0, 7) ? ' <small>보관함</small>' : ' <small>이번 달</small>'}`, `${ns.length}개`, `${new Set(ns.map((r) => r.brand)).size}곳`, `${es.length}건`], ['월', '새 메뉴', '브랜드', '마감하는 한정·이벤트']);
  }).join('');
  const body = `<p>달마다 새로 나온 프랜차이즈 메뉴와 그달에 끝나는 한정 메뉴·이벤트를 한 페이지에 모았어요. 푸디세이에 기록된 항목을 날짜로 나눠 자동으로 만들고, 지난 달 페이지는 지우지 않고 보관함으로 남겨 두어서 “그때 뭐가 나왔더라” 하고 찾아볼 수 있어요.</p>`
    + `<h2>월별 현황</h2><div class="tbl"><table class="compare"><thead><tr><th>월</th><th>새 메뉴</th><th>브랜드</th><th>마감하는 한정·이벤트</th></tr></thead><tbody>${rows}</tbody></table></div><p class="table-note">새 메뉴는 기사에 나온 출시·발표일, 마감은 기사에 나온 종료일 기준이에요. 기준일 ${esc(fmtDate(today))}.</p>`
    + `<h2>월별 한눈에 보기</h2><ul class="dl">${months.slice().reverse().map((m) => {
      const ns = all.filter((r) => r.kind === 'new' && (r.date || r.firstSeen || '').startsWith(m));
      const cnt = {}; ns.forEach((r) => { cnt[r.brand] = (cnt[r.brand] || 0) + 1; });
      const top = Object.keys(cnt).sort((a, c) => cnt[c] - cnt[a] || a.localeCompare(c, 'ko')).slice(0, 5).map((x) => `${x} ${cnt[x]}개`).join(', ');
      const ps = ns.filter((r) => priceNum(r.price)).map((r) => priceNum(r.price));
      return `<li><a href="/new/${m}"><b>${esc(monthLabel(m))}</b></a> — 새 메뉴 ${ns.length}개${top ? '(많은 브랜드: ' + esc(top) + ')' : ''}${ps.length ? `, 가격이 확인된 ${ps.length}개는 ${esc(won(Math.min(...ps)))}~${esc(won(Math.max(...ps)))}` : ', 가격이 확인된 메뉴는 아직 없어요'}</li>`;
    }).join('')}</ul>`
    + `<h2>전체 합계</h2><p>${months.length}개 월 합계로 새 메뉴 ${all.filter((r) => r.kind === 'new').length}개, 마감하는 한정 메뉴·이벤트 ${all.filter((r) => r.kind !== 'new' && r.end).length}건, 종료일이 아직 없는 한정 항목 ${all.filter((r) => r.kind !== 'new' && !r.end).length}건이 기록돼 있어요. 종료일이 아직 없는 항목은 종료일이 기사에 나오면 그달 마감 달력에 들어가요.</p>`
    + (() => {
      const from = new Date(Date.parse(today) - 7 * 86400000).toISOString().slice(0, 10);
      const rec = all.filter((r) => r.firstSeen && r.firstSeen >= from && !noindexReason(r, status(r, today))).sort((a, c) => c.firstSeen.localeCompare(a.firstSeen) || a.brand.localeCompare(c.brand, 'ko')).slice(0, 12);
      if (rec.length < 3) return '';
      return `<h2>최근 7일 안에 푸디세이에 올라온 메뉴</h2><p>${esc(mdw(from))}부터 ${esc(mdw(today))}까지 등록된 항목 중 검색에 노출되는 ${rec.length}개예요(등록일 순).</p><ul class="dl">${rec.map((r) => `<li><a href="${href(menuPath(r))}"><b>${esc(r.brand)} ${esc(r.name)}</b></a> — ${esc(fmtDate(r.firstSeen))} 등록${r.price ? ', 가격 ' + esc(r.price) : ''}${r.kind === 'new' ? '' : r.period ? ', ' + esc(r.period) : ''}</li>`).join('')}</ul>`;
    })()
    + `<h2>더 읽을거리</h2><p><a href="/guide/limited-menu-duration">한정 메뉴 판매 기간 계산</a> · <a href="/guide/price-distribution">신메뉴 가격대 분포</a> · <a href="/guide/">가이드 전체</a></p>`;
  return pageShell({ title: `월별 신메뉴·한정 메뉴 모음 (${months.length}개 월) | 푸디세이`, desc: '달마다 새로 나온 프랜차이즈 신메뉴와 마감하는 한정 메뉴·이벤트를 모은 월별 보관함이에요.', canonical: '/new/', crumbList: [{ name: '홈', path: '/' }, { name: '월별 모음', path: '/new/' }], kicker: '월별 모음', h1: '월별 신메뉴·한정 메뉴 모음', body });
}

// ---------- 메뉴 페이지 요약 카드(브랜드 칩·가격·D-day·판매 기간 막대) ----------
function brandColor(brand) {
  let h = 0;
  for (let i = 0; i < brand.length; i++) h = (h * 31 + brand.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 46%, 40%)`;
}
// 상단 답 상자(2026-11-18 사장님 지시): H1 바로 아래, 첫 화면 안에서 상태·기간·남은 기간·가격·출처를 큰 글씨로 보여 줘요. 데이터가 있는 항목만 노출해요.
let IMG_META = {};
try { IMG_META = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'img-meta.json'), 'utf8')); } catch (e) {}
const IMG_MAX_BYTES = 700000;
function answerCard(r, today) {
  const st = status(r, today);
  const label = statusLabel(r, st);
  const rows = [];
  rows.push(['상태', `<span class="badge ${st === 'on' ? 'on' : 'off'}" data-end="${esc(r.endLate || r.end || '')}">${esc(label)}</span>`]);
  if (r.kind === 'new') {
    if (r.date) rows.push([/발표/.test(r.when) ? '발표일' : '출시일', esc(mdKo(r.date)) + (r.when && /[가-힣]/.test(r.when.replace(/출시|발표/g, '')) ? `<small>${esc(r.when)}</small>` : '')]);
  } else if (r.end && r.endLate) {
    rows.push(['판매 기간', `${r.start ? esc(mdKo(r.start)) + ' 출시 · ' : ''}<b>종료 예상 ${esc(mdKo(r.end))} ~ ${esc(mdKo(r.endLate))}</b><small>확정이 아니라 기사에 나온 운영 기간으로 계산한 예상이에요</small>`]);
    rows.push(['남은 기간(예상)', `<span class="dday" data-d="${esc(r.end)}"></span> ~ <span class="dday" data-d="${esc(r.endLate)}"></span>`]);
  } else if (r.end) {
    rows.push(['판매 기간', r.start ? `${esc(mdKo(r.start))} ~ ${esc(mdKo(r.end))}` : (/발표|출시/.test(r.period || '') ? esc(natural(r.period)) : `${esc(mdKo(r.end))}까지`)]);
    rows.push(['남은 기간', `<span class="dday" data-d="${esc(r.end)}"></span>`]);
  } else if (r.open || r.period) {
    rows.push(['판매 기간', `${esc(natural(r.period || r.open))}${r.open && r.period && !r.period.includes(r.open) ? '' : ''}<small>종료일은 기사에 아직 나오지 않았어요</small>`]);
  }
  const priceTxt = r.price ? esc(r.price) : (r.lines && r.lines.length ? r.lines.slice(0, 3).map((l) => esc(l[0]) + ' ' + esc(l[1])).join('<br>') : '');
  if (priceTxt) rows.push(['가격', `<b class="mono">${priceTxt}</b>${r.priceNote ? `<small>${esc(r.priceNote)}</small>` : ''}`]);
  const srcTxt = r.src ? `<a href="${esc(r.src.url)}" target="_blank" rel="noopener nofollow">${esc(r.src.label)}</a>` : '';
  const meta = r.img ? IMG_META[r.img] : null;
  const showImg = !!(meta && meta.bytes <= IMG_MAX_BYTES);
  const imgFrom = r.imgFrom || (meta && meta.official ? meta.official.replace(/\(.*\)/, '') + ' 공식 홈페이지' : r.brand + ' 공식 홈페이지');
  const fig = showImg ? `<figure class="ans-img"><img src="${esc(r.img)}" alt="${esc(r.brand + ' ' + r.name)} 공식 홈페이지 사진" width="${meta.w}" height="${meta.h}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>사진: ${esc(imgFrom)} · 확인일 ${esc(fmtDate(UPDATED))}</figcaption></figure>` : '';
  if (rows.length < 2 && !srcTxt) return `<div class="ans-wrap${showImg ? ' has-img' : ''}">${storeFind(r.brand, 'menu')}${fig}</div>`;
  const grid = rows.map(([k, v]) => `<div class="ans-row${k.startsWith('판매') ? ' wide' : ''}"><span class="ans-k">${k}</span><span class="ans-v">${nwTok(v)}</span></div>`).join('');
  return `<div class="ans-wrap${showImg ? ' has-img' : ''}"><div class="answer-card" aria-label="한눈에 보는 답">${grid}${r.kind !== 'new' && r.end ? '<p class="ans-note">재고가 떨어지면 마감일보다 일찍 끝날 수 있어요.</p>' : ''}<p class="ans-src">${srcTxt ? '출처: ' + srcTxt + ' · ' : ''}기준일 <span class="nw">${esc(fmtDate(UPDATED))}</span></p></div>${storeFind(r.brand, 'menu')}${fig}</div>`;
}
function summaryCard(r, today) {
  const st = status(r, today);
  const label = statusLabel(r, st);
  const parts = [`<span class="s-chip" style="background:${brandColor(r.brand)}">${esc(r.brand)}</span>`];
  if (r.price) parts.push(`<span class="s-price mono">${esc(r.price)}</span>`);
  if (r.kind !== 'new' && r.end) {
    parts.push(`<span class="badge s-badge s-dday dday" data-end="${esc(r.endLate || r.end || '')}" data-d="${esc(r.end)}"></span>`);
  } else {
    parts.push(`<span class="badge s-badge ${st === 'on' ? 'on' : 'off'}" data-end="${esc(r.endLate || r.end || '')}">${esc(label)}</span>`);
  }
  let bar = '';
  if (r.kind !== 'new' && r.start && r.end && !r.endLate) {
    const total = dayDiff(r.start, r.end) + 1;
    const passed = Math.min(Math.max(dayDiff(r.start, today) + 1, 0), total);
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
    bar = `<div class="s-bar" role="img" aria-label="판매 기간 중 ${pct}% 지남"><div class="s-bar-fill" style="width:${pct}%"></div></div><p class="s-period">${esc(fmtDate(r.start))} ~ ${esc(fmtDate(r.end))}</p>`;
  }
  return `<div class="s-card">${parts.join('')}${bar}</div>`;
}

// ---------- 메뉴 페이지 ----------
function menuPage(r, all, today) {
  const st = status(r, today);
  const label = statusLabel(r, st);
  const isEvent = r.kind === 'event';
  // 검색 의도형 제목(2026-11-16 네이버 CTR 개선): 기간 정보가 있는 항목만 '언제까지?'를 붙이고, 없으면 억지로 넣지 않아요.
  const hasPeriod = r.kind !== 'new' && !!(r.end || r.endLate || r.period || r.open);
  const priceTag = r.price || (r.lines && r.lines.length) ? '·가격' : '';
  const title = isEvent
    ? (r.end ? `${r.brand} ${r.name} 언제까지? 기간·참여 방법 | 푸디세이` : `${r.brand} ${r.name} 기간·참여 방법 | 푸디세이`)
    : (r.kind === 'new' ? `${r.brand} ${r.name} 신메뉴 출시일·가격 | 푸디세이`
      : (hasPeriod ? `${r.brand} ${r.name} 언제까지? 판매 기간${priceTag || '·가격'} | 푸디세이` : `${r.brand} ${r.name} 가격·판매 기간 | 푸디세이`));
  const h1Text = isEvent ? `${r.brand} ${r.name} ${r.end ? '기간' : '기간·참여 방법'}` : (r.kind === 'new' ? `${r.brand} ${r.name}` : (hasPeriod ? `${r.brand} ${r.name} 판매 기간·가격` : `${r.brand} ${r.name}`));
  const h1Suffix = isEvent ? (r.end ? '기간' : '기간·참여 방법') : (r.kind === 'new' ? '' : (hasPeriod ? '판매 기간·가격' : ''));
  const priceTxt = r.price ? r.price : (r.lines && r.lines.length ? r.lines.map((l) => l[0] + ' ' + l[1]).join(', ') : '');
  const answerBits = [];
  if (r.kind !== 'new') { if (r.period) answerBits.push(`판매·진행 기간은 ${r.period}`); }
  else if (r.date) answerBits.push(`${fmtDate(r.date)} ${/발표/.test(r.when) ? '발표' : '출시'}`);
  if (!isEvent || priceTxt) answerBits.push(priceTxt ? `가격은 ${priceTxt}` : '가격은 기사에서 확인되지 않았어요');
  const answerLine = `<p class="answer"><b>한 줄 답:</b> ${esc(r.brand + ' ' + r.name)} — ${esc(answerBits.join(' · '))}${priceTxt ? '' : ''}. 출처는 아래 기사 링크예요.</p>`;
  const descBits = [];
  if (r.price) descBits.push(`가격 ${r.price}`);
  if (r.kind === 'new' && r.date) descBits.push(`${fmtDate(r.date)} ${/발표/.test(r.when) ? '발표' : '출시'}`);
  if (r.kind !== 'new' && r.period) descBits.push(r.period);
  const lead = (r.desc || r.note || '').replace(/\s+/g, ' ');
  const desc = `${r.brand} ${r.name}${st === 'on' ? '' : '(' + label + ')'} ${isEvent ? '기간·참여 방법' : (hasPeriod ? '판매 기간·가격' : '정보')}: ${descBits.join(', ')}${descBits.length ? '. ' : ''}${lead}`.slice(0, 155);

  const facts = [];
  facts.push(['브랜드', `<a href="${href(brandPath(r.brand))}">${esc(r.brand)}</a>`]);
  if (r.catName) facts.push(['업종', `<a href="${href(catPath(r.cat))}">${esc(r.catName)}</a>`]);
  facts.push(['구분', esc(r.tag)]);
  if (r.season && SEASONS[r.season]) facts.push(['모아보기', `<a href="${href(seasonPath(r.season))}">${esc(SEASONS[r.season].name)} 메뉴 전체</a>`]);
  if (r.season === 'christmas') {
    const cmp = [['<a href="/guide/christmas-cake-preorder">크리스마스 케이크 사전예약 비교(브랜드별 할인·마감)</a>']];
    if (/프리퀀시/.test(r.name + ' ' + (r.title || ''))) cmp.unshift(['<a href="/guide/starbucks-frequency">스타벅스 겨울 e-프리퀀시 정리</a>']);
    facts.push(['같은 시즌 비교', cmp.map((x) => x[0]).join(' · ')]);
  }
  (r.specs || []).forEach(([k, v]) => facts.push([esc(k), esc(v)]));
  if (r.cups) facts.push(['적립', `${r.cups.total}잔 (미션음료 ${r.cups.mission}잔 포함)`]);

  let body = '';
  if (st !== 'on') {
    body += `<p class="notice">${st === 'ended'
      ? (isEvent ? '이 이벤트는 끝났어요.' : '이 한정 메뉴는 판매가 끝났어요. 다시 나오면 이 페이지에 다시 표시돼요.')
      : '출시한 지 시간이 지나 새 메뉴 목록에서는 내려갔어요. 지금도 파는지는 매장이나 브랜드 앱에서 확인해 주세요.'}</p>`;
  }
  body += `<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  if (r.desc) body += `<p>${esc(r.desc)}</p>`;
  if (r.note && r.note !== r.desc) body += `<p>${esc(r.note)}</p>`;
  if (r.lines && r.lines.length) {
    body += `<h2>메뉴와 가격</h2><table class="lines"><tbody>${r.lines.map((l) => `<tr><th scope="row">${esc(l[0])}</th><td class="mono">${esc(l[1] || '-')}</td></tr>`).join('')}</tbody></table>`;
  }
  if (r.group && r.group.length > 1) {
    const sibs = r.group.filter((n) => n !== r.name);
    body += `<h2>같이 나온 메뉴</h2><p>${esc(r.brand)}에서 ${esc(r.name)}${josaWa(r.name)} 함께 ${esc(sibs.join(', '))}도 나왔어요.</p>`;
  }
  // 출처는 상단 답 상자에 한 번만 보여 줘요(같은 정보가 두 번 나오지 않게).

  const REL = relatedSets(r, all, today);
  body += compareHtml(r, all, today);
  body += relTop(REL);

  const cr = crumbs([{ name: '홈', path: '/' }, { name: r.brand, path: brandPath(r.brand) }, { name: r.name, path: menuPath(r) }]);
  // 푸디세이는 물건을 파는 사이트가 아니라 메뉴 정보 사이트예요. Product/Offer/Review 같은 판매·평점 마크업은 쓰지 않고,
  // 화면에 실제 있는 내용(제목·설명·위치)만 WebPage + BreadcrumbList로 알려요. (규칙: README '구조화된 데이터 규칙')
  const page = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: `${r.brand} ${r.name}`,
    description: desc, url: SITE + href(menuPath(r)), inLanguage: 'ko',
    isPartOf: { '@type': 'WebSite', name: '푸디세이', url: SITE + '/' },
    dateModified: UPDATED
  };
  const jsonld = [cr.ld, page];

  return head({ title, desc, canonical: SITE + href(menuPath(r)), jsonld, robots: noindexReason(r, st) ? 'noindex,follow' : '' })
    + `<main><div class="wrap"><article>${cr.html}<p class="kicker">${esc(r.brand)} · ${esc(r.tag)}</p><h1>${menuH1(r, h1Suffix)}</h1>${answerCard(r, today)}${body}</article></div></main>\n`
    + ddayScript() + foot();
}
// D-day와 마감 지남은 날마다 바뀌니 브라우저에서 한국 시간으로 다시 계산해요.
function ddayScript() {
  return `<script>
(function () {
  var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  var t = new Date(p + 'T00:00:00Z');
  function d(s) { return Math.round((new Date(s + 'T00:00:00Z') - t) / 86400000); }
  document.querySelectorAll('.dday[data-d]').forEach(function (n) { var x = d(n.dataset.d); n.textContent = x > 0 ? 'D-' + x : (x === 0 ? 'D-DAY' : '마감'); if (x >= 0 && x <= 3) n.classList.add('soon'); });
  document.querySelectorAll('.badge.on[data-end]').forEach(function (n) { if (n.dataset.end && d(n.dataset.end) < 0) { n.textContent = '종료'; n.className = 'badge off'; } });
})();
</script>
`;
}

// ---------- 목록 페이지(브랜드, 업종) ----------
function listPage({ title, h1, kicker, intro, pathName, crumbList, groups, extraHtml, extra, robots }) {
  const cr = crumbs(crumbList);
  const flat = groups.flatMap((g) => g.items);
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: h1, itemListElement: flat.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + href(menuPath(x.r)), name: `${x.r.brand} ${x.r.name}` })) };
  const body = groups.filter((g) => g.items.length).map((g) => `<h2>${esc(g.title)}</h2><ul class="cards">${g.items.map((x) => card(x.r, x.st)).join('')}</ul>`).join('');
  const desc = `${intro} ${flat.filter((x) => x.st === 'on').slice(0, 6).map((x) => x.r.name).join(', ')}`.slice(0, 155);
  return head({ title, desc, canonical: SITE + href(pathName), jsonld: [cr.ld, ld], robots })
    + `<main><div class="wrap"><article>${cr.html}<p class="kicker">${esc(kicker)}</p><h1>${esc(h1)}</h1><p>${esc(intro)}</p>${stampHtml()}${extraHtml || ''}${body}${extra || ''}${exploreHtml(pathName.startsWith('/cat/') ? pathName.slice(5) : '')}<p class="more"><a href="/">오늘의 새 메뉴·한정 메뉴 전체 보기 →</a></p></article></div></main>\n`
    + foot();
}
// 크리스마스 시즌 페이지용: 브랜드별 케이크 가격·사전예약 마감일 비교표.
// 기사에서 확인한 값만 쓰고, 가격이 확인되지 않으면 추측하지 않고 "가격 미공개"로 적어요.
// 업종 페이지 '이번 주 신메뉴 요약표'(2026-11-16 네이버 노출 검색어 대응): 최근 10일 안에 나온 신메뉴만 브랜드별로 정리해요.
function catWeekTable(list, today, catName) {
  const from = new Date(Date.parse(today) - 10 * 86400000).toISOString().slice(0, 10);
  const rows = list.filter((r) => r.kind === 'new' && r.date && r.date >= from && r.date <= today && status(r, today) === 'on')
    .sort((a, c) => c.date.localeCompare(a.date) || a.brand.localeCompare(c.brand, 'ko'));
  if (rows.length < 2) return '';
  const heads = ['브랜드', '메뉴', '출시·발표일', '가격', '출처'];
  const body = rows.map((r) => trow([esc(r.brand), `<a href="${href(menuPath(r))}">${esc(r.name)}</a>`, esc(mdw(r.date)), esc(r.price || '확인 안 됨'), r.src ? `<a href="${esc(r.src.url)}" target="_blank" rel="noopener nofollow">${esc(r.src.label)}</a>` : '-'], heads)).join('');
  return `<h2>이번 주 ${esc(catName)} 신메뉴 한눈에</h2><p>최근 10일(${esc(mdw(from))}~${esc(mdw(today))}) 안에 나온 ${rows.length}개를 브랜드별로 모았어요. 가격은 기사에 나온 값만 적었고, 없으면 “확인 안 됨”이에요.</p><div class="tbl"><table class="compare"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// 표 안에 넣는 작은 '매장 찾기' 링크(마케터 요청 2026-11-16): storeFind와 같은 네이버 지도 검색·GA4 store_find 이벤트를 써요.
function storeLink(brand, pageType) {
  const pin = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  return `<a class="store-link" href="https://map.naver.com/p/search/${encodeURIComponent(brand)}" target="_blank" rel="noopener" data-store-find="${esc(brand)}" data-page-type="${esc(pageType)}">${pin}<span>매장 찾기</span></a>`;
}
function christmasCompareTable(list) {
  const brands = [...new Set(list.map((r) => r.brand))];
  const rows = brands.map((b) => {
    const cakeItems = list.filter((r) => r.brand === b && r.kind === 'new' && /케이크/.test(r.tag || ''));
    if (!cakeItems.length) return null;
    const prices = [...new Set(cakeItems.filter((r) => r.price).map((r) => r.price))];
    const events = list.filter((r) => r.brand === b && r.kind === 'event' && r.end && /케이크/.test(r.name || '')).sort((a, c) => a.end.localeCompare(c.end));
    return {
      brand: b, count: cakeItems.length,
      price: prices.length ? prices.join(', ') : '가격 미공개',
      deadline: events.length ? `${fmtDate(events[0].end)} (${short(events[0].end)})` : '-'
    };
  }).filter(Boolean);
  if (!rows.length) return '';
  return `<h2>브랜드별 케이크 가격·사전예약 마감일 비교</h2>`
    + `<p class="table-note">가격·마감일은 기사나 브랜드 공식 홈페이지에서 확인한 것만 적었어요. 확인되지 않은 가격은 "가격 미공개"로 표시해요.</p>`
    + `<table class="compare"><thead><tr><th>브랜드</th><th>케이크 종류</th><th>가격</th><th>사전예약 마감</th></tr></thead><tbody>`
    + rows.map((r) => `<tr><td data-label="브랜드">${esc(r.brand)}<br>${storeLink(r.brand, 'season')}</td><td data-label="케이크 종류">${r.count}종</td><td data-label="가격">${esc(r.price)}</td><td data-label="사전예약 마감">${esc(r.deadline)}</td></tr>`).join('')
    + `</tbody></table>`;
}
function sameCatBrands(all, today, catId, brand, catName) {
  const bs = [...new Set(all.filter((r) => r.cat === catId && r.brand !== brand && status(r, today) === 'on').map((r) => r.brand))];
  return bs.length ? `<h2>다른 ${esc(catName)} 브랜드</h2><p class="explore">${bs.map((x) => `<a href="${href(brandPath(x))}">${esc(x)}</a>`).join(' · ')}</p>` : '';
}
function sortRecent(a, b) {
  const ka = a.r.date || a.r.end || a.r.firstSeen || '', kb = b.r.date || b.r.end || b.r.firstSeen || '';
  return kb.localeCompare(ka);
}
function groupsFor(list, today, withBrand) {
  const on = list.map((r) => ({ r, st: status(r, today) }));
  const g = [
    { title: '새로 나온 메뉴', items: on.filter((x) => x.r.kind === 'new' && x.st === 'on').sort(sortRecent) },
    { title: '기간 한정 메뉴', items: on.filter((x) => x.r.kind === 'limited' && x.st === 'on') },
    { title: '진행 중인 이벤트', items: on.filter((x) => x.r.kind === 'event' && x.st === 'on') },
    { title: '지난 메뉴·끝난 이벤트', items: on.filter((x) => x.st !== 'on').sort(sortRecent) }
  ];
  return g;
}

// ---------- index.html 갱신 ----------
function replaceBlock(html, name, inner) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`index.html에 <!-- build:${name} --> 표시가 없어요`);
  return html.replace(re, `$1\n${inner}\n$2`);
}

// ---------- 실행 ----------
function main() {
  const today = kstToday();
  const D = loadData();
  UPDATED = D.updated || today;
  CATS = D.cats;
  const { items, catName } = collect(D);
  const all = mergeArchive(items, today);

  for (const dir of ['menu', 'brand', 'cat', 'season', 'new']) {
    const p = path.join(ROOT, dir);
    fs.rmSync(p, { recursive: true, force: true });
    fs.mkdirSync(p, { recursive: true });
  }
  const urls = [];
  let noindexCount = 0;
  all.forEach((r) => {
    let mp = menuPage(r, all, today);
    if (!noindexReason(r, status(r, today)) && plainLen(mp) < MENU_MIN && !(GRACE.until >= today && GRACE.slugs.includes(r.slug))) { FORCED.add(r.slug); mp = menuPage(r, all, today); }
    fs.writeFileSync(path.join(ROOT, 'menu', r.slug + '.html'), mp);
    if (noindexReason(r, status(r, today))) { noindexCount++; return; }
    urls.push({ loc: menuPath(r), lastmod: r.firstSeen, pri: status(r, today) === 'on' ? '0.7' : '0.4' });
  });

  let hubNoindex = 0;
  const brands = [...new Set(all.map((r) => r.brand))].sort((a, b) => a.localeCompare(b, 'ko'));
  brands.forEach((b) => {
    const list = all.filter((r) => r.brand === b);
    const cat = list.find((r) => r.cat);
    const mkBrand = (robots) => listPage({
      title: `${b} 신메뉴 (${today.slice(0, 4)}년 ${Number(today.slice(5, 7))}월) | 푸디세이`, h1: `${b} 신메뉴·한정 메뉴`, kicker: cat ? cat.catName : '브랜드',
      intro: `${b}에서 최근 새로 나온 메뉴와 기간 한정 메뉴, 이벤트를 모았어요. 매일 아침 기사를 확인해 업데이트해요.`,
      pathName: brandPath(b),
      crumbList: [{ name: '홈', path: '/' }].concat(cat ? [{ name: cat.catName, path: catPath(cat.cat) }] : []).concat([{ name: b, path: brandPath(b) }]),
      groups: groupsFor(list, today),
      extraHtml: storeFind(b, 'brand') + brandSummary(list, today, b) + dataTable(list, today, `${b} 메뉴 한눈에 보기`) + descList(list, today),
      extra: cat ? sameCatBrands(all, today, cat.cat, b, cat.catName) : '',
      robots
    });
    let page = mkBrand('');
    const brandThin = plainLen(page) < HUB_MIN || (hangulLen(page) < HUB_MIN && !VALUE_EX['brand/' + slug(b) + '.html']);
    if (brandThin) { page = mkBrand('noindex,follow'); hubNoindex++; }
    fs.writeFileSync(path.join(ROOT, 'brand', slug(b) + '.html'), page);
    if (brandThin) return;
    urls.push({ loc: brandPath(b), lastmod: UPDATED, pri: '0.6' });
  });

  D.cats.forEach((c) => {
    const list = all.filter((r) => r.cat === c.id);
    const bs = [...new Set(list.map((r) => r.brand))];
    const mkCat = (robots) => listPage({
      title: `${c.name} 신메뉴 ${Number(today.slice(5, 7))}월 최신: 브랜드별 이번 주 신상·한정 메뉴 | 푸디세이`, h1: `${c.name} 신메뉴·한정 메뉴`, kicker: '업종',
      intro: `${bs.join(', ')} 등 ${c.name} 프랜차이즈의 새 메뉴와 기간 한정 메뉴를 최근 순으로 모았어요.`,
      pathName: catPath(c.id), crumbList: [{ name: '홈', path: '/' }, { name: c.name, path: catPath(c.id) }],
      groups: groupsFor(list, today),
      extraHtml: catSummary(list, today, c.name) + catWeekTable(list, today, c.name) + descList(list, today) + dataTable(list.map((r) => Object.assign({}, r, { brandShow: true })), today, `${c.name} 메뉴 한눈에 보기`),
      extra: bs.length ? `<h2>${esc(c.name)} 브랜드</h2><p class="explore">${bs.map((x) => `<a href="${href(brandPath(x))}">${esc(x)}</a>`).join(' · ')}</p>` : '',
      robots
    });
    let page = mkCat('');
    const catThin = plainLen(page) < HUB_MIN || (hangulLen(page) < HUB_MIN && !VALUE_EX['cat/' + c.id + '.html']);
    if (catThin) { page = mkCat('noindex,follow'); hubNoindex++; }
    fs.writeFileSync(path.join(ROOT, 'cat', c.id + '.html'), page);
    if (catThin) return;
    urls.push({ loc: catPath(c.id), lastmod: UPDATED, pri: '0.6' });
  });

  Object.keys(SEASONS).forEach((sid) => {
    const list = all.filter((r) => r.season === sid);
    if (!list.length) return;
    const S = SEASONS[sid];
    const page = listPage({
      title: S.title(today.slice(0, 4)), h1: S.h1, kicker: '시즌', intro: S.intro, pathName: seasonPath(sid),
      crumbList: [{ name: '홈', path: '/' }, { name: S.name, path: seasonPath(sid) }],
      groups: groupsFor(list, today),
      extraHtml: sid === 'christmas' ? '<div class="notice">예약 마감이 가까운 순으로 브랜드별 할인·수령 기간을 비교했어요: <a href="/guide/christmas-cake-preorder">크리스마스 케이크 사전예약 비교</a> · <a href="/guide/starbucks-frequency">스타벅스 겨울 e-프리퀀시 정리</a></div>' + christmasCompareTable(list) : ''
    });
    fs.writeFileSync(path.join(ROOT, 'season', sid + '.html'), page);
    urls.push({ loc: seasonPath(sid), lastmod: UPDATED, pri: '0.7' });
  });

  // 업데이트 내역: 푸디세이에 등록된 날짜별 메뉴 목록(검색 노출 대상만)
  {
    const shown = all.filter((r) => !noindexReason(r, status(r, today)));
    const days = [...new Set(shown.map((r) => r.firstSeen))].sort().reverse();
    const upBody = days.map((d) => `<h2>${esc(fmtDate(d))} 등록</h2><ul class="cards">${shown.filter((r) => r.firstSeen === d).map((r) => card(r, status(r, today))).join('')}</ul>`).join('');
    const upPage = head({ title: `업데이트 내역 (${UPDATED.slice(0, 4)}년 ${Number(UPDATED.slice(5, 7))}월) | 푸디세이`, desc: '푸디세이에 새로 올라온 프랜차이즈 신메뉴·한정 메뉴를 등록 날짜별로 모았어요. 매일 아침 기사를 확인해 업데이트해요.', canonical: SITE + '/updates', jsonld: [crumbs([{ name: '홈', path: '/' }, { name: '업데이트 내역', path: '/updates' }]).ld] })
      + `<main><div class="wrap"><article>${crumbs([{ name: '홈', path: '/' }, { name: '업데이트 내역', path: '/updates' }]).html}<p class="kicker">업데이트</p><h1>업데이트 내역</h1><p>푸디세이에 올라온 새 메뉴와 한정 메뉴를 등록 날짜 순으로 모았어요. 매일 아침 기사 원문을 확인해서 바뀐 내용만 반영해요.</p>${stampHtml()}${upBody}${exploreHtml('')}<p class="more"><a href="/">오늘의 새 메뉴·한정 메뉴 전체 보기 →</a></p></article></div></main>\n`
      + foot();
    fs.writeFileSync(path.join(ROOT, 'updates.html'), upPage);
    urls.push({ loc: '/updates', lastmod: UPDATED, pri: '0.6' });
  }

  // 가이드(자동 계산)·월별 모음
  fs.mkdirSync(path.join(ROOT, 'guide'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'guide', 'limited-menu-duration.html'), durationGuide(all, today));
  fs.writeFileSync(path.join(ROOT, 'guide', 'price-distribution.html'), priceGuide(all, today));
  fs.writeFileSync(path.join(ROOT, 'guide', 'index.html'), guideIndex(all, today));
  const MONTHS = monthsOf(all, today);
  MONTHS.forEach((m) => {
    fs.writeFileSync(path.join(ROOT, 'new', m + '.html'), monthPage(m, all, today, MONTHS));
    urls.push({ loc: '/new/' + m, lastmod: UPDATED, pri: m === today.slice(0, 7) ? '0.7' : '0.5' });
  });
  fs.writeFileSync(path.join(ROOT, 'new', 'index.html'), monthHub(all, today, MONTHS));
  urls.push({ loc: '/new/', lastmod: UPDATED, pri: '0.6' });

  // sitemap.xml
  const fixed = [{ loc: '/', lastmod: D.updated || today, pri: '1.0', freq: 'daily' }, { loc: '/about', pri: '0.3', freq: 'monthly' }, { loc: '/contact', pri: '0.3', freq: 'monthly' }, { loc: '/terms', pri: '0.2', freq: 'yearly' }, { loc: '/privacy', pri: '0.2', freq: 'yearly' }, { loc: '/guide/', pri: '0.5', freq: 'weekly' }].concat(GUIDES.map((g) => ({ loc: '/guide/' + g.slug, lastmod: g.updated || UPDATED, pri: '0.6', freq: 'monthly' })));
  const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + fixed.concat(urls).map((u) => `  <url><loc>${esc(SITE + href(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.freq ? `<changefreq>${u.freq}</changefreq>` : ''}<priority>${u.pri}</priority></url>`).join('\n')
    + '\n</urlset>\n';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sm);

  // rss.xml: 새로 올라온 메뉴 순(최근 50개). 네이버 서치어드바이저 RSS 제출용.
  const rfc = (d) => new Date(d + 'T09:00:00+09:00').toUTCString();
  const feed = all.filter((r) => !noindexReason(r, status(r, today))).slice().sort((a, b) => (b.firstSeen + (b.date || '')).localeCompare(a.firstSeen + (a.date || ''))).slice(0, 50);
  const rss = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n'
    + `<title>푸디세이 · 프랜차이즈 새 메뉴와 한정 메뉴</title>\n<link>${SITE}/</link>\n<description>버거, 치킨, 피자, 빵, 분식, 커피 프랜차이즈의 새 메뉴와 기간 한정 메뉴를 매일 정리해요.</description>\n<language>ko</language>\n`
    + `<atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>\n<lastBuildDate>${rfc(D.updated || today)}</lastBuildDate>\n`
    + feed.map((r) => {
      const st = status(r, today);
      const bits = [r.tag, r.price, r.kind === 'new' ? r.when : r.period, st === 'on' ? '' : statusLabel(r, st)].filter(Boolean).join(' · ');
      const d = [bits, r.desc || r.note].filter(Boolean).join(' — ');
      const u = SITE + href(menuPath(r));
      return `<item><title>${esc(r.brand + ' ' + r.name)}</title><link>${esc(u)}</link><guid isPermaLink="true">${esc(u)}</guid>`
        + `<pubDate>${rfc(r.firstSeen > (r.date || '') ? r.firstSeen : r.date)}</pubDate>${r.catName ? `<category>${esc(r.catName)}</category>` : ''}<description>${esc(d)}</description></item>`;
    }).join('\n')
    + '\n</channel>\n</rss>\n';
  fs.writeFileSync(path.join(ROOT, 'rss.xml'), rss);

  // index.html: 브랜드별 메뉴 목록(크롤러와 사람 모두 보는 링크)과 구조화 데이터
  const idxFile = path.join(ROOT, 'index.html');
  let idx = fs.readFileSync(idxFile, 'utf8');
  const liveItems = all.filter((r) => status(r, today) === 'on');
  const seasonHtml = Object.keys(SEASONS).map((sid) => {
    const list = liveItems.filter((r) => r.season === sid);
    if (!list.length) return '';
    const bs = [...new Set(list.map((r) => r.brand))];
    return `      <div class="dir-cat"><h3><a href="${href(seasonPath(sid))}">${esc(SEASONS[sid].name)}</a></h3>`
      + bs.map((b) => `<p><a class="dir-brand" href="${href(brandPath(b))}">${esc(b)}</a> `
        + list.filter((r) => r.brand === b).map((r) => `<a href="${href(menuPath(r))}">${esc(r.name)}</a>`).join(' · ') + '</p>').join('')
      + '</div>';
  }).filter(Boolean);
  const dirHtml = seasonHtml.concat(D.cats.map((c) => {
    const bs = [...new Set(liveItems.filter((r) => r.cat === c.id).map((r) => r.brand))];
    if (!bs.length) return '';
    return `      <div class="dir-cat"><h3><a href="${href(catPath(c.id))}">${esc(c.name)}</a></h3>`
      + bs.map((b) => `<p><a class="dir-brand" href="${href(brandPath(b))}">${esc(b)}</a> `
        + liveItems.filter((r) => r.brand === b).map((r) => `<a href="${href(menuPath(r))}">${esc(r.name)}</a>`).join(' · ') + '</p>').join('')
      + '</div>';
  })).filter(Boolean).join('\n');
  idx = replaceBlock(idx, 'directory', dirHtml);
  const lim = liveItems.filter((r) => r.kind !== 'new').sort((a, c) => (a.end || a.endLate || '9999').localeCompare(c.end || c.endLate || '9999'));
  const limHtml = lim.length
    ? '      <ul class="dir-lim">\n' + lim.map((r) => `        <li><a href="${href(menuPath(r))}"><b>${esc(r.brand)}</b> ${esc(r.name)}</a> <span>${esc([r.kind === 'event' ? '이벤트' : '한정 메뉴', r.period || r.open].filter(Boolean).join(' · '))}</span></li>`).join('\n') + '\n      </ul>'
    : '';
  idx = replaceBlock(idx, 'upcoming', limHtml);
  // 홈 상단 '오늘/이번 주 업데이트': archive.json의 등록일(firstSeen) 기준으로 센 사실만 써요.
  const t0 = Date.parse(today);
  const ageOf = (r) => Math.round((t0 - Date.parse(r.firstSeen)) / 86400000);
  const newToday = all.filter((r) => r.firstSeen === today).length;
  const newWeek = all.filter((r) => r.firstSeen && ageOf(r) >= 0 && ageOf(r) <= 6).length;
  const freshBits = [newToday ? `오늘 올라온 메뉴 ${newToday}개` : '', newWeek ? `최근 7일간 등록된 메뉴 ${newWeek}개` : ''].filter(Boolean).join(' · ');
  idx = replaceBlock(idx, 'stamp', `마지막 업데이트 <time datetime="${esc(UPDATED)}">${esc(fmtDate(UPDATED))}</time>${freshBits ? ' · ' + freshBits : ''} · 판매·진행 중 메뉴 ${liveItems.length}개 · <a href="/updates">업데이트 내역</a> · <a href="/rss.xml">RSS 구독</a>`);
  const readsLinks = GUIDES.map((g) => `<li><a href="/guide/${g.slug}">${esc(g.title)}</a></li>`).concat(MONTHLY_LINKS(all, today)).concat([`<li><a href="${href(seasonPath('christmas'))}">크리스마스·연말 메뉴 모음</a></li>`, '<li><a href="/updates">날짜별 업데이트 내역</a></li>']);
  idx = replaceBlock(idx, 'reads', `      <ul class="reads-list">\n        ${readsLinks.join('\n        ')}\n      </ul>`);
  const idxLd = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: '푸디세이', alternateName: 'Foodyssey', url: SITE + '/' },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: '프랜차이즈 새 메뉴와 한정 메뉴', itemListElement: liveItems.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + href(menuPath(r)), name: `${r.brand} ${r.name}` })) }
  ];
  idx = replaceBlock(idx, 'jsonld', idxLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n'));
  fs.writeFileSync(idxFile, idx);

  // 구조화 데이터 린트: 금지 패턴이 있으면 빌드를 실패시켜서 잘못된 페이지가 배포되지 않게 해요.
  autoIsolate(releaseHold(all, today));
  versionAssets();
  const lintRes = require('./lint-jsonld').lint(ROOT, { analytics: true });
  if (lintRes.errs.length) {
    console.error('JSON-LD 린트 실패 ' + lintRes.errs.length + '건');
    lintRes.errs.slice(0, 40).forEach((e) => console.error(' - ' + e));
    process.exit(1);
  }
  console.log('JSON-LD 린트 통과: ' + JSON.stringify(lintRes.stat));
  // 콘텐츠 품질 점검(scripts/quality-report.js): 치명 문제(출처 없는 가격·날짜, 기사와 다른 값, 끝난 메뉴에 종료 표시 없음 등)는 빌드를 멈추고,
  // 총점 미달 페이지 수는 경고로만 알려요. 자동 업데이트(매일 09시)가 만든 새 페이지도 같은 기준을 통과해야 게시돼요.
  try {
    const q = require('./quality-report').run(ROOT);
    const hardRows = q.rows.filter((r) => r.hard.length && !r.noindex);
    console.log('품질 점검: 페이지 ' + q.rows.length + '개, 미달 ' + q.failCount + '개, 하위 20% ' + q.bottomCount + '개(총점 ≤ ' + q.cut + '), 출처 대조 ' + q.verifiedPages + '개');
    if (q.failCount) q.rows.filter((r) => r.fail).slice(0, 15).forEach((r) => console.warn(' ! 품질 미달 ' + r.total + '점 ' + r.url + ' — ' + r.hard.concat(r.notes).slice(0, 3).join(' / ')));
    const vg = require('./quality-report').valueGate(q.rows, ROOT);
    console.log('가치 게이트(정보형 한글 800자): 메뉴 상세 ' + vg.warns.length + '개 미달(경고), 예외 목록 ' + vg.exceptions + '개' + (vg.stale.length ? ', 이미 통과해 예외 목록에서 뺄 수 있는 것 ' + vg.stale.length + '개' : ''));
    if (vg.errs.length) {
      console.error('가치 게이트 실패 ' + vg.errs.length + '건');
      vg.errs.slice(0, 30).forEach((e) => console.error(' - ' + e));
      process.exit(1);
    }
    if (hardRows.length) {
      console.error('품질 점검 실패(치명 문제) ' + hardRows.length + '건');
      hardRows.slice(0, 30).forEach((r) => console.error(' - ' + r.url + ' — ' + r.hard.join(' / ')));
      process.exit(1);
    }
  } catch (e) { console.warn('품질 점검을 건너뛰었어요: ' + e.message); }

  console.log(`메뉴 ${all.length}개(판매·진행 중 ${liveItems.length}, 검색 제외 noindex ${noindexCount}, 허브 noindex ${hubNoindex}), 브랜드 ${brands.length}개, 업종 ${D.cats.length}개 페이지를 만들었어요.`);
}


// 자동 격리(2026-11-12 PULSE 지시): 데이터 갱신으로 새로 생긴 메뉴·브랜드·업종 페이지가 가치 기준에 못 미치면 빌드를 멈추지 않고
// 그 페이지만 noindex,follow + 사이트맵·RSS 제외로 돌려요. 기준은 낮추지 않았고, 보강돼 기준을 넘으면 다음 빌드에서 자동으로 색인 대상으로 돌아와요.
// 격리 목록은 빌드 로그와 data/auto-noindex.json에 남겨요(관리자가 보강 대상으로 확인).
// 하루 새 메뉴 페이지 한도(2026-11 PULSE 승인): 같은 틀의 페이지가 한꺼번에 색인 대상이 되지 않게, 새로 생긴 메뉴 페이지는 하루 5쪽까지만 색인 대상으로 풀어요.
// 이미 라이브였던 페이지는 처음 이 기능을 켠 날 seed로 기록해 한도에 세지 않아요. 한도를 넘는 새 페이지는 release 날짜가 뒤로 밀려 그날까지 noindex,follow·사이트맵 제외예요.
const DAILY_NEW_LIMIT = 5;
function releaseHold(all, today) {
  const f = path.join(ROOT, 'data', 'index-release.json');
  let m = { dailyLimit: DAILY_NEW_LIMIT, release: {} };
  try { m = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  const first = !Object.keys(m.release || {}).length;
  m.dailyLimit = DAILY_NEW_LIMIT;
  const live = all.filter((r) => !noindexReason(r, status(r, today)));
  const count = {};
  Object.values(m.release).forEach((x) => { if (!x.seed) count[x.date] = (count[x.date] || 0) + 1; });
  live.slice().sort((a, b) => String(a.firstSeen || '').localeCompare(String(b.firstSeen || '')) || a.slug.localeCompare(b.slug)).forEach((r) => {
    if (m.release[r.slug]) return;
    if (first) { m.release[r.slug] = { date: r.firstSeen || today, seed: true }; return; }
    let d = r.firstSeen && r.firstSeen > today ? r.firstSeen : today;
    if (r.firstSeen && r.firstSeen < today) d = today;
    while ((count[d] || 0) >= DAILY_NEW_LIMIT) d = new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10);
    count[d] = (count[d] || 0) + 1;
    m.release[r.slug] = { date: d };
  });
  const hold = [];
  live.forEach((r) => { const x = m.release[r.slug]; if (x && x.date > today) hold.push({ rel: 'menu/' + r.slug + '.html', url: menuPath(r), why: '하루 새 페이지 한도(' + DAILY_NEW_LIMIT + '쪽): ' + x.date + '에 색인 대상이 돼요' }); });
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(m, null, 1) + '\n');
  return hold;
}

function autoIsolate(extraHold) {
  const qr = require('./quality-report');
  const q = qr.run(ROOT);
  let ex = {};
  try { ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'value-exceptions.json'), 'utf8')); } catch (e) {}
  const list = [];
  q.rows.filter((r) => !r.noindex).forEach((r) => {
    if (r.type === 'menu' && r.uniqueChars < 40) list.push({ rel: r.rel, url: r.url, why: '이 페이지만의 문장 ' + r.uniqueChars + '자(40자 미만)' });
    else if ((r.type === 'brand' || r.type === 'cat') && r.hangul < qr.VALUE_MIN_HANGUL && !ex[r.rel]) list.push({ rel: r.rel, url: r.url, why: '본문 한글 ' + r.hangul + '자(' + qr.VALUE_MIN_HANGUL + '자 미만)' });
  });
  (extraHold || []).forEach((h) => { if (!list.some((x) => x.rel === h.rel)) list.push(h); });
  let sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  let rss = '';
  try { rss = fs.readFileSync(path.join(ROOT, 'rss.xml'), 'utf8'); } catch (e) {}
  list.forEach((it) => {
    const f = path.join(ROOT, it.rel);
    let h = fs.readFileSync(f, 'utf8');
    if (!/<meta name="robots"/.test(h)) h = h.replace(/(<link rel="canonical"[^>]*>\r?\n)/, '$1<meta name="robots" content="noindex,follow">\n');
    fs.writeFileSync(f, h);
    const loc = SITE + it.url.split('/').map((x) => encodeURIComponent(decodeURIComponent(x))).join('/');
    sm = sm.split('\n').filter((ln) => !(ln.includes('<loc>' + loc + '</loc>'))).join('\n');
    rss = rss.replace(/<item>(?:(?!<\/item>)[\s\S])*?<link>[^<]*<\/link>(?:(?!<\/item>)[\s\S])*?<\/item>\s*/g, (m) => (m.includes('<link>' + loc + '</link>') ? '' : m));
  });
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sm);
  if (rss) fs.writeFileSync(path.join(ROOT, 'rss.xml'), rss);
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'auto-noindex.json'), JSON.stringify({ generated: UPDATED, note: '데이터 갱신 빌드가 기준 미달로 자동 noindex,follow·사이트맵 제외한 페이지예요. 보강하면 다음 빌드에서 자동으로 색인 대상이 돼요.', pages: list.map((x) => ({ page: x.url, why: x.why })) }, null, 1) + '\n');
  console.log('자동 격리 ' + list.length + '건(noindex,follow, 사이트맵·RSS 제외): ' + (list.map((x) => x.url + ' [' + x.why + ']').join(', ') || '없음'));
}


// (워크플로는 정적 페이지 5개도 함께 커밋해요.)
// 스타일 캐시 무효화(2026-11-16): pages.css가 바뀌면 모든 페이지의 링크 주소(?v=해시)가 함께 바뀌어서, 브라우저·CDN에 남은 옛 CSS가 새 HTML에 쓰이지 않게 해요.
function versionAssets() {
  const crypto = require('crypto');
  const v = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, 'pages.css'))).digest('hex').slice(0, 8);
  const walkH = (d, out) => { fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { if (['.git', 'node_modules', 'scripts', 'data'].includes(e.name)) return; const f = path.join(d, e.name); if (e.isDirectory()) walkH(f, out); else if (e.name.endsWith('.html')) out.push(f); }); return out; };
  let n = 0;
  walkH(ROOT, []).forEach((f) => {
    const h = fs.readFileSync(f, 'utf8');
    const u = h.replace(/href="\/pages\.css(?:\?v=[0-9a-f]+)?"/g, 'href="/pages.css?v=' + v + '"');
    if (u !== h) { fs.writeFileSync(f, u); n++; }
  });
  console.log('스타일 버전 ?v=' + v + ' 적용 ' + n + '개 페이지');
}

main();
