// 다크모드 버튼: 누르면 밝게/어둡게를 바꾸고 이 브라우저에 기억해요.
// 직접 고르기 전에는 기기 설정이 바뀌면 그대로 따라가요.
(function () {
  var root = document.documentElement, btn = document.getElementById('theme-btn');
  var meta = document.querySelector('meta[name="theme-color"]');
  var mq = matchMedia('(prefers-color-scheme: dark)');
  function apply(t) {
    root.dataset.theme = t;
    if (meta) meta.content = t === 'dark' ? '#121816' : '#1f9370';
    if (btn) btn.setAttribute('aria-label', t === 'dark' ? '밝은 화면으로' : '다크모드 켜기');
  }
  // 바꿀 때만 화면 전체를 한 장처럼 0.3초 동안 서서히 바꿔요(View Transition).
  // 요소마다 따로 색을 바꾸면 글자가 잠깐 바탕에 묻혀 깜빡여 보여서, 화면을 통째로 겹쳐 바꿔요.
  // 지원하지 않는 브라우저와 움직임 줄이기를 켠 기기에선 바로 바뀌어요.
  var st = document.createElement('style');
  st.textContent = '::view-transition-old(root), ::view-transition-new(root) { animation-duration: .3s; animation-timing-function: ease; }'
    + '.theme-switching, .theme-switching * { transition: none !important; }';
  document.head.appendChild(st);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  function fade(t) {
    if (reduce.matches || root.dataset.theme === t || !document.startViewTransition) return apply(t);
    root.classList.add('theme-switching');
    var vt = document.startViewTransition(function () { apply(t); });
    vt.finished.then(done, done);
    function done() { root.classList.remove('theme-switching'); }
  }
  function saved() { try { return localStorage.getItem('fd_theme'); } catch (e) { return null; } }
  apply(root.dataset.theme === 'dark' ? 'dark' : 'light');
  if (btn) btn.addEventListener('click', function () {
    var t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('fd_theme', t); } catch (e) {}
    fade(t);
  });
  var follow = function (e) { if (!saved()) fade(e.matches ? 'dark' : 'light'); };
  if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
})();
