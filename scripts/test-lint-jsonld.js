const fs = require('fs'), path = require('path'), os = require('os');
// 린트 자체 테스트: 일부러 잘못된 마크업을 넣어 린트가 잡는지 확인해요. 실행: node scripts/test-lint-jsonld.js
const { lint } = require('./lint-jsonld.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-'));
fs.writeFileSync(path.join(dir, 'icon-512.png'), 'x');
const page = (ld, extra = '') => `<html><head><meta property="og:image" content="https://foodyssey.co.kr/icon-512.png">${extra}<script type="application/ld+json">${typeof ld === 'string' ? ld : JSON.stringify(ld)}</script></head><body></body></html>`;
const cases = {
  ok: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'a', url: 'https://foodyssey.co.kr/' }, 0],
  badJson: ['{"@context":', 1],
  review: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'a', url: 'https://foodyssey.co.kr/', review: { '@type': 'Review' } }, 1],
  aggregate: [{ '@context': 'https://schema.org', '@type': 'Thing', aggregateRating: { ratingValue: 5 } }, 1],
  product: [{ '@context': 'https://schema.org', '@type': 'Product', name: 'x' }, 1],
  faq: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] }, 1],
  emptyStr: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: '', url: 'https://foodyssey.co.kr/' }, 1],
  undef: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'undefined', url: 'https://foodyssey.co.kr/' }, 1],
  missingReq: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'a' }, 1],
  imgMissing: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'a', url: 'https://foodyssey.co.kr/', image: 'https://foodyssey.co.kr/nope.png' }, 1],
  imgExternal: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'a', url: 'https://foodyssey.co.kr/', image: 'https://example.com/a.png' }, 1],
  noContext: [{ '@type': 'WebPage', name: 'a', url: 'https://foodyssey.co.kr/' }, 1]
};
let pass = 0, total = 0;
for (const [k, [ld, exp]] of Object.entries(cases)) {
  const d = path.join(dir, k); fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, 'icon-512.png'), 'x');
  fs.writeFileSync(path.join(d, 'index.html'), page(ld));
  const r = lint(d);
  const failed = r.errs.length > 0 ? 1 : 0;
  total++; if (failed === exp) pass++; else console.log('UNEXPECTED', k, r.errs.slice(0, 2));
}
// og:image 파일 없음
const d2 = path.join(dir, 'ogmissing'); fs.mkdirSync(d2);
fs.writeFileSync(path.join(d2, 'index.html'), '<html><head><meta property="og:image" content="https://foodyssey.co.kr/gone.png"></head></html>');
total++; if (lint(d2).errs.length === 1) pass++; else console.log('UNEXPECTED og');
console.log('lint 자체 테스트', pass + '/' + total + ' 통과');
fs.rmSync(dir, { recursive: true, force: true });
if (pass !== total) process.exit(1);
