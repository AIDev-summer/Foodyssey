# 푸디세이 (Foodyssey)

프랜차이즈 신메뉴를 **신상**(새로 나와서 계속 파는 메뉴)과 **한정**(기간이 끝나면 사라지는 메뉴·이벤트)으로 나눠 보여 주는 페이지예요.

## 파일

- `index.html`: 페이지. 더블클릭하면 브라우저에서 열려요.
- `data.js`: 메뉴 데이터. 이 파일만 고치면 페이지가 바뀌어요.
- `theme.js`: 다크모드 버튼. 처음엔 기기 설정을 따르고, 버튼으로 고르면 그 브라우저에 기억해요.

## 매일 자동 업데이트

1. 매일 오전 9시(한국 시간)에 Claude 클라우드 예약이 최근 7일 프랜차이즈 기사를 찾아 `data.js`를 고쳐요.
   - 출처 기사를 직접 열어 확인한 항목만 넣고, 가격·날짜는 기사에 나온 것만 적어요.
   - 출시 6주가 지난 신상과 끝난 지 7일이 지난 한정 항목은 빼요.
2. 바뀐 게 있으면 `auto/daily-YYYY-MM-DD` 브랜치로 PR을 열고, 텔레그램으로 요약과 [승인] [취소] 버튼을 보내요. 바뀐 게 없으면 아무것도 보내지 않아요.
3. 텔레그램에서 [승인]을 누르면 매시 5분(오전 9시 5분 ~ 밤 12시 5분)에 도는 확인 예약이 PR을 main에 합쳐요. [취소]를 누르면 PR을 닫아요.

예약은 claude.ai/code의 Routines에서 보고 고칠 수 있어요. 클라우드 환경에는 `TELEGRAM_BOT_TOKEN` 환경 변수와 '전체' 네트워크 접근이 필요해요.

## 직접 고칠 때

1. `data.js`의 `updated`와 `weekLabel`을 오늘 날짜에 맞게 바꿔요.
2. 새로 나온 메뉴는 `newItems`에 넣어요. `date: "YYYY-MM-DD"`(출시·발표일)로 업종 안에서 최근 순으로 정렬돼요. 일까지 모르면 그 달 1일로 적어요. 같은 브랜드는 화면에서 한 블록으로 묶여요.
3. 기간 한정 메뉴는 `limited`에 `kind: "메뉴"`로, 이벤트는 `kind: "이벤트"`로 넣어요. `end: "YYYY-MM-DD"`를 넣으면 남은 날(D-day)이 자동으로 계산되고, 날짜가 지나면 자동으로 사라져요. 종료일을 모르면 `end` 대신 `open: "가을 시즌"`처럼 적어요.
4. 가격을 모르면 `price`를 빼면 돼요. 화면에도 표시되지 않아요.

## 가격·사진 필드 (자동 업데이트도 이 형식으로 써요)

> 2026-11-03부터 저작권 위험 때문에 `img`·`imgFrom`·`lines` 세 번째 칸(사진)은 **쓰지 않아요**. 사용 허락을 받은 사진이 생기기 전까지 아래 사진 안내는 보관용이에요.

| 필드 | 넣는 곳 | 형식 | 설명 |
|---|---|---|---|
| `price` | `newItems[].items[]`, `limited[]`, `hotLimited` | `"4,900원"`, `"23,000·24,000원"` | 공식 홈페이지나 기사에서 확인한 가격만. 모르면 빼요. |
| `img` | `newItems[].items[]`, `limited[]`, `hotNew`, `hotLimited` | `"https://..."` | 브랜드 **공식 홈페이지**의 메뉴 사진 주소만. 있으면 메뉴 이름에 사진 아이콘이 붙고, 누르면 사진·가격 팝업이 떠요. 못 찾으면 빼요. |
| `imgFrom` | `img`와 같은 곳 | `"맥도날드 공식 홈페이지 (세트 사진)"` | 팝업 아래 사진 출처 문구. 없으면 "브랜드명 공식 홈페이지"로 나와요. |
| `lines` 세 번째 칸 | `limited[].lines[]` | `["이름", "가격", "https://사진"]` | 여러 메뉴를 묶은 한정 항목에서 메뉴별 사진. |

- 사진 주소에 한글이나 공백이 있으면 퍼센트 인코딩해서 넣어요(예: 공백 → `%20`).
- 넣기 전에 주소가 실제 이미지(200, image/*)로 열리는지 확인해요. 사진이 안 열리면 팝업에 "사진을 불러오지 못했어요"가 나와요.
- 지금 사진을 가져오는 곳: 맥도날드(mcdonalds.co.kr/upload), 교촌(kyochon.com/uploadFiles), 파리바게뜨(paris.co.kr 상품 페이지의 og:image), 이디야(ediya.com/files/menu), 메가MGC커피(img.mega-mgccoffee.com).

## 메뉴·브랜드·업종 페이지 (검색 유입용)

- `node scripts/build.js`가 `data.js`를 읽어 `menu/브랜드-메뉴.html`, `brand/브랜드.html`, `cat/업종.html`, `sitemap.xml`을 만들고, `index.html`의 "브랜드별로 보기" 목록과 구조화 데이터(JSON-LD)를 다시 채워요.
- GitHub Actions(`.github/workflows/build-pages.yml`)가 `data.js`가 main에 합쳐질 때와 매일 0시 10분(한국 시간)에 자동으로 돌려 main에 커밋해요. 직접 돌릴 필요는 없어요.
- `data/archive.json`은 한 번이라도 올라온 메뉴를 모두 기억해요. `data.js`에서 빠지거나 마감일이 지나도 메뉴 페이지는 지우지 않고 "판매 종료"로 남겨요(지난 메뉴 검색 유입용).
- `menu/`, `brand/`, `cat/`, `sitemap.xml`은 자동으로 만들어지는 파일이라 손으로 고치지 않아요. 문구나 모양은 `scripts/build.js`와 `pages.css`에서 고쳐요.

## 메뉴 페이지 품질 규칙 (얇은 페이지 방지)

- `newItems[].items[]`와 `limited[]`에 **`desc`**(그 메뉴만의 설명)를 넣어요. 기사 본문에 있는 사실만 쓰고, 묶음 공통 문구는 `note`에 적어요.
- 가격·메뉴표(`lines`)가 없고 메뉴 자기 설명(`desc`)이 40자 미만이면 그 메뉴 페이지는 `noindex,follow`로 만들어지고 sitemap·RSS에서 빠져요(페이지는 남고 브랜드·업종·시즌 페이지에서 계속 연결돼요). 끝난 이벤트도 같아요.
- 시즌 모음 페이지: 항목에 `season: "christmas"`를 달면 `/season/christmas`에 모여요.
- 정적 페이지: `about.html`, `privacy.html`, `terms.html`(이용약관), `contact.html`(문의), `404.html`. 푸터에서 모두 이어져요.
- `updates.html`(업데이트 내역)은 `scripts/build.js`가 `data/archive.json`의 등록일(firstSeen)로 만들어요. 홈·허브·메뉴 페이지의 "마지막 업데이트" 날짜는 `data.js`의 `updated` 값이에요(그래서 데이터를 고칠 때 `updated`를 꼭 바꿔요).

## 구조화된 데이터 규칙 (JSON-LD)

푸디세이는 물건을 파는 사이트가 아니라 메뉴 정보 사이트예요. 눈에 보이지 않는 근거 없는 마크업은 구글 스팸 정책 위반이라 아래 규칙을 지켜요.

- **쓰는 것:** `WebSite`(홈), `WebPage`(메뉴 페이지), `BreadcrumbList`(위치), `ItemList`(목록). 모두 화면에 실제 있는 내용만 담아요.
- **쓰지 않는 것(린트가 막아요):** `Product`·`Offer`(가격/재고), `Review`·`AggregateRating`(평점), `FAQPage`, `hasMerchantReturnPolicy`·`shippingDetails`. 실제로 없는 평점·리뷰·배송·반품 정보는 절대 만들어 넣지 않아요. 가격·기간은 눈에 보이는 본문에 적어요.
- **린트:** `scripts/lint-jsonld.js`가 `node scripts/build.js` 마지막에 자동으로 돌아요. 금지 형식·필드, 빈 문자열/`undefined`/`null`, JSON 오류, 필수 필드 누락(WebSite·WebPage·BreadcrumbList·ItemList), `image`·`og:image`·`twitter:image`가 가리키는 파일이 없거나 외부 주소인 경우에 빌드를 실패시켜요(Actions도 멈춰서 잘못된 페이지가 배포되지 않아요). `node scripts/test-lint-jsonld.js`는 린트 자체 테스트예요.
- **사진·이미지를 빼거나 바꿀 때는** 구조화 데이터와 `og:image`·`twitter:image`를 같이 확인하세요(2026-11-03 사고: 사진 핫링크를 지우면서 Product의 `image`가 사라져 서치콘솔 경고).

## 인스타 프로필 링크 `/ig`

- `ig/index.html`은 손으로 만든 이동 전용 페이지예요(`node scripts/build.js`가 건드리지 않아요). `https://foodyssey.co.kr/ig`로 들어오면 `/?utm_source=instagram&utm_medium=social&utm_campaign=profile`로 보내서 GA4에서 인스타 유입을 구분해요.
- 자바스크립트가 켜져 있으면 `?me=0/1` 값을 이동 주소에 이어 붙여요(내 방문 제외 유지). 꺼져 있으면 `<noscript>`의 meta refresh가 이동해요.
- `noindex,nofollow`, canonical은 홈이에요. 사이트맵·RSS·내부 링크·허브에는 넣지 않아요. JSON-LD·광고·통계 스크립트도 넣지 않아요.

## 월별 모음과 자동 계산 가이드

- `scripts/build.js`가 `/new`(월별 모음 목록), `/new/YYYY-MM`(그달 새 메뉴·마감 달력, 지난 달은 보관함 표시), `/guide`(가이드 목록), `/guide/limited-menu-duration`(판매 기간 계산), `/guide/price-distribution`(가격대 분포)를 `data/archive.json`과 `data.js` 값으로 매일 다시 만들어요. 손으로 고치지 않아요.
- 한정 항목에 기사에서 확인한 **`start`(시작·출시일, YYYY-MM-DD)** 를 넣으면 판매 기간 계산에 들어가요. 기사에 없으면 넣지 않아요(추측 금지). 가격은 기사에 숫자 하나로 있을 때만 `price`에 적어요.
- 손으로 쓰는 가이드는 `guide/starbucks-frequency.html`, `guide/christmas-cake-preorder.html`뿐이에요(기사 근거 문장만, 일반론 금지).
- 메뉴 페이지 맨 위·아래의 "함께 보면 좋은 메뉴"(같은 브랜드, 비슷한 가격대, 이번 주 끝나는 한정)는 `relatedSets()`가 데이터로 골라요.

## 디자인 규칙 (2026-11-06 검수 기준)

- 모바일 본문 16px 이상, 보조 글자 13px 이상. 링크·버튼 같은 눌리는 요소는 높이 44px 이상(칩·메뉴·푸터·빵부스러기·"함께 보면 좋은 메뉴" 칩 포함).
- 링크 색은 흰 배경 4.5:1 이상(`--fresh` #17745a). 새 색을 쓰면 라이트·다크 둘 다 대비를 확인해요.
- 표(`table.compare`)는 열이 4개 이상이면 가로로 밀어서 보게 하고 안내 문구가 자동으로 붙어요. 메뉴 이름 칸은 `td.nm`, 짧은 칸은 `td.nw`(줄바꿈 안 함)로 자동 표시돼요.
- 소개·약관·개인정보·문의·404와 손글 가이드도 `pages.css`와 같은 머리글·꼬리글을 써요(스타일을 페이지마다 따로 복사하지 않아요).
- 광고 자리를 미리 비워 두지 않아요. 사진 없이도 허전하지 않게 D-day 배지·가격·기간 요약으로 채워요.

## 콘텐츠 품질 점검 규칙

- `node scripts/quality-report.js [--out 폴더]`: 빌드된 모든 페이지를 9개 항목(분량 15, 고유성 15, 정확성 20, 출처·기준일 10, 가독성 8, 사용자 가치 12, 제목·설명 8, 내부 링크 6, 신선도 6)으로 0~100점 채점해 `quality-scores.csv/.md`를 만들고 하위 20%를 표시해요. 총점 70 미만이거나 치명 문제가 있으면 '미달'이에요.
- `node scripts/verify-sources.js`: data.js의 가격·출시일·종료일·메뉴 이름이 출처 기사 본문에 실제로 있는지 대조해 `data/source-checks.json`에 저장해요(네트워크 필요, 값이 없으면 종료 코드 1). 공식 홈페이지 가격이라고 적은 항목은 기사 대조에서 빼요.
- `build.js`는 빌드 끝에 품질 점검을 돌려요. 치명 문제(출처 없는 가격·날짜, 기사와 다른 값, 끝난 메뉴에 종료 표시 없음, 마지막 업데이트 날짜 불일치)는 **빌드를 실패**시키고, 총점 미달 페이지 수는 경고로 보여 줘요. 매일 09시 자동 업데이트가 만든 새 페이지도 같은 기준을 통과해야 게시돼요(본문 800자 미만이면 기존 규칙대로 noindex).
- 새 메뉴를 넣을 때는 PR을 만들기 전에 `verify-sources.js`를 돌려 불일치 0건을 확인해요. 기사에 없는 가격·날짜는 쓰지 않고 비워 둬요.

- **브라우저 사용 규칙(2026-11-08, PULSE 지시):** 검수·클릭 테스트·스크린샷·라이브 확인은 ego lite 브라우저(원격 제어 포트 9333)로 해요. 새 `browser_exec` 세션 이름을 쓰고(에이전트·작업마다 다르게) 끝나면 자기 탭을 닫아요. `js('navigator.userAgent')`에 `HeadlessChrome/156`이 보이면 ego lite예요. 크롬은 로그인이 필요하거나 ego lite에서만 재현되지 않는 문제일 때만 쓰고, 끝나면 `browser.cdp_url`을 9333으로 되돌려요. 방문 통계 오염 방지를 위해 `?me=1`로 열어요.
- **브라우저 탭 정리 규칙(2026-11-08, PULSE 지시):** 브라우저 작업이 끝나면 자기가 연 탭과 작업 중 생긴 빈 탭(about:blank)을 `Target.closeTarget`으로 닫아요. 다른 에이전트 탭과 사장님이 로그인한 탭, ego lite 창 자체는 건드리지 않아요. 작업 시작 전에 빈 탭이 여러 개 보이면 먼저 정리해요.
