/* =========================================================
   메인 3D 연출
   1) 반투명 X-ray 인체(척추·골반·갈비뼈)가 회전하며 AI 스캔
   2) 구부정한 자세 → 바른 자세로 펴짐 (목·어깨·허리·무릎)
   3) 바른 자세 완성 후, 평상복 입은 남녀가 함께 조깅하며
      화면 앞으로 달려 나옴
   ========================================================= */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- X-ray 재질 (프레넬 림 라이트) ---------- */
  function xrayMaterial(color, power = 2.2) {
    return new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 1 }, power: { value: power } },
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 color; uniform float opacity; uniform float power;
        varying vec3 vN; varying vec3 vV;
        void main(){
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), power);
          gl_FragColor = vec4(color, (f * 0.85 + 0.05) * opacity);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide
    });
  }
  function boneMaterial(color) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
  }

  /* ---------- 인체 리그 ---------- */
  function makeHuman(mode, look) {
    const root = new THREE.Group();
    const J = {};
    const mats = [];
    const joint = (name, parent, p) => { const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); parent.add(g); J[name] = g; return g; };

    const hips = joint('hips', root, [0, .95, 0]);
    const spine1 = joint('spine1', hips, [0, .08, 0]);
    const spine2 = joint('spine2', spine1, [0, .12, 0]);
    const chest = joint('chest', spine2, [0, .13, 0]);
    const neck = joint('neck', chest, [0, .22, -.01]);
    const head = joint('head', neck, [0, .09, .01]);
    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      const sh = joint('sh' + s, chest, [.17 * k, .17, -.01]);
      const arm = joint('arm' + s, sh, [.03 * k, 0, 0]);
      joint('elbow' + s, arm, [0, -.28, 0]);
      const hip = joint('hip' + s, hips, [.09 * k, -.05, 0]);
      const knee = joint('knee' + s, hip, [0, -.42, 0]);
      joint('ankle' + s, knee, [0, -.42, 0]);
    });

    // 재질
    let shell, skin, shirt, pants, shoe, hair;
    if (mode === 'xray') {
      shell = xrayMaterial(0x7fe9ff, 2.0); mats.push(shell);
    } else {
      const std = c => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: .75, metalness: 0, transparent: true }); mats.push(m); return m; };
      skin = std(look.skin); shirt = std(look.shirt); pants = std(look.pants); shoe = std(look.shoe); hair = std(look.hair);
    }
    const M = part => mode === 'xray' ? shell : ({ skin, shirt, pants, shoe, hair })[part];

    const add = (parent, geo, part, pos, scale, rot) => {
      const m = new THREE.Mesh(geo, M(part));
      if (pos) m.position.set(pos[0], pos[1], pos[2]);
      if (scale) m.scale.set(scale[0], scale[1], scale[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      parent.add(m); return m;
    };
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16);
    const sph = r => new THREE.SphereGeometry(r, 24, 18);

    // 몸통
    add(hips, sph(.16), 'pants', [0, .01, 0], [1.05, .8, .78]);
    add(spine1, cap(.135, .1), mode === 'xray' ? 'shirt' : 'shirt', [0, .07, 0], [1, 1, .74]);
    add(chest, cap(.155, .16), 'shirt', [0, .07, 0], [1.05, 1, .72]);
    add(neck, new THREE.CylinderGeometry(.045, .052, .12, 14), 'skin', [0, .02, 0]);
    add(head, sph(.105), 'skin', [0, .07, .01], [.92, 1.12, 1]);
    if (mode !== 'xray') {
      add(head, sph(.11), 'hair', [0, .1, -.012], [.96, .9, 1.02]);
      if (look.ponytail) add(head, cap(.04, .12), 'hair', [0, .04, -.12], null, [-.5, 0, 0]);
      // 웃는 얼굴
      const face = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: .6, transparent: true }); mats.push(face);
      [-1, 1].forEach(k => { const e = new THREE.Mesh(new THREE.SphereGeometry(.011, 8, 8), face); e.position.set(.034 * k, .085, .097); e.scale.set(1.2, .7, .6); head.add(e); });
      const smile = new THREE.Mesh(new THREE.TorusGeometry(.03, .0065, 6, 18, Math.PI), face);
      smile.rotation.z = Math.PI; smile.position.set(0, .045, .1); head.add(smile);
      const cheekM = new THREE.MeshStandardMaterial({ color: 0xf29b8f, transparent: true, opacity: .5 }); mats.push(cheekM);
      [-1, 1].forEach(k => { const c = new THREE.Mesh(new THREE.SphereGeometry(.016, 8, 8), cheekM); c.position.set(.06 * k, .05, .08); c.scale.set(1, .6, .4); head.add(c); });
      // 반팔 소매
      ['L', 'R'].forEach(s => add(J['arm' + s], cap(.055, .08), 'shirt', [0, -.07, 0]));
    }
    ['L', 'R'].forEach(s => {
      add(J['arm' + s], cap(.043, .2), mode === 'xray' ? 'shirt' : 'skin', [0, -.14, 0]);
      add(J['elbow' + s], cap(.037, .2), 'skin', [0, -.13, 0]);
      add(J['elbow' + s], sph(.045), 'skin', [0, -.27, .01], [.8, 1.1, .6]);
      add(J['hip' + s], cap(.075, .28), 'pants', [0, -.21, 0]);
      add(J['knee' + s], cap(.056, .3), 'pants', [0, -.21, 0]);
      add(J['ankle' + s], new THREE.BoxGeometry(.09, .06, .22), 'shoe', [0, -.02, .05]);
    });

    // X-ray 뼈대
    const bones = { all: [], spine: [], pelvis: [] };
    if (mode === 'xray') {
      const bm = boneMaterial(0xc8fbff), spineM = boneMaterial(0x7dffb2);
      mats.push(bm, spineM);
      const vert = new THREE.BoxGeometry(.04, .022, .034);
      const placeV = (parent, n, len, z) => {
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(vert, spineM);
          m.position.set(0, (i + .5) * len / n, z);
          parent.add(m); bones.spine.push(m);
        }
      };
      placeV(spine1, 2, .12, -.06); placeV(spine2, 2, .13, -.07); placeV(chest, 5, .22, -.075); placeV(neck, 3, .1, -.02);
      // 갈비뼈
      for (let i = 0; i < 6; i++) {
        const r = .1 + Math.sin((i + 1) / 7 * Math.PI) * .045;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 6, 40, Math.PI * 1.55), bm);
        rib.rotation.set(Math.PI / 2 + .25, 0, Math.PI * .5 + Math.PI * .225);
        rib.position.set(0, .02 + i * .03, -.02); rib.scale.set(1.15, .8, 1);
        chest.add(rib); bones.all.push(rib);
      }
      // 쇄골
      ['L', 'R'].forEach((s, i) => {
        const k = i ? -1 : 1;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .16, 6), bm);
        c.rotation.z = Math.PI / 2; c.position.set(.085 * k, .16, .03); chest.add(c); bones.all.push(c);
      });
      // 골반
      const pel = new THREE.Mesh(new THREE.TorusGeometry(.1, .022, 10, 32), spineM);
      pel.rotation.x = Math.PI / 2 - .35; pel.scale.set(1.25, 1, .8); pel.position.set(0, .02, 0);
      hips.add(pel); bones.pelvis.push(pel);
      ['L', 'R'].forEach((s, i) => {
        const k = i ? -1 : 1;
        const w = new THREE.Mesh(sph(.06), spineM);
        w.scale.set(.5, 1, 1.1); w.position.set(.1 * k, .05, -.01); w.rotation.z = .4 * k;
        hips.add(w); bones.pelvis.push(w);
      });
      // 사지 뼈
      const longBone = (parent, len, y) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, len, 6), bm);
        m.position.y = y; parent.add(m); bones.all.push(m);
        const k = new THREE.Mesh(sph(.022), bm); k.position.y = y - len / 2; parent.add(k); bones.all.push(k);
      };
      ['L', 'R'].forEach(s => {
        longBone(J['arm' + s], .26, -.14); longBone(J['elbow' + s], .24, -.13);
        longBone(J['hip' + s], .4, -.21); longBone(J['knee' + s], .4, -.21);
      });
      // 두개골
      const skull = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc8fbff, wireframe: true, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
      mats.push(skull.material);
      skull.position.set(0, .075, .01); skull.scale.set(.95, 1.1, 1.05); head.add(skull); bones.all.push(skull);
    }

    return { root, J, mats, bones };
  }

  /* ---------- 자세 ---------- */
  const POSE_SLOUCH = {
    hips: [-.12, 0, 0], spine1: [.06, 0, 0], spine2: [.12, 0, 0], chest: [.22, 0, 0], neck: [.32, 0, 0], head: [.12, 0, 0],
    shL: [0, -.32, -.05], shR: [0, .32, .05], armL: [-.22, 0, .03], armR: [-.22, 0, -.03], elbowL: [-.25, 0, 0], elbowR: [-.25, 0, 0],
    hipL: [-.24, 0, .02], hipR: [-.24, 0, -.02], kneeL: [.42, 0, 0], kneeR: [.42, 0, 0], ankleL: [-.18, 0, 0], ankleR: [-.18, 0, 0]
  };
  const POSE_UPRIGHT = {
    hips: [0, 0, 0], spine1: [-.02, 0, 0], spine2: [-.02, 0, 0], chest: [-.03, 0, 0], neck: [0, 0, 0], head: [-.02, 0, 0],
    shL: [0, .04, 0], shR: [0, -.04, 0], armL: [0, 0, .09], armR: [0, 0, -.09], elbowL: [-.08, 0, 0], elbowR: [-.08, 0, 0],
    hipL: [0, 0, .02], hipR: [0, 0, -.02], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0]
  };
  function applyBlend(h, t) {
    for (const k in POSE_SLOUCH) {
      const a = POSE_SLOUCH[k], b = POSE_UPRIGHT[k], j = h.J[k];
      if (j) j.rotation.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
    }
    h.root.position.y = lerp(-.05, 0, t);
  }
  function applyRun(h, p) {
    const s = Math.sin(p), c = Math.cos(p);
    const J = h.J;
    J.hips.rotation.set(0, s * .08, 0);
    J.spine1.rotation.set(.04, -s * .06, 0); J.spine2.rotation.set(.04, 0, 0); J.chest.rotation.set(.04, -s * .1, 0);
    J.neck.rotation.set(-.06, 0, 0); J.head.rotation.set(-.04, s * .05, 0);
    J.shL.rotation.set(0, 0, 0); J.shR.rotation.set(0, 0, 0);
    J.hipL.rotation.set(-s * .55 - .1, 0, .02); J.hipR.rotation.set(s * .55 - .1, 0, -.02);
    J.kneeL.rotation.set(.35 + Math.max(0, c) * .8, 0, 0); J.kneeR.rotation.set(.35 + Math.max(0, -c) * .8, 0, 0);
    J.ankleL.rotation.set(-.15, 0, 0); J.ankleR.rotation.set(-.15, 0, 0);
    J.armL.rotation.set(s * .55, 0, .12); J.armR.rotation.set(-s * .55, 0, -.12);
    J.elbowL.rotation.set(-1.25, 0, 0); J.elbowR.rotation.set(-1.25, 0, 0);
    h.root.position.y = Math.abs(Math.sin(p)) * .035 - .035;
  }
  const setOpacity = (h, o) => h.mats.forEach(m => {
    if (m.uniforms) m.uniforms.opacity.value = o;
    else { m.opacity = (m.userData.base == null ? (m.userData.base = m.opacity) : m.userData.base) * o; }
  });

  /* ---------- 메인 ---------- */
  function initHero(opts) {
    const stage = opts.stage, canvasWrap = opts.canvasWrap, hud = opts.hud;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { stage.classList.add('no-webgl'); return { pause() {}, resume() {} }; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasWrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .05, 50);
    camera.position.set(0, 1.0, 5.3);
    camera.lookAt(0, .92, 0);

    scene.add(new THREE.HemisphereLight(0xdff3ff, 0x4d8a5a, .55));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.05); sun.position.set(2, 4, 3); scene.add(sun);

    // 바닥: 스캔 링
    const floor = new THREE.Group(); scene.add(floor);
    const polar = new THREE.PolarGridHelper(1.1, 12, 5, 64, 0x2fd6a0, 0x2fd6a0);
    polar.material.transparent = true; polar.material.opacity = .35; polar.material.depthWrite = false; floor.add(polar);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.95, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: .6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; floor.add(ring);

    // 스캔 라인
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .012), new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .18), new THREE.MeshBasicMaterial({ color: 0x2fd6a0, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(scan, scanGlow);

    // X-ray 인체
    const xr = makeHuman('xray');
    scene.add(xr.root);

    // 조깅하는 남녀
    const man = makeHuman('clothed', { skin: 0xd9a77f, shirt: 0x1f5fa8, pants: 0x9c8460, shoe: 0xf4f4f4, hair: 0x1e1612 });
    const woman = makeHuman('clothed', { skin: 0xe8b894, shirt: 0x2fa36a, pants: 0x2c3a4a, shoe: 0xffffff, hair: 0x2b1d16, ponytail: true });
    woman.root.scale.setScalar(.94);
    const runners = new THREE.Group(); runners.add(man.root, woman.root); scene.add(runners);

    // 이동하는 바닥 라인 (달리는 느낌)
    const lanes = new THREE.Group(); scene.add(lanes);
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 14; i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(.04, .35), laneMat);
      l.rotation.x = -Math.PI / 2; l.position.set(i % 2 ? .9 : -.9, .002, -i * .7); lanes.add(l);
    }

    // 실제 영상으로 교체 옵션
    const video = opts.videoEl;
    const useVideo = !!(video && video.getAttribute('src'));
    let videoOK = useVideo, videoReady = false;
    if (useVideo) {
      video.preload = 'auto';
      video.addEventListener('canplaythrough', () => { videoReady = true; });
      video.addEventListener('canplay', () => { videoReady = true; });
      video.addEventListener('error', () => { videoOK = false; });
      try { video.load(); } catch (e) {}
    }

    function resize() {
      const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < .8 ? 40 : 32;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();

    const H = hud || {};
    const ISSUES = [
      { el: H.neck, a: 24, b: 3, unit: '°' },
      { el: H.shoulder, a: 18, b: 2, unit: '°' },
      { el: H.pelvis, a: 14, b: 1, unit: '°' },
      { el: H.knee, a: 21, b: 0, unit: '°' }
    ];
    let lastPhase = '';
    const setPhase = (p, text) => {
      if (p === lastPhase) return; lastPhase = p;
      stage.dataset.phase = p;
      if (H.caption) { H.caption.classList.remove('show'); void H.caption.offsetWidth; H.caption.textContent = text; H.caption.classList.add('show'); }
    };

    // 영상이 준비되면 21초 루프(조깅 장면 포함), 아니면 12초 루프(자세 교정만)
    let running = true, t0 = performance.now(), pausedAt = 0;
    let cycleStart = 0, LOOP = 12, runThis = false, runStarted = false;

    function frame(nowMs) {
      if (!running) return;
      requestAnimationFrame(frame);
      const el = (nowMs - t0) / 1000;
      if (el - cycleStart >= LOOP) {
        cycleStart = el;
        runThis = videoOK && videoReady && !reduce;
        LOOP = runThis ? 21 : 12;
        runStarted = false;
      }
      const t = reduce ? 8 : el - cycleStart;

      // 단계
      const fadeIn = seg(t, 0, 1);
      const straighten = ease(seg(t, 3.2, 7));
      const xrOut = runThis ? seg(t, 9.2, 10.2) : seg(t, 11.2, 12);
      const runIn = runThis ? seg(t, 9.4, 10.4) : 0;
      const runOut = seg(t, 20.2, 21);
      const xrVis = fadeIn * (1 - xrOut);

      if (t < 3.2) setPhase('scan', 'AI 자세 분석 중 · 거북목 · 라운드숄더 · 골반 후방경사 감지');
      else if (t < 7) setPhase('fix', '입는 바른자세 착용 · 머리를 들고, 어깨를 펴고, 허리를 세웁니다');
      else if (t < 9.6 || !runThis) setPhase('done', '바른자세 완성 · 자세점수 98점');
      else setPhase('run', '바른 자세로 함께 달리는 건강한 일상');

      // X-ray 인체
      applyBlend(xr, straighten);
      xr.root.rotation.y = reduce ? .6 : el * .55;
      setOpacity(xr, xrVis);
      xr.root.visible = xrVis > .01;
      const bad = new THREE.Color(0xff8a5c), good = new THREE.Color(0x7dffb2);
      const sc = bad.clone().lerp(good, straighten);
      xr.bones.spine.forEach(m => m.material.color.copy(sc));
      xr.bones.pelvis.forEach(m => m.material.color.copy(sc));

      // 스캔 라인
      const sy = .05 + (Math.sin(el * 1.6) * .5 + .5) * 1.65;
      scan.position.set(0, sy, .25); scanGlow.position.set(0, sy, .24);
      scan.material.opacity = .9 * xrVis * (1 - straighten * .6); scanGlow.material.opacity = .12 * xrVis;
      floor.visible = xrVis > .01; ring.material.opacity = .6 * xrVis; polar.material.opacity = .35 * xrVis;
      ring.scale.setScalar(1 + Math.sin(el * 3) * .03);

      // HUD 값
      const score = Math.round(lerp(52, 98, straighten));
      if (H.score) H.score.textContent = score;
      if (H.bar) H.bar.style.transform = `scaleX(${score / 100})`;
      ISSUES.forEach(i => { if (i.el) { i.el.textContent = Math.round(lerp(i.a, i.b, straighten)) + i.unit; i.el.parentElement.classList.toggle('ok', straighten > .85); } });

      // 조깅
      const rv = runIn * (1 - runOut);
      runners.visible = false; // 실사 영상으로 대체
      if (runners.visible) {
        const p = el * 7.5;
        applyRun(man, p); applyRun(woman, p + .9);
        const prog = seg(t, 9.6, 16.6);
        const z = lerp(-3.2, 2.3, ease(prog));
        man.root.position.set(.3, 0, z); woman.root.position.set(-.3, 0, z - .15);
        man.root.position.y += 0; // bob handled in applyRun
        setOpacity(man, rv); setOpacity(woman, rv);
        laneMat.opacity = .5 * rv;
        lanes.children.forEach((l, i) => { l.position.z = ((i * .7 + el * 3.2) % 9.8) - 7.5; });
      } else laneMat.opacity = 0;
      if (useVideo) {
        if (runThis && t >= 9.2 && !runStarted) { runStarted = true; try { video.currentTime = 0; } catch (e) {} video.play().catch(() => {}); }
        video.style.opacity = rv;
        const zoom = lerp(.9, 1.06, ease(seg(t, 9.4, 20.2)));
        video.style.transform = `scale(${zoom.toFixed(4)})`;
        if (rv <= .01 && !video.paused && t > 20.5) video.pause();
      }

      // 카메라 미세 움직임
      camera.position.x = Math.sin(el * .3) * .12;
      camera.lookAt(0, .92, 0);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    return {
      pause() { if (!running) return; running = false; pausedAt = performance.now(); },
      resume() { if (running) return; t0 += performance.now() - pausedAt; running = true; requestAnimationFrame(frame); resize(); },
      resize
    };
  }

  window.initHero = initHero;
})();
