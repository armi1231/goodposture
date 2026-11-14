/* =========================================================
   메인 3D 연출 (v2 · 해부학 골격 + 정면 조깅)
   ---------------------------------------------------------
   1) X-ray 골격: 24개 척추뼈(경추7·흉추12·요추5) + 천골/골반
      12쌍 갈비뼈 + 흉골 + 쇄골 + 견갑골 + 두개골/하악골
      상완·전완·대퇴·경골 등 실제 뼈 형태로 회전하며 AI 스캔
   2) 구부정한 자세 → 바른 자세 교정 (자세점수 52 → 98)
   3) 40대 동양인 남녀가 '정면'을 향해 달려오는 조깅
      (긴 트레이닝복 · 밝은 표정 · 서로 마주보며 달리기)
   4) 스캔 단계마다 글자가 한 글자씩 나타나는 타이핑 연출
   ========================================================= */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- 재질 ---------------- */
  function boneMaterial(color, opacity) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: .38,
      roughness: .38, metalness: .05,
      transparent: true, opacity: opacity == null ? .95 : opacity
    });
  }
  function bodyShellMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x6fdcff, emissive: 0x1d7f9e, emissiveIntensity: .55,
      roughness: .85, metalness: 0, transparent: true, opacity: .075,
      depthWrite: false, side: THREE.DoubleSide
    });
  }

  /* ---------------- 지오메트리 헬퍼 ---------------- */
  const cyl = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 14);
  const sph = (r, s) => new THREE.SphereGeometry(r, s || 18, Math.round((s || 18) * .72));
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  /* 뼈 하나(몸통 + 양끝 관절두) */
  function longBone(mat, len, r1, r2) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(cyl(r1, r2, len, 14), mat);
    shaft.position.y = -len / 2; g.add(shaft);
    const head = new THREE.Mesh(sph(r1, 16), mat); head.scale.set(1, .92, 1); g.add(head);
    const foot = new THREE.Mesh(sph(r2, 16), mat); foot.scale.set(1.03, .9, 1.03); foot.position.y = -len; g.add(foot);
    return g;
  }

  /* ---------------- 골격 인체 ---------------- */
  function makeSkeleton() {
    const root = new THREE.Group();
    const J = {}, mats = [];
    const bone = boneMaterial(0xe9f7ff, .95);       // 일반 뼈
    const spineBone = boneMaterial(0xa8ffcc, .96);  // 척추(문제 부위)
    const pelvisBone = boneMaterial(0xa8ffcc, .96);
    const shell = bodyShellMaterial();
    mats.push(bone, spineBone, pelvisBone, shell);

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
      joint('arm' + s, sh, [.03 * k, 0, 0]);
      joint('elbow' + s, J['arm' + s], [0, -.28, 0]);
      joint('hand' + s, J['elbow' + s], [0, -.26, 0]);
      const hip = joint('hip' + s, hips, [.09 * k, -.05, 0]);
      const knee = joint('knee' + s, hip, [0, -.42, 0]);
      joint('ankle' + s, knee, [0, -.42, 0]);
    });

    /* --- 몸 실루엣(사람 형태를 읽게 해 주는 반투명 외피) --- */
    const shellAdd = (parent, geo, pos, scale) => {
      const m = new THREE.Mesh(geo, shell);
      if (pos) m.position.set(pos[0], pos[1], pos[2]);
      if (scale) m.scale.set(scale[0], scale[1], scale[2]);
      parent.add(m); return m;
    };
    shellAdd(hips, sph(.16, 20), [0, .01, 0], [1.08, .8, .8]);
    shellAdd(spine1, cyl(.135, .13, .14, 18), [0, .06, 0], [1, 1, .78]);
    shellAdd(spine2, cyl(.142, .13, .14, 18), [0, .05, 0], [1.02, 1, .8]);
    shellAdd(chest, cyl(.155, .14, .3, 20), [0, -.02, 0], [1.05, 1, .74]);
    shellAdd(neck, cyl(.045, .05, .12, 14), [0, .02, 0]);
    shellAdd(head, sph(.108, 20), [0, .07, .01], [.92, 1.1, .99]);
    ['L', 'R'].forEach(s => {
      shellAdd(J['arm' + s], cyl(.048, .042, .27, 14), [0, -.14, 0]);
      shellAdd(J['elbow' + s], cyl(.04, .033, .25, 14), [0, -.13, 0]);
      shellAdd(J['hip' + s], cyl(.078, .056, .4, 16), [0, -.21, 0]);
      shellAdd(J['knee' + s], cyl(.055, .038, .4, 16), [0, -.2, 0]);
    });

    /* --- 척추뼈 --- */
    const spineParts = [];
    function vertebra(parent, y, z, r, tilt) {
      const g = new THREE.Group();
      g.position.set(0, y, z);
      if (tilt) g.rotation.x = tilt;
      parent.add(g);
      const body = new THREE.Mesh(cyl(r, r * 1.06, r * .82, 14), spineBone);
      g.add(body);
      const spinous = new THREE.Mesh(box(r * .5, r * .46, r * 1.9), spineBone);
      spinous.position.set(0, -r * .1, -r * 1.3); spinous.rotation.x = -.3; g.add(spinous);
      const trans = new THREE.Mesh(box(r * 3.1, r * .34, r * .55), spineBone);
      trans.position.set(0, r * .12, -r * .5); g.add(trans);
      spineParts.push(body, spinous, trans);
      return g;
    }
    // 요추 5 (앞쪽으로 볼록한 전만곡)
    vertebra(spine1, .015, .012, .032, .03);
    vertebra(spine1, .062, .010, .033, .02);
    vertebra(spine2, .012, .006, .031, .01);
    vertebra(spine2, .055, .002, .029, 0);
    vertebra(spine2, .098, -.004, .027, -.01);
    // 흉추 12 (뒤쪽으로 볼록한 후만곡) + 갈비뼈
    const ribMat = boneMaterial(0xe9f7ff, .95); mats.push(ribMat);
    for (let i = 0; i < 12; i++) {
      const fy = .004 + i * .0162;
      const fz = -.010 - Math.sin((i / 11) * Math.PI) * .022;
      const r = .026 - i * .00075;
      vertebra(chest, fy, fz, r, -.02);
      // 갈비뼈 한 쌍
      [-1, 1].forEach(k => {
        const wide = .085 + Math.sin((i / 11) * Math.PI) * .028;
        const deep = .052 + Math.sin((i / 11) * Math.PI) * .014;
        const frontZ = i < 7 ? .078 - i * .002 : .048 - (i - 7) * .004;
        const frontX = i < 7 ? .028 : .052;
        const pts = [
          new THREE.Vector3(k * .018, fy, fz - .012),
          new THREE.Vector3(k * (wide * .62), fy + .012, fz - .022),
          new THREE.Vector3(k * wide, fy + .002, fz + deep * .35),
          new THREE.Vector3(k * (wide * .78), fy - .016, frontZ - .012),
          new THREE.Vector3(k * frontX, fy - .026, frontZ)
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .0052, 6, false), ribMat);
        chest.add(tube); spineParts.push(tube);
      });
    }
    // 경추 7
    for (let i = 0; i < 7; i++) vertebra(neck, .006 + i * .0145, -.004 - i * .0012, .0135 - i * .0004, -.015);

    /* --- 흉골 · 쇄골 · 견갑골 --- */
    const sternum = new THREE.Mesh(box(.032, .13, .014), bone);
    sternum.position.set(0, .10, .076); chest.add(sternum);
    [-1, 1].forEach(k => {
      const clav = new THREE.Mesh(cyl(.0075, .0075, .17, 10), bone);
      clav.rotation.z = Math.PI / 2; clav.rotation.y = k * .28;
      clav.position.set(.085 * k, .178, .045); chest.add(clav);
      const scap = new THREE.Mesh(box(.075, .1, .012), bone);
      scap.position.set(.085 * k, .105, -.062); scap.rotation.set(.1, k * .22, k * .16); chest.add(scap);
    });

    /* --- 골반 (장골 · 천골 · 치골 · 좌골) --- */
    const pelvisParts = [];
    [-1, 1].forEach(k => {
      const wing = new THREE.Mesh(sph(.075, 20), pelvisBone);
      wing.scale.set(.72, 1.05, .48);
      wing.position.set(.062 * k, .022, -.012);
      wing.rotation.set(.12, k * .18, k * -.34);
      hips.add(wing); pelvisParts.push(wing);
      const isch = new THREE.Mesh(sph(.032, 14), pelvisBone);
      isch.scale.set(.9, .9, .85); isch.position.set(.052 * k, -.055, .006);
      hips.add(isch); pelvisParts.push(isch);
      // 대퇴골두를 감싸는 비구
      const acet = new THREE.Mesh(new THREE.TorusGeometry(.028, .009, 8, 20), pelvisBone);
      acet.position.set(.072 * k, -.038, .004); acet.rotation.y = Math.PI / 2;
      hips.add(acet); pelvisParts.push(acet);
    });
    const sacrum = new THREE.Mesh(cyl(.03, .012, .11, 4), pelvisBone);
    sacrum.position.set(0, .012, -.048); sacrum.rotation.x = .34; sacrum.rotation.y = Math.PI / 4;
    hips.add(sacrum); pelvisParts.push(sacrum);
    const pubis = new THREE.Mesh(new THREE.TorusGeometry(.042, .0085, 8, 22, Math.PI), pelvisBone);
    pubis.rotation.set(Math.PI / 2, 0, Math.PI); pubis.position.set(0, -.052, .022);
    hips.add(pubis); pelvisParts.push(pubis);

    /* --- 사지 뼈 --- */
    ['L', 'R'].forEach(s => {
      const k = s === 'L' ? 1 : -1;
      // 상완
      J['arm' + s].add(longBone(bone, .25, .016, .013));
      // 요골 · 척골
      J['elbow' + s].add(longBone(bone, .23, .0115, .009));
      const ulna = new THREE.Mesh(cyl(.0085, .007, .22, 10), bone);
      ulna.position.set(.012 * k, -.12, -.006); J['elbow' + s].add(ulna);
      // 손
      const hand = new THREE.Mesh(box(.042, .075, .02), bone);
      hand.position.set(0, -.03, .004); J['hand' + s].add(hand);
      // 대퇴
      const femur = longBone(bone, .40, .019, .016);
      femur.rotation.z = -.05 * k; J['hip' + s].add(femur);
      const troch = new THREE.Mesh(sph(.02, 12), bone);
      troch.position.set(.026 * k, -.012, -.004); J['hip' + s].add(troch);
      // 경골 · 비골 · 슬개골
      J['knee' + s].add(longBone(bone, .382, .017, .014));
      const fibula = new THREE.Mesh(cyl(.008, .007, .34, 10), bone);
      fibula.position.set(.021 * k, -.19, -.004); J['knee' + s].add(fibula);
      const patella = new THREE.Mesh(sph(.019, 12), bone);
      patella.scale.set(1, 1.15, .55); patella.position.set(0, -.012, .036);
      J['knee' + s].add(patella);
      // 발
      const talus = new THREE.Mesh(sph(.022, 12), bone); J['ankle' + s].add(talus);
      const foot = new THREE.Mesh(box(.075, .032, .19), bone);
      foot.position.set(0, -.026, .045); J['ankle' + s].add(foot);
    });

    /* --- 두개골 · 하악골 --- */
    const skull = new THREE.Mesh(sph(.088, 22), bone);
    skull.scale.set(1, 1.12, 1.05); skull.position.set(0, .075, .008); head.add(skull);
    const mand = new THREE.Mesh(sph(.058, 18), bone);
    mand.scale.set(.94, .5, .95); mand.position.set(0, .028, .028); head.add(mand);
    const nasal = new THREE.Mesh(cyl(.012, .006, .03, 8), bone);
    nasal.position.set(0, .068, .086); nasal.rotation.x = 1.1; head.add(nasal);
    [-1, 1].forEach(k => {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(.019, .006, 8, 18), bone);
      orbit.position.set(.032 * k, .085, .072); orbit.rotation.y = k * .18; head.add(orbit);
      const zyg = new THREE.Mesh(cyl(.007, .005, .045, 8), bone);
      zyg.position.set(.05 * k, .062, .055); zyg.rotation.z = Math.PI / 2; zyg.rotation.y = k * .3; head.add(zyg);
    });

    return { root, J, mats, spine: spineParts, pelvis: pelvisParts, boneMat: bone, spineMat: spineBone, pelvisMat: pelvisBone };
  }

  /* ---------------- 자세 ---------------- */
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
  function setOpacity(h, o) {
    h.mats.forEach(m => {
      if (m.userData.base == null) m.userData.base = m.opacity;
      m.opacity = m.userData.base * o;
    });
  }

  /* ---------------- 조깅하는 40대 동양인 남녀 ---------------- */
  function makeRunner(o) {
    const M = {
      skin: new THREE.MeshStandardMaterial({ color: o.skin, roughness: .74, metalness: 0 }),
      top: new THREE.MeshStandardMaterial({ color: o.top, roughness: .88, metalness: 0 }),
      topD: new THREE.MeshStandardMaterial({ color: o.topD || o.top, roughness: .9, metalness: 0 }),
      pants: new THREE.MeshStandardMaterial({ color: o.pants, roughness: .92, metalness: 0 }),
      shoe: new THREE.MeshStandardMaterial({ color: o.shoe, roughness: .7, metalness: .04 }),
      hair: new THREE.MeshStandardMaterial({ color: o.hair, roughness: .55, metalness: .02 }),
      eye: new THREE.MeshStandardMaterial({ color: 0x241a15, roughness: .35 }),
      white: new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: .4 }),
      mouth: new THREE.MeshStandardMaterial({ color: 0xb8493f, roughness: .6 }),
      blush: new THREE.MeshStandardMaterial({ color: 0xf39b8d, transparent: true, opacity: .42, roughness: .8 })
    };
    const root = new THREE.Group(), J = {};
    const j = (n, p, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); J[n] = g; return g; };
    const add = (p, geo, mat, pos, scale) => {
      const m = new THREE.Mesh(geo, mat);
      if (pos) m.position.set(pos[0], pos[1], pos[2]);
      if (scale) m.scale.set(scale[0], scale[1], scale[2]);
      p.add(m); return m;
    };

    const hips = j('hips', root, 0, .90, 0);
    const spine = j('spine', hips, 0, .05, 0);
    const chest = j('chest', spine, 0, .12, 0);
    const neckJ = j('neck', chest, 0, .15, 0);
    const head = j('head', neckJ, 0, .085, .004);

    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      const sh = j('sh' + s, chest, .142 * k, .105, 0);
      const up = j('up' + s, sh, 0, 0, 0);
      const lo = j('lo' + s, up, 0, -.235, 0);
      const hand = j('hand' + s, lo, 0, -.215, 0);
      const hp = j('hip' + s, hips, .082 * k, -.035, 0);
      const th = j('thigh' + s, hp, 0, 0, 0);
      const sn = j('shin' + s, th, 0, -.355, 0);
      const ft = j('foot' + s, sn, 0, -.355, 0);
      return { sh, up, lo, hand, hp, th, sn, ft, k };
    });

    /* 몸통 */
    add(hips, sph(.145, 20), M.pants, [0, .01, 0], [1.06, .82, .82]);
    add(spine, cyl(.132, .126, .13, 18), M.top, [0, .055, 0], [1, 1, .8]);
    add(chest, cyl(.146, .132, .28, 20), M.top, [0, -.005, 0], [1.03, 1, .74]);
    // 어깨 라인
    [-1, 1].forEach(k => add(chest, sph(.062, 14), M.top, [.128 * k, .095, 0], [1.1, .9, .95]));
    // 목
    add(neckJ, cyl(.042, .048, .09, 14), M.skin, [0, .005, 0]);

    /* 머리 */
    add(head, sph(.098, 22), M.skin, [0, .045, .006], [.95, 1.06, .98]);
    add(head, sph(.008, 10), M.skin, [.095, .045, .0], [.7, 1.2, 1]);   // 귀
    add(head, sph(.008, 10), M.skin, [-.095, .045, .0], [.7, 1.2, 1]);
    // 눈 (흰자 + 눈동자)
    [-1, 1].forEach(k => {
      add(head, sph(.0155, 12), M.white, [.033 * k, .055, .086], [1.25, .78, .5]);
      add(head, sph(.0072, 10), M.eye, [.034 * k, .054, .096], [1, 1, .7]);
      add(head, sph(.0026, 8), M.white, [.031 * k, .059, .099]);
      // 눈썹
      add(head, box(.03, .005, .008), M.hair, [.034 * k, .079, .09]);
      // 볼 터치
      add(head, sph(.014, 10), M.blush, [.052 * k, .033, .072], [1, .62, .35]);
    });
    // 코
    add(head, cyl(.009, .013, .026, 10), M.skin, [0, .038, .093]);
    // 미소 (윗니가 살짝 보이는 밝은 표정)
    const smile = add(head, new THREE.TorusGeometry(.024, .0052, 6, 16, Math.PI), M.mouth, [0, .018, .089]);
    smile.rotation.z = Math.PI;
    add(head, sph(.018, 12), M.white, [0, .016, .086], [1.15, .5, .3]);
    // 헤어
    if (o.style === 'woman') {
      add(head, new THREE.SphereGeometry(.104, 20, 14, 0, TAU, 0, Math.PI * .62), M.hair, [0, .05, .004], [1, 1.06, 1.04]);
      add(head, sph(.058, 16), M.hair, [0, .012, -.062], [1.15, .8, .6]);   // 묶은 머리
      add(head, cyl(.022, .012, .07, 10), M.hair, [0, -.038, -.075], null); // 다발
    } else {
      add(head, new THREE.SphereGeometry(.101, 20, 14, 0, TAU, 0, Math.PI * .55), M.hair, [0, .052, .004], [1, .96, 1.03]);
    }

    /* 긴팔 트레이닝 상의 (팔 전체를 덮음) */
    ['L', 'R'].forEach(s => {
      const J2 = J;
      add(J2['up' + s], cyl(.052, .046, .235, 14), M.top, [0, -.117, 0]);
      add(J2['up' + s], sph(.052, 14), M.top, [0, 0, 0], [1, .85, 1]);
      add(J2['lo' + s], cyl(.045, .036, .215, 14), M.top, [0, -.107, 0]);
      // 커프스
      add(J2['lo' + s], cyl(.037, .037, .026, 14), M.topD, [0, -.214, 0]);
      add(J2['hand' + s], sph(.036, 14), M.skin, [0, -.03, .002], [.9, 1.1, .72]);
    });

    /* 긴 트레이닝 팬츠 (발목까지) */
    ['L', 'R'].forEach(s => {
      add(J['thigh' + s], cyl(.077, .062, .355, 16), M.pants, [0, -.177, 0]);
      add(J['thigh' + s], sph(.077, 14), M.pants, [0, 0, 0], [1, .8, 1]);
      add(J['shin' + s], cyl(.06, .045, .355, 16), M.pants, [0, -.177, 0]);
      // 밴딩 (발목 조임)
      add(J['shin' + s], cyl(.044, .044, .03, 14), M.topD, [0, -.348, 0]);
      // 운동화
      add(J['foot' + s], box(.082, .046, .185), M.shoe, [0, -.028, .046]);
      add(J['foot' + s], sph(.045, 14), M.shoe, [0, -.03, .125], [1, .62, .8]);
      add(J['foot' + s], box(.086, .014, .19), M.topD, [0, -.052, .046]);
    });

    root.userData.mats = Object.values(M);
    return { root, J, mats: Object.values(M) };
  }

  function poseRunner(r, p, look) {
    const s = Math.sin(p), c = Math.cos(p);
    const J = r.J;
    // 상체: 살짝 앞으로, 좌우 리듬
    J.hips.rotation.set(.06, s * .07, 0);
    J.spine.rotation.set(.03, -s * .05, 0);
    J.chest.rotation.set(.05, -s * .09, 0);
    J.neck.rotation.set(-.05, 0, 0);
    J.head.rotation.set(-.03, look == null ? s * .04 : look, 0);
    // 다리
    J.thighL.rotation.set(-s * .82 - .04, 0, .02);
    J.thighR.rotation.set(s * .82 - .04, 0, -.02);
    J.shinL.rotation.set(Math.max(0, c * 1.0) + .12, 0, 0);
    J.shinR.rotation.set(Math.max(0, -c * 1.0) + .12, 0, 0);
    J.footL.rotation.set(-.12 - Math.max(0, c) * .18, 0, 0);
    J.footR.rotation.set(-.12 - Math.max(0, -c) * .18, 0, 0);
    // 팔 (다리와 반대)
    J.upL.rotation.set(s * .72, 0, -.10);
    J.upR.rotation.set(-s * .72, 0, .10);
    J.loL.rotation.set(-1.32 - Math.max(0, s) * .32, 0, 0);
    J.loR.rotation.set(-1.32 - Math.max(0, -s) * .32, 0, 0);
    J.handL.rotation.set(-.1, 0, 0);
    J.handR.rotation.set(-.1, 0, 0);
    // 상하 바운스
    r.root.position.y = Math.abs(Math.sin(p)) * .045 - .015;
  }

  /* ---------------- 타이핑 텍스트 ---------------- */
  function typeInto(el, text) {
    if (!el) return;
    el.textContent = '';
    Array.from(text).forEach((ch, i) => {
      const sp = document.createElement('span');
      sp.className = 'ch';
      sp.textContent = ch === ' ' ? '\u00A0' : ch;
      sp.style.animationDelay = (i * .042).toFixed(3) + 's';
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
            sp.style.animationDelay = (.55 + i * .028).toFixed(3) + 's';
            sEl.appendChild(sp);
          });
        }
      }
      el.classList.add('on');
    } else {
      el.classList.remove('on');
      el.dataset.ready = '';
      const m = el.querySelector('.rc-main'), s = el.querySelector('.rc-sub');
      if (m) m.textContent = ''; if (s) s.textContent = '';
    }
  }

  /* ---------------- 메인 ---------------- */
  function initHero(opts) {
    const stage = opts.stage, canvasWrap = opts.canvasWrap, hud = opts.hud || {};
    const typeEl = opts.typeEl || null, runCaption = opts.runCaption || null;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { stage.classList.add('no-webgl'); return { pause() {}, resume() {} }; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    canvasWrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .05, 60);
    camera.position.set(0, 1.02, 5.2);
    camera.lookAt(0, .95, 0);

    scene.add(new THREE.HemisphereLight(0xdff3ff, 0x4d8a5a, .75));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.15); key.position.set(2.4, 4.2, 3.2); scene.add(key);
    const rim = new THREE.DirectionalLight(0x8ff0ff, .8); rim.position.set(-3, 2, -4); scene.add(rim);

    /* 바닥 스캔 링 */
    const floor = new THREE.Group(); scene.add(floor);
    const polar = new THREE.PolarGridHelper(1.15, 12, 5, 64, 0x2fd6a0, 0x2fd6a0);
    polar.material.transparent = true; polar.material.opacity = .32; polar.material.depthWrite = false; floor.add(polar);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.98, 1.03, 72), new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: .55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; floor.add(ring);

    /* 스캔 라인 */
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .01), new THREE.MeshBasicMaterial({ color: 0xbdfddf, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .2), new THREE.MeshBasicMaterial({ color: 0x2fd6a0, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(scan, scanGlow);

    /* 골격 */
    const sk = makeSkeleton();
    scene.add(sk.root);

    /* 조깅하는 남녀 (정면 · 긴 트레이닝복) */
    const man = makeRunner({ skin: 0xd8a071, top: 0x1f5fa8, topD: 0x17497f, pants: 0x2b3a4a, shoe: 0xf2f4f5, hair: 0x1a1512, style: 'man' });
    const woman = makeRunner({ skin: 0xe6b48c, top: 0xe2604e, topD: 0xc44a3b, pants: 0x2f3242, shoe: 0xffffff, hair: 0x1c1512, style: 'woman' });
    woman.root.scale.setScalar(.95);
    const runners = new THREE.Group(); runners.add(man.root, woman.root); scene.add(runners);
    runners.visible = false;

    /* 트랙 라인 + 그림자 */
    const lanes = new THREE.Group(); scene.add(lanes);
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 16; i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(.05, .5), laneMat);
      l.rotation.x = -Math.PI / 2; l.position.set(i % 2 ? 1.05 : -1.05, .002, -i * .8); lanes.add(l);
    }
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0d3b31, transparent: true, opacity: 0, depthWrite: false });
    const shM = new THREE.Mesh(new THREE.CircleGeometry(.34, 24), shadowMat); shM.rotation.x = -Math.PI / 2; scene.add(shM);
    const shW = new THREE.Mesh(new THREE.CircleGeometry(.32, 24), shadowMat); shW.rotation.x = -Math.PI / 2; scene.add(shW);

    function resize() {
      const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < .8 ? 40 : 32;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();

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
        hud.caption.classList.remove('show'); void hud.caption.offsetWidth;
        hud.caption.textContent = main;
        hud.caption.classList.add('show');
      }
    }

    /* 21초 루프: 스캔 → 교정 → 완성 → 조깅 */
    const LOOP = 21;
    let running = true, t0 = performance.now(), pausedAt = 0, cycleStart = 0;

    function frame(nowMs) {
      if (!running) return;
      requestAnimationFrame(frame);
      const el = (nowMs - t0) / 1000;
      if (el - cycleStart >= LOOP) cycleStart = el;
      const t = reduce ? 8 : el - cycleStart;

      const fadeIn = seg(t, 0, 1);
      const straighten = ease(seg(t, 3.2, 7));
      const xrOut = seg(t, 9.2, 10.2);
      const runIn = seg(t, 9.4, 10.6);
      const runOut = seg(t, 20.1, 21);
      const xrVis = fadeIn * (1 - xrOut);
      const runVis = runIn * (1 - runOut * .9);

      if (t < 3.2) setPhase('scan', 'AI 자세 스캔', '척추 · 골반 · 경추 정밀 분석');
      else if (t < 7) setPhase('fix', '바른 자세로 교정', '머리를 들고 · 어깨를 펴고 · 골반을 세웁니다');
      else if (t < 9.4) setPhase('done', '자세점수 98점', '입는 바른자세 ·脊柱 밸런스 회복');
      else setPhase('run', '바른 자세로 함께 달리다', '건강한 40대의 하루가 시작됩니다');

      /* 골격 */
      applyBlend(sk, straighten);
      sk.root.rotation.y = reduce ? .55 : el * .52;
      sk.root.visible = xrVis > .01;
      setOpacity(sk, xrVis);
      const bad = new THREE.Color(0xff8a5c), good = new THREE.Color(0x7dffb2);
      const c1 = bad.clone().lerp(good, straighten);
      sk.spine.forEach(m => m.material.color.copy(c1));
      sk.pelvis.forEach(m => m.material.color.copy(c1));
      sk.spineMat.color.copy(c1); sk.pelvisMat.color.copy(c1);

      /* 스캔 라인 */
      const sy = .1 + (Math.sin(el * 1.5) * .5 + .5) * 1.72;
      scan.position.set(0, sy, .26); scanGlow.position.set(0, sy, .25);
      scan.material.opacity = .85 * xrVis * (1 - straighten * .5);
      scanGlow.material.opacity = .12 * xrVis;
      floor.visible = xrVis > .01;
      ring.material.opacity = .55 * xrVis; polar.material.opacity = .3 * xrVis;
      ring.scale.setScalar(1 + Math.sin(el * 3) * .03);

      /* HUD */
      const score = Math.round(lerp(52, 98, straighten));
      if (hud.score) hud.score.textContent = score;
      if (hud.bar) hud.bar.style.transform = 'scaleX(' + (score / 100) + ')';
      ISSUES.forEach(i => {
        if (!i.el) return;
        i.el.textContent = Math.round(lerp(i.a, i.b, straighten)) + i.unit;
        i.el.parentElement.classList.toggle('ok', straighten > .85);
      });

      /* 조깅 */
      runners.visible = runVis > .01;
      shM.visible = shW.visible = runVis > .01;
      if (runners.visible) {
        const p = el * 8.2;
        const prog = ease(seg(t, 9.4, 20.2));
        const z = lerp(-6.2, 1.5, prog);
        const spread = lerp(.44, .62, prog);
        man.root.position.set(spread, 0, z);
        woman.root.position.set(-spread, 0, z - .06);
        // 서로 마주보기 ↔ 앞 보기 (주기적으로 시선 교환)
        const glance = Math.sin(el * .9);
        const lookY = glance > .25 ? -.34 : glance < -.45 ? .18 : null;
        poseRunner(man, p, lookY == null ? Math.sin(el * .6) * .05 : lookY);
        poseRunner(woman, p + Math.PI, lookY == null ? Math.sin(el * .6) * .05 : -lookY);
        man.root.rotation.y = lerp(-.16, 0, prog);
        woman.root.rotation.y = lerp(.16, 0, prog);
        [man, woman].forEach((r, i) => r.mats.forEach(m => {
          if (m.userData.base == null) m.userData.base = m.opacity;
          m.opacity = m.userData.base * runVis;
          m.transparent = runVis < .99;
        }));
        const sc = .34 + prog * .22;
        shM.scale.setScalar(sc / .34); shM.position.set(spread, -0.02, z + .05);
        shW.scale.setScalar(sc / .34); shW.position.set(-spread, -0.02, z - .01);
        shadowMat.opacity = .16 * runVis;
        laneMat.opacity = .34 * runVis;
        lanes.children.forEach((l, i) => { l.position.z = ((i * .8 + el * 4.4) % 12.6) - 9.4; });
      } else laneMat.opacity = 0;

      /* 조깅 하단 문구 */
      setRunCaption(runCaption, '바른 자세로, 함께 달리다', '오늘도 건강하게 · 40대의 가장 밝은 하루', t >= 9.8 && t < 20.4);

      camera.position.x = Math.sin(el * .3) * .1;
      camera.lookAt(0, .95, 0);
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
