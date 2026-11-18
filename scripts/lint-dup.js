// 한 페이지에 같은 내용이 두 번 나오지 않게 검사해요(2026-11-18 사장님 지시).
//  - 같은 '매장 찾기' 버튼(.store-find)이 두 번 이상
//  - '기준일'이 두 번 이상
//  - '출처:' 줄이 두 번 이상
//  - 같은 문장(문단·목록·설명, 20자 이상)이 두 번 이상
//  - 답 상자에 나온 기간·가격·종료 문구가 본문 문단·목록·표에서 그대로 또 나옴(가이드·메뉴)
// 위반이 있으면 빌드를 멈춰요. 표 안의 브랜드별 '매장 찾기' 링크(.store-link)는 서로 다른 브랜드라 대상이 아니에요.
const fs = require('fs');
const path = require('path');

const plain = (s) => s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = (s) => plain(s).replace(/[\s·,.]/g, '');

function checkHtml(html) {
  const errs = [];
  const m = html.match(/<main[\s\S]*<\/main>/);
  if (!m) return errs;
  const main = m[0];
  const sf = (main.match(/class="store-find"/g) || []).length;
  if (sf > 1) errs.push(`매장 찾기 버튼이 ${sf}번 나와요`);
  const g = (main.match(/기준일\s*\d{1,4}\s*[년월]/g) || []).length;
  if (g > 1) errs.push(`기준일 날짜가 ${g}번 나와요`);
  const so = (main.match(/출처:/g) || []).length;
  if (so > 1) errs.push(`'출처:' 줄이 ${so}번 나와요`);
  // 같은 문장 반복
  const blocks = [];
  const re = /<(p|li|dd)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let b;
  while ((b = re.exec(main))) {
    if (/class="(ans-src|ans-note|store-find|stamp|meta)"/.test(b[0].slice(0, 80))) continue;
    if (/class="(ans-v|ans-row)/.test(b[0].slice(0, 40))) continue;
    const t = plain(b[2]);
    if (t.length >= 20) blocks.push(t);
  }
  const seen = {};
  blocks.forEach((t) => { seen[t] = (seen[t] || 0) + 1; });
  Object.keys(seen).filter((t) => seen[t] > 1).slice(0, 3).forEach((t) => errs.push(`같은 문장이 ${seen[t]}번 나와요: "${t.slice(0, 40)}…"`));
  // 답 상자의 가격·기간이 본문에서 그대로 또 나오는지
  const card = main.match(/<div class="answer-card"[\s\S]*?<p class="ans-src">/);
  if (card) {
    const vals = [];
    const vr = /<span class="ans-v">([\s\S]*?)<\/span><\/div>/g;
    let v;
    while ((v = vr.exec(card[0]))) vals.push(v[1]);
    const rest = main.replace(card[0], '');
    const restN = norm(rest);
    vals.forEach((x) => {
      const key = norm(x.replace(/<small>[\s\S]*?<\/small>/g, ''));
      if (key.length >= 9 && /\d/.test(key) && !/D-/.test(key) && restN.includes(key)) errs.push(`답 상자 값이 본문에 또 나와요: "${plain(x).slice(0, 40)}"`);
    });
  }
  return errs;
}

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.')) return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.html')) out.push(p);
  });
  return out;
}

function run(root) {
  // 홈(index.html)은 업종·시즌별 둘러보기 목록이라 같은 메뉴 이름이 서로 다른 묶음에 나올 수 있어 제외해요.
  const files = walk(root, []).filter((f) => !/[\/](node_modules|scripts)[\/]/.test(f) && path.relative(root, f).split(path.sep).join('/') !== 'index.html');
  const bad = [];
  files.forEach((f) => {
    const e = checkHtml(fs.readFileSync(f, 'utf8'));
    if (e.length) bad.push({ page: path.relative(root, f).replace(/\\/g, '/'), errs: e });
  });
  return { checked: files.length, bad };
}

module.exports = { run, checkHtml };
if (require.main === module) {
  const r = run(path.resolve(process.argv[2] || '.'));
  console.log(`중복 점검: ${r.checked}쪽, 위반 ${r.bad.length}쪽`);
  r.bad.slice(0, 80).forEach((b) => console.log(' - ' + b.page + ': ' + b.errs.join(' / ')));
  process.exit(r.bad.length ? 1 : 0);
}
