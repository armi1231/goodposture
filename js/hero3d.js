/* =========================================================
   메인 AI 체형 측정 및 실사 조깅 연출 (v9)
   ---------------------------------------------------------
   1) 첨부 실사 해부학 측정 영상 (posture_scan.mp4) 전면 탑재
      - 첨부 생성 영상(gemini_generated_video)을 고화질 웹 비디오로 완벽 연동
      - 영상에 내장된 실제 AI 측정 사운드 효과음 실시간 재생
   2) 정밀 체형 측정 & 실시간 정렬 교정 HUD 완벽 연동
      - 0.0s ~ 3.4s [scan]: 52점 불균형 측정 (경추 24°, 어깨 18°, 골반 14°, 무릎 21°)
      - 3.4s ~ 7.2s [fix]: 실시간 정렬 교정 연출 (52점 -> 98점 상승, 전 부위 정상 회복)
      - 7.2s ~ 10.0s [done]: 자세점수 98점 이상적 밸런스 회복 및 전신 바른 자세 완성
   3) 40대 남녀 실사 조깅 영상 (joggers_v6.mp4) 10.0s ~ 20.0s
      - 10초 실사 조깅 장면 + 대화 음성 또렷하게 출력
      - '바른자세가 아름답고 건강한 몸이다' 순백색 한글자씩 확대 슬로건
   4) 원터치 사운드 제어 & 스마트 오디오 더킹
      - 측정 단계: 영상 속 AI 측정 효과음(1.0) + 산뜻한 자연 BGM(0.25)
      - 조깅 단계: 영상 속 남녀 대화 음성(1.0) + 부드러운 BGM 더킹(0.18)
   ========================================================= */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;

  function initHero(opts) {
    opts = opts || {};
    const stage = opts.stage || document.getElementById('heroStage');
    const canvasWrap = opts.canvasWrap || document.getElementById('heroCanvas');
    if (!stage || !canvasWrap) return null;

    const hud = opts.hud || {};
    const typeEl = opts.typeEl || null;
    const runCaption = opts.runCaption || null;
    const scanVideo = opts.scanVideoEl || stage.querySelector('#heroScanVideo');
    const video = opts.videoEl || stage.querySelector('#heroVideo');
    const soundBtn = opts.soundBtn || stage.querySelector('#heroSoundBtn') || document.querySelector('#heroSoundBtn');
    const natureAudio = opts.natureAudio || stage.querySelector('#natureAudio');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------- Three.js 홀로그램 스캔 레이저 & 링 오버레이 ---------------- */
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      stage.classList.add('no-webgl');
      return { pause() {}, resume() {} };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    canvasWrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .05, 60);
    camera.position.set(0, 1.02, 5.2);
    camera.lookAt(0, .95, 0);

    /* 바닥 홀로그램 스캔 그리드 & 회전 링 */
    const floor = new THREE.Group();
    scene.add(floor);
    const polar = new THREE.PolarGridHelper(1.2, 12, 5, 64, 0x2fd6a0, 0x2fd6a0);
    polar.material.transparent = true;
    polar.material.opacity = .38;
    polar.material.depthWrite = false;
    floor.add(polar);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(.98, 1.04, 72),
      new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: .75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    floor.add(ring);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(.54, .57, 48),
      new THREE.MeshBasicMaterial({ color: 0x2fd6a0, transparent: true, opacity: .60, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    innerRing.rotation.x = -Math.PI / 2;
    floor.add(innerRing);

    /* AI 수직 스캔 고휘도 레이저 빔 (고휘도 백색 코어 + 네온 그린 라인 + 에메랄드 산란광) */
    const scanGroup = new THREE.Group();
    scene.add(scanGroup);

    const scanCore = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, .022),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const scanBand = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, .07),
      new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: .88, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const scanGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, .38),
      new THREE.MeshBasicMaterial({ color: 0x2fd6a0, transparent: true, opacity: .38, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scanGroup.add(scanCore, scanBand, scanGlow);

    const tickGeo = new THREE.PlaneGeometry(.06, .06);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
    const tickL = new THREE.Mesh(tickGeo, tickMat);
    tickL.position.x = -0.92;
    const tickR = new THREE.Mesh(tickGeo, tickMat);
    tickR.position.x = 0.92;
    scanGroup.add(tickL, tickR);

    function typeInto(el, text) {
      if (!el) return;
      if (el.dataset.raw === text) return;
      el.dataset.raw = text;
      el.innerHTML = '';
      if (!text) return;
      [...text].forEach((ch, idx) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.style.animationDelay = (idx * 0.038) + 's';
        s.textContent = ch === ' ' ? '\u00A0' : ch;
        el.appendChild(s);
      });
    }

    function resize() {
      const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < .8 ? 40 : 32;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    const ISSUES = [
      { el: hud.neck, a: 24, b: 3, unit: '°' },
      { el: hud.shoulder, a: 18, b: 2, unit: '°' },
      { el: hud.pelvis, a: 14, b: 1, unit: '°' },
      { el: hud.knee, a: 21, b: 0, unit: '°' }
    ];

    /* ---------------- 음향 & 대화 및 측정소리 & 자연 BGM 제어 ---------------- */
    let soundEnabled = false;

    function applyAudioBalance(isRunPhase) {
      if (!soundEnabled) return;
      if (isRunPhase) {
        // [조깅 단계]: 남녀 조깅 대화 음성 또렷하게 출력 + 자연 BGM 부드러운 더킹
        if (scanVideo) {
          scanVideo.muted = true;
        }
        if (video) {
          video.muted = false;
          video.volume = 1.0;
        }
        if (natureAudio) {
          natureAudio.volume = 0.18;
        }
      } else {
        // [측정 단계]: 첨부 영상 속 실제 AI 측정 효과음 또렷하게 출력 + 자연 BGM 조화
        if (scanVideo) {
          scanVideo.muted = false;
          scanVideo.volume = 1.0;
        }
        if (video) {
          video.muted = true;
        }
        if (natureAudio) {
          natureAudio.volume = 0.28;
        }
      }
    }

    function updateSoundUI() {
      if (!soundBtn) return;
      soundBtn.classList.toggle('is-active', soundEnabled);
      const icon = soundBtn.querySelector('.hsb-icon');
      const text = soundBtn.querySelector('.hsb-text');
      if (soundEnabled) {
        if (icon) icon.textContent = '🔊';
        if (text) text.textContent = '사운드 ON';
        soundBtn.setAttribute('aria-label', '음향 끄기');
        soundBtn.title = '클릭하여 음소거';
      } else {
        if (icon) icon.textContent = '🔇';
        if (text) text.textContent = '소리 켜기';
        soundBtn.setAttribute('aria-label', '음향 켜기 (측정소리 & 대화 & 자연 BGM)');
        soundBtn.title = '클릭하여 AI 측정 효과음, 조깅 대화 및 자연 새소리 듣기';
      }
    }

    function enableSound() {
      if (soundEnabled) return;
      soundEnabled = true;
      updateSoundUI();
      if (natureAudio) {
        natureAudio.play().catch(() => {});
      }
      const isRun = stage.dataset.phase === 'run';
      if (isRun && video) {
        video.muted = false;
        video.volume = 1.0;
        video.play().catch(() => {});
      } else if (!isRun && scanVideo) {
        scanVideo.muted = false;
        scanVideo.volume = 1.0;
        scanVideo.play().catch(() => {});
      }
      applyAudioBalance(isRun);
    }

    function disableSound() {
      soundEnabled = false;
      updateSoundUI();
      if (natureAudio) {
        natureAudio.pause();
      }
      if (scanVideo) {
        scanVideo.muted = true;
      }
      if (video) {
        video.muted = true;
      }
    }

    function toggleSound() {
      if (soundEnabled) disableSound();
      else enableSound();
    }

    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSound();
      });
    }

    // 히어로 스테이지 클릭 시에도 자연스럽게 소리 활성화
    stage.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, .kakao-chip')) return;
      if (!soundEnabled) {
        enableSound();
      }
    });

    // 비디오 자동 재생 초기화
    [scanVideo, video].forEach(v => {
      if (!v) return;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.play().catch(() => {});
    });

    // 브라우저 최초 제스처 시 비디오 재생 보장
    const unlockAutoplay = () => {
      if (scanVideo && scanVideo.paused) scanVideo.play().catch(() => {});
      if (video && video.paused) video.play().catch(() => {});
      window.removeEventListener('click', unlockAutoplay);
      window.removeEventListener('touchstart', unlockAutoplay);
    };
    window.addEventListener('click', unlockAutoplay, { once: true });
    window.addEventListener('touchstart', unlockAutoplay, { once: true });

    let lastPhase = '';
    function setPhase(p, main, sub) {
      if (p === lastPhase) return;
      // 단계 전환 시 각 영상의 시작점을 동기화하여 완벽한 시각적/청각적 연출 제공
      if (p === 'scan' && lastPhase === 'run') {
        if (scanVideo) {
          scanVideo.currentTime = 0;
          scanVideo.play().catch(() => {});
        }
      } else if (p === 'run' && lastPhase !== 'run') {
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      }

      lastPhase = p;
      stage.dataset.phase = p;
      typeInto(typeEl ? typeEl.querySelector('.st-main') : null, main);
      typeInto(typeEl ? typeEl.querySelector('.st-sub') : null, sub || '');
    }

    /* 20초 전체 루프: 10초 AI 측정(첨부 영상) -> 10초 실사 조깅(대화 및 슬로건) */
    const LOOP = 20;
    let running = true, t0 = performance.now(), pausedAt = 0, cycleStart = 0;

    function frame(nowMs) {
      if (!running) return;
      requestAnimationFrame(frame);
      const el = (nowMs - t0) / 1000;
      if (el - cycleStart >= LOOP) cycleStart = el;
      const t = reduce ? 5 : el - cycleStart;

      const isScanPhase = (t < 10.0);
      const isRunPhase = !isScanPhase;

      let straighten = 0.0;

      // 단계별 순백색 타이핑 문구 및 자세 교정 수치 진행
      if (t < 3.4) {
        // [1단계: AI 체형 측정] 0.0s ~ 3.4s (영상 속 구부정한 자세 스캔, 52점)
        straighten = 0.0;
        setPhase('scan', 'AI 해부학 정밀 체형 측정', '경추 24° · 굽은등 · 골반 비대칭 분석');
      } else if (t < 7.2) {
        // [2단계: 실시간 교정] 3.4s ~ 7.2s (영상 속 인체가 고개를 들고 펴지며 회전, 52 -> 98점)
        straighten = ease(seg(t, 3.4, 7.0));
        setPhase('fix', '입는 바른자세 · 실시간 정렬 교정', '머리를 들고 · 어깨를 펴고 · 골반의 중심을 세웁니다');
      } else if (t < 10.0) {
        // [3단계: 자세 완성] 7.2s ~ 10.0s (영상 속 인체 바른자세 완성 정면 안착, 98점)
        straighten = 1.0;
        setPhase('done', '자세점수 98점 · 이상적인 밸런스 회복', '척추 24마디 완벽 정렬 · 바른 자세 완성');
      } else {
        // [4단계: 40대 남녀 실사 조깅 영상] 10.0s ~ 20.0s
        straighten = 1.0;
        setPhase('run', '', '');
      }

      applyAudioBalance(isRunPhase);

      /* 수직 스캔 레이저 라인 (발끝 0.08부터 머리끝 1.88까지 스캔 왕복) */
      const sy = .08 + (Math.sin(el * 1.8) * .5 + .5) * 1.80;
      scanGroup.position.set(0, sy, .28);
      scanGroup.visible = isScanPhase;
      scanCore.material.opacity = isScanPhase ? 1.0 : 0;
      scanBand.material.opacity = isScanPhase ? .88 : 0;
      scanGlow.material.opacity = isScanPhase ? .38 : 0;
      tickL.material.opacity = isScanPhase ? .95 : 0;
      tickR.material.opacity = isScanPhase ? .95 : 0;

      floor.visible = isScanPhase;
      ring.material.opacity = .75;
      polar.material.opacity = .38;
      floor.rotation.y = el * 0.25;
      ring.scale.setScalar(1 + Math.sin(el * 3) * .03);

      /* HUD 수치 업데이트 (영상 속 변화와 100% 동기화) */
      const score = Math.round(lerp(52, 98, straighten));
      if (hud.score) hud.score.textContent = score;
      if (hud.bar) hud.bar.style.transform = 'scaleX(' + (score / 100) + ')';
      ISSUES.forEach(i => {
        if (!i.el) return;
        i.el.textContent = Math.round(lerp(i.a, i.b, straighten)) + i.unit;
        i.el.parentElement.classList.toggle('ok', straighten > .85);
      });

      /* 조깅 영상 위 순백색 확대 슬로건 */
      if (runCaption) {
        if (isRunPhase) {
          runCaption.classList.add('on');
        } else {
          runCaption.classList.remove('on');
        }
      }

      camera.position.x = Math.sin(el * .28) * .06;
      camera.lookAt(0, .95, 0);

      if (isScanPhase) {
        renderer.render(scene, camera);
      }
    }

    requestAnimationFrame(frame);

    return {
      pause() {
        if (!running) return;
        running = false;
        pausedAt = performance.now();
        if (scanVideo) scanVideo.pause();
        if (video) video.pause();
        if (natureAudio) natureAudio.pause();
      },
      resume() {
        if (running) return;
        t0 += performance.now() - pausedAt;
        running = true;
        requestAnimationFrame(frame);
        if (scanVideo) scanVideo.play().catch(() => {});
        if (video) video.play().catch(() => {});
        if (soundEnabled && natureAudio) natureAudio.play().catch(() => {});
        resize();
      },
      resize
    };
  }

  window.initHero = initHero;
})();
