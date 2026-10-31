// 푸디세이 메뉴 데이터. 이 파일만 고치면 페이지가 바뀌어요. 매일 아침 자동 조사가 PR로 고쳐요.
// - newItems: 새로 나와서 계속 파는 메뉴 (업종별). date(YYYY-MM-DD, 출시·발표일)로 업종 안에서 최근 순으로 정렬해요.
//   날짜가 "10월 출시"처럼 일까지 안 나오면 그 달 1일로 적어요. 같은 브랜드 블록은 화면에서 하나로 묶여요.
// - limited: 기간이 끝나면 사라지는 메뉴·이벤트. end(YYYY-MM-DD)가 있으면 D-day를 자동 계산하고, 지나면 자동으로 숨겨요.
// - price: "4,900원"처럼 적어요. 없으면 가격을 표시하지 않아요. 공식 홈페이지나 기사에서 확인한 것만 넣어요.
// - img: 브랜드 공식 홈페이지의 메뉴 사진 주소(https). 있으면 메뉴 이름을 눌렀을 때 사진 팝업이 떠요. 없으면 빼요.
//   imgFrom: 팝업 아래 사진 출처 문구. 없으면 "브랜드명 공식 홈페이지"로 표시돼요.
//   lines 항목은 [이름, 가격, 사진 주소] 순서로 세 번째 칸에 사진을 넣을 수 있어요.
// - pop: 검색량 배수(최근 3일 / 지난 4주). 한정 탭 인기순 정렬에 써요. 없으면 마감순으로 뒤에 놓여요.
window.FOODYSSEY = {
  updated: "2026-10-31",
  weekLabel: "2026년 10월 다섯째 주",

  cats: [
    { id: "burger", name: "버거" },
    { id: "chicken", name: "치킨" },
    { id: "pizza", name: "피자" },
    { id: "bakery", name: "베이커리" },
    { id: "snack", name: "분식" },
    { id: "cafe", name: "커피·디저트" }
  ],

  hotNew: {
    kicker: "이번 주 가장 많이 찾은 신상 · 검색 2.5배",
    name: "알싹킹",
    brandline: "bhc · 10월 출시",
    desc: "고추, 양파, 대파로 맛을 낸 매콤한 치킨이에요. 튀김옷이 얇고, 맵싸소스와 파싹소스가 같이 와요.",
    src: { label: "비즈트리뷴", url: "https://www.biztribune.co.kr/news/articleView.html?idxno=361110" }
  },

  hotLimited: {
    kicker: "이번 주 가장 많이 찾은 한정 메뉴 · 검색 5.2배",
    name: "빅아치",
    brandline: "맥도날드 · 10.22 출시 · 4~6주 한정",
    price: "12,400원",
    img: "https://www.mcdonalds.co.kr/upload/2026/10/Corp_PC_VIEW_772x530_%EB%B9%85%EC%95%84%EC%B9%98_EVM.png",
    priceNote: "세트 13,900원 · 맥런치 세트 13,000원",
    specs: [["무게", "374g"], ["빅맥 대비", "+151g"], ["패티", "113g × 2"]],
    desc: "국내 맥도날드 버거 중 단품 가격이 가장 비싸요. 화이트 체다 3장에 크리스피 어니언이 들어가요. 반응을 보고 정규 메뉴로 바꿀지 정한대요.",
    src: { label: "재경일보", url: "https://news.jkn.co.kr/post/1039964" }
  },

  newItems: [
    { cat: "burger", brand: "맘스터치", when: "10.15 발표", date: "2026-10-15",
      items: [{ name: "베이컨치폴레싸이버거", tag: "신메뉴" }],
      src: { label: "마이데일리", url: "https://www.mydaily.co.kr/page/view/2026101514360760582" },
      note: "스매시버거 매장 약 1,000곳에서 판매" },
    { cat: "burger", brand: "맥도날드", when: "10.29 출시", date: "2026-10-29",
      items: [{ name: "게살 크림 크로켓 머핀", tag: "맥모닝", img: "https://www.mcdonalds.co.kr/upload/2026/10/Corp_PC_VIEW_772x530_%EA%B2%8C%EC%82%B4%ED%81%AC%EB%A6%BC%ED%81%AC%EB%A1%9C%EC%BC%93%EB%A8%B8%ED%95%80_EVB.png", imgFrom: "맥도날드 공식 홈페이지 (세트 사진)" }],
      src: { label: "데일리안", url: "https://www.dailian.co.kr/news/view/1707077/%EB%A7%A5%EB%8F%84%EB%82%A0%EB%93%9C-%EA%B2%8C%EC%82%B4-%ED%81%AC%EB%A6%BC-%ED%81%AC%EB%A1%9C%EC%BC%93-%EB%A8%B8%ED%95%80-%EB%A7%A5%EB%AA%A8-2026" },
      note: "오전 4시부터 10시 30분까지 팔아요" },
    { cat: "burger", brand: "노브랜드버거", when: "10.15 출시", date: "2026-10-15",
      items: [{ name: "NBB 훅", tag: "신메뉴", price: "4,900원" }, { name: "NBB 펀치", tag: "신메뉴", price: "4,900원" }],
      src: { label: "파이낸셜뉴스", url: "https://www.fnnews.com/news/202610141826190444" },
      note: "단품 4,900원 · 세트 6,900원" },
    { cat: "burger", brand: "노브랜드버거", when: "10.27 발표", date: "2026-10-27",
      items: [{ name: "진짜 비빔밥 버거", tag: "신메뉴", price: "5,900원" }],
      src: { label: "머니투데이", url: "https://www.mt.co.kr/living/2026/10/27/2026102709110962425" },
      note: "세트 7,900원 · 튀긴 비빔밥 패티와 직화 패티가 들어가요" },

    { cat: "pizza", brand: "피자헛", when: "10.8 출시", date: "2026-10-08",
      items: [{ name: "피자설기", tag: "신메뉴", price: "3,900원" }],
      src: { label: "뉴스탭", url: "https://www.newstap.co.kr/news/articleView.html?idxno=335540" },
      note: "떡 위에 소스, 치즈, 페페로니를 올린 컵 형태예요" },

    { cat: "chicken", brand: "bhc", when: "10월 출시", date: "2026-10-01",
      items: [{ name: "알싹킹", tag: "신메뉴" }],
      src: { label: "비즈트리뷴", url: "https://www.biztribune.co.kr/news/articleView.html?idxno=361110" },
      note: "얇은 튀김옷에 맵싸소스·파싹소스가 같이 와요" },
    { cat: "chicken", brand: "bhc", when: "10.22 매장 판매 확대", date: "2026-10-22",
      items: [{ name: "콰삭모짜킹", tag: "신메뉴" }],
      src: { label: "비즈트리뷴", url: "https://www.biztribune.co.kr/news/articleView.html?idxno=361661" },
      note: "9월 24일 앱·쿠팡이츠 전용으로 나왔다가 10월 22일부터 전국 매장에서도 팔아요" },
    { cat: "chicken", brand: "교촌치킨", when: "10.22 출시", date: "2026-10-22",
      items: [
        { name: "허니윙콤비", tag: "신메뉴", price: "24,000원", img: "https://www.kyochon.com/uploadFiles/TB_ITEM/list_Honey%20Wing%20Combo.png" },
        { name: "허니옥수수윙콤비", tag: "신메뉴", price: "25,000원", img: "https://www.kyochon.com/uploadFiles/TB_ITEM/list_Honey%20Corn%20Wing%20Combo.png" },
        { name: "허니옥수수윙박스 (16·20조각)", tag: "신메뉴", price: "23,000·24,000원", img: "https://www.kyochon.com/uploadFiles/TB_ITEM/list_Honey%20Corn%20Wing%20Box_20pcs.png" },
        { name: "허니옥수수싱글윙", tag: "신메뉴", price: "8,500원", img: "https://www.kyochon.com/uploadFiles/TB_ITEM/list_Honey%20Corn%20Single.png" }
      ],
      src: { label: "비즈트리뷴", url: "https://www.biztribune.co.kr/news/articleView.html?idxno=361110" },
      note: "가격은 교촌 홈페이지 권장소비자가격이에요" },
    { cat: "chicken", brand: "교촌치킨", when: "10.1 출시", date: "2026-10-01",
      items: [
        { name: "웨지고구마 · 웨지반반", tag: "사이드", plain: true, price: "4,500·8,000원", img: "https://www.kyochon.com/uploadFiles/TB_ITEM/list_Seasoned-Wedge-Potatoes.png" }
      ],
      src: { label: "프라임경제", url: "https://www.newsprime.co.kr/news/article/?no=749669" },
      note: "웨지반반은 웨지고구마와 웨지감자를 반씩 담았어요 · 가격은 교촌 홈페이지 권장소비자가격" },

    { cat: "bakery", brand: "파리바게뜨", when: "10.15 출시 · 치즈 5종", date: "2026-10-15",
      items: [
        { name: "멕시칸 핫도그", tag: "신제품", img: "https://d2afncas1tel3t.cloudfront.net/wp-content/uploads/2026/09/5000240-%EB%A9%95%EC%8B%9C%EC%B9%B8%ED%95%AB%EB%8F%84%EA%B7%B8.png" },
        { name: "고다치즈 올리브식빵", tag: "신제품", img: "https://d2afncas1tel3t.cloudfront.net/wp-content/uploads/2026/09/%EA%B3%A0%EB%8B%A4%EC%B9%98%EC%A6%88-%EC%98%AC%EB%A6%AC%EB%B8%8C%EC%8B%9D%EB%B9%B5-Whole.png" },
        { name: "치즈 소보루빵", tag: "신제품", img: "https://d2afncas1tel3t.cloudfront.net/wp-content/uploads/2026/09/%EC%B9%98%EC%A6%88%EC%86%8C%EB%B3%B4%EB%A3%A8%EB%B9%B5.png" },
        { name: "크림치즈말랑", tag: "신제품", img: "https://d2afncas1tel3t.cloudfront.net/wp-content/uploads/2026/09/%ED%81%AC%EB%A6%BC%EC%B9%98%EC%A6%88%EB%A7%90%EB%9E%91.png" },
        { name: "모짜렐라 치즈봉", tag: "신제품", img: "https://d2afncas1tel3t.cloudfront.net/wp-content/uploads/2026/09/%EB%B0%94%EC%82%AD%EB%AA%A8%EC%A7%9C%EB%A0%90%EB%9D%BC%EC%B9%98%EC%A6%88%EB%B4%89.png" }
      ],
      src: { label: "싱글리스트", url: "https://www.slist.kr/news/articleView.html?idxno=773578" } },
    { cat: "bakery", brand: "뚜레쥬르", when: "10.15 출시 · 가을 5종", date: "2026-10-15",
      items: [
        { name: "사르르 호박 카스테라 크림빵", tag: "신제품" },
        { name: "꿀맛 고구마 생도넛", tag: "신제품" },
        { name: "오리지널 퀴니아망", tag: "신제품" },
        { name: "흑임자 퀴니아망", tag: "신제품" },
        { name: "흑임자 가나슈 바게트", tag: "신제품" }
      ],
      src: { label: "싱글리스트", url: "https://www.slist.kr/news/articleView.html?idxno=773578" } },

    { cat: "snack", brand: "삼첩분식", when: "10.16 출시", date: "2026-10-16",
      items: [{ name: "떠먹는피자떡볶이", tag: "신메뉴" }],
      src: { label: "더쎈뉴스", url: "https://www.mhns.co.kr/news/articleView.html?idxno=764579" } },

    { cat: "cafe", brand: "이디야커피", when: "10.22 출시 · 푸드 9종", date: "2026-10-22",
      items: [
        { name: "와그작 생 초코파이", tag: "디저트", img: "https://www.ediya.com/files/menu/IMG_1792465407166.png" },
        { name: "딸기 쏙쏙 모찌떡", tag: "디저트" },
        { name: "말차초코 크림파운드", tag: "디저트", img: "https://www.ediya.com/files/menu/IMG_1792465705645.png" },
        { name: "촉촉한 치즈 수플레", tag: "디저트", img: "https://www.ediya.com/files/menu/IMG_1792466041370.png" },
        { name: "햄 치즈 스크램블 브리오슈", tag: "식사", img: "https://www.ediya.com/files/menu/IMG_1792466490538.png" },
        { name: "콘치즈 토스트", tag: "식사", img: "https://www.ediya.com/files/menu/IMG_1792466629165.png" },
        { name: "저당 콤비네이션 포켓피자", tag: "식사", img: "https://www.ediya.com/files/menu/IMG_1792466815753.png" },
        { name: "스틱 츄러스 · 브리오슈 소금빵", tag: "리뉴얼", plain: true }
      ],
      src: { label: "베타뉴스", url: "https://www.betanews.net/article/view/beta202610220164" } },
    { cat: "cafe", brand: "투썸플레이스", when: "10월 · 가을 시즌", date: "2026-10-01",
      items: [{ name: "블랙 치즈폼 라떼", tag: "음료", price: "6,300원" }, { name: "딸기 요거트 프라페", tag: "음료", price: "6,500원" }],
      src: { label: "프라임경제", url: "https://www.newsprime.co.kr/news/article/?no=749669" } },
    { cat: "cafe", brand: "메가MGC커피", when: "10.29 출시 · 겨울 5종", date: "2026-10-29",
      items: [
        { name: "딥 초코 체리 프라페", tag: "음료", price: "4,400원", img: "https://img.mega-mgccoffee.com/megahp/manager/upload/menu/20261021185329_1792576409658_TSL3J4XMIy.png" },
        { name: "쫀득 모찌 밀크티", tag: "음료", price: "3,800원", img: "https://img.mega-mgccoffee.com/megahp/manager/upload/menu/20261021185621_1792576581002_NyaJL6AVnt.png" },
        { name: "매실 모과차", tag: "음료", price: "3,500원", img: "https://img.mega-mgccoffee.com/megahp/manager/upload/menu/20261021185422_1792576462096_Ju7aC8KXEI.png" },
        { name: "바삭허니 엠지씨네 컵치킨", tag: "푸드", price: "4,400원", img: "https://img.mega-mgccoffee.com/megahp/manager/upload/menu/20261021185720_1792576640171_6Y1WcMmn0X.png" },
        { name: "엠지씨네 마라 떡볶이", tag: "푸드", price: "4,400원", img: "https://img.mega-mgccoffee.com/megahp/manager/upload/menu/20261021185813_1792576693475_CPlWEhkpD0.png" }
      ],
      src: { label: "금강일보", url: "https://www.ggilbo.com/news/articleView.html?idxno=1189936" },
      note: "29일부터 18일간 신규 음료 3종을 6일씩 돌아가며 500원 할인해요" }
  ],

  limited: [
    { kind: "이벤트", brand: "bhc", title: "알싹킹 앱 쿠폰 이벤트", pop: 2.5, end: "2026-10-31", period: "~ 10.31(토)",
      desc: "bhc 앱에서 알싹킹을 주문하고 이벤트 페이지에서 응모하면 다음 달에 쓸 알싹킹 2,000원 쿠폰을 줘요. 추첨으로 모바일 상품권도 있어요.",
      src: { label: "비즈트리뷴", url: "https://www.biztribune.co.kr/news/articleView.html?idxno=361110" } },
    { kind: "이벤트", brand: "교촌치킨", title: "허니페스타", end: "2026-10-31", period: "~ 10.31(토)",
      desc: "교촌 주문 앱에서 매일 오후 5시에 선착순 5,000원 할인쿠폰을 줘요. 허니 메뉴 7종에 쓸 수 있어요.",
      src: { label: "맥스무비", url: "https://www.maxmovie.com/news/articleView.html?idxno=502586" } },
    { kind: "이벤트", brand: "쉐이크쉑", title: "세트 업그레이드 쿠폰", end: "2026-10-31", period: "~ 10.31(토)",
      desc: "카카오톡 채널에서 세트 업그레이드 쿠폰을 받을 수 있어요.",
      src: { label: "식품투데이", url: "https://www.foodtoday.or.kr/news/article.html?no=208450" } },
    { kind: "메뉴", brand: "맥도날드", title: "빅아치", price: "12,400원", img: "https://www.mcdonalds.co.kr/upload/2026/10/Corp_PC_VIEW_772x530_%EB%B9%85%EC%95%84%EC%B9%98_EVM.png", imgFrom: "맥도날드 공식 홈페이지 (세트 사진)", pop: 5.2, end: "2026-11-19", endLate: "2026-12-03",
      period: "10.22 출시 · 11.19~12.3 사이 종료 예상",
      desc: "4~6주 한정이라 종료일이 정확히 나오지 않았어요. 빠르면 11월 19일에 끝날 수 있어요.",
      src: { label: "재경일보", url: "https://news.jkn.co.kr/post/1039964" } },
    { kind: "이벤트", brand: "스타벅스", title: "겨울 e-프리퀀시", pop: 5.8, end: "2026-12-31", period: "10.22(목) ~ 12.31(목)",
      cups: { total: 17, mission: 3 },
      desc: "미션음료 3잔을 포함해 17잔이면 증정품 1개를 예약할 수 있어요. 렉슨 스피커, 몰스킨 플래너, 코듀로이 백팩, 캔버스 토트 중에서 골라요.",
      src: { label: "데일리환경", url: "https://www.dailyt.co.kr/newsView/dlt202610150013" } },
    { kind: "메뉴", brand: "도미노피자", title: "레몬 버터 더블 살시챠 피자", end: "2026-12-31", period: "연말까지 한정",
      desc: "자사 앱과 쿠팡이츠에서 주문할 수 있어요.",
      src: { label: "프라임경제", url: "https://www.newsprime.co.kr/news/article/?no=749669" } },
    { kind: "메뉴", brand: "버거킹", title: "블랙 트러플치즈 버거", price: "10,700원", end: "2027-01-05", period: "10.14 출시 · 2027.1.5까지",
      desc: "세트는 12,900원이에요. 트러플 풍미를 더한 치즈 버거예요.",
      src: { label: "헤럴드경제", url: "https://biz.heraldcorp.com/article/10900655" } },
    { kind: "메뉴", brand: "맘스터치", title: "햄치즈휠렛버거", open: "종료일 미정", period: "10.15 발표 · 전국 한정 판매",
      desc: "온라인 투표로 다시 돌아온 추억의 버거예요. 전국 매장에서 한정으로 팔아요.",
      src: { label: "마이데일리", url: "https://www.mydaily.co.kr/page/view/2026101514360760582" } },
    { kind: "메뉴", brand: "쉐이크쉑", title: "쉑하우스 바비큐 4종", open: "가을 시즌", period: "10.1 출시 · 종료일 미정",
      lines: [["쉑하우스 바비큐 버거", "10,900원"], ["쉑하우스 바비큐 치킨", "9,900원"], ["쉑하우스 바비큐 프라이", "6,500원"], ["스모어 쉐이크", "7,800원"]],
      src: { label: "식품투데이", url: "https://www.foodtoday.or.kr/news/article.html?no=208450" } },
    { kind: "메뉴", brand: "성심당", title: "알밤시루", price: "4만 원대", open: "가을 시즌", period: "9.23 출시 · 종료일 미정 · 대전 매장만",
      desc: "알밤을 듬뿍 올린 가을 한정 케이크예요. 케익부띠끄 본점은 9월 23일부터, 롯데점과 DCC점은 9월 28일부터 팔아요.",
      src: { label: "국제뉴스", url: "https://www.gukjenews.com/news/articleView.html?idxno=3703754" } },
    { kind: "메뉴", brand: "버거킹", title: "트러플 머쉬룸 시즌 5종", open: "가을 시즌", period: "9.16 출시 · 종료일 미정",
      lines: [["트러플 머쉬룸 와퍼", "9,700원"], ["핫 트러플 머쉬룸 와퍼", "9,700원"], ["메종 트러플 치즈 버거", "10,500원"], ["딥 트러플 프라이", "3,000원"], ["트러플 머쉬룸 파이로얄", "2,700원"]],
      desc: "버거 세트는 11,900원(메종은 12,700원)이에요. 매년 가을에만 돌아오는 메뉴예요.",
      src: { label: "아시아경제", url: "https://view.asiae.co.kr/article/2026091608122210585" } }
  ],

  trends: {
    asOf: "10.28",
    src: { label: "블로그 키워드 추천 집계", url: "https://github.com/kangeunseo04/blog-keywords/issues/55" },
    rows: [
      ["스타벅스 프리퀀시", 5.8, "limited"],
      ["맥도날드 빅아치", 5.2, "limited"],
      ["컴포즈 신메뉴", 2.9, "new"],
      ["알싹킹", 2.5, "new"],
      ["스타벅스 신메뉴", 1.9, "new"],
      ["이디야 신메뉴", 1.8, "new"],
      ["메가커피 신메뉴", 1.7, "new"]
    ]
  }
};
