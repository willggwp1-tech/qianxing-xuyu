/* ============================================================
   牽星絮語 — Tutorial System  (tutorial.js)
   Usage from any page:
     TutorialSystem.autoStart(steps, 'page_key');
   Manual replay:
     TutorialSystem.start(steps, 'page_key');
   ============================================================ */
(function () {
  'use strict';

  // ── Google Font ───────────────────────────────────────────
  if (!document.querySelector('link[href*="Comfortaa"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&family=Fredoka+One&display=swap';
    document.head.appendChild(l);
  }

  // ── CSS ───────────────────────────────────────────────────
  const CSS = `
/* ── Overlay ── */
#tut-overlay {
  position: fixed; inset: 0;
  background: rgba(2, 5, 15, 0.83);
  z-index: 99997;
  display: none;
  pointer-events: all;
}
#tut-overlay.tut-visible { display: block; }

/* ── Mascot video ── */
#tut-mascot-wrap {
  position: fixed;
  bottom: 0; left: 54px;
  width: 280px;
  z-index: 99999;
  display: none;
  pointer-events: none;
}
#tut-mascot-wrap.tut-visible { display: block; }
#tut-mascot-wrap video {
  width: 100%; display: block;
  border-radius: 14px 14px 0 0;
  filter: drop-shadow(0 0 22px rgba(120,180,255,0.35));
}

/* ── Dialog box ── */
#tut-dialog {
  position: fixed;
  bottom: 38px; left: 380px; right: 64px;
  max-width: 1300px;
  background: linear-gradient(135deg, rgba(7,12,28,0.97) 0%, rgba(11,18,40,0.97) 100%);
  border: 1px solid rgba(140,180,255,0.28);
  border-radius: 18px;
  padding: 28px 36px 22px;
  z-index: 99999;
  display: none;
  box-shadow: 0 0 0 1px rgba(80,120,200,0.08),
              0 0 50px rgba(80,140,255,0.13),
              0 8px 32px rgba(0,0,0,0.65);
  animation: tutSlideUp 0.36s cubic-bezier(.22,.68,0,1.15);
}
#tut-dialog.tut-visible { display: block; }

/* Arrow pointing left toward mascot */
#tut-dialog::before {
  content: ''; position: absolute;
  left: -13px; bottom: 56px;
  border: 7px solid transparent;
  border-right-color: rgba(140,180,255,0.28);
}
#tut-dialog::after {
  content: ''; position: absolute;
  left: -11px; bottom: 57px;
  border: 6px solid transparent;
  border-right-color: rgba(11,18,40,0.97);
}

@keyframes tutSlideUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Dialog content ── */
#tut-step-label {
  font-family: 'Comfortaa', 'Microsoft JhengHei', cursive;
  font-size: 0.7rem; color: rgba(140,180,255,0.45);
  letter-spacing: 0.2em; text-transform: uppercase;
  margin-bottom: 8px;
}
#tut-title {
  font-family: 'Comfortaa', 'Fredoka One', 'Microsoft JhengHei', cursive;
  font-size: 1.42rem; color: #a0c4ff;
  margin-bottom: 11px; letter-spacing: 0.04em; line-height: 1.45;
}
#tut-text {
  font-family: 'Comfortaa', 'Microsoft JhengHei', 'PingFang TC', cursive;
  font-size: 1.0rem; color: #b6cde6; line-height: 1.92;
}
#tut-nav {
  display: flex; justify-content: space-between;
  align-items: center; margin-top: 20px;
}

/* Skip button */
#tut-skip {
  background: none; border: 1px solid rgba(140,180,255,0.14);
  border-radius: 6px; color: rgba(140,180,255,0.32);
  font-family: 'Comfortaa', 'Microsoft JhengHei', cursive;
  font-size: 0.8rem; padding: 7px 18px; cursor: pointer;
  transition: all 0.2s; letter-spacing: 0.05em;
}
#tut-skip:hover { color: rgba(160,196,255,0.72); border-color: rgba(160,196,255,0.3); }

/* Dots */
#tut-dots { display: flex; gap: 8px; align-items: center; }
.tut-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(140,180,255,0.16); transition: all 0.25s;
}
.tut-dot.tut-active { background: #a0c4ff; transform: scale(1.35); }

/* Next/finish button */
#tut-next {
  background: linear-gradient(135deg, #1a3a5c 0%, #264d73 100%);
  border: 1px solid rgba(140,180,255,0.3); border-radius: 10px;
  color: #a0c4ff;
  font-family: 'Comfortaa', 'Microsoft JhengHei', cursive;
  font-size: 0.95rem; padding: 9px 28px; cursor: pointer;
  transition: all 0.2s; letter-spacing: 0.05em;
}
#tut-next:hover {
  background: linear-gradient(135deg, #264d73 0%, #2e6090 100%);
  box-shadow: 0 0 14px rgba(120,180,255,0.22);
}

/* ── Replay button (persistent bottom-right) ── */
#tut-replay-btn {
  position: fixed; bottom: 18px; right: 22px;
  z-index: 9990;
  background: rgba(16,26,52,0.7);
  border: 1px solid rgba(140,180,255,0.18); border-radius: 8px;
  color: rgba(140,180,255,0.48);
  font-family: 'Comfortaa', 'Microsoft JhengHei', cursive;
  font-size: 0.78rem; padding: 7px 16px; cursor: pointer;
  backdrop-filter: blur(6px); transition: all 0.2s; letter-spacing: 0.05em;
}
#tut-replay-btn:hover {
  color: #a0c4ff; background: rgba(26,58,92,0.82);
  border-color: rgba(160,196,255,0.36);
}

/* ── Step text transition ── */
.tut-step-anim { animation: tutFadeStep 0.26s ease-out; }
@keyframes tutFadeStep {
  from { opacity: 0; transform: translateX(10px); }
  to   { opacity: 1; transform: translateX(0); }
}
  `;

  // ── DOM Construction ──────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('tut-styles')) return;
    const s = document.createElement('style');
    s.id = 'tut-styles'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildDOM() {
    if (document.getElementById('tut-overlay')) return;

    // Dark overlay
    const overlay = document.createElement('div');
    overlay.id = 'tut-overlay';
    document.body.appendChild(overlay);

    // Mascot video
    const mascotWrap = document.createElement('div');
    mascotWrap.id = 'tut-mascot-wrap';
    const vid = document.createElement('video');
    vid.id = 'tut-video';
    vid.src = 'assets/mascot.mp4';
    vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
    mascotWrap.appendChild(vid);
    document.body.appendChild(mascotWrap);

    // Dialog box
    const dialog = document.createElement('div');
    dialog.id = 'tut-dialog';
    dialog.innerHTML = `
      <div id="tut-step-label"></div>
      <div id="tut-title"></div>
      <div id="tut-text"></div>
      <div id="tut-nav">
        <button id="tut-skip">跳過教學</button>
        <div id="tut-dots"></div>
        <button id="tut-next">下一步 →</button>
      </div>
    `;
    document.body.appendChild(dialog);

    document.getElementById('tut-skip').addEventListener('click', end);
    document.getElementById('tut-next').addEventListener('click', nextStep);
  }

  // ── State ─────────────────────────────────────────────────
  let _steps = [], _idx = 0, _key = '';

  function render() {
    const s = _steps[_idx];
    document.getElementById('tut-step-label').textContent =
      '步驟 ' + (_idx + 1) + '  /  ' + _steps.length;

    const titleEl = document.getElementById('tut-title');
    const textEl  = document.getElementById('tut-text');
    titleEl.className = 'tut-step-anim';
    textEl.className  = 'tut-step-anim';
    // Force reflow so animation retriggers
    void titleEl.offsetWidth;
    void textEl.offsetWidth;
    titleEl.textContent = s.title;
    textEl.innerHTML    = s.text;

    document.getElementById('tut-next').textContent =
      _idx === _steps.length - 1 ? '開始探索 ✦' : '下一步 →';

    const dotsEl = document.getElementById('tut-dots');
    dotsEl.innerHTML = '';
    _steps.forEach(function(_, i) {
      const d = document.createElement('div');
      d.className = 'tut-dot' + (i === _idx ? ' tut-active' : '');
      dotsEl.appendChild(d);
    });
  }

  function nextStep() {
    if (_idx < _steps.length - 1) { _idx++; render(); }
    else end();
  }

  function end() {
    ['tut-overlay', 'tut-mascot-wrap', 'tut-dialog'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '0';
      setTimeout(function() {
        el.classList.remove('tut-visible');
        el.style.opacity = '';
        el.style.transition = '';
      }, 320);
    });
    localStorage.setItem('tut_done_' + _key, 'true');
  }

  // ── Public API ────────────────────────────────────────────
  function start(steps, pageKey) {
    injectStyles();
    buildDOM();
    _steps = steps; _idx = 0; _key = pageKey;

    ['tut-overlay', 'tut-mascot-wrap', 'tut-dialog'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.style.opacity = ''; el.classList.add('tut-visible'); }
    });

    var vid = document.getElementById('tut-video');
    if (vid) vid.play().catch(function() {});
    render();
  }

  function addReplayBtn(steps, pageKey) {
    if (document.getElementById('tut-replay-btn')) return;
    injectStyles();
    var btn = document.createElement('button');
    btn.id = 'tut-replay-btn';
    btn.textContent = '❓ 教學說明';
    btn.addEventListener('click', function() { start(steps, pageKey); });
    document.body.appendChild(btn);
  }

  function autoStart(steps, pageKey) {
    function run() {
      injectStyles();
      buildDOM();
      addReplayBtn(steps, pageKey);
      if (localStorage.getItem('tut_done_' + pageKey) !== 'true') {
        // Small delay so page content is visible before overlay appears
        setTimeout(function() { start(steps, pageKey); }, 700);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      setTimeout(run, 0);
    }
  }

  // pendingAutoStart: fires when an explicit unlock flag is set (e.g. after shard_create)
  // OR on plain first visit. The unlock flag overrides the tut_done guard so returning
  // players also see the tutorial when they reach a newly unlocked page.
  function pendingAutoStart(steps, pageKey, unlockFlag) {
    function run() {
      injectStyles();
      buildDOM();
      addReplayBtn(steps, pageKey);
      var pending = unlockFlag && localStorage.getItem(unlockFlag) === 'true';
      var done    = localStorage.getItem('tut_done_' + pageKey) === 'true';
      if (pending || !done) {
        if (pending) localStorage.removeItem(unlockFlag);
        setTimeout(function() { start(steps, pageKey); }, 700);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      setTimeout(run, 0);
    }
  }

  window.TutorialSystem = { start: start, autoStart: autoStart, pendingAutoStart: pendingAutoStart };
})();
