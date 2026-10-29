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
  function saved() { try { return localStorage.getItem('fd_theme'); } catch (e) { return null; } }
  apply(root.dataset.theme === 'dark' ? 'dark' : 'light');
  if (btn) btn.addEventListener('click', function () {
    var t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('fd_theme', t); } catch (e) {}
    apply(t);
  });
  var follow = function (e) { if (!saved()) apply(e.matches ? 'dark' : 'light'); };
  if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
})();
