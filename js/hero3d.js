/* =========================================================
   메인 3D 연출 (X-ray 골격 분석 + 40대 동양인 남녀 실사 조깅)
   ---------------------------------------------------------
   1) 실제 의료용 X-ray / EOS 스캐너를 연상시키는 정밀 해부학 골격
      - Additive Blending & Fresnel Shader 기반의 투광형 X-ray 재질
      - 24개 척추(경추7·흉추12·요추5), 12쌍 갈비뼈, 흉골, 쇄골, 견갑골, 골반, 두개골
      - 인체 윤곽선(연부조직 실루엣)이 함께 은은하게 투과
   2) 굽은 자세(거북목·굽은등·골반뒤틀림) → 바른 자세 실시간 교정
      - 문제 척추 부위 경고 주황색 → 완벽 정렬 시 청량한 바이오 그린으로 변환
      - 자세 점수 52점 → 98점 실시간 상승
   3) 40대 한국인 남녀의 밝고 건강한 실사 조깅
      - 청계천처럼 맑은 물과 푸른 잔디, 꽃길 산책로를 다정하게 웃으며 달리는 모습
      - Three.js 3D 벚꽃/꽃잎 흩날림 & 햇살·물결 반짝임 파티클 연출
   4) 영상 내 모든 텍스트는 선명한 순백색(#FFFFFF) & 그림자로 가독성 100% 확보
   ========================================================= */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- X-ray 투광 셰이더 (실제 엑스레이 질감) ---------------- */
  function createXrayShader(colorHex, power = 2.0, glow = 0.9, core = 0.28) {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(colorHex) },
        opacity: { value: 1.0 },
        power: { value: power },
        glow: { value: glow },
        core: { value: core }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        uniform float power;
        uniform float glow;
        uniform float core;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float d = abs(dot(normalize(vNormal), normalize(vView)));
          float fresnel = pow(1.0 - d, power);
          float inner = pow(d, 2.2) * core;
          float intensity = clamp(fresnel * glow + inner + 0.12, 0.0, 1.0);
          vec3 c = mix(color, vec3(1.0, 1.0, 1.0), fresnel * 0.55 + inner * 0.7);
          gl_FragColor = vec4(c, intensity * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  /* ---------------- 지오메트리 헬퍼 ---------------- */
  const cyl = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 14);
  const sph = (r, s) => new THREE.SphereGeometry(r, s || 18, Math.round((s || 18) * .72));
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  /* 관절두가 있는 긴 뼈 */
  function longBone(mat, len, r1, r2) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(cyl(r1, r2, len, 12), mat);
    shaft.position.y = -len / 2;
    g.add(shaft);
    const head = new THREE.Mesh(sph(r1 * 1.08, 14), mat);
    g.add(head);
    const foot = new THREE.Mesh(sph(r2 * 1.08, 14), mat);
    foot.position.y = -len;
    g.add(foot);
    return g;
  }

  /* ---------------- 해부학적 X-ray 인체 골격 ---------------- */
  function makeXraySkeleton() {
    const root = new THREE.Group();
    const J = {}, mats = [];

    // 엑스레이 뼈 재질 (투광성 청백색)
    const boneMat = createXrayShader(0x8fe8ff, 1.9, 0.88, 0.26);
    // 척추 재질 (경고 주황색 → 바른 정렬 시 에메랄드 그린)
    const spineMat = createXrayShader(0xff945c, 1.8, 0.95, 0.35);
    const pelvisMat = createXrayShader(0xff945c, 1.9, 0.92, 0.32);
    // 인체 외형 실루엣 (엑스레이 연부조직 투과광)
    const shellMat = createXrayShader(0x38bdf8, 3.4, 0.18, 0.02);

    mats.push(boneMat, spineMat, pelvisMat, shellMat);

    const joint = (name, parent, p) => {
      const g = new THREE.Group();
      g.position.set(p[0], p[1], p[2]);
      parent.add(g);
      J[name] = g;
      return g;
    };

    const hips = joint('hips', root, [0, .95, 0]);
    const spine1 = joint('spine1', hips, [0, .08, 0]);
    const spine2 = joint('spine2', spine1, [0, .12, 0]);
    const chest = joint('chest', spine2, [0, .13, 0]);
    const neck = joint('neck', chest, [0, .22, -.01]);
    const head = joint('head', neck, [0, .09, .01]);

    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      const sh = joint('sh' + s, chest, [.17 * k, .17, -.01]);
      joint('arm' + s, sh, [.03 * k, 0, 0]);
      joint('elbow' + s, J['arm' + s], [0, -.28, 0]);
      joint('hand' + s, J['elbow' + s], [0, -.26, 0]);
      const hip = joint('hip' + s, hips, [.09 * k, -.05, 0]);
      const knee = joint('knee' + s, hip, [0, -.42, 0]);
      joint('ankle' + s, knee, [0, -.42, 0]);
    });

    /* --- 연부조직 엑스레이 실루엣 (실제 엑스레이 필름의 인체 외곽선) --- */
    const shellAdd = (parent, geo, pos, scale) => {
      const m = new THREE.Mesh(geo, shellMat);
      if (pos) m.position.set(pos[0], pos[1], pos[2]);
      if (scale) m.scale.set(scale[0], scale[1], scale[2]);
      parent.add(m);
      return m;
    };
    shellAdd(hips, sph(.16, 18), [0, .01, 0], [1.08, .8, .8]);
    shellAdd(spine1, cyl(.135, .13, .14, 16), [0, .06, 0], [1, 1, .78]);
    shellAdd(spine2, cyl(.142, .13, .14, 16), [0, .05, 0], [1.02, 1, .8]);
    shellAdd(chest, cyl(.155, .14, .3, 18), [0, -.02, 0], [1.05, 1, .74]);
    shellAdd(neck, cyl(.045, .05, .12, 14), [0, .02, 0]);
    shellAdd(head, sph(.108, 18), [0, .07, .01], [.92, 1.1, .99]);
    ['L', 'R'].forEach(s => {
      shellAdd(J['arm' + s], cyl(.048, .042, .27, 12), [0, -.14, 0]);
      shellAdd(J['elbow' + s], cyl(.04, .033, .25, 12), [0, -.13, 0]);
      shellAdd(J['hip' + s], cyl(.078, .056, .4, 14), [0, -.21, 0]);
      shellAdd(J['knee' + s], cyl(.055, .038, .4, 14), [0, -.2, 0]);
    });

    /* --- 24개 척추뼈 정밀 구성 (경추 7, 흉추 12, 요추 5) --- */
    const spineParts = [];
    function vertebra(parent, y, z, r, tilt) {
      const g = new THREE.Group();
      g.position.set(0, y, z);
      if (tilt) g.rotation.x = tilt;
      parent.add(g);
      const body = new THREE.Mesh(cyl(r, r * 1.05, r * .82, 14), spineMat);
      g.add(body);
      const spinous = new THREE.Mesh(box(r * .48, r * .44, r * 1.8), spineMat);
      spinous.position.set(0, -r * .1, -r * 1.25);
      spinous.rotation.x = -.3;
      g.add(spinous);
      const trans = new THREE.Mesh(box(r * 3.0, r * .32, r * .5), spineMat);
      trans.position.set(0, r * .12, -r * .48);
      g.add(trans);
      spineParts.push(body, spinous, trans);
      return g;
    }
    // 요추 5개 (L1~L5)
    vertebra(spine1, .015, .012, .032, .03);
    vertebra(spine1, .062, .010, .033, .02);
    vertebra(spine2, .012, .006, .031, .01);
    vertebra(spine2, .058, .003, .030, 0);
    vertebra(spine2, .104, 0, .029, -.01);
    // 흉추 12개 (T1~T12)
    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      const y = -.04 + v * .26;
      const z = -Math.sin(v * Math.PI) * .024;
      vertebra(chest, y, z, .028 - v * .006, -.02 + v * .04);
    }
    // 경추 7개 (C1~C7)
    for (let i = 0; i < 7; i++) {
      const v = i / 6;
      vertebra(neck, -.04 + v * .14, Math.sin(v * Math.PI) * .012, .021 - v * .003, .03 - v * .04);
    }

    /* --- 골반 & 천골 --- */
    const pelvisParts = [];
    const sacrum = new THREE.Mesh(cyl(.042, .014, .13, 10), pelvisMat);
    sacrum.position.set(0, -.03, -.025);
    sacrum.rotation.x = .28;
    hips.add(sacrum);
    pelvisParts.push(sacrum);
    [-1, 1].forEach(k => {
      const ilium = new THREE.Mesh(new THREE.TorusGeometry(.095, .024, 8, 18, Math.PI * .88), pelvisMat);
      ilium.position.set(.062 * k, .01, -.01);
      ilium.rotation.set(-.2, k * .38, Math.PI * .52 + k * .3);
      hips.add(ilium);
      const pubic = new THREE.Mesh(cyl(.013, .013, .095, 8), pelvisMat);
      pubic.position.set(.038 * k, -.052, .042);
      pubic.rotation.set(.7, 0, -k * .55);
      hips.add(pubic);
      pelvisParts.push(ilium, pubic);
    });

    /* --- 12쌍 갈비뼈 & 흉골 --- */
    const sternum = new THREE.Mesh(box(.032, .17, .015), boneMat);
    sternum.position.set(0, .09, .135);
    chest.add(sternum);
    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      const y = .16 - v * .21;
      const rx = .115 + Math.sin(v * Math.PI) * .042;
      const rz = .105 + Math.sin(v * Math.PI) * .035;
      [-1, 1].forEach(k => {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(rx, .0072, 6, 20, Math.PI * .92), boneMat);
        rib.scale.set(1, .55, rz / rx);
        rib.position.set(.014 * k, y, 0);
        rib.rotation.set(.18 + v * .12, k * .1, Math.PI * .52 + (k > 0 ? 0 : Math.PI));
        chest.add(rib);
      });
    }

    /* --- 쇄골 & 견갑골 --- */
    [-1, 1].forEach(k => {
      const clav = new THREE.Mesh(cyl(.008, .007, .13, 8), boneMat);
      clav.position.set(.075 * k, .19, .07);
      clav.rotation.set(.12, k * .28, k * 1.48);
      chest.add(clav);
      const scap = new THREE.Mesh(box(.072, .105, .01), boneMat);
      scap.position.set(.085 * k, .11, -.105);
      scap.rotation.set(-.15, -k * .22, -k * .18);
      chest.add(scap);
    });

    /* --- 사지 골격 (상완, 전완, 대퇴골, 경골, 슬개골) --- */
    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      // 상완골
      J['arm' + s].add(longBone(boneMat, .26, .017, .014));
      // 요골·척골
      const radius = new THREE.Mesh(cyl(.011, .009, .23, 8), boneMat);
      radius.position.set(.012 * k, -.115, .004);
      J['elbow' + s].add(radius);
      const ulna = new THREE.Mesh(cyl(.012, .008, .235, 8), boneMat);
      ulna.position.set(-.008 * k, -.117, -.004);
      J['elbow' + s].add(ulna);
      // 손목 & 손
      const hand = new THREE.Mesh(box(.055, .075, .02), boneMat);
      hand.position.set(0, -.045, 0);
      J['hand' + s].add(hand);

      // 대퇴골
      J['hip' + s].add(longBone(boneMat, .39, .023, .019));
      // 경골 & 비골
      J['knee' + s].add(longBone(boneMat, .38, .018, .014));
      const fibula = new THREE.Mesh(cyl(.008, .007, .34, 8), boneMat);
      fibula.position.set(.022 * k, -.19, -.004);
      J['knee' + s].add(fibula);
      // 슬개골 (무릎뼈)
      const patella = new THREE.Mesh(sph(.02, 12), boneMat);
      patella.scale.set(1, 1.15, .55);
      patella.position.set(0, -.012, .036);
      J['knee' + s].add(patella);
      // 발
      const foot = new THREE.Mesh(box(.072, .032, .185), boneMat);
      foot.position.set(0, -.026, .045);
      J['ankle' + s].add(foot);
    });

    /* --- 두개골 & 하악골 --- */
    const skull = new THREE.Mesh(sph(.088, 18), boneMat);
    skull.scale.set(1, 1.12, 1.05);
    skull.position.set(0, .075, .008);
    head.add(skull);
    const mand = new THREE.Mesh(sph(.056, 16), boneMat);
    mand.scale.set(.94, .5, .95);
    mand.position.set(0, .028, .028);
    head.add(mand);
    [-1, 1].forEach(k => {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(.019, .006, 6, 16), boneMat);
      orbit.position.set(.032 * k, .085, .072);
      orbit.rotation.y = k * .18;
      head.add(orbit);
    });

    return {
      root, J, mats,
      spine: spineParts,
      pelvis: pelvisParts,
      boneMat, spineMat, pelvisMat, shellMat
    };
  }

  /* ---------------- 자세 보간 (Slouch ↔ Upright) ---------------- */
  const POSE_SLOUCH = {
    hips: [-.12, 0, 0], spine1: [.06, 0, 0], spine2: [.13, 0, 0], chest: [.23, 0, 0], neck: [.30, 0, 0], head: [.14, 0, 0],
    shL: [0, -.30, -.05], shR: [0, .30, .05], armL: [-.24, 0, .03], armR: [-.24, 0, -.03], elbowL: [-.26, 0, 0], elbowR: [-.26, 0, 0],
    hipL: [-.24, 0, .02], hipR: [-.24, 0, -.02], kneeL: [.44, 0, 0], kneeR: [.44, 0, 0], ankleL: [-.18, 0, 0], ankleR: [-.18, 0, 0]
  };
  const POSE_UPRIGHT = {
    hips: [.02, 0, 0], spine1: [-.03, 0, 0], spine2: [-.03, 0, 0], chest: [-.05, 0, 0], neck: [.02, 0, 0], head: [-.02, 0, 0],
    shL: [0, .04, 0], shR: [0, -.04, 0], armL: [0, 0, .10], armR: [0, 0, -.10], elbowL: [-.08, 0, 0], elbowR: [-.08, 0, 0],
    hipL: [0, 0, .02], hipR: [0, 0, -.02], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0]
  };

  function applyBlend(h, t) {
    for (const k in POSE_SLOUCH) {
      const a = POSE_SLOUCH[k], b = POSE_UPRIGHT[k], j = h.J[k];
      if (j) j.rotation.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
    }
    h.root.position.y = lerp(-.05, 0, t);
  }

  function setSkeletonOpacity(h, o) {
    h.mats.forEach(m => {
      if (m.uniforms && m.uniforms.opacity) {
        m.uniforms.opacity.value = o;
      }
    });
  }

  /* ---------------- 조깅 배경 3D 파티클 (흩날리는 꽃잎 & 맑은 물결 반짝임) ---------------- */
  function createNatureParticles() {
    const group = new THREE.Group();

    // 1) 벚꽃/봄꽃 흩날리는 꽃잎 (45개)
    const petals = [];
    const petalGeo = new THREE.PlaneGeometry(.04, .028);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xffb7c5,
      transparent: true,
      opacity: .82,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    for (let i = 0; i < 45; i++) {
      const p = new THREE.Mesh(petalGeo, petalMat.clone());
      p.userData = {
        x0: (Math.random() - .5) * 4.2,
        y0: Math.random() * 3.2 - .5,
        z0: Math.random() * 6 - 3,
        speedX: .35 + Math.random() * .4,
        speedY: -.2 - Math.random() * .3,
        rotSpeed: Math.random() * 2 + 1,
        phase: Math.random() * TAU
      };
      group.add(p);
      petals.push(p);
    }

    // 2) 청계천 물결 햇살 반짝임 파티클 (60개)
    const sparkles = [];
    const spkGeo = new THREE.PlaneGeometry(.022, .022);
    const spkMat = new THREE.MeshBasicMaterial({
      color: 0xc4fbff,
      transparent: true,
      opacity: .75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    for (let i = 0; i < 50; i++) {
      const s = new THREE.Mesh(spkGeo, spkMat.clone());
      s.userData = {
        x: (Math.random() - .5) * 3.6,
        y: -.25 - Math.random() * .55,
        z: Math.random() * 4 - 2,
        freq: 2.5 + Math.random() * 4,
        phase: Math.random() * TAU
      };
      s.position.set(s.userData.x, s.userData.y, s.userData.z);
      group.add(s);
      sparkles.push(s);
    }

    function update(time, vis) {
      if (vis <= .01) {
        group.visible = false;
        return;
      }
      group.visible = true;

      // 꽃잎 흔들림 및 카메라 방향 이동
      petals.forEach(p => {
        const u = p.userData;
        const localTime = time + u.phase;
        p.position.x = ((u.x0 + localTime * u.speedX) % 4.6) - 2.3;
        p.position.y = ((u.y0 + localTime * u.speedY) % 3.6) - .6;
        p.position.z = u.z0 + Math.sin(localTime * .8) * .4;
        p.rotation.set(
          Math.sin(localTime * u.rotSpeed) * 1.2,
          Math.cos(localTime * u.rotSpeed * .8) * 1.5,
          localTime * u.rotSpeed * .5
        );
        p.material.opacity = .82 * vis;
      });

      // 물결 반짝임
      sparkles.forEach(s => {
        const u = s.userData;
        const blink = Math.sin(time * u.freq + u.phase);
        s.material.opacity = Math.max(0, blink) * .85 * vis;
        s.scale.setScalar(clamp(blink * .8 + .4, .2, 1.3));
      });
    }

    return { group, update };
  }

  /* ---------------- 타이핑 텍스트 ---------------- */
  function typeInto(el, text) {
    if (!el) return;
    el.textContent = '';
    Array.from(text).forEach((ch, i) => {
      const sp = document.createElement('span');
      sp.className = 'ch';
      sp.textContent = ch === ' ' ? '\u00A0' : ch;
      sp.style.animationDelay = (i * .035).toFixed(3) + 's';
      el.appendChild(sp);
    });
  }

  function setRunCaption(el, main, sub, on) {
    if (!el) return;
    if (on) {
      if (el.dataset.ready !== '1') {
        el.dataset.ready = '1';
        typeInto(el.querySelector('.rc-main'), main);
        const sEl = el.querySelector('.rc-sub');
        if (sEl) {
          sEl.textContent = '';
          Array.from(sub).forEach((ch, i) => {
            const sp = document.createElement('span');
            sp.className = 'ch rc-sub-ch';
            sp.textContent = ch === ' ' ? '\u00A0' : ch;
            sp.style.animationDelay = (.45 + i * .022).toFixed(3) + 's';
            sEl.appendChild(sp);
          });
        }
      }
      el.classList.add('on');
    } else {
      el.classList.remove('on');
      el.dataset.ready = '';
      const m = el.querySelector('.rc-main'), s = el.querySelector('.rc-sub');
      if (m) m.textContent = '';
      if (s) s.textContent = '';
    }
  }

  /* ---------------- 메인 히어로 초기화 ---------------- */
  function initHero(opts) {
    const stage = opts.stage;
    const canvasWrap = opts.canvasWrap;
    const hud = opts.hud || {};
    const typeEl = opts.typeEl || null;
    const runCaption = opts.runCaption || null;
    const joggerEl = stage.querySelector('#heroJogger');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // 엑스레이 스캔 조명 (쿨 톤 중심)
    scene.add(new THREE.HemisphereLight(0xddf7ff, 0x073138, .85));
    const key = new THREE.DirectionalLight(0xbef6ff, .9);
    key.position.set(2.4, 4.2, 3.2);
    scene.add(key);

    /* 바닥 홀로그램 스캔 링 */
    const floor = new THREE.Group();
    scene.add(floor);
    const polar = new THREE.PolarGridHelper(1.15, 12, 5, 64, 0x2fd6a0, 0x2fd6a0);
    polar.material.transparent = true;
    polar.material.opacity = .32;
    polar.material.depthWrite = false;
    floor.add(polar);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(.98, 1.03, 72),
      new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: .55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    floor.add(ring);

    /* AI 수직 스캔 레이저 라인 */
    const scan = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, .014),
      new THREE.MeshBasicMaterial({ color: 0xbdfddf, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const scanGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, .24),
      new THREE.MeshBasicMaterial({ color: 0x2fd6a0, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(scan, scanGlow);

    /* 엑스레이 골격 */
    const sk = makeXraySkeleton();
    scene.add(sk.root);

    /* 3D 자연 파티클 (흩날리는 꽃잎 & 맑은 물결 반짝임) */
    const nature = createNatureParticles();
    scene.add(nature.group);

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

    let lastPhase = '';
    function setPhase(p, main, sub) {
      if (p === lastPhase) return;
      lastPhase = p;
      stage.dataset.phase = p;
      typeInto(typeEl ? typeEl.querySelector('.st-main') : null, main);
      typeInto(typeEl ? typeEl.querySelector('.st-sub') : null, sub || '');
      if (hud.caption) {
        hud.caption.classList.remove('show');
        void hud.caption.offsetWidth;
        hud.caption.textContent = main;
        hud.caption.classList.add('show');
      }
    }

    /* 21초 전체 루프: 정밀 스캔 → 바른자세 교정 → 자세 98점 → 40대 실사 조깅 */
    const LOOP = 21;
    let running = true, t0 = performance.now(), pausedAt = 0, cycleStart = 0;

    function frame(nowMs) {
      if (!running) return;
      requestAnimationFrame(frame);
      const el = (nowMs - t0) / 1000;
      if (el - cycleStart >= LOOP) cycleStart = el;
      const t = reduce ? 8 : el - cycleStart;

      const fadeIn = seg(t, 0, 1.0);
      const straighten = ease(seg(t, 3.4, 7.2));
      const xrOut = seg(t, 9.2, 10.2);
      const runIn = seg(t, 9.4, 10.6);
      const runOut = seg(t, 20.1, 21.0);

      const xrVis = fadeIn * (1 - xrOut);
      const runVis = runIn * (1 - runOut * .9);

      // 단계별 순백색 타이핑 문구
      if (t < 3.4) {
        setPhase('scan', 'AI 해부학 정밀 골격 분석', '경추 24° · 흉추 만곡 · 골반 비대칭 감지');
      } else if (t < 7.2) {
        setPhase('fix', '입는 바른자세 · 실시간 정렬 교정', '머리를 들고 · 어깨를 펴고 · 골반의 중심을 세웁니다');
      } else if (t < 9.4) {
        setPhase('done', '자세점수 98점 · 이상적인 밸런스 회복', '척추 24마디 완벽 정렬 · 바른 자세 완성');
      } else {
        setPhase('run', '바른 자세로, 함께 달리다', '맑은 물길과 푸른 자연 사이로 · 40대의 활력과 미소');
      }

      /* 엑스레이 골격 업데이트 */
      applyBlend(sk, straighten);
      sk.root.rotation.y = reduce ? .55 : el * .48;
      sk.root.visible = xrVis > .01;
      setSkeletonOpacity(sk, xrVis);

      // 척추 & 골반 문제 부위 색상 변환 (경고 주황 → 치유의 에메랄드 바이오 그린)
      const warnColor = new THREE.Color(0xff8a4c);
      const goodColor = new THREE.Color(0x60ffc0);
      const activeColor = warnColor.clone().lerp(goodColor, straighten);

      sk.spineMat.uniforms.color.value.copy(activeColor);
      sk.pelvisMat.uniforms.color.value.copy(activeColor);

      /* 레이저 스캔 바 */
      const sy = .1 + (Math.sin(el * 1.5) * .5 + .5) * 1.72;
      scan.position.set(0, sy, .26);
      scanGlow.position.set(0, sy, .25);
      scan.material.opacity = .95 * xrVis * (1 - straighten * .45);
      scanGlow.material.opacity = .16 * xrVis;

      floor.visible = xrVis > .01;
      ring.material.opacity = .55 * xrVis;
      polar.material.opacity = .3 * xrVis;
      ring.scale.setScalar(1 + Math.sin(el * 3) * .03);

      /* HUD 수치 업데이트 */
      const score = Math.round(lerp(52, 98, straighten));
      if (hud.score) hud.score.textContent = score;
      if (hud.bar) hud.bar.style.transform = 'scaleX(' + (score / 100) + ')';
      ISSUES.forEach(i => {
        if (!i.el) return;
        i.el.textContent = Math.round(lerp(i.a, i.b, straighten)) + i.unit;
        i.el.parentElement.classList.toggle('ok', straighten > .85);
      });

      /* 40대 동양인 남녀 실사 조깅 & 3D 자연 파티클 */
      nature.update(el, runVis);

      /* 조깅 하단 순백색 캡션 */
      setRunCaption(
        runCaption,
        '바른 자세로, 함께 달리다',
        '청계천 맑은 물길을 따라 활기차게 · 40대의 가장 밝고 건강한 하루',
        t >= 9.8 && t < 20.4
      );

      // 카메라 숨쉬기 움직임
      camera.position.x = Math.sin(el * .28) * .08;
      camera.lookAt(0, .95, 0);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(frame);

    return {
      pause() {
        if (!running) return;
        running = false;
        pausedAt = performance.now();
      },
      resume() {
        if (running) return;
        t0 += performance.now() - pausedAt;
        running = true;
        requestAnimationFrame(frame);
        resize();
      },
      resize
    };
  }

  window.initHero = initHero;
})();
