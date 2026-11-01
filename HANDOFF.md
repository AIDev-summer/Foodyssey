# 푸디세이(Foodyssey) 인수인계

> 기준일: 2026-11-01. 새 세션은 이 문서와 `README.md`를 먼저 읽으세요.

## 1. 개요와 목표

- **무엇:** 프랜차이즈(커피·베이커리·분식·버거·치킨·피자 등) 신메뉴·프리퀀시·한정 이벤트 모음 페이지. 성심당 같은 인기 비프랜차이즈도 포함.
- **구조:** `신상`(계속 파는 새 메뉴, 업종 필터) / `한정`(기간 한정, `한정 상품`·`이벤트` 두 섹션, 마감순·인기순 정렬) 탭. 해시 `#new` / `#limited`.
- **목표:** 내용이 매일 바뀌어 재방문이 생기는 사이트 → 검색 유입(“브랜드명 + 신메뉴”) → 애드센스 수익.
- **이름:** 푸디세이(Foodyssey = Food + Odyssey). 로고 옆 문구 `Food Odyssey`(O 대문자). 슬로건 “새 메뉴를 찾아 떠나는 여정”.
- **아이콘:** 초록 둥근 사각 + 흰 접시 + 토마토(`favicon.svg`) 유지로 확정. 교체 제안하지 말 것.

## 2. 레포·배포·도메인

| 항목 | 내용 |
|---|---|
| 레포 | https://github.com/AIDev-summer/Foodyssey (공개, 기본 브랜치 `main`) |
| 배포 | GitHub Pages, `main` / root. HTTPS 강제 켜짐 |
| 도메인 | `foodyssey.co.kr` (가비아 구매·가비아 네임서버). 레포의 `CNAME` 파일 |
| DNS(가비아) | A 4줄 `185.199.108.153`~`185.199.111.153` + CNAME `www → aidev-summer.github.io` |
| 페이지 | `/`(index), `/about.html`, `/privacy.html`, `menu/`·`brand/`·`cat/` 자동 생성 페이지, `sitemap.xml`, `rss.xml`, `robots.txt`, `ads.txt` |

## 3. 로컬 작업 경로 (프로젝트 지침)

- 사용자 PC 작업공간: `C:\Users\morra\Desktop\AI Develop\Web Service(PULSE)\Foodyssey` (origin = 위 레포, `main`)
- PC 접근 권한 범위: `C:\Users\morra\Desktop\AI Develop\Web Service(PULSE)` — PC 접근이 필요하면 이 폴더로 연다.
- 이 제한은 **로컬에만** 해당. git(GitHub)·클라우드 작업은 기존대로 진행.
- 옛 경로 `AI Develop\Foodyssey`는 없음(2026-10-31 이동). 같은 상위 폴더에 Pulse, Eolchu, EMC Tool Box, Naepda도 있음.
- 로컬 git은 커밋 기록이 GitHub보다 뒤처질 수 있음 → 작업 전 `git fetch` 후 맞추기(`git reset --keep origin/main` 등). 옛 stash 1개는 이미 반영된 내용.

## 4. 빌드·실행

- 빌드 도구 없음. 정적 HTML + `data.js`(메뉴 데이터). `index.html`을 브라우저로 열면 바로 보임.
- 메뉴 수정은 `data.js`만. 형식(newItems/limited/hotNew/hotLimited, `date`, `end`, `open`, `pop`, `price`, `img`, `imgFrom`, `lines`)은 `README.md` 참고.
- `node scripts/build.js` (Node 22): `data.js` → `menu/`·`brand/`·`cat/` HTML, `sitemap.xml`, `rss.xml`, `index.html`의 `build:directory`·`build:jsonld` 블록 생성. `data/archive.json`이 지난 메뉴를 기억해 “판매 종료” 페이지로 유지.
- **자동 생성 파일은 손으로 고치지 않음** → `scripts/build.js`, `pages.css`에서 수정.
- GitHub Actions `.github/workflows/build-pages.yml`: `data.js`·`scripts/**`·`index.html`이 main에 push될 때 + 매일 00:10 KST(cron `10 15 * * *`) + 수동 실행. 바뀐 게 있으면 main에 커밋하고 Pages 빌드 API 호출.
- 다크모드: `<html data-theme>`를 head 인라인 스크립트가 먼저 정함, 버튼은 `theme.js`, 저장값 `localStorage fd_theme`. 전환은 View Transition 크로스페이드(요소별 transition으로 되돌리지 말 것). 새 색은 `:root`와 `:root[data-theme="dark"]` 둘 다 토큰으로.

## 5. 외부 서비스와 설정

| 서비스 | 설정 |
|---|---|
| GA4 | 계정 `Pulse` 안 속성 `Foodyssey`, 측정 ID `G-LN6SS7QZSR`, 속성 ID `561415205`. gtag는 head에 직접. 같은 계정에 eolchu.com, EMC Tool Box 속성 있음. 새 사이트는 새 계정 말고 Pulse 계정에 속성 추가 |
| GA 집계 제외 | gtag 앞 스크립트가 끔: `navigator.webdriver`, 헤드리스·봇 UA, `?me=1`로 연 브라우저(`localStorage fd_me`, `?me=0` 해제), foodyssey.co.kr 밖 도메인 |
| Pulse 대시보드 | 사용자 PC `Web Service(PULSE)\Pulse`, `config.json`의 sites에 푸디세이(source ga4, propertyId `561415205` 직접 지정). 서버 `127.0.0.1:4310`, 캐시 60분, config는 시작 시 1회 읽음, 강제 갱신 `/api/data?refresh=1` |
| 애드센스 | 게시자 ID `pub-3810068839288182`. `ads.txt`, head의 `google-adsense-account` 메타 + adsbygoogle.js. 2026-10-29 검토 요청, **심사 대기** |
| 쿠팡 파트너스 | 보조 추천용(아직 미적용). 광고는 애드센스가 메인 |
| 구글 서치콘솔 | URL 접두어, HTML 태그 인증, `sitemap.xml` 제출 완료 |
| 네이버 서치어드바이저 | HTML 태그 인증, `sitemap.xml` 제출 완료. RSS 제출은 사용자에게 요청함. 네이버 사이트는 Claude 브라우저 도구로 막혀 사용자가 직접 |
| 인증 메타 태그 | `index.html` head에 있음. **지우면 인증 풀림** |
| 문의 이메일 | 소개·개인정보처리방침에 게시된 사용자 이메일 |
| 텔레그램 봇 | 토큰은 클라우드 환경 변수 `TELEGRAM_BOT_TOKEN`. 허용 도메인 `api.telegram.org`, 환경 네트워크 접근 ‘전체’. 토큰 값은 어디에도 적지 말 것. 채팅 ID는 예약 작업 안에 고정 |

## 6. 자동 업데이트 (Claude 예약 작업)

1. **매일 09:00 KST** `trig_01R68RGLwDB1ZKpkKaJ1kdJv` “푸디세이 매일 메뉴 업데이트”: 최근 기사 검색 → `data.js`만 수정 → `auto/daily-YYYY-MM-DD` 브랜치 PR(main 직접 push 안 함) → 텔레그램으로 요약과 [승인]/[취소].
2. **매시 5분(09:05~00:05 KST)** `trig_01YA7Ja4ocK27GNCcFU4hLak`: 텔레그램 답 확인, ‘승인’이면 merge, ‘취소’면 PR 닫음.
3. merge되면 Actions가 정적 페이지 재생성.
- 관리: claude.ai/code Routines. 이 예약들은 Remote Control 세션이 만든 것이라 클라우드 세션에서 수정·삭제가 안 될 수 있음(사용자 또는 RC 세션이 처리).

## 7. 작업 규칙 (사용자 지정)

- 항상 한국어, 간결하고 정확하게. 모르면 모른다고.
- 스스로 할 수 있는 일은 묻지 말고 진행. 로그인·결제 등만 사용자에게 요청.
- **PR을 만들면 머지·배포 확인까지 알아서**(“배포까지 알아서 해”). 작업 끝나면 스레드 종료.
- Claude가 foodyssey.co.kr을 열 땐 **항상 `?me=1`** 붙이기(Playwright, Chrome 확장, 내장 브라우저 모두). 가능하면 로컬 파일로 확인. gtag 수정 시 제외 장치 유지, 새 페이지에 gtag 넣으면 제외 스크립트도 같이.
- **데이터 원칙:** 출처 기사 본문에 있는 값만(가격·출시일·종료일). 블록 `date`는 기사 날짜 기준. 근거 없는 “소진 시 종료” 같은 문구 금지.
- **사진:** 브랜드 공식 홈페이지 사진만, 200 + image/* 확인 후 `img`에 넣기.
- **UI 작업:** better-* 스킬(better-interface 등) 먼저 로드. 라이트 모드 글자 대비 4.5:1 이상 유지. 디자인 방향은 “필요한 정보 먼저, 자극적이지 않은 색”(파스텔 바탕·중간 채도, 빨강은 D-3 이내만).
- 민감 정보(토큰·비밀번호·키)는 레포·메모리·채팅에 쓰지 않음.

## 8. 최근 완료한 작업

| 날짜 | 내용 |
|---|---|
| 10-28 | 기획(신상/한정), PC 폴더·레포 연결, 매일 자동 업데이트 + 텔레그램 승인 흐름 |
| 10-29 | GitHub Pages 공개·도메인·HTTPS, GA4, 애드센스 준비(about/privacy/robots/sitemap/OG/파비콘), 새 디자인, 다크모드(PR #3), 아이콘 유지 결정 |
| 10-30 | 다크모드 전환 효과 교체(#4→#7), Claude 방문 GA 제외(PR #6) |
| 10-31 | better-* 스킬로 UI 개선(PR #9), 가격·사진 팝업(PR #10), 정적 페이지 자동 생성·사이트맵·JSON-LD(PR #11), head 태그 명시(#12), RSS(#13), 구글·네이버 등록, 로고 옆 `Food Odyssey`(#14, #15), 폴더 이동 점검, Pulse에 GA4 연결, 유입 전략 수립, 전체 검수(PR #16: 기사 18건 대조·사진 24장 확인) |
| 11-01 | 자동 업데이트 PR #17 머지, Actions가 페이지 재생성 |

- 유입 전략 문서: https://claude.ai/artifact/9d7Pzeoka3fDQbM2mwxGKT (1순위 SEO, 2순위 공유·SNS, 3순위 재방문)

## 9. 진행 중·남은 작업

- [ ] 애드센스 심사 결과 확인(대기 중). 승인되면 광고 위치 배치.
- [ ] 네이버 서치어드바이저 RSS 제출 여부 확인(사용자 작업).
- [ ] 0시 예약 빌드 확인: 10-31 검수 때 “첫날 미실행”으로 기록됐으나, 11-01 확인 결과 예약 실행 1회 있음(10-31 19:13 UTC = 11-01 04:13 KST, 약 4시간 지연). GitHub 예약은 늦거나 건너뛸 수 있으니 계속 지켜볼 것.
- [ ] 유입 전략 다음 단계: 공유용 OG 이미지, 카카오톡 공유 버튼, 재방문 배지.
- [ ] 쿠팡 파트너스 보조 추천 적용 검토.
- [ ] 인기순용 `pop` 값 보강, 가격 보강(투썸 딸기 요거트 프라페 6,500원은 기사 미확인).

## 10. 주의할 점

- 자동 생성 파일(`menu/`, `brand/`, `cat/`, `sitemap.xml`, `rss.xml`, index의 build 블록) 직접 수정 금지.
- Actions가 main에 직접 커밋하므로 작업 브랜치 머지 전 main을 다시 받을 것(자동 업데이트 PR과 충돌 잦음).
- 자주 틀리는 데이터 유형: 기사에 없는 값, 여러 날짜 메뉴를 한 블록에 묶기, 끝난 이벤트 문구가 `hotNew` 설명에 남기.
- 클라우드 curl로 공식 사진·가격 가져오기 가능: 맥도날드(`/api/v1/kor/product/product/list?mainCategory=1|2&subCategory=N`, `pcImageUrl`), 교촌(`kyochon.com/menu/chicken.asp`), 파리바게뜨(`paris.co.kr/product/*` og:image), 이디야(`ediya.com/inc/ajax_brand.php?gubun=menu_more&product_cate=8&page=N`), 메가커피(`mega-mgccoffee.com/menu/menu.php?page=N`).
- 클라우드에서 막힘: bhc, 맘스터치, 버거킹, 노브랜드버거, 피자헛, 투썸(403), 쉐이크쉑, 뚜레쥬르.
- 기사 가격 찾기는 네이버 뉴스 검색(`search.naver.com` `where=news`)을 curl로 열어 본문 확인이 가장 잘 됨. WebSearch는 한국 기사에 약함.
- 메뉴가 JS로 그려지는 메인은 크롤러에 얇게 보일 수 있음 → 정적 페이지(PR #11)로 보완 중.
- 롯데리아 10월 신메뉴 못 찾음, 빽다방은 출시일 미확인이라 제외했던 이력 있음.

## 마케터 요청 (2026-11-01, 처리 후 이 항목에 완료 표시)

근거: `../Marketing/02_검색데이터_점검_및_조치_2026-11-01.md` (구글 서치콘솔·네이버 서치어드바이저 실측)

- [x] (2026-11-02, 브랜치 `claude/brand-title-seo`) 구글이 홈만 색인, brand/cat/menu는 'Google에 알려지지 않은 URL' — 확인 결과 **문제 없음**: `index.html`의 `<!-- build:directory -->` 블록(브랜드별로 보기)이 JS 실행 전 raw HTML에 일반 `<a href="/brand/...">`, `<a href="/menu/...">`, `<a href="/cat/...">` 링크를 그대로 담고 있음(`view-source`로 확인, JS 없이도 보임). 코드 수정 없음. 그래도 색인이 안 되면 원인은 다른 쪽(크롤 빈도, sitemap 제출, robots)일 가능성이 높음 — 마케터가 서치콘솔 '크롤됨-색인 안 됨' 사유를 추가로 확인해 주면 좋음.
- [x] (2026-11-02, 브랜치 `claude/brand-title-seo`) 브랜드 페이지 제목에 검색어(월) 앞배치: `scripts/build.js`의 브랜드 타이틀을 `{브랜드} 신메뉴·한정 메뉴 모음` → `{브랜드} 신메뉴 ({YYYY}년 {M}월) · 한정 메뉴 모음`으로 바꿈. 빌드할 때마다 그 날짜의 연·월로 자동 갱신됨(수동 갱신 불필요). 18개 브랜드 페이지 전부 재생성 확인.
- [x] (2026-11-02, 브랜치 `claude/brand-title-seo`, 일부) 크리스마스 케이크·연말 한정 메뉴 블록·페이지 미리 준비: `data.js`의 `limited` 배열에 스타벅스 "크리스마스 케이크·디저트"(누텔라 촉촉 생크림 케이크 등 4종) 1건을 매일경제 기사(10/30) 근거로 추가해 블록 틀을 만듦. 정확한 가격·예약 시작일은 기사에 없어서 비워 둠("-" 표시). **파스쿠찌(스와로브스키 협업 6종, 11/9부터 카카오 예약) 등 다른 브랜드 케이크, 정확한 가격·예약일은 11월 중순 공식 발표 후 추가 필요** — 마케터·사장님 판단 필요하면 알려주세요.
- [ ] 참고: 네이버 RSS 제출·수집 요청은 마케터가 처리 가능. 블로그 blog.naver.com/morrao 에 새 메뉴·마감 임박 한정 메뉴를 우선 게시하며 푸디세이 링크를 검.
