/* ============================================================
   중고나라 사내 슬라이드 — 공통 엔진
   (모든 HTML이 이 파일을 <script src>로 참조)
============================================================ */

/* ---------- STATE ---------- */
var SLIDES = [];
var CFG = { duration: 8, accentColor: '#1AAED1' };
var current = 0;
var playing = true;
var slideTimer = null;
var progressRAF = null;
var progressOffset = 0;
var progressTick = Date.now();
var uiTimer = null;
var wakeLock = null;
var DOTS = [];

/* ---------- UTIL ---------- */
function hl(text) {
  /* __강조__ → <em>강조</em> */
  if (!text) return '';
  return String(text).replace(/__([^_]+)__/g, '<em>$1</em>');
}
function nl(text) {
  /* \n → <br> */
  if (!text) return '';
  return String(text).replace(/\n/g, '<br>');
}

/* ---------- 동적 날짜 (D-day 자동 계산) ---------- */
function dday(targetDateStr) {
  if (!targetDateStr) return 0;
  var today = new Date(); today.setHours(0,0,0,0);
  var target = new Date(targetDateStr); target.setHours(0,0,0,0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
function ddayText(targetDateStr) {
  var n = dday(targetDateStr);
  if (n > 0) return 'D − ' + n;
  if (n === 0) return 'D-DAY';
  return 'D + ' + Math.abs(n);
}
/* 템플릿 치환 — {{dday(YYYY-MM-DD)}} → "D − N" 으로 변환 */
function templ(str) {
  if (str == null) return str;
  return String(str).replace(/\{\{dday\(([^)]+)\)\}\}/g, function(_, ds) {
    return ddayText(ds.trim());
  });
}

/* ---------- 일정 단계 자동 현재화 ---------- */
function autoMarkCurrent(milestones) {
  var hasDates = milestones.some(function(m){ return !!m.startDate; });
  if (!hasDates) return;

  var today = new Date(); today.setHours(0,0,0,0);
  var t = today.getTime();

  /* 1) 오늘이 startDate~endDate 범위 안에 있는 단계 → 활성 */
  var anyActive = false;
  milestones.forEach(function(m) {
    if (m.startDate && m.endDate) {
      var s = new Date(m.startDate); s.setHours(0,0,0,0);
      var e = new Date(m.endDate); e.setHours(23,59,59,999);
      if (t >= s.getTime() && t <= e.getTime()) {
        m.current = true; anyActive = true;
      } else {
        m.current = false;
      }
    }
  });

  /* 2) 현재 활성 없으면 → 가장 가까운 다음 단계 펄스 */
  if (!anyActive) {
    for (var i = 0; i < milestones.length; i++) {
      if (milestones[i].startDate) {
        var s = new Date(milestones[i].startDate); s.setHours(0,0,0,0);
        if (s.getTime() > t) { milestones[i].current = true; break; }
      }
    }
  }
}

/* ============================================================
   RENDERERS (슬라이드 타입별 HTML 생성)
============================================================ */
function renderSlide(s, idx, total) {
  var theme = s.theme || 'summer';
  var num = String(idx + 1).padStart(2, '0');
  var tot = String(total).padStart(2, '0');

  if (theme === 'dark-green') return renderGreen(s, num);
  return renderSummer(s, num, tot);
}

function renderGreen(s, num) {
  var clsExtra = (s.type === 'vision') ? ' vision' : '';
  var ghost = '<div class="gn-ghost">' + num + '</div>';

  if (s.type === 'context') {
    return '<div class="theme-green' + clsExtra + '">' + ghost +
      '<h1 class="s-el gn-title context-title">' + hl(nl(s.title)) + '</h1>' +
    '</div>';
  }

  var tag = s.tag ? '<div class="s-el gn-tag">' + s.tag + '</div>' : '';
  var title = s.title ? '<h1 class="s-el gn-title">' + hl(nl(s.title)) + '</h1>' : '';
  var translate = '';
  if (s.translate) {
    translate =
      '<div class="s-el gn-translate">' +
        '<span class="t-label">한 줄 번역</span>' +
        '<span class="t-text">' + nl(s.translate) + '</span>' +
      '</div>';
  }
  return '<div class="theme-green' + clsExtra + '">' + ghost + tag + title + translate + '</div>';
}

function renderSummer(s, num, tot) {
  var topbar = renderTopBar(s, num, tot);
  var botbar = renderBotBar(s);

  var inner = '';
  switch (s.type) {
    case 'intro':         inner = renderIntro(s); break;
    case 'value':         inner = renderValue(s); break;
    case 'section':       inner = renderSection(s); break;
    case 'way':
    case 'culture-item':  inner = renderWay(s); break;
    case 'cover':         inner = renderCover(s); break;
    case 'sched':         inner = renderSched(s); break;
    default:              inner = '';
  }
  return '<div class="theme-summer"><div class="layer">' + topbar + inner + botbar + '</div></div>';
}

/* ---------- 공통 상/하 바 ---------- */
function renderTopBar(s, num, tot) {
  var tb = s.topbar || {};
  var leftA = templ(tb.leftA || '중고나라 · 사내 공지');
  var leftB = templ(tb.leftB || '');
  var right = templ(tb.right || (num + ' / ' + tot));
  var rightCls = tb.rightBlue ? ' class="blue"' : '';
  return '<div class="top-bar">' +
    '<div class="left">' +
      '<span class="accent">' + leftA + '</span>' +
      (leftB ? '<span class="sep"></span><span>' + leftB + '</span>' : '') +
    '</div>' +
    '<div class="right"><span' + rightCls + '>' + right + '</span></div>' +
  '</div>';
}
function renderBotBar(s) {
  var bb = s.botbar || {};
  var leftA = templ(bb.leftA || '');
  var leftB = templ(bb.leftB || '');
  var leftBCls = bb.leftBBlue ? ' class="blue"' : '';
  var right = templ(bb.right || '');
  return '<div class="bot-bar">' +
    '<div class="left">' +
      (leftA ? '<span>' + leftA + '</span>' : '') +
      (leftB ? '<span class="sep"></span><span' + leftBCls + '>' + leftB + '</span>' : '') +
    '</div>' +
    '<div class="right">' + (right ? '<span>' + right + '</span>' : '') + '</div>' +
  '</div>';
}

/* ---------- intro · 매거진 TOC 가로 행 ---------- */
function renderIntro(s) {
  var count = (s.items || []).length;
  var listCls = (count >= 4) ? 'intro-list is-4' : 'intro-list';

  var rows = (s.items || []).map(function(it) {
    /* desc 첫 줄은 hero 키 문구, 나머지는 desc 보조문 (끝점 제거) */
    var lines = (it.desc || '').split('\n');
    var hero = (lines[0] || '').replace(/\.$/, '').trim();
    var sub = lines.slice(1).join(' ').trim();
    return '<div class="s-el intro-row">' +
      '<div class="ir-num">' + (it.num || '') + '</div>' +
      '<div class="ir-mid">' +
        '<div class="ir-name">' + (it.name || '') + '</div>' +
        (it.tag ? '<div class="ir-tag">' + it.tag + '</div>' : '') +
      '</div>' +
      '<div class="ir-right">' +
        (hero ? '<div class="ir-hero">' + hero + '</div>' : '') +
        (sub ? '<div class="ir-desc">' + sub + '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="layout-intro">' +
    '<div class="intro-head">' +
      '<div class="s-el v-kicker">' + (s.kicker || '') + (s.kickerEn ? '<span class="muted">' + s.kickerEn + '</span>' : '') + '</div>' +
      '<h1 class="s-el v-title">' + (s.num ? '<span class="num">' + s.num + '</span>' : '') + (s.title || '') + '</h1>' +
      (s.body ? '<p class="s-el v-sub">' + s.body + '</p>' : '') +
    '</div>' +
    '<div class="' + listCls + '">' + rows + '</div>' +
  '</div>';
}

/* ---------- value · 핵심가치 디테일 ---------- */
function renderValue(s) {
  var indexList = (s.indexItems || []).map(function(it, i) {
    var cur = (s.indexCur != null && i === s.indexCur) ? ' class="cur"' : '';
    return '<span' + cur + '>' + it + '</span>';
  }).join('');

  return '<div class="layout-value">' +
    '<div class="s-el val-meta">' +
      (s.tag ? '<span class="tag">' + s.tag + '</span>' : '') +
      (s.subtag || '') +
    '</div>' +
    '<h1 class="s-el val-title">' + hl(s.title || '') + '</h1>' +
    (s.body ? '<p class="s-el val-body">' + hl(nl(s.body)) + '</p>' : '') +
    (indexList ? '<div class="s-el val-index" aria-hidden="true">' + indexList + '</div>' : '') +
  '</div>';
}

/* ---------- section · 그룹 + 행 리스트 ---------- */
function renderSection(s) {
  var groups = (s.groups || []).map(function(g) {
    var rows = (g.values || []).map(function(v) {
      var sub = v.sub || '';
      return '<div class="sec-row">' +
        '<div class="sr-num">' + (v.num || '') + '</div>' +
        '<div class="sr-name">' + (v.name || '') + '</div>' +
        '<div class="sr-sub">' + hl(sub) + '</div>' +
      '</div>';
    }).join('');
    var count = g.values ? g.values.length + '가지' : '';
    return '<div class="s-el sec-grp">' +
      '<div class="sec-grp-h">' +
        '<span class="grp-name">' + (g.name || '') + '</span>' +
        (g.cap ? '<span class="grp-en">' + g.cap + '</span>' : '') +
        '<span class="grp-spacer"></span>' +
        '<span class="grp-count">' + count + '</span>' +
      '</div>' +
      rows +
    '</div>';
  }).join('');

  return '<div class="layout-section">' +
    '<div class="intro-head">' +
      '<div class="s-el v-kicker">' + (s.kicker || '') + (s.kickerEn ? '<span class="muted">' + s.kickerEn + '</span>' : '') + '</div>' +
      '<h1 class="s-el v-title">' + (s.num ? '<span class="num">' + s.num + '</span>' : '') + (s.title || '') + '</h1>' +
      (s.body ? '<p class="s-el v-sub">' + s.body + '</p>' : '') +
    '</div>' +
    '<div class="section-list">' + groups + '</div>' +
  '</div>';
}

/* ---------- way / culture-item ---------- */
function renderWay(s) {
  return '<div class="layout-way">' +
    '<div class="s-el way-kicker">' +
      '<span class="way-tag"><span class="num">' + (s.numLabel || '') + '</span>' + (s.categoryLabel || '') + '</span>' +
      (s.category || '') +
    '</div>' +
    '<h1 class="s-el way-title">' + (s.title || '') + '</h1>' +
    '<div class="s-el way-subline">' +
      '<div class="way-bar"></div>' +
      '<div class="way-sub">' + (s.subBold ? '<strong>' + s.subBold + '</strong>' : '') + (s.subRest || '') + '</div>' +
    '</div>' +
    (s.body ? '<p class="s-el way-body">' + hl(nl(s.body)) + '</p>' : '') +
  '</div>';
}

/* ---------- cover · 성과평가 안내 ---------- */
function renderCover(s) {
  var items = (s.sideItems || []).map(function(it) {
    var vCls = it.style ? ' ' + it.style : '';
    return '<div class="s-el item">' +
      '<div class="l">' + (it.label || '') + '</div>' +
      '<div class="v' + vCls + '">' + templ(it.value || '') + '</div>' +
    '</div>';
  }).join('');

  return '<div class="layout-cover">' +
    '<div class="cv-main">' +
      (s.pretitle ? '<div class="s-el cv-pretitle">' + templ(s.pretitle) + '</div>' : '') +
      '<h1 class="s-el cv-title">' + hl(nl(templ(s.title || ''))) + '</h1>' +
    '</div>' +
    '<aside class="cv-side">' + items + '</aside>' +
  '</div>';
}

/* ---------- sched · 일정 안내 ---------- */
function renderSched(s) {
  /* 단계 데이터 복사 후 오늘 날짜 기준으로 current 자동 마킹 */
  var ms = (s.milestones || []).map(function(m){
    var copy = {};
    for (var k in m) if (m.hasOwnProperty(k)) copy[k] = m[k];
    return copy;
  });
  autoMarkCurrent(ms);

  var milestones = ms.map(function(m) {
    var cur = m.current ? ' is-cur' : '';
    return '<div class="s-el ms-col' + cur + '">' +
      '<div class="ms-circle">' + (m.num || '') + '</div>' +
      (m.stage   ? '<div class="ms-stage">'   + m.stage   + '</div>' : '') +
      (m.name    ? '<div class="ms-name">'    + m.name    + '</div>' : '') +
      (m.action  ? '<div class="ms-action">'  + m.action  + '</div>' : '') +
      (m.date    ? '<div class="ms-date">'    + m.date    + '</div>' : '') +
      (m.weekday ? '<div class="ms-weekday">' + m.weekday + '</div>' : '') +
    '</div>';
  }).join('');

  return '<div class="layout-sched">' +
    '<div class="sc-head">' +
      '<h1 class="s-el sc-title">' + hl(nl(templ(s.title || ''))) + '</h1>' +
      (s.metaRight ? '<div class="s-el sc-meta">' + templ(s.metaRight.line || '') + (s.metaRight.strong ? '<span class="strong">' + templ(s.metaRight.strong) + '</span>' : '') + '</div>' : '') +
    '</div>' +
    '<div class="sched-flow">' +
      '<div class="flow-track"></div>' +
      milestones +
    '</div>' +
  '</div>';
}


/* ============================================================
   INIT & BUILD
============================================================ */
function initWithData(data) {
  SLIDES = (data && data.slides) || [];
  if (data && data.config) Object.assign(CFG, data.config);

  buildSlides();
  buildDots();
  goTo(0, false);
  if (playing) resumeAll();
  showUI();
  wireUI();
}

function buildSlides() {
  var stage = document.getElementById('stage');
  if (!stage) return;
  stage.innerHTML = '';
  SLIDES.forEach(function(s, i) {
    var section = document.createElement('section');
    section.className = 'slide';
    section.dataset.i = i;
    section.innerHTML = renderSlide(s, i, SLIDES.length);
    stage.appendChild(section);
  });
  /* 슬라이드 클릭 → 토글 재생 (전체화면 모드 외) */
  document.querySelectorAll('.slide').forEach(function(sl) {
    sl.addEventListener('click', function(e) {
      if (document.fullscreenElement) return;
      togglePlay(e);
    });
  });
}

function buildDots() {
  var box = document.getElementById('dots');
  if (!box) return;
  box.innerHTML = '';
  DOTS = [];
  SLIDES.forEach(function(_, i) {
    var d = document.createElement('div');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', function(e) { e.stopPropagation(); goTo(i); });
    box.appendChild(d);
    DOTS.push(d);
  });
}


/* ============================================================
   NAV / PLAYBACK
============================================================ */
function runStagger(slideEl) {
  var els = slideEl.querySelectorAll('.s-el');
  els.forEach(function(el, i) {
    el.classList.remove('in');
    setTimeout(function() { el.classList.add('in'); }, 200 + i * 90);
  });
}

function goTo(idx, animate) {
  if (animate === undefined) animate = true;
  var total = SLIDES.length;
  if (!total) return;
  var nx = ((idx % total) + total) % total;
  var slides = document.querySelectorAll('.slide');
  slides[current].classList.remove('active');
  if (DOTS[current]) DOTS[current].classList.remove('active');
  current = nx;
  slides[current].classList.add('active');
  if (DOTS[current]) DOTS[current].classList.add('active');
  runStagger(slides[current]);
  var counter = document.getElementById('slide-counter');
  if (counter) counter.textContent = String(current + 1).padStart(2,'0') + ' / ' + String(total).padStart(2,'0');
  if (animate) { resetProgress(); if (playing) restartSlideTimer(); }
}
function next() { goTo(current + 1); }
function prev() { goTo(current - 1); }

function togglePlay(e) { if (e) e.stopPropagation(); playing ? pauseAll() : resumeAll(); }
function resumeAll() {
  playing = true;
  var b = document.getElementById('btn-play'); if (b) b.textContent = '⏸';
  var ov = document.getElementById('pause-overlay'); if (ov) ov.classList.remove('show');
  progressTick = Date.now();
  startProgressRAF();
  restartSlideTimer();
}
function pauseAll() {
  playing = false;
  var b = document.getElementById('btn-play'); if (b) b.textContent = '▶';
  var ov = document.getElementById('pause-overlay'); if (ov) ov.classList.add('show');
  progressOffset += Date.now() - progressTick;
  clearTimeout(slideTimer);
  cancelAnimationFrame(progressRAF);
}

function durationOf() {
  var s = SLIDES[current] || {};
  return (s.duration || CFG.duration || 8) * 1000;
}
function restartSlideTimer() {
  clearTimeout(slideTimer);
  var remaining = durationOf() - progressOffset;
  slideTimer = setTimeout(function() { if (playing) next(); }, Math.max(remaining, 0));
}
function resetProgress() {
  progressOffset = 0; progressTick = Date.now();
  var bar = document.getElementById('progress-bar'); if (bar) bar.style.width = '0%';
}
function startProgressRAF() {
  cancelAnimationFrame(progressRAF);
  var bar = document.getElementById('progress-bar');
  function tick() {
    if (!playing || !bar) return;
    var elapsed = progressOffset + (Date.now() - progressTick);
    var pct = Math.min(elapsed / durationOf() * 100, 100);
    bar.style.width = pct + '%';
    progressRAF = requestAnimationFrame(tick);
  }
  progressRAF = requestAnimationFrame(tick);
}

function showUI() {
  var ui = document.getElementById('ui');
  var cursor = document.getElementById('cursor');
  if (ui) ui.classList.remove('ui-hidden');
  if (cursor) cursor.classList.remove('ui-hidden');
  clearTimeout(uiTimer);
  uiTimer = setTimeout(function() {
    if (playing) {
      if (ui) ui.classList.add('ui-hidden');
      if (cursor) cursor.classList.add('ui-hidden');
    }
  }, 3000);
}


/* ============================================================
   FULLSCREEN · WAKE LOCK
============================================================ */
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function(){});
  else document.exitFullscreen().catch(function(){});
}
async function requestWakeLock() {
  if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch(e){} }
}
async function releaseWakeLock() { if (wakeLock) { try { await wakeLock.release(); } catch(e){} wakeLock = null; } }


/* ============================================================
   WIRE UP UI (한 번만)
============================================================ */
var uiWired = false;
function wireUI() {
  if (uiWired) return; uiWired = true;

  document.addEventListener('mousemove', showUI);
  document.addEventListener('keydown', showUI);

  var cursor = document.getElementById('cursor');
  if (cursor) {
    document.addEventListener('mousemove', function(e) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
    document.addEventListener('mousedown', function(){ cursor.classList.add('clicking'); });
    document.addEventListener('mouseup', function(){ cursor.classList.remove('clicking'); });
  }

  document.addEventListener('keydown', function(e) {
    switch(e.key) {
      case 'ArrowRight': next(); break;
      case 'ArrowLeft': prev(); break;
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  var btnFs = document.getElementById('btn-fullscreen');
  if (btnFs) btnFs.addEventListener('click', function(e){ e.stopPropagation(); toggleFullscreen(); });
  var btnPrev = document.getElementById('btn-prev');
  if (btnPrev) btnPrev.addEventListener('click', function(e){ e.stopPropagation(); prev(); });
  var btnNext = document.getElementById('btn-next');
  if (btnNext) btnNext.addEventListener('click', function(e){ e.stopPropagation(); next(); });
  var btnPlay = document.getElementById('btn-play');
  if (btnPlay) btnPlay.addEventListener('click', function(e){ e.stopPropagation(); togglePlay(); });

  document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) {
      if (!playing) resumeAll();   /* 전체화면 진입 시 자동 재생 강제 */
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && document.fullscreenElement) {
      requestWakeLock();
      if (playing && !slideTimer) restartSlideTimer();
    }
  });
}


/* ============================================================
   BOOTSTRAP (모든 var/function 선언 완료 후 마지막에 실행)
============================================================ */
(function bootstrap() {
  /* GitHub Pages 등 http(s) → slides.json fetch 시도, 실패 시 인라인 사용 */
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    fetch('slides.json')
      .then(function(r){ if (!r.ok) throw new Error(); return r.json(); })
      .then(function(d){ initWithData(d); })
      .catch(function(){
        if (window.SLIDES_DATA) initWithData(window.SLIDES_DATA);
      });
  } else {
    /* file:// 로컬 — window.SLIDES_DATA 사용 */
    if (window.SLIDES_DATA) initWithData(window.SLIDES_DATA);
  }
})();
