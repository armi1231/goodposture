/* =========================================================
   메인 3D 체형 측정 및 실사 조깅 연출
   ---------------------------------------------------------
   1) 사람의 외형이 사실적으로 나타나는 해부학적 인체 모델링
      - 눈, 코, 입, 턱선, 목, 가슴, 둔부, 허벅지, 종아리의 자연스러운 인체 곡선
      - 첨부된 해부학 일러스트 기반의 반투명 인체 실루엣 (연부조직)
      - 실제 골반(장골익·천골) 및 24개 척추 + 척추 디스크(청록색 추간판) 정밀 구성
   2) 거북목·굽은등·골반 비대칭 → 이상적인 척추 S-curve 실시간 교정 (52점 → 98점)
      - 문제 디스크/척추 경고 주황색 → 교정 완료 시 바이오 에메랄드/청록색 발광
   3) 40대 남녀 실사 조깅 영상 (joggers.mp4) 재생
      - 영상 위에 오직 단 하나의 핵심 슬로건만 입체적으로 표시:
        '바른자세가 아름답고 건강한 몸이다'
   ========================================================= */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- 인체 피부 실루엣 셰이더 (사람 형태 투광) ---------------- */
  function createHumanSkinShader() {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x60c8e8) },
        opacity: { value: 0.28 },
        rimPower: { value: 2.2 },
        rimGlow: { value: 0.75 }
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
        uniform float rimPower;
        uniform float rimGlow;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float d = abs(dot(normalize(vNormal), normalize(vView)));
          float rim = pow(1.0 - d, rimPower);
          float core = pow(d, 2.0) * 0.15;
          float alpha = clamp(rim * rimGlow + core + 0.08, 0.0, 1.0) * opacity;
          vec3 c = mix(color, vec3(0.9, 0.98, 1.0), rim * 0.6);
          gl_FragColor = vec4(c, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
  }

  /* ---------------- 실제 골격 재질 (자연스러운 뼈 색상) ---------------- */
  function createBoneMaterial(colorHex, opacity = 0.96) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex || 0xf2ece1),
      emissive: new THREE.Color(0x28241e),
      roughness: 0.42,
      metalness: 0.04,
      transparent: true,
      opacity: opacity
    });
  }

  /* ---------------- 척추 추간판(디스크) 발광 재질 ---------------- */
  function createDiscMaterial(colorHex) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex || 0x22d3ee),
      emissive: new THREE.Color(colorHex || 0x0ea5e9),
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    });
  }

  /* ---------------- 지오메트리 헬퍼 ---------------- */
  const cyl = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 16);
  const sph = (r, s) => new THREE.SphereGeometry(r, s || 18, Math.round((s || 18) * .72));
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  /* 관절두가 있는 긴 뼈 */
  function longBone(mat, len, r1, r2) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(cyl(r1, r2, len, 12), mat);
    shaft.position.y = -len / 2;
    g.add(shaft);
    const head = new THREE.Mesh(sph(r1 * 1.1, 14), mat);
    g.add(head);
    const foot = new THREE.Mesh(sph(r2 * 1.1, 14), mat);
    foot.position.y = -len;
    g.add(foot);
    return g;
  }

  /* ---------------- 사실적 인체 형태 & 내부 골격 생성 ---------------- */
  function makeRealisticHumanModel() {
    const root = new THREE.Group();
    const J = {}, mats = [];

    // 1) 사실적 재질
    const boneMat = createBoneMaterial(0xf1eae0, 0.96);
    const spineBoneMat = createBoneMaterial(0xf6f0e6, 0.96);
    const discMat = createDiscMaterial(0x22d3ee); // 푸른색 디스크
    const skinMat = createHumanSkinShader();       // 반투명 인체 실루엣

    mats.push(boneMat, spineBoneMat, discMat, skinMat);

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
    const head = joint('head', neck, [0, .095, .01]);

    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      const sh = joint('sh' + s, chest, [.175 * k, .17, -.01]);
      joint('arm' + s, sh, [.03 * k, 0, 0]);
      joint('elbow' + s, J['arm' + s], [0, -.28, 0]);
      joint('hand' + s, J['elbow' + s], [0, -.26, 0]);
      const hip = joint('hip' + s, hips, [.095 * k, -.05, 0]);
      const knee = joint('knee' + s, hip, [0, -.42, 0]);
      joint('ankle' + s, knee, [0, -.42, 0]);
    });

    /* =========================================================
       A. 사람의 형태가 사실적이게 나타나는 인체 외형 (피부·근육 윤곽)
       눈, 코, 입, 턱선, 둔부, 가슴, 종아리 굴곡
       ========================================================= */
    const skinAdd = (parent, geo, pos, scale, rot) => {
      const m = new THREE.Mesh(geo, skinMat);
      if (pos) m.position.set(pos[0], pos[1], pos[2]);
      if (scale) m.scale.set(scale[0], scale[1], scale[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      parent.add(m);
      return m;
    };

    // 1) 머리 및 눈·코·입 얼굴 프로필 굴곡 (측면/반측면에서 뚜렷한 사람 형태)
    // 두개골 구체
    skinAdd(head, sph(.106, 22), [0, .07, .005], [.94, 1.12, 1.02]);
    // 이마 ~ 콧대 굴곡
    skinAdd(head, box(.028, .045, .026), [0, .085, .098], [1, 1, 1], [.22, 0, 0]);
    // 콧날 및 코끝 돌출 (Nose profile)
    const nose = skinAdd(head, cyl(.007, .013, .036, 10), [0, .056, .115]);
    nose.rotation.x = 1.05;
    // 인중 및 입술 굴곡 (Upper & Lower Lips)
    skinAdd(head, box(.036, .012, .018), [0, .032, .104], [1, 1, 1]); // 윗입술
    skinAdd(head, box(.034, .011, .017), [0, .019, .101], [1, 1, 1]); // 아랫입술
    // 턱끝 돌출 (Chin curve)
    skinAdd(head, sph(.024, 14), [0, .001, .095], [1.1, .9, 1.1]);
    // 턱선 (Jawline)
    [-1, 1].forEach(k => {
      const jaw = skinAdd(head, cyl(.012, .018, .07, 10), [.042 * k, .028, .042]);
      jaw.rotation.set(.75, 0, -k * .35);
    });

    // 2) 목과 승모근 굴곡
    skinAdd(neck, cyl(.044, .055, .13, 16), [0, .02, 0]);
    [-1, 1].forEach(k => {
      skinAdd(neck, cyl(.024, .042, .11, 10), [.045 * k, -.01, -.02], [1, 1, .8], [0, 0, -k * .5]);
    });

    // 3) 가슴, 흉부, 복부 및 허리 굴곡
    // 흉곽 상체
    skinAdd(chest, cyl(.16, .145, .32, 22), [0, -.01, 0], [1.06, 1, .78]);
    // 대흉근 (가슴 굴곡)
    [-1, 1].forEach(k => {
      skinAdd(chest, sph(.065, 14), [.068 * k, .07, .09], [1.1, .9, .6]);
    });
    // 허리 및 복부 (자연스러운 얇아지는 허리 라인)
    skinAdd(spine2, cyl(.142, .134, .14, 18), [0, .05, 0], [1.02, 1, .79]);
    skinAdd(spine1, cyl(.136, .142, .14, 18), [0, .06, 0], [1.01, 1, .81]);

    // 4) 둔부 (엉덩이 굴곡 - 사람다운 자연스러운 볼륨)
    skinAdd(hips, sph(.165, 20), [0, .01, -.015], [1.12, .88, .86]);
    [-1, 1].forEach(k => {
      skinAdd(hips, sph(.095, 16), [.068 * k, -.01, -.065], [1, 1.1, 1]);
    });

    // 5) 사지 (어깨 삼각근, 팔, 대퇴부 허벅지, 종아리 근육 알 굴곡)
    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      // 어깨 삼각근
      skinAdd(chest, sph(.065, 14), [.175 * k, .16, -.01], [1.1, 1.2, 1]);
      // 상완 (이두·삼두)
      skinAdd(J['arm' + s], cyl(.05, .043, .27, 14), [0, -.14, 0], [1, 1, .9]);
      // 전완 (팔뚝)
      skinAdd(J['elbow' + s], cyl(.042, .033, .25, 14), [0, -.13, 0], [1.05, 1, .9]);
      // 손
      skinAdd(J['hand' + s], box(.06, .08, .022), [0, -.042, 0]);

      // 대퇴부 (허벅지 앞/뒤 자연스러운 근육 굴곡)
      skinAdd(J['hip' + s], cyl(.084, .06, .41, 18), [0, -.21, .01], [1.05, 1, 1.1]);
      // 무릎 관절
      skinAdd(J['knee' + s], sph(.052, 14), [0, 0, .02], [1, 1.1, 1]);
      // 하퇴부 (종아리 비복근 굴곡 - 뒤쪽이 볼록한 실제 사람 다리 형태)
      skinAdd(J['knee' + s], cyl(.062, .038, .41, 18), [0, -.2, -.01], [1, 1, 1.15]);
      skinAdd(J['knee' + s], sph(.048, 14), [0, -.13, -.04], [.9, 1.3, .8]); // 종아리 알
      // 발목 & 발 (뒤꿈치와 발등 아치)
      skinAdd(J['ankle' + s], box(.076, .042, .195), [0, -.028, .045]);
      skinAdd(J['ankle' + s], sph(.032, 12), [0, -.025, -.038]); // 뒤꿈치
    });

    /* =========================================================
       B. 실제 골격 및 골반과 척추 디스크 정밀 구성
       ========================================================= */
    const spineDiscs = [];
    const spineBones = [];

    // 척추 마디 하나 (뼈 + 푸른색 디스크)
    function vertebraWithDisc(parent, y, z, r, tilt, isProblem) {
      const g = new THREE.Group();
      g.position.set(0, y, z);
      if (tilt) g.rotation.x = tilt;
      parent.add(g);

      // 1) 척추체 (Vertebral body)
      const body = new THREE.Mesh(cyl(r, r * 1.04, r * .78, 14), spineBoneMat);
      g.add(body);
      // 극돌기 (Spinous process)
      const spinous = new THREE.Mesh(box(r * .46, r * .42, r * 1.7), spineBoneMat);
      spinous.position.set(0, -r * .1, -r * 1.2);
      spinous.rotation.x = -.28;
      g.add(spinous);
      // 횡돌기 (Transverse process)
      const trans = new THREE.Mesh(box(r * 2.9, r * .3, r * .48), spineBoneMat);
      trans.position.set(0, r * .1, -r * .45);
      g.add(trans);

      // 2) 척추 추간판 디스크 (Intervertebral Disc - 첨부 이미지의 푸른빛 디스크!)
      const disc = new THREE.Mesh(cyl(r * 1.02, r * 1.02, r * .32, 14), discMat.clone());
      disc.position.set(0, -r * .48, 0);
      g.add(disc);

      disc.userData.isProblem = isProblem;
      spineDiscs.push(disc);
      spineBones.push(body, spinous, trans);
      return g;
    }

    // 요추 5개 (L1 ~ L5) - 앞쪽으로 자연스럽게 휘는 전만곡
    vertebraWithDisc(spine1, .015, .012, .033, .03, true);
    vertebraWithDisc(spine1, .062, .010, .034, .02, true);
    vertebraWithDisc(spine2, .012, .006, .032, .01, true);
    vertebraWithDisc(spine2, .058, .003, .031, 0, false);
    vertebraWithDisc(spine2, .104, 0, .030, -.01, false);

    // 흉추 12개 (T1 ~ T12) - 뒤쪽으로 휘는 후만곡
    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      const y = -.04 + v * .26;
      const z = -Math.sin(v * Math.PI) * .024;
      vertebraWithDisc(chest, y, z, .029 - v * .006, -.02 + v * .04, i >= 7);
    }

    // 경추 7개 (C1 ~ C7) - 앞쪽으로 휘는 전만곡
    for (let i = 0; i < 7; i++) {
      const v = i / 6;
      vertebraWithDisc(neck, -.04 + v * .14, Math.sin(v * Math.PI) * .012, .022 - v * .003, .03 - v * .04, i <= 3);
    }

    /* --- 실제 골반 (장골익 Flared Iliac Wings & 천골 Sacrum) --- */
    const sacrum = new THREE.Mesh(cyl(.044, .016, .14, 12), boneMat);
    sacrum.position.set(0, -.032, -.028);
    sacrum.rotation.x = .32;
    hips.add(sacrum);

    // 골반 날개 (실제 인체 골반처럼 넓고 우아하게 펼쳐진 장골 날개)
    [-1, 1].forEach(k => {
      const ilium = new THREE.Mesh(new THREE.TorusGeometry(.098, .026, 8, 20, Math.PI * .88), boneMat);
      ilium.position.set(.065 * k, .012, -.01);
      ilium.rotation.set(-.22, k * .38, Math.PI * .52 + k * .32);
      hips.add(ilium);

      const pubic = new THREE.Mesh(cyl(.014, .014, .098, 8), boneMat);
      pubic.position.set(.04 * k, -.054, .044);
      pubic.rotation.set(.7, 0, -k * .55);
      hips.add(pubic);
    });

    /* --- 12쌍 갈비뼈 & 흉골 --- */
    const sternum = new THREE.Mesh(box(.034, .175, .016), boneMat);
    sternum.position.set(0, .09, .138);
    chest.add(sternum);

    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      const y = .16 - v * .21;
      const rx = .118 + Math.sin(v * Math.PI) * .044;
      const rz = .108 + Math.sin(v * Math.PI) * .036;
      [-1, 1].forEach(k => {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(rx, .0075, 6, 22, Math.PI * .92), boneMat);
        rib.scale.set(1, .55, rz / rx);
        rib.position.set(.015 * k, y, 0);
        rib.rotation.set(.18 + v * .12, k * .1, Math.PI * .52 + (k > 0 ? 0 : Math.PI));
        chest.add(rib);
      });
    }

    /* --- 쇄골 & 견갑골 --- */
    [-1, 1].forEach(k => {
      const clav = new THREE.Mesh(cyl(.008, .007, .135, 8), boneMat);
      clav.position.set(.078 * k, .19, .072);
      clav.rotation.set(.12, k * .28, k * 1.48);
      chest.add(clav);

      const scap = new THREE.Mesh(box(.074, .108, .01), boneMat);
      scap.position.set(.088 * k, .11, -.108);
      scap.rotation.set(-.15, -k * .22, -k * .18);
      chest.add(scap);
    });

    /* --- 사지 골격 (대퇴골, 경골, 비골, 슬개골, 상완골 등) --- */
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
      // 손
      const hand = new THREE.Mesh(box(.052, .074, .02), boneMat);
      hand.position.set(0, -.045, 0);
      J['hand' + s].add(hand);

      // 대퇴골
      J['hip' + s].add(longBone(boneMat, .395, .024, .019));
      // 경골 & 비골
      J['knee' + s].add(longBone(boneMat, .385, .018, .014));
      const fibula = new THREE.Mesh(cyl(.008, .007, .34, 8), boneMat);
      fibula.position.set(.022 * k, -.19, -.004);
      J['knee' + s].add(fibula);
      // 슬개골
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
      spineDiscs, spineBones,
      boneMat, discMat, skinMat
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

  function setModelOpacity(h, o) {
    h.mats.forEach(m => {
      if (m.uniforms && m.uniforms.opacity) {
        m.uniforms.opacity.value = o * 0.28;
      } else {
        m.opacity = o * 0.96;
      }
    });
    h.spineDiscs.forEach(d => {
      d.material.opacity = o * 0.95;
    });
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

  /* ---------------- 메인 히어로 초기화 ---------------- */
  function initHero(opts) {
    const stage = opts.stage;
    const canvasWrap = opts.canvasWrap;
    const hud = opts.hud || {};
    const typeEl = opts.typeEl || null;
    const runCaption = opts.runCaption || null;
    const video = opts.videoEl || stage.querySelector('#heroVideo');
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

    // 자연스러운 인체 해부학 조명
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a3b44, 0.95));
    const key = new THREE.DirectionalLight(0xfff7ea, 1.15);
    key.position.set(2.4, 4.2, 3.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.85);
    rim.position.set(-2.8, 2.5, -3.5);
    scene.add(rim);

    /* 바닥 홀로그램 스캔 그리드 & 링 */
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

    /* 사실적 인체 & 내부 골격 모델 */
    const model = makeRealisticHumanModel();
    scene.add(model.root);

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

    // 비디오 재생 준비
    let videoPlaying = false;
    if (video) {
      video.muted = true;
      video.loop = true;
    }

    /* 21초 전체 루프: 인체 체형 측정 → 바른자세 교정 → 자세 98점 → 40대 남녀 실사 조깅 영상 */
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
      const runIn = seg(t, 9.4, 10.5);
      const runOut = seg(t, 20.0, 21.0);

      const xrVis = fadeIn * (1 - xrOut);
      const runVis = runIn * (1 - runOut);

      // 단계별 순백색 타이핑 문구
      if (t < 3.4) {
        setPhase('scan', 'AI 해부학 정밀 체형 측정', '경추 24° · 굽은등 · 골반 비대칭 분석');
      } else if (t < 7.2) {
        setPhase('fix', '입는 바른자세 · 실시간 정렬 교정', '머리를 들고 · 어깨를 펴고 · 골반의 중심을 세웁니다');
      } else if (t < 9.2) {
        setPhase('done', '자세점수 98점 · 이상적인 밸런스 회복', '척추 24마디 완벽 정렬 · 바른 자세 완성');
      } else {
        setPhase('run', '', '');
      }

      /* 3D 인체 및 골격 자세/회전 업데이트 */
      applyBlend(model, straighten);
      model.root.rotation.y = reduce ? .55 : el * .48;
      model.root.visible = xrVis > .01;
      setModelOpacity(model, xrVis);

      // 문제 디스크 발광 색상 변화 (경고 주황색 → 건강한 에메랄드/청록색)
      const warnDisc = new THREE.Color(0xf97316);
      const goodDisc = new THREE.Color(0x22d3ee);
      const activeDiscColor = warnDisc.clone().lerp(goodDisc, straighten);

      model.spineDiscs.forEach(d => {
        if (d.userData.isProblem) {
          d.material.color.copy(activeDiscColor);
          d.material.emissive.copy(activeDiscColor);
        }
      });

      /* 수직 스캔 라인 */
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

      /* 40대 남녀 실사 조깅 영상 재생 제어 */
      if (video) {
        if (t >= 9.2 && t < 20.2) {
          if (!videoPlaying) {
            videoPlaying = true;
            try {
              video.currentTime = 0;
            } catch (e) {}
            video.play().catch(() => {});
          }
        } else {
          if (videoPlaying) {
            videoPlaying = false;
            try {
              video.pause();
            } catch (e) {}
          }
        }
      }

      /* 조깅 영상 위 입체적 단일 슬로건 */
      if (runCaption) {
        if (t >= 9.6 && t < 20.2) {
          runCaption.classList.add('on');
        } else {
          runCaption.classList.remove('on');
        }
      }

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
        if (video) video.pause();
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
