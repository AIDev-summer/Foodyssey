#!/usr/bin/env node
// 푸디세이 정적 페이지 만들기: data.js를 읽어 메뉴별·브랜드별·업종별 HTML과 sitemap.xml을 만들어요.
// 실행: node scripts/build.js  (저장소 맨 위 폴더에서)
// - menu/<브랜드-메뉴>.html, brand/<브랜드>.html, cat/<업종>.html 을 새로 써요.
// - data/archive.json 에 한 번이라도 올라온 메뉴를 모두 기록해요. data.js에서 빠져도 페이지는 "판매 종료"로 남아요.
// - index.html 안의 <!-- build:directory --> 사이(브랜드별 메뉴 목록)와 <!-- build:jsonld --> 사이(구조화 데이터)를 다시 채워요.
// GitHub Actions(.github/workflows/build-pages.yml)가 data.js가 바뀔 때마다 자동으로 돌려요.
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
        date: g.date || '', when: g.when || '', note: g.note || '',
        desc: (h && h.desc) || '', specs: (h && h.specs) || null, priceNote: (h && h.priceNote) || '',
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
      end: x.end || '', endLate: x.endLate || '', open: x.open || '', period: x.period || '',
      desc: x.desc || (h && h.desc) || '', specs: (h && h.specs) || null, priceNote: (h && h.priceNote) || '',
      lines: x.lines || null, cups: x.cups || null, src: x.src || null
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

// ---------- 공통 틀 ----------
function head({ title, desc, canonical, image, jsonld }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
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
</script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@700;800&family=IBM+Plex+Sans+KR:wght@400;600;700&family=IBM+Plex+Mono:wght@500&display=swap">
<link rel="alternate" type="application/rss+xml" title="푸디세이" href="/rss.xml">
<link rel="stylesheet" href="/pages.css">
</head>
<body>
<header><div class="wrap"><a class="logo" href="/">푸디세이<span class="logo-en" lang="en">Food Odyssey</span></a><nav><a href="/#new">신상</a><a href="/#limited">한정</a><button class="theme-btn" id="theme-btn" type="button" aria-label="다크모드 켜기"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button></nav></div></header>
`;
}
function foot() {
  return `<footer><div class="wrap"><p>메뉴와 가격은 매장마다 다를 수 있어요. 주문 전에 브랜드 공식 앱이나 매장에서 한 번 더 확인해 주세요. 푸디세이는 각 브랜드와 관계없는 독립 사이트예요.</p><p class="links"><a href="/">홈</a><a href="/about">소개</a><a href="/privacy">개인정보처리방침</a><a href="mailto:aidev.summer@gmail.com">문의</a></p></div></footer>
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

function card(r, st) {
  const meta = [r.tag, r.price, r.kind === 'new' ? r.when : r.period].filter(Boolean).join(' · ');
  return `<li><a href="${href(menuPath(r))}"><span class="c-brand">${esc(r.brand)}</span><span class="c-name">${esc(r.name)}</span><span class="c-meta">${esc(meta)}</span>${st !== 'on' ? `<span class="badge off">${esc(statusLabel(r, st))}</span>` : ''}</a></li>`;
}

// ---------- 메뉴 페이지 ----------
function menuPage(r, all, today) {
  const st = status(r, today);
  const label = statusLabel(r, st);
  const isEvent = r.kind === 'event';
  const title = isEvent
    ? `${r.brand} ${r.name} 기간·참여 방법 | 푸디세이`
    : `${r.brand} ${r.name} 가격·${r.kind === 'new' ? '출시일' : '판매 기간'} | 푸디세이`;
  const descBits = [];
  if (r.price) descBits.push(`가격 ${r.price}`);
  if (r.kind === 'new' && r.date) descBits.push(`${fmtDate(r.date)} ${/발표/.test(r.when) ? '발표' : '출시'}`);
  if (r.kind !== 'new' && r.period) descBits.push(r.period);
  const lead = (r.desc || r.note || '').replace(/\s+/g, ' ');
  const desc = `${r.brand} ${r.name}${st === 'on' ? '' : '(' + label + ')'} 정보예요. ${descBits.join(', ')}${descBits.length ? '. ' : ''}${lead}`.slice(0, 155);

  const facts = [];
  facts.push(['상태', `<span class="badge ${st === 'on' ? 'on' : 'off'}" data-end="${esc(r.endLate || r.end || '')}">${esc(label)}</span>`]);
  facts.push(['브랜드', `<a href="${href(brandPath(r.brand))}">${esc(r.brand)}</a>`]);
  if (r.catName) facts.push(['업종', `<a href="${href(catPath(r.cat))}">${esc(r.catName)}</a>`]);
  facts.push(['구분', esc(r.tag)]);
  if (r.price) facts.push(['가격', `<b class="mono">${esc(r.price)}</b>${r.priceNote ? ` <small>${esc(r.priceNote)}</small>` : ''}`]);
  if (r.kind === 'new' && r.date) facts.push([/발표/.test(r.when) ? '발표일' : '출시일', esc(fmtDate(r.date)) + (r.when && /[가-힣]/.test(r.when.replace(/출시|발표/g, '')) ? ` <small>(${esc(r.when)})</small>` : '')]);
  if (r.kind !== 'new') {
    if (r.period) facts.push(['기간', esc(r.period)]);
    if (r.end) facts.push([r.endLate ? '빠른 종료 예상' : '마감일', `${esc(fmtDate(r.end))} <span class="dday" data-d="${esc(r.end)}"></span>`]);
    else if (r.open) facts.push(['마감', esc(r.open)]);
  }
  (r.specs || []).forEach(([k, v]) => facts.push([esc(k), esc(v)]));
  if (r.cups) facts.push(['적립', `${r.cups.total}잔 (미션음료 ${r.cups.mission}잔 포함)`]);

  let body = '';
  if (st !== 'on') {
    body += `<p class="notice">${st === 'ended'
      ? (isEvent ? '이 이벤트는 끝났어요.' : '이 한정 메뉴는 판매가 끝났어요. 다시 나오면 이 페이지에 다시 표시돼요.')
      : '출시한 지 시간이 지나 새 메뉴 목록에서는 내려갔어요. 지금도 파는지는 매장이나 브랜드 앱에서 확인해 주세요.'}</p>`;
  }
  if (r.img) {
    body += `<figure class="shot"><img src="${esc(r.img)}" alt="${esc(r.brand + ' ' + r.name + ' 사진')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>사진: ${esc(r.imgFrom || r.brand + ' 공식 홈페이지')}</figcaption></figure>`;
  }
  body += `<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  if (r.desc) body += `<p>${esc(r.desc)}</p>`;
  if (r.note && r.note !== r.desc) body += `<p>${esc(r.note)}</p>`;
  if (r.lines && r.lines.length) {
    body += `<h2>메뉴와 가격</h2><table class="lines"><tbody>${r.lines.map((l) => `<tr><th scope="row">${esc(l[0])}</th><td class="mono">${esc(l[1] || '-')}</td></tr>`).join('')}</tbody></table>`;
  }
  if (r.group && r.group.length > 1) {
    const sibs = r.group.filter((n) => n !== r.name);
    body += `<h2>같이 나온 메뉴</h2><p>${esc(r.brand)}에서 ${esc(r.name)}와 함께 ${esc(sibs.join(', '))}도 나왔어요.</p>`;
  }
  if (r.src) body += `<p class="src">출처: <a href="${esc(r.src.url)}" target="_blank" rel="noopener nofollow">${esc(r.src.label)}</a></p>`;

  const sameBrand = all.filter((x) => x.brand === r.brand && x.slug !== r.slug);
  const sameCat = all.filter((x) => r.cat && x.cat === r.cat && x.brand !== r.brand && status(x, today) === 'on').slice(0, 8);
  if (sameBrand.length) body += `<h2>${esc(r.brand)}의 다른 메뉴</h2><ul class="cards">${sameBrand.map((x) => card(x, status(x, today))).join('')}</ul>`;
  if (sameCat.length) body += `<h2>다른 브랜드 ${esc(r.catName)} 메뉴</h2><ul class="cards">${sameCat.map((x) => card(x, 'on')).join('')}</ul>`;
  body += `<p class="more"><a href="/">오늘의 새 메뉴·한정 메뉴 전체 보기 →</a></p>`;

  const cr = crumbs([{ name: '홈', path: '/' }, { name: r.brand, path: brandPath(r.brand) }, { name: r.name, path: menuPath(r) }]);
  const n = priceNum(r.price);
  const product = {
    '@context': 'https://schema.org', '@type': 'Product', name: `${r.brand} ${r.name}`,
    brand: { '@type': 'Brand', name: r.brand }, category: r.catName || undefined,
    description: (r.desc || r.note || `${r.brand}의 ${r.tag} ${r.name}`), url: SITE + href(menuPath(r))
  };
  if (r.img) product.image = r.img;
  if (n) product.offers = { '@type': 'Offer', price: n, priceCurrency: 'KRW', availability: st === 'on' ? 'https://schema.org/InStock' : 'https://schema.org/Discontinued', url: SITE + href(menuPath(r)) };
  const jsonld = isEvent ? [cr.ld] : [cr.ld, product];

  return head({ title, desc, canonical: SITE + href(menuPath(r)), image: r.img, jsonld })
    + `<main><div class="wrap"><article>${cr.html}<p class="kicker">${esc(r.brand)} · ${esc(r.tag)}</p><h1>${esc(r.name)}</h1>${body}</article></div></main>\n`
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
function listPage({ title, h1, kicker, intro, pathName, crumbList, groups }) {
  const cr = crumbs(crumbList);
  const flat = groups.flatMap((g) => g.items);
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: h1, itemListElement: flat.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + href(menuPath(x.r)), name: `${x.r.brand} ${x.r.name}` })) };
  const body = groups.filter((g) => g.items.length).map((g) => `<h2>${esc(g.title)}</h2><ul class="cards">${g.items.map((x) => card(x.r, x.st)).join('')}</ul>`).join('');
  const desc = `${intro} ${flat.filter((x) => x.st === 'on').slice(0, 6).map((x) => x.r.name).join(', ')}`.slice(0, 155);
  return head({ title, desc, canonical: SITE + href(pathName), jsonld: [cr.ld, ld] })
    + `<main><div class="wrap"><article>${cr.html}<p class="kicker">${esc(kicker)}</p><h1>${esc(h1)}</h1><p>${esc(intro)}</p>${body}<p class="more"><a href="/">오늘의 새 메뉴·한정 메뉴 전체 보기 →</a></p></article></div></main>\n`
    + foot();
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
  const { items, catName } = collect(D);
  const all = mergeArchive(items, today);

  for (const dir of ['menu', 'brand', 'cat']) {
    const p = path.join(ROOT, dir);
    fs.rmSync(p, { recursive: true, force: true });
    fs.mkdirSync(p, { recursive: true });
  }
  const urls = [];
  all.forEach((r) => {
    fs.writeFileSync(path.join(ROOT, 'menu', r.slug + '.html'), menuPage(r, all, today));
    urls.push({ loc: menuPath(r), lastmod: r.firstSeen, pri: status(r, today) === 'on' ? '0.7' : '0.4' });
  });

  const brands = [...new Set(all.map((r) => r.brand))].sort((a, b) => a.localeCompare(b, 'ko'));
  brands.forEach((b) => {
    const list = all.filter((r) => r.brand === b);
    const cat = list.find((r) => r.cat);
    const page = listPage({
      title: `${b} 신메뉴·한정 메뉴 모음 | 푸디세이`, h1: `${b} 신메뉴·한정 메뉴`, kicker: cat ? cat.catName : '브랜드',
      intro: `${b}에서 최근 새로 나온 메뉴와 기간 한정 메뉴, 이벤트를 모았어요. 매일 아침 기사를 확인해 업데이트해요.`,
      pathName: brandPath(b),
      crumbList: [{ name: '홈', path: '/' }].concat(cat ? [{ name: cat.catName, path: catPath(cat.cat) }] : []).concat([{ name: b, path: brandPath(b) }]),
      groups: groupsFor(list, today)
    });
    fs.writeFileSync(path.join(ROOT, 'brand', slug(b) + '.html'), page);
    urls.push({ loc: brandPath(b), lastmod: list.map((r) => r.firstSeen).sort().pop(), pri: '0.6' });
  });

  D.cats.forEach((c) => {
    const list = all.filter((r) => r.cat === c.id);
    const bs = [...new Set(list.map((r) => r.brand))];
    const page = listPage({
      title: `${c.name} 프랜차이즈 신메뉴·한정 메뉴 | 푸디세이`, h1: `${c.name} 신메뉴·한정 메뉴`, kicker: '업종',
      intro: `${bs.join(', ')} 등 ${c.name} 프랜차이즈의 새 메뉴와 기간 한정 메뉴를 최근 순으로 모았어요.`,
      pathName: catPath(c.id), crumbList: [{ name: '홈', path: '/' }, { name: c.name, path: catPath(c.id) }],
      groups: groupsFor(list, today)
    });
    fs.writeFileSync(path.join(ROOT, 'cat', c.id + '.html'), page);
    urls.push({ loc: catPath(c.id), lastmod: list.map((r) => r.firstSeen).sort().pop(), pri: '0.6' });
  });

  // sitemap.xml
  const fixed = [{ loc: '/', lastmod: D.updated || today, pri: '1.0', freq: 'daily' }, { loc: '/about', pri: '0.3', freq: 'monthly' }, { loc: '/privacy', pri: '0.2', freq: 'yearly' }];
  const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + fixed.concat(urls).map((u) => `  <url><loc>${esc(SITE + href(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.freq ? `<changefreq>${u.freq}</changefreq>` : ''}<priority>${u.pri}</priority></url>`).join('\n')
    + '\n</urlset>\n';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sm);

  // rss.xml: 새로 올라온 메뉴 순(최근 50개). 네이버 서치어드바이저 RSS 제출용.
  const rfc = (d) => new Date(d + 'T09:00:00+09:00').toUTCString();
  const feed = all.slice().sort((a, b) => (b.firstSeen + (b.date || '')).localeCompare(a.firstSeen + (a.date || ''))).slice(0, 50);
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
  const dirHtml = D.cats.map((c) => {
    const bs = [...new Set(liveItems.filter((r) => r.cat === c.id).map((r) => r.brand))];
    if (!bs.length) return '';
    return `      <div class="dir-cat"><h3><a href="${href(catPath(c.id))}">${esc(c.name)}</a></h3>`
      + bs.map((b) => `<p><a class="dir-brand" href="${href(brandPath(b))}">${esc(b)}</a> `
        + liveItems.filter((r) => r.brand === b).map((r) => `<a href="${href(menuPath(r))}">${esc(r.name)}</a>`).join(' · ') + '</p>').join('')
      + '</div>';
  }).filter(Boolean).join('\n');
  idx = replaceBlock(idx, 'directory', dirHtml);
  const idxLd = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: '푸디세이', alternateName: 'Foodyssey', url: SITE + '/' },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: '프랜차이즈 새 메뉴와 한정 메뉴', itemListElement: liveItems.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + href(menuPath(r)), name: `${r.brand} ${r.name}` })) }
  ];
  idx = replaceBlock(idx, 'jsonld', idxLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n'));
  fs.writeFileSync(idxFile, idx);

  console.log(`메뉴 ${all.length}개(판매·진행 중 ${liveItems.length}), 브랜드 ${brands.length}개, 업종 ${D.cats.length}개 페이지를 만들었어요.`);
}

main();
