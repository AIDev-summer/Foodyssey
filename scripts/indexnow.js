// IndexNow: 배포로 바뀐 색인 대상 URL을 검색엔진(빙·네이버 등 참여 엔진)에 바로 알려요.
// 사용: node scripts/indexnow.js <이전커밋> [HEAD]   (인자 없으면 사이트맵 전체)
// 키 파일(<key>.txt)은 사이트 루트에 있어요. 전송 실패는 배포를 막지 않아요.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'foodyssey.co.kr';
const SITE = 'https://' + HOST;

function toUrl(rel) {
  let x = '/' + rel.replace(/\\/g, '/');
  if (x === '/index.html') return SITE + '/';
  if (/\/index\.html$/.test(x)) x = x.replace(/index\.html$/, '');
  else x = x.replace(/\.html$/, '');
  return SITE + x.split('/').map((s) => encodeURIComponent(s)).join('/').replace(/%2F/g, '/');
}

async function main() {
  const { key } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indexnow-key.json'), 'utf8'));
  if (!fs.existsSync(path.join(ROOT, key + '.txt'))) throw new Error('키 파일이 없어요: ' + key + '.txt');
  const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const inMap = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  let urls;
  const base = process.argv[2];
  if (base) {
    const files = execSync(`git diff --name-only ${base} ${process.argv[3] || 'HEAD'}`, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => /\.html$/.test(f));
    urls = [...new Set(files.map(toUrl))].filter((u) => inMap.has(u));
  } else urls = [...inMap];
  if (!urls.length) { console.log('IndexNow: 보낼 URL이 없어요'); return; }
  urls = urls.slice(0, 10000);
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls })
  });
  console.log(`IndexNow: ${urls.length}개 URL 전송 → HTTP ${res.status}`);
}
main().catch((e) => { console.log('IndexNow 건너뜀: ' + e.message); });
