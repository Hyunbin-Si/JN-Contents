/* 슬라이드 공통 — 어떤 화면이든 1920×1080 비율을 유지하도록 무대를 맞춘다 */
(function(){
  function fit(){
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var st = document.getElementById('stage');
    if (st) st.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', fit);
  fit();
})();
