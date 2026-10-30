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
  // 바꿀 때만 잠깐 모든 색이 같이 0.3초 동안 서서히 바뀌어요. 움직임 줄이기를 켠 기기에선 바로 바뀌어요.
  var st = document.createElement('style');
  st.textContent = '.theme-fade, .theme-fade *, .theme-fade *::before, .theme-fade *::after { transition: background-color .3s ease, color .3s ease, border-color .3s ease, text-decoration-color .3s ease, fill .3s ease, stroke .3s ease, box-shadow .3s ease !important; }';
  document.head.appendChild(st);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)'), timer;
  function fade(t) {
    if (reduce.matches || root.dataset.theme === t) return apply(t);
    clearTimeout(timer);
    root.classList.add('theme-fade');
    apply(t);
    timer = setTimeout(function () { root.classList.remove('theme-fade'); }, 350);
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
