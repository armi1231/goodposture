/* =========================================================
   온라인 교육 1강 — 시청률 추적 + 퀴즈 게이트
   ---------------------------------------------------------
   · YouTube IFrame API 로 실제 재생된 '초'를 중복 없이 집계
     → 탐색(seek)으로 건너뛴 구간은 시청률에 포함되지 않습니다.
   · 시청 중에는 영상 아래 게이지(링 + 바 + %)로 %를 실시간 표시
   · 100% 시청 → 퀴즈 12문항 제출(/점수 보기) 확인 → '1강 완료'
   · 진행률은 회원 계정(user.progress[강의ID])에 저장되어
     관리자 페이지 > 교육 현황에서 회원별 %를 확인할 수 있습니다.
   ========================================================= */
(function () {
  let apiPromise = null;
  let player = null, ticker = null, ctx = null, lec = null;
  let watched = new Set(), dur = 0, lastSave = 0, unlocked = false, apiFailed = false;
  let hostEl = null;

  function ytId(url) {
    if (!url) return '';
    const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(res => {
      if (window.YT && window.YT.Player) return res(true);
      let done = false;
      window.onYouTubeIframeAPIReady = () => { if (!done) { done = true; res(true); } };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { if (!done) { done = true; res(false); } };
      document.head.appendChild(s);
      setTimeout(() => { if (!done) { done = true; res(!!(window.YT && window.YT.Player)); } }, 8000);
    });
    return apiPromise;
  }

  const prog = (u, id) => (u.progress && u.progress[id]) || null;

  function save(pct, force) {
    if (!ctx || !lec) return;
    if (!force && Date.now() - lastSave < 3000) return;
    lastSave = Date.now();
    const u = ctx.user;
    u.progress = u.progress || {};
    const prev = u.progress[lec.id] || {};
    const newPct = Math.round(pct * 10) / 10;
    const isAlreadyDone = !!(prev.done || prev.quizAt || (prev.pct >= 100));
    const effectivePct = isAlreadyDone ? 100 : Math.max(prev.pct || 0, newPct);
    u.progress[lec.id] = Object.assign({}, prev, {
      pct: effectivePct,
      watched: Math.max(prev.watched || 0, watched.size),
      duration: Math.max(prev.duration || 0, Math.round(dur || 0)),
      done: isAlreadyDone || (effectivePct >= 100),
      quizAt: prev.quizAt || '',
      updatedAt: (window.Store && window.Store.now) ? window.Store.now() : new Date().toISOString()
    });
    if (ctx.S && ctx.S.save) ctx.S.save();
    if (ctx.onProgress) ctx.onProgress(u.progress[lec.id]);
  }

  function template(l) {
    return `
      <div class="lec-player">
        <div class="lec-top">
          <span class="lec-part">1부 · 필수</span>
          <h3>${l.title}</h3>
          <p class="lec-sub">${l.desc || '영상 100% 시청 + 퀴즈 제출까지 완료해야 1강이 이수됩니다.'}</p>
        </div>

        <div class="lec-stage">
          <div class="yt-host" id="ytHost"></div>
          <div class="lec-fallback" id="lecFallback" hidden>
            <div class="lf-inner">
              <p>영상 플레이어를 불러오지 못했습니다.</p>
              <a class="btn btn-primary" href="${l.url}" target="_blank" rel="noopener">유튜브에서 영상 보기</a>
              <button class="btn btn-line" id="lfManual">영상을 끝까지 시청했습니다 (수동 확인)</button>
              <small>수동 확인은 관리자 화면에 '수동 확인'으로 기록됩니다.</small>
            </div>
          </div>
        </div>

        <div class="watch-panel" id="watchPanel">
          <div class="wp-ring">
            <svg viewBox="0 0 88 88" aria-hidden="true">
              <circle class="wp-track" cx="44" cy="44" r="36"></circle>
              <circle class="wp-fill" id="wpFill" cx="44" cy="44" r="36"></circle>
            </svg>
            <div class="wp-pct"><b id="wpPct">0</b><span>%</span></div>
          </div>
          <div class="wp-body">
            <div class="wp-row">
              <p class="wp-title"><span class="wp-dot"></span> 영상 시청률 · <b id="wpState">재생을 눌러 주세요</b></p>
              <span class="wp-time" id="wpTime">0:00 / --:--</span>
            </div>
            <div class="wp-bar"><i id="wpBar"></i></div>
            <p class="wp-note">건너뛰기(구간 이동)는 시청률에 포함되지 않습니다. 끝까지 재생하면 100%가 됩니다.</p>
          </div>
        </div>

        <div class="quiz-gate locked" id="quizGate">
          <div class="qg-lock"><span class="qg-ic">🔒</span>
            <div><h4>퀴즈는 영상 100% 시청 후 열립니다</h4>
            <p>영상을 끝까지 본 뒤 <b>12문항 퀴즈</b>를 풀고 제출하면 1강이 완료됩니다.</p></div>
          </div>
        </div>
      </div>`;
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function paint(pct) {
    const fill = hostEl.querySelector('#wpFill');
    const pctEl = hostEl.querySelector('#wpPct');
    const bar = hostEl.querySelector('#wpBar');
    const timeEl = hostEl.querySelector('#wpTime');
    const stateEl = hostEl.querySelector('#wpState');
    if (!fill) return;
    const C = 2 * Math.PI * 36;
    fill.style.strokeDasharray = C;
    fill.style.strokeDashoffset = String(C * (1 - pct / 100));
    fill.style.stroke = pct >= 99.5 ? '#2fd6a0' : pct > 50 ? '#7ddc9c' : '#ffd86b';
    if (pctEl) pctEl.textContent = Math.floor(pct);
    if (bar) bar.style.width = pct + '%';
    if (timeEl && player && player.getCurrentTime) timeEl.textContent = fmt(player.getCurrentTime()) + ' / ' + fmt(dur);
    if (stateEl) {
      const st = player && player.getPlayerState ? player.getPlayerState() : -1;
      stateEl.textContent = pct >= 99.5 ? '시청 완료' : st === 1 ? '시청 중' : st === 3 ? '버퍼링' : st === 2 ? '일시정지' : '재생 대기';
    }
  }

  function unlockQuiz() {
    if (unlocked) return;
    unlocked = true;
    const gate = hostEl.querySelector('#quizGate');
    if (!gate) return;
    gate.classList.remove('locked');
    gate.classList.add('open');
    gate.innerHTML = `
      <div class="qg-head"><span class="qg-badge">영상 100% 시청 완료</span>
        <h4>이제 퀴즈 12문항에 참여해 주세요</h4>
        <p>영상만 봐서는 1강이 완료되지 않습니다. <b>제출 → 점수 보기</b>까지 마쳐야 이수로 인정됩니다.</p>
      </div>
      <ol class="qg-steps">
        <li><b>1</b><div>영상을 끝까지 시청합니다 <span class="ok-chip">완료</span></div></li>
        <li><b>2</b><div>아래 버튼을 눌러 <b>이름을 적고 12문항</b>을 풉니다</div></li>
        <li><b>3</b><div>제출 후 <b>「점수 보기」</b>를 눌러 점수와 해설을 확인합니다</div></li>
      </ol>
      <a class="btn btn-primary btn-lg qg-btn" href="${lec.quizUrl}" target="_blank" rel="noopener">👉 퀴즈 참여하기</a>
      <label class="agree qg-check"><input type="checkbox" id="qgCheck"> 퀴즈 12문항을 제출하고 점수·해설까지 확인했습니다.</label>
      <button class="btn btn-cta btn-lg" id="qgSubmit" disabled>1강 수강 완료하기</button>
      <p class="qg-note">※ 구글폼 제출 여부는 홈페이지가 자동으로 확인할 수 없습니다. 제출 후 위 확인란에 체크해 주세요. 관리자 화면에는 시청률(%)과 제출 확인 시각이 함께 기록됩니다.</p>`;
    const chk = gate.querySelector('#qgCheck');
    const btn = gate.querySelector('#qgSubmit');
    chk.addEventListener('change', () => { btn.disabled = !chk.checked; });
    btn.addEventListener('click', () => complete());
    gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function complete() {
    if (!ctx) return;
    const u = ctx.user;
    u.progress = u.progress || {};
    const prev = u.progress[lec.id] || {};
    u.progress[lec.id] = Object.assign({}, prev, {
      pct: 100,
      watched: Math.max(prev.watched || 0, watched.size, Math.round(dur || 0)),
      duration: Math.max(prev.duration || 0, Math.round(dur || 0)),
      done: true,
      quizAt: prev.quizAt || ((window.Store && window.Store.now) ? window.Store.now() : new Date().toISOString()),
      updatedAt: (window.Store && window.Store.now) ? window.Store.now() : new Date().toISOString()
    });
    if (ctx.S && ctx.S.save) ctx.S.save();
    if (ctx.S && ctx.S.data && ctx.S.data.lectures) {
      const next = ctx.S.data.lectures.filter(x => x.part === 1).sort((a, b) => a.order - b.order).find(x => x.order > (lec.order || 1));
      lec.__next = next || null;
    }
    celebrate(u.progress[lec.id]);
    if (ctx.onComplete) ctx.onComplete(u.progress[lec.id]);
  }

  function celebrate(p) {
    const root = hostEl.querySelector('.lec-player');
    if (!root) return;
    if (ticker) { clearInterval(ticker); ticker = null; }
    const next = lec.__next;
    const pages = ['assets/brochure/p03.jpg', 'assets/brochure/p04.jpg', 'assets/brochure/p05.jpg'];
    root.innerHTML = `
      <div class="done-wrap">
        <div class="confetti" aria-hidden="true">${Array.from({ length: 22 }).map((_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <div class="done-card">
          <div class="done-badge">1강 이수 완료</div>
          <h3>1강 수강이 완료되었습니다.<br>수고하셨습니다 👏</h3>
          <p class="done-lead"><b>2강에서 만나요!</b></p>
          <div class="done-meta">
            <span><small>영상 시청률</small><b>${Math.floor(p.pct || 100)}%</b></span>
            <span><small>퀴즈 제출</small><b>확인됨</b></span>
            <span><small>완료 일시</small><b>${(p.quizAt || '').slice(0, 10).replace(/-/g, '.')}</b></span>
          </div>
          <div class="done-slides" aria-hidden="true">
            ${pages.map((s, i) => `<img src="${s}" alt="" style="animation-delay:${i * 3}s" loading="lazy">`).join('')}
          </div>
          <div class="done-next">
            <p class="eyebrow">다음 수강 안내</p>
            <h4>${next ? next.title : '2부 · 자율 6시간 과정'}</h4>
            <p>${next ? (next.desc || '다음 강의도 같은 방식으로 100% 시청 + 퀴즈를 완료해 주세요.') : '1부 필수 3시간을 모두 마치면 <b>피움 등급 · 월 렌탈료 4배 임시사업권</b>이 열립니다.'}</p>
            <div class="btn-row">
              <a class="btn btn-primary" href="#/edu" data-close>강의실로 돌아가기</a>
              <a class="btn btn-line" href="#/mypage" data-close>내 진도 확인</a>
            </div>
          </div>
        </div>
      </div>`;
    root.querySelectorAll('[data-close]').forEach(a => a.addEventListener('click', () => {
      const x = document.querySelector('.modal-x'); if (x) x.click();
    }));
  }

  function mount(el, l, options) {
    hostEl = el; lec = l; ctx = options;
    const u = ctx.user;
    const prev = prog(u, l.id) || {};
    el.innerHTML = template(l);
    dur = prev.duration || 0;
    unlocked = false; apiFailed = false; lastSave = 0;
    watched = new Set();
    // 이전에 본 초를 복원 (초 단위 집계 유지)
    const restored = Math.min(prev.duration || 0, prev.watched || 0);
    for (let i = 0; i < restored; i++) watched.add(i);
    paint(prev.pct || 0);

    const vid = ytId(l.url);
    if (!vid) {
      el.querySelector('#lecFallback').hidden = false;
      return;
    }
    loadApi().then(ok => {
      if (!ok || !window.YT || !window.YT.Player) {
        apiFailed = true;
        el.querySelector('#lecFallback').hidden = false;
        return;
      }
      player = new YT.Player('ytHost', {
        videoId: vid,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, origin: location.origin },
        events: {
          onReady: ev => {
            dur = ev.target.getDuration() || dur || 0;
            paint(dur ? watched.size / dur * 100 : (prev.pct || 0));
            startTicker();
          },
          onStateChange: () => { if (!ticker) startTicker(); },
          onError: () => { apiFailed = true; el.querySelector('#lecFallback').hidden = false; }
        }
      });
    });

    const manual = el.querySelector('#lfManual');
    if (manual) manual.addEventListener('click', () => {
      if (!confirm('영상을 끝까지 시청하셨나요? 수동 확인으로 기록됩니다.')) return;
      watched = new Set(); dur = dur || 1;
      save(100, true);
      const p = prog(me(), l.id) || {};
      unlockQuiz();
      const gate = el.querySelector('#quizGate');
      if (gate) gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
      void p;
    });

    function me() { return ctx.user; }

    function startTicker() {
      if (ticker) clearInterval(ticker);
      ticker = setInterval(() => {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        let t = 0, st = -1;
        try { t = player.getCurrentTime(); st = player.getPlayerState(); } catch (e) { return; }
        if (!dur && player.getDuration) dur = player.getDuration() || 0;
        if (st === 1 && !document.hidden) {
          const sec = Math.floor(t);
          if (sec >= 0 && (!dur || sec <= dur + 1)) watched.add(sec);
        }
        const pct = dur ? Math.min(100, watched.size / dur * 100) : (watched.size > 0 ? 100 : 0);
        paint(pct);
        save(pct);
        if (pct >= 99.5) { save(100, true); unlockQuiz(); }
      }, 400);
    }
  }

  function stop() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    try { if (player && player.destroy) player.destroy(); } catch (e) {}
    player = null; watched = new Set(); dur = 0;
  }

  window.LecturePlayer = { mount, stop, ytId };
})();
