/* =========================================================
   메인 3D 체형 측정 및 실사 조깅 연출 (v4)
   ---------------------------------------------------------
   1) 사실적 인체 외형 (Organic Human Silhouette)
      - 이마, 콧대, 코끝, 인중, 입술, 턱선, 턱끝의 정밀 굴곡
      - 대흉근(가슴), 허리 라인, 둔부(자연스러운 엉덩이 곡선), 비복근(종아리 알)
      - 첨부 일러스트(anatomy-ref.png) 기반의 투광형 X-ray 반투명 피부 실루엣
   2) 사실적 내부 골격 (Realistic Anatomical Skeleton)
      - 실제 골반 구조: 우아하게 펼쳐진 장골 날개(Iliac Wings), 천골(Sacrum), 치골
      - 고관절 비구(Acetabulum)에 안착되는 대퇴골두(Femoral Head) 및 경골·비골
      - 24개 척추(경추 7, 흉추 12, 요추 5) + 마디마다 빛나는 청록색 추간판 디스크
      - 12쌍 갈비뼈(Ribcage), 흉골(Sternum), 쇄골(Clavicle), 견갑골(Scapula)
   3) 실시간 자세 교정 연출 (52점 → 98점)
      - 거북목·굽은등·골반 경사 → 이상적인 황금 S-curve 교정
      - 문제 디스크 주황색 경고등 → 교정 완료 시 바이오 에메랄드/청록색 발광
   4) 40대 남녀 실사 조깅 영상 (joggers.mp4) 재생
      - 영상 위에 오직 단 하나의 핵심 슬로건만 순백색 3D 입체로 표시:
        '바른자세가 아름답고 건강한 몸이다'
   ========================================================= */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- 인체 피부 실루엣 셰이더 (투광형 X-ray) ---------------- */
  function createHumanSkinShader() {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x67e8f9) }, // 상쾌한 아이스 청록빛
        opacity: { value: 0.26 },
        rimPower: { value: 2.1 },
        rimGlow: { value: 0.85 }
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
          float core = pow(d, 2.2) * 0.12;
          float alpha = clamp(rim * rimGlow + core + 0.05, 0.0, 1.0) * opacity;
          vec3 c = mix(color, vec3(0.92, 0.98, 1.0), rim * 0.65);
          gl_FragColor = vec4(c, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide // FrontSide로 렌더하여 내부 교차면의 지저분한 중첩 방지
    });
  }

  /* ---------------- 실제 골격 재질 (따뜻한 천연 뼈 색상) ---------------- */
  function createBoneMaterial(colorHex, opacity = 0.96) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex || 0xf4ede2),
      emissive: new THREE.Color(0x28231c),
      roughness: 0.38,
      metalness: 0.04,
      transparent: true,
      opacity: opacity
    });
  }

  /* ---------------- 척추 추간판(디스크) 발광 재질 ---------------- */
  function createDiscMaterial(colorHex) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex || 0x00e5ff),
      emissive: new THREE.Color(colorHex || 0x0284c7),
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.08,
      transparent: true,
      opacity: 0.95
    });
  }

  /* ---------------- 지오메트리 기본 헬퍼 ---------------- */
  const cyl = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 18);
  const sph = (r, s) => new THREE.SphereGeometry(r, s || 20, Math.round((s || 20) * .75));
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  /* 관절두가 있는 자연스러운 긴 뼈 */
  function longBone(mat, len, r1, r2, curveOffset = 0) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(cyl(r1, r2, len, 14), mat);
    shaft.position.y = -len / 2;
    if (curveOffset) shaft.position.z = curveOffset;
    g.add(shaft);
    const head = new THREE.Mesh(sph(r1 * 1.15, 14), mat);
    g.add(head);
    const foot = new THREE.Mesh(sph(r2 * 1.15, 14), mat);
    foot.position.y = -len;
    g.add(foot);
    return g;
  }

  /* =========================================================
     A. 사실적인 사람 형태 3D 모델링 (유기적 인체 조형)
     ========================================================= */

  /* 1) 유기적 머리 & 얼굴 프로필 (이마, 콧대, 코끝, 입술, 턱끝 굴곡) */
  function makeOrganicHead(skinMat) {
    const geo = new THREE.SphereGeometry(0.096, 36, 26);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // 인체 두개골 비율: 세로 및 전후가 좌우보다 김
      x *= 0.88;
      y *= 1.12;
      z *= 1.04;

      const absX = Math.abs(x);

      // 안와 (Eye Orbits) - 눈 부위의 자연스러운 음영 홈
      if (y > 0.045 && y < 0.085 && z > 0) {
        const d = Math.hypot(absX - 0.034, y - 0.065);
        if (d < 0.024) z -= (0.024 - d) * 0.42;
      }

      // 콧대 및 코끝 돌출 (Nose profile)
      if (y > 0.022 && y < 0.078 && z > 0) {
        const nw = Math.max(0, 1 - absX / 0.016);
        const nh = Math.sin(seg(y, 0.022, 0.078) * Math.PI);
        z += nw * nh * 0.038;
        if (y > 0.042 && y < 0.056) {
          z += nw * 0.008; // 코끝 볼륨
        }
      }

      // 윗입술 (Upper Lip)
      if (y > 0.016 && y < 0.032 && z > 0) {
        const lw = Math.max(0, 1 - absX / 0.028);
        z += lw * Math.sin(seg(y, 0.016, 0.032) * Math.PI) * 0.016;
      }

      // 구순 구 (Mouth Line)
      if (y > 0.010 && y < 0.016 && z > 0) {
        z -= Math.max(0, 1 - absX / 0.026) * 0.006;
      }

      // 아랫입술 (Lower Lip)
      if (y > 0.000 && y < 0.012 && z > 0) {
        const lw2 = Math.max(0, 1 - absX / 0.024);
        z += lw2 * Math.sin(seg(y, 0.000, 0.012) * Math.PI) * 0.014;
      }

      // 턱-입술 사이 홈 (Mentolabial Sulcus)
      if (y > -0.010 && y < 0.000 && z > 0) {
        z -= Math.max(0, 1 - absX / 0.022) * 0.008;
      }

      // 턱끝 돌출 (Chin / Mental Protuberance)
      if (y > -0.032 && y < -0.008 && z > 0) {
        const cw = Math.max(0, 1 - absX / 0.024);
        const ch = Math.sin(seg(y, -0.032, -0.008) * Math.PI);
        z += cw * ch * 0.022;
      }

      // 턱선 (Mandibular Angle)
      if (y > -0.04 && y < 0.02 && z < 0.02) {
        const jw = Math.max(0, 1 - Math.abs(absX - 0.042) / 0.018);
        x += (x > 0 ? 1 : -1) * jw * 0.006;
      }

      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, skinMat);
    mesh.position.set(0, 0.07, 0.005);
    return mesh;
  }

  /* 2) 유기적 몸통 (가슴 근육, 복부, 허리, 엉덩이 굴곡) */
  function makeOrganicTorso(skinMat) {
    const geo = new THREE.CylinderGeometry(0.148, 0.142, 0.58, 36, 28, true);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const absX = Math.abs(x);

      // 인체 흉곽의 타원형 단면 (전후가 좌우보다 얇음)
      z *= 0.78;

      // 대흉근 (Pectorals) - 가슴 부위 자연스러운 전방 볼륨
      if (y > 0.08 && y < 0.24 && z > 0) {
        const pw = Math.max(0, 1 - Math.pow((absX - 0.065) / 0.075, 2));
        const ph = Math.sin(seg(y, 0.08, 0.24) * Math.PI);
        z += pw * ph * 0.044;
      }

      // 자연스러운 허리 곡선 (Waist Incurve)
      if (y > -0.08 && y < 0.08) {
        const wt = 1 - Math.cos(seg(y, -0.08, 0.08) * Math.PI * 2) * 0.08;
        x *= wt;
        z *= wt;
      }

      // 둔부 굴곡 (Gluteal Curve) - 인체다운 자연스러운 엉덩이 볼륨
      if (y > -0.28 && y < -0.08 && z < 0) {
        const gw = Math.max(0, 1 - Math.pow((absX - 0.068) / 0.068, 2));
        const gh = Math.sin(seg(y, -0.28, -0.08) * Math.PI);
        z -= gw * gh * 0.058;
      }

      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, skinMat);
  }

  /* 3) 종아리 근육(비복근)이 자연스러운 하퇴부 */
  function makeOrganicCalf(skinMat) {
    const geo = new THREE.CylinderGeometry(0.058, 0.035, 0.42, 24, 20);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // 비복근 굴곡: 상부 뒤쪽이 둥글게 튀어나오고 아킬레스건 쪽으로 얇아짐
      if (y > -0.26 && y < -0.04 && z < 0) {
        const bh = Math.sin(seg(y, -0.26, -0.04) * Math.PI);
        z -= bh * 0.038;
      }

      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, skinMat);
    mesh.position.y = -0.21;
    return mesh;
  }

  /* =========================================================
     B. 사실적 내부 골격 및 골반 구조 생성
     ========================================================= */

  /* 우아하게 펼쳐진 실제 해부학적 골반 장골 날개 (Iliac Wings) */
  function makeRealisticPelvis(boneMat) {
    const pelvisGroup = new THREE.Group();

    // 1) 천골 (Sacrum)
    const sacrumGeo = cyl(0.042, 0.015, 0.14, 14);
    const sacrum = new THREE.Mesh(sacrumGeo, boneMat);
    sacrum.position.set(0, -0.035, -0.032);
    sacrum.rotation.x = 0.34;
    pelvisGroup.add(sacrum);

    // 2) 장골 날개 (Iliac Blades - 첨부 이미지와 같은 우아한 곡면 날개)
    [-1, 1].forEach(k => {
      const iliacShape = new THREE.Shape();
      iliacShape.moveTo(0, 0);
      iliacShape.bezierCurveTo(0.03, 0.08, 0.09, 0.09, 0.12, 0.06);
      iliacShape.bezierCurveTo(0.14, 0.03, 0.13, -0.04, 0.08, -0.08);
      iliacShape.bezierCurveTo(0.04, -0.09, 0.01, -0.05, 0, 0);

      const extrudeSettings = {
        steps: 1,
        depth: 0.014,
        bevelEnabled: true,
        bevelThickness: 0.007,
        bevelSize: 0.007,
        bevelSegments: 4
      };
      const iliacGeo = new THREE.ExtrudeGeometry(iliacShape, extrudeSettings);
      const ilium = new THREE.Mesh(iliacGeo, boneMat);
      ilium.scale.set(1.15, 1.15, 1);
      ilium.position.set(0.045 * k, 0.015, -0.015);
      ilium.rotation.set(-0.25, k * 0.42, (k > 0 ? 0.35 : -0.35) + (k < 0 ? Math.PI : 0));
      pelvisGroup.add(ilium);

      // 치골·좌골 분지 (Pubic & Ischial Rami)
      const pubic = new THREE.Mesh(cyl(0.013, 0.013, 0.095, 8), boneMat);
      pubic.position.set(0.038 * k, -0.058, 0.042);
      pubic.rotation.set(0.72, 0, -k * 0.52);
      pelvisGroup.add(pubic);

      // 고관절 소켓 비구 (Acetabulum Cup)
      const acetabulum = new THREE.Mesh(sph(0.024, 12), boneMat);
      acetabulum.position.set(0.092 * k, -0.05, 0.005);
      pelvisGroup.add(acetabulum);
    });

    return pelvisGroup;
  }

  /* 사실적 인체 3D 모델 조립 */
  function makeRealisticHumanModel() {
    const root = new THREE.Group();
    const J = {}, mats = [];

    // 재질 세트
    const boneMat = createBoneMaterial(0xf4ede2, 0.96);
    const spineBoneMat = createBoneMaterial(0xf8f2e8, 0.96);
    const discMat = createDiscMaterial(0x00e5ff); // 청록빛 발광 추간판
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

    /* ---------------- 1. 사실적 인체 외형 실루엣 (반투명 피부) ---------------- */
    // 머리 & 정밀 안면 굴곡 (이마, 콧대, 코끝, 인중, 입술, 턱)
    head.add(makeOrganicHead(skinMat));

    // 목과 승모근 라인
    const neckMesh = new THREE.Mesh(cyl(0.046, 0.058, 0.13, 20), skinMat);
    neckMesh.position.set(0, 0.02, 0);
    neck.add(neckMesh);

    // 몸통 유기적 외형 (대흉근, 허리, 둔부 곡선)
    chest.add(makeOrganicTorso(skinMat));

    // 사지 유기적 외형
    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      // 어깨 삼각근 볼륨
      const delt = new THREE.Mesh(sph(0.068, 16), skinMat);
      delt.scale.set(1.1, 1.25, 1);
      delt.position.set(0.175 * k, 0.16, -0.01);
      chest.add(delt);

      // 상완 (이두·삼두)
      const armMesh = new THREE.Mesh(cyl(0.052, 0.042, 0.27, 16), skinMat);
      armMesh.position.set(0, -0.14, 0);
      J['arm' + s].add(armMesh);

      // 전완 (팔뚝)
      const elMesh = new THREE.Mesh(cyl(0.042, 0.033, 0.25, 16), skinMat);
      elMesh.position.set(0, -0.13, 0);
      J['elbow' + s].add(elMesh);

      // 손
      const handMesh = new THREE.Mesh(box(0.058, 0.082, 0.022), skinMat);
      handMesh.position.set(0, -0.042, 0);
      J['hand' + s].add(handMesh);

      // 대퇴부 (허벅지 대퇴사두근 굴곡)
      const thighMesh = new THREE.Mesh(cyl(0.086, 0.058, 0.41, 20), skinMat);
      thighMesh.position.set(0, -0.21, 0.01);
      J['hip' + s].add(thighMesh);

      // 무릎 관절
      const kneeMesh = new THREE.Mesh(sph(0.052, 14), skinMat);
      kneeMesh.scale.set(1, 1.1, 1);
      kneeMesh.position.set(0, 0, 0.02);
      J['knee' + s].add(kneeMesh);

      // 종아리 비복근 굴곡 (유기적 하퇴부)
      J['knee' + s].add(makeOrganicCalf(skinMat));

      // 발 (뒤꿈치 종골 및 족궁 아치)
      const footMesh = new THREE.Mesh(box(0.076, 0.042, 0.198), skinMat);
      footMesh.position.set(0, -0.028, 0.046);
      J['ankle' + s].add(footMesh);

      const heelMesh = new THREE.Mesh(sph(0.034, 12), skinMat);
      heelMesh.position.set(0, -0.024, -0.042);
      J['ankle' + s].add(heelMesh);
    });

    /* ---------------- 2. 사실적 내부 골격 정밀 구성 ---------------- */
    const spineDiscs = [];
    const spineBones = [];

    // 척추 마디 하나 (뼈 + 푸른빛 디스크)
    function vertebraWithDisc(parent, y, z, r, tilt, isProblem) {
      const g = new THREE.Group();
      g.position.set(0, y, z);
      if (tilt) g.rotation.x = tilt;
      parent.add(g);

      // 1) 척추체 (Vertebral Body)
      const body = new THREE.Mesh(cyl(r, r * 1.04, r * 0.78, 16), spineBoneMat);
      g.add(body);

      // 극돌기 (Spinous Process - 뒤쪽 하방 돌출)
      const spinous = new THREE.Mesh(box(r * 0.44, r * 0.42, r * 1.75), spineBoneMat);
      spinous.position.set(0, -r * 0.1, -r * 1.25);
      spinous.rotation.x = -0.30;
      g.add(spinous);

      // 횡돌기 (Transverse Processes - 좌우 돌출)
      const trans = new THREE.Mesh(box(r * 3.0, r * 0.32, r * 0.48), spineBoneMat);
      trans.position.set(0, r * 0.1, -r * 0.45);
      g.add(trans);

      // 2) 척추 추간판 디스크 (Intervertebral Disc - 청록색 발광체)
      const disc = new THREE.Mesh(cyl(r * 1.04, r * 1.04, r * 0.34, 16), discMat.clone());
      disc.position.set(0, -r * 0.50, 0);
      g.add(disc);

      disc.userData.isProblem = isProblem;
      spineDiscs.push(disc);
      spineBones.push(body, spinous, trans);
      return g;
    }

    // 요추 5개 (L1 ~ L5) - 전만곡
    vertebraWithDisc(spine1, .015, .012, .034, .03, true);
    vertebraWithDisc(spine1, .062, .010, .035, .02, true);
    vertebraWithDisc(spine2, .012, .006, .033, .01, true);
    vertebraWithDisc(spine2, .058, .003, .032, 0, false);
    vertebraWithDisc(spine2, .104, 0, .031, -.01, false);

    // 흉추 12개 (T1 ~ T12) - 후만곡
    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      const y = -.04 + v * .26;
      const z = -Math.sin(v * Math.PI) * .024;
      vertebraWithDisc(chest, y, z, .029 - v * .006, -.02 + v * .04, i >= 7);
    }

    // 경추 7개 (C1 ~ C7) - 전만곡
    for (let i = 0; i < 7; i++) {
      const v = i / 6;
      vertebraWithDisc(neck, -.04 + v * .14, Math.sin(v * Math.PI) * .012, .023 - v * .003, .03 - v * .04, i <= 3);
    }

    // 실제 골반 (장골 날개·천골·치골)
    hips.add(makeRealisticPelvis(boneMat));

    // 12쌍 갈비뼈 & 흉골
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

    // 쇄골 & 견갑골
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

    // 사지 골격 (대퇴골두 고관절 안착, 경골·비골, 상완골)
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
      // 손뼈
      const hand = new THREE.Mesh(box(.052, .074, .02), boneMat);
      hand.position.set(0, -.045, 0);
      J['hand' + s].add(hand);

      // 대퇴골 (대퇴골두 경사각 적용)
      const femurGroup = new THREE.Group();
      femurGroup.add(longBone(boneMat, .395, .024, .019, 0.008));
      femurGroup.rotation.z = -k * 0.06; // 자연스러운 인체 외반각
      J['hip' + s].add(femurGroup);

      // 슬개골
      const patella = new THREE.Mesh(sph(.02, 12), boneMat);
      patella.scale.set(1, 1.15, .55);
      patella.position.set(0, -.012, .036);
      J['knee' + s].add(patella);

      // 경골 & 비골
      J['knee' + s].add(longBone(boneMat, .385, .018, .014));
      const fibula = new THREE.Mesh(cyl(.008, .007, .34, 8), boneMat);
      fibula.position.set(.022 * k, -.19, -.004);
      J['knee' + s].add(fibula);

      // 발뼈
      const foot = new THREE.Mesh(box(.072, .032, .185), boneMat);
      foot.position.set(0, -.026, .045);
      J['ankle' + s].add(foot);
    });

    // 두개골 & 하악골
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
        m.uniforms.opacity.value = o * 0.26;
      } else {
        m.opacity = o * 0.96;
      }
    });
    h.spineDiscs.forEach(d => {
      d.material.opacity = o * 0.95;
    });
  }

  /* ---------------- 순백색 타이핑 텍스트 ---------------- */
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x0f3640, 0.95));
    const key = new THREE.DirectionalLight(0xfff8ee, 1.25);
    key.position.set(2.4, 4.2, 3.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.95);
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
      const goodDisc = new THREE.Color(0x00e5ff);
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
