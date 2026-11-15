/* =========================================================
   메인 3D 체형 측정 및 실사 조깅 연출 (v5 - 해부학 정밀 조형)
   ---------------------------------------------------------
   1) 사실적인 유기적 인체 외형 (Organic Human Mesh)
      - 머리 & 안면 윤곽: 이마, 부드러운 콧대, 코끝 볼륨, 인중, 도톰한 입술, 턱끝, 턱선
      - 몸통 & 사지: 대흉근(가슴), 잘록한 허리, 둔부(자연스러운 엉덩이 볼륨), 비복근(종아리 알)
      - 투광형 X-ray 반투명 피부 셰이더 (전면 투광, 외곽 아이스 청록빛 프레넬 광채)
   2) 막대기 형태를 완전 탈피한 사실적 해부학 골격 (Realistic Anatomical Skeleton)
      - 실제 골반: 우아하게 펼쳐진 오목한 장골 날개(Iliac Wings), 천골(Sacrum), 치골, 폐쇄공
      - 대퇴골(Femur): 대퇴골두(Femoral Head)가 고관절 비구(Acetabulum)에 125도 경사각으로 안착
      - 하퇴부: 정강이 고평부와 능선이 뚜렷한 경골(Tibia) + 평행한 비골(Fibula) + 종골(Heel)
      - 24개 척추(경추 7, 흉추 12, 요추 5) + 마디마다 빛나는 일렉트릭 청록색 추간판 디스크
      - 흉곽: 평평한 리본 형태의 12쌍 갈비뼈(Ribcage), 흉골(Sternum), S자 쇄골, 날개 견갑골
   3) 실시간 자세 교정 연출 (52점 → 98점)
      - 거북목(24°)·굽은등·골반 경사 → 이상적인 황금 S-curve 교정
      - 문제 디스크 주황색 경고등 → 교정 완료 시 바이오 에메랄드/청록색 점등
   4) 40대 남녀 실사 조깅 영상 (joggers.mp4) 재생
      - 영상 위에 오직 단 하나의 핵심 슬로건만 한 글자씩 확대(Pop-in Zoom) 연출:
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
        color: { value: new THREE.Color(0x67e8f9) }, // 깨끗한 아이스 청록빛
        opacity: { value: 0.24 },
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
          float core = pow(d, 2.2) * 0.10;
          float alpha = clamp(rim * rimGlow + core + 0.04, 0.0, 1.0) * opacity;
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

  /* ---------------- 기본 헬퍼 ---------------- */
  const cyl = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 18);
  const sph = (r, s) => new THREE.SphereGeometry(r, s || 20, Math.round((s || 20) * .75));
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  /* =========================================================
     A. 사실적인 유기적 인체 외형 (반투명 피부)
     ========================================================= */

  /* 1) 유기적 머리 & 얼굴 프로필 (이마, 콧대, 코끝, 입술, 턱끝 굴곡) */
  function makeOrganicHead(skinMat) {
    const geo = new THREE.SphereGeometry(0.096, 36, 26);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      x *= 0.88;
      y *= 1.12;
      z *= 1.04;

      const absX = Math.abs(x);

      // 안와 (Eye Orbits)
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

      // 턱끝 돌출 (Chin)
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
      z *= 0.78;

      // 대흉근 (Pectorals)
      if (y > 0.08 && y < 0.24 && z > 0) {
        const pw = Math.max(0, 1 - Math.pow((absX - 0.065) / 0.075, 2));
        const ph = Math.sin(seg(y, 0.08, 0.24) * Math.PI);
        z += pw * ph * 0.044;
      }

      // 허리 라인 (Waist)
      if (y > -0.08 && y < 0.08) {
        const wt = 1 - Math.cos(seg(y, -0.08, 0.08) * Math.PI * 2) * 0.08;
        x *= wt;
        z *= wt;
      }

      // 둔부 굴곡 (Gluteal Curve - 엉덩이 볼륨)
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

  /* 3) 종아리 비복근 굴곡 */
  function makeOrganicCalf(skinMat) {
    const geo = new THREE.CylinderGeometry(0.058, 0.035, 0.42, 24, 20);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

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
     B. 사실적 해부학 골격 (막대기 형태 완전 탈피)
     ========================================================= */

  /* 1) 사실적인 대퇴골 (Femur: 대퇴골두 + 경부 + 대전자 + 원위 관절융기) */
  function makeRealisticFemur(boneMat, len, isLeft) {
    const g = new THREE.Group();
    const k = isLeft ? 1 : -1;

    // 대퇴골체 (전방 만곡 곡면 적용)
    const shaftGeo = new THREE.CylinderGeometry(0.019, 0.021, len * 0.76, 16);
    const pos = shaftGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      pos.setZ(i, z + Math.sin(seg(y, -len * 0.38, len * 0.38) * Math.PI) * 0.012);
    }
    shaftGeo.computeVertexNormals();
    const shaft = new THREE.Mesh(shaftGeo, boneMat);
    shaft.position.y = -len * 0.44;
    g.add(shaft);

    // 대퇴골두 (구형 관절두)
    const head = new THREE.Mesh(sph(0.024, 16), boneMat);
    head.position.set(-0.034 * k, 0, 0.005);
    g.add(head);

    // 대퇴골경 (125도 경사각)
    const neck = new THREE.Mesh(cyl(0.014, 0.017, 0.038, 12), boneMat);
    neck.position.set(-0.018 * k, -0.014, 0.003);
    neck.rotation.z = k * 0.78;
    g.add(neck);

    // 대전자 (외측 근육 부착 돌기)
    const trochanter = new THREE.Mesh(sph(0.018, 12), boneMat);
    trochanter.scale.set(0.9, 1.4, 1.1);
    trochanter.position.set(0.016 * k, -0.018, -0.004);
    g.add(trochanter);

    // 원위 관절융기 (무릎 관절면)
    const condyles = new THREE.Mesh(box(0.046, 0.028, 0.044), boneMat);
    condyles.position.set(0, -len * 0.86, 0);
    g.add(condyles);

    return g;
  }

  /* 2) 사실적인 경골 & 비골 (Tibia & Fibula) */
  function makeRealisticLowerLeg(boneMat, len, isLeft) {
    const g = new THREE.Group();
    const k = isLeft ? 1 : -1;

    // 경골 고평부 (상단 넓은 관절면)
    const plateau = new THREE.Mesh(box(0.048, 0.022, 0.042), boneMat);
    plateau.position.set(0, -0.012, 0);
    g.add(plateau);

    // 경골 골간 (정강이 앞 능선)
    const tibiaShaft = new THREE.Mesh(cyl(0.018, 0.014, len * 0.82, 14), boneMat);
    tibiaShaft.position.set(0, -len * 0.44, 0.003);
    g.add(tibiaShaft);

    // 내측 복사뼈
    const medMall = new THREE.Mesh(sph(0.016, 12), boneMat);
    medMall.position.set(-0.014 * k, -len * 0.86, 0.004);
    g.add(medMall);

    // 비골 (외측 평행 보조 뼈)
    const fibulaShaft = new THREE.Mesh(cyl(0.007, 0.007, len * 0.80, 10), boneMat);
    fibulaShaft.position.set(0.024 * k, -len * 0.44, -0.004);
    g.add(fibulaShaft);

    // 외측 복사뼈
    const latMall = new THREE.Mesh(sph(0.013, 10), boneMat);
    latMall.position.set(0.024 * k, -len * 0.86, -0.004);
    g.add(latMall);

    // 슬개골 (Patella)
    const patella = new THREE.Mesh(sph(0.019, 14), boneMat);
    patella.scale.set(1.0, 1.25, 0.55);
    patella.position.set(0, 0.005, 0.034);
    g.add(patella);

    return g;
  }

  /* 3) 사실적인 발 뼈 (종골 뒤꿈치 + 족궁 아치) */
  function makeRealisticFoot(boneMat) {
    const g = new THREE.Group();

    // 종골 (Calcaneus: 뒤꿈치)
    const heel = new THREE.Mesh(sph(0.024, 14), boneMat);
    heel.scale.set(0.9, 0.9, 1.4);
    heel.position.set(0, -0.022, -0.045);
    g.add(heel);

    // 거골 (Talus: 발목 접촉면)
    const talus = new THREE.Mesh(box(0.038, 0.024, 0.045), boneMat);
    talus.position.set(0, -0.008, -0.01);
    g.add(talus);

    // 족궁 아치 및 중족골
    const arch = new THREE.Mesh(box(0.068, 0.024, 0.13), boneMat);
    arch.position.set(0, -0.024, 0.065);
    arch.rotation.x = 0.08;
    g.add(arch);

    return g;
  }

  /* 4) 사실적인 골반 (장골 날개 + 천골 + 고관절 비구) */
  function makeRealisticPelvis(boneMat) {
    const g = new THREE.Group();

    // 천골 (Sacrum)
    const sacrumGeo = cyl(0.044, 0.016, 0.145, 14);
    const sacrum = new THREE.Mesh(sacrumGeo, boneMat);
    sacrum.position.set(0, -0.035, -0.032);
    sacrum.rotation.x = 0.35;
    g.add(sacrum);

    // 좌우 오목한 장골 날개
    [-1, 1].forEach(k => {
      const iliacShape = new THREE.Shape();
      iliacShape.moveTo(0, 0);
      iliacShape.bezierCurveTo(0.02, 0.06, 0.06, 0.09, 0.11, 0.08);
      iliacShape.bezierCurveTo(0.14, 0.06, 0.14, -0.02, 0.09, -0.07);
      iliacShape.bezierCurveTo(0.05, -0.09, 0.01, -0.05, 0, 0);

      const extrudeSettings = {
        steps: 1,
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 4
      };
      const iliacGeo = new THREE.ExtrudeGeometry(iliacShape, extrudeSettings);
      const ilium = new THREE.Mesh(iliacGeo, boneMat);
      ilium.scale.set(1.2, 1.2, 1);
      ilium.position.set(0.048 * k, 0.016, -0.018);
      ilium.rotation.set(-0.25, k * 0.42, (k > 0 ? 0.35 : -0.35) + (k < 0 ? Math.PI : 0));
      g.add(ilium);

      // 치골 & 좌골 (폐쇄공)
      const pubis = new THREE.Mesh(cyl(0.014, 0.014, 0.098, 8), boneMat);
      pubis.position.set(0.040 * k, -0.060, 0.042);
      pubis.rotation.set(0.72, 0, -k * 0.52);
      g.add(pubis);

      // 고관절 비구 (Acetabulum Socket)
      const acetabulum = new THREE.Mesh(sph(0.026, 14), boneMat);
      acetabulum.position.set(0.092 * k, -0.052, 0.005);
      g.add(acetabulum);
    });

    return g;
  }

  /* 5) 사실적인 흉곽 (12쌍 평면 리본 갈비뼈 & 흉골) */
  function makeRealisticRibcage(boneMat) {
    const g = new THREE.Group();

    // 흉골 (Sternum: 자루 + 체 + 검상돌기)
    const manubrium = new THREE.Mesh(box(0.048, 0.044, 0.016), boneMat);
    manubrium.position.set(0, 0.175, 0.138);
    g.add(manubrium);

    const sternalBody = new THREE.Mesh(box(0.034, 0.13, 0.014), boneMat);
    sternalBody.position.set(0, 0.088, 0.142);
    g.add(sternalBody);

    const xiphoid = new THREE.Mesh(box(0.016, 0.022, 0.010), boneMat);
    xiphoid.position.set(0, 0.012, 0.138);
    g.add(xiphoid);

    // 12쌍 갈비뼈 (평평한 리본 형태)
    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      const y = 0.165 - v * 0.22;
      const rx = 0.118 + Math.sin(v * Math.PI) * 0.046;
      const rz = 0.108 + Math.sin(v * Math.PI) * 0.038;

      [-1, 1].forEach(k => {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(rx, 0.0085, 8, 26, Math.PI * 0.94), boneMat);
        rib.scale.set(1, 0.55, rz / rx);
        rib.position.set(0.016 * k, y, 0);
        rib.rotation.set(0.18 + v * 0.14, k * 0.12, Math.PI * 0.52 + (k > 0 ? 0 : Math.PI));
        g.add(rib);
      });
    }

    // 쇄골 & 견갑골
    [-1, 1].forEach(k => {
      const clavGeo = new THREE.CylinderGeometry(0.009, 0.008, 0.145, 10);
      const pos = clavGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setZ(i, pos.getZ(i) + Math.sin(seg(y, -0.07, 0.07) * Math.PI) * 0.014);
      }
      clavGeo.computeVertexNormals();
      const clav = new THREE.Mesh(clavGeo, boneMat);
      clav.position.set(0.082 * k, 0.192, 0.075);
      clav.rotation.set(0.12, k * 0.30, k * 1.48);
      g.add(clav);

      const scapShape = new THREE.Shape();
      scapShape.moveTo(0, 0);
      scapShape.lineTo(0.07, 0.04);
      scapShape.lineTo(0.05, -0.11);
      scapShape.lineTo(0, -0.03);
      const scapGeo = new THREE.ExtrudeGeometry(scapShape, { steps: 1, depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3 });
      const scap = new THREE.Mesh(scapGeo, boneMat);
      scap.position.set(0.055 * k, 0.15, -0.108);
      scap.rotation.set(-0.16, -k * 0.24, -k * 0.18);
      g.add(scap);
    });

    return g;
  }

  /* 사실적 인체 3D 모델 종합 조립 */
  function makeRealisticHumanModel() {
    const root = new THREE.Group();
    const J = {}, mats = [];

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
    head.add(makeOrganicHead(skinMat));

    const neckMesh = new THREE.Mesh(cyl(0.046, 0.058, 0.13, 20), skinMat);
    neckMesh.position.set(0, 0.02, 0);
    neck.add(neckMesh);

    chest.add(makeOrganicTorso(skinMat));

    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      const delt = new THREE.Mesh(sph(0.068, 16), skinMat);
      delt.scale.set(1.1, 1.25, 1);
      delt.position.set(0.175 * k, 0.16, -0.01);
      chest.add(delt);

      const armMesh = new THREE.Mesh(cyl(0.052, 0.042, 0.27, 16), skinMat);
      armMesh.position.set(0, -0.14, 0);
      J['arm' + s].add(armMesh);

      const elMesh = new THREE.Mesh(cyl(0.042, 0.033, 0.25, 16), skinMat);
      elMesh.position.set(0, -0.13, 0);
      J['elbow' + s].add(elMesh);

      const handMesh = new THREE.Mesh(box(0.058, 0.082, 0.022), skinMat);
      handMesh.position.set(0, -0.042, 0);
      J['hand' + s].add(handMesh);

      const thighMesh = new THREE.Mesh(cyl(0.086, 0.058, 0.41, 20), skinMat);
      thighMesh.position.set(0, -0.21, 0.01);
      J['hip' + s].add(thighMesh);

      const kneeMesh = new THREE.Mesh(sph(0.052, 14), skinMat);
      kneeMesh.scale.set(1, 1.1, 1);
      kneeMesh.position.set(0, 0, 0.02);
      J['knee' + s].add(kneeMesh);

      J['knee' + s].add(makeOrganicCalf(skinMat));

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

    // 척추 마디 하나 (두툼한 뼈 + 푸른빛 디스크)
    function vertebraWithDisc(parent, y, z, r, tilt, isProblem) {
      const g = new THREE.Group();
      g.position.set(0, y, z);
      if (tilt) g.rotation.x = tilt;
      parent.add(g);

      // 척추체
      const bodyGeo = cyl(r, r * 1.05, r * 0.82, 18);
      bodyGeo.scale(1.15, 1, 0.95);
      const body = new THREE.Mesh(bodyGeo, spineBoneMat);
      g.add(body);

      // 극돌기
      const spinousGeo = box(r * 0.38, r * 0.44, r * 1.8);
      const spinous = new THREE.Mesh(spinousGeo, spineBoneMat);
      spinous.position.set(0, -r * 0.12, -r * 1.25);
      spinous.rotation.x = -0.32;
      g.add(spinous);

      // 횡돌기
      const transGeo = box(r * 3.1, r * 0.34, r * 0.52);
      const trans = new THREE.Mesh(transGeo, spineBoneMat);
      trans.position.set(0, r * 0.10, -r * 0.45);
      g.add(trans);

      // 척추 추간판 디스크
      const discGeo = cyl(r * 1.08, r * 1.08, r * 0.36, 18);
      discGeo.scale(1.15, 1, 0.95);
      const disc = new THREE.Mesh(discGeo, discMat.clone());
      disc.position.set(0, -r * 0.52, 0);
      g.add(disc);

      disc.userData.isProblem = isProblem;
      spineDiscs.push(disc);
      spineBones.push(body, spinous, trans);
      return g;
    }

    // 요추 5개 (L1 ~ L5) - 전만곡
    vertebraWithDisc(spine1, .015, .012, .035, .03, true);
    vertebraWithDisc(spine1, .062, .010, .036, .02, true);
    vertebraWithDisc(spine2, .012, .006, .034, .01, true);
    vertebraWithDisc(spine2, .058, .003, .033, 0, false);
    vertebraWithDisc(spine2, .104, 0, .032, -.01, false);

    // 흉추 12개 (T1 ~ T12) - 후만곡
    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      const y = -.04 + v * .26;
      const z = -Math.sin(v * Math.PI) * .024;
      vertebraWithDisc(chest, y, z, .030 - v * .006, -.02 + v * .04, i >= 7);
    }

    // 경추 7개 (C1 ~ C7) - 전만곡
    for (let i = 0; i < 7; i++) {
      const v = i / 6;
      vertebraWithDisc(neck, -.04 + v * .14, Math.sin(v * Math.PI) * .012, .024 - v * .003, .03 - v * .04, i <= 3);
    }

    // 실제 해부학 골반
    hips.add(makeRealisticPelvis(boneMat));

    // 실제 해부학 흉곽
    chest.add(makeRealisticRibcage(boneMat));

    // 사지 골격
    ['L', 'R'].forEach((s, i) => {
      const isLeft = (i === 0);

      // 상완골
      const humerus = new THREE.Mesh(cyl(0.018, 0.016, 0.26, 12), boneMat);
      humerus.position.y = -0.13;
      J['arm' + s].add(humerus);

      // 요골·척골
      const forearm = new THREE.Mesh(cyl(0.014, 0.011, 0.24, 12), boneMat);
      forearm.position.y = -0.12;
      J['elbow' + s].add(forearm);

      // 손뼈
      const hand = new THREE.Mesh(box(0.052, 0.074, 0.018), boneMat);
      hand.position.set(0, -0.045, 0);
      J['hand' + s].add(hand);

      // 대퇴골 (대퇴골두 고관절 안착)
      J['hip' + s].add(makeRealisticFemur(boneMat, 0.40, isLeft));

      // 경골 & 비골
      J['knee' + s].add(makeRealisticLowerLeg(boneMat, 0.39, isLeft));

      // 발뼈 (종골 + 족궁)
      J['ankle' + s].add(makeRealisticFoot(boneMat));
    });

    // 두개골 & 안와 & 하악골
    const skull = new THREE.Mesh(sph(0.088, 20), boneMat);
    skull.scale.set(0.96, 1.12, 1.05);
    skull.position.set(0, 0.075, 0.008);
    head.add(skull);

    const mand = new THREE.Mesh(sph(0.056, 16), boneMat);
    mand.scale.set(0.94, 0.52, 0.95);
    mand.position.set(0, 0.026, 0.028);
    head.add(mand);

    [-1, 1].forEach(k => {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.020, 0.006, 8, 18), boneMat);
      orbit.position.set(0.032 * k, 0.085, 0.072);
      orbit.rotation.y = k * 0.18;
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
        m.uniforms.opacity.value = o * 0.24;
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
    const soundBtn = opts.soundBtn || stage.querySelector('#heroSoundBtn');
    const natureAudio = opts.natureAudio || stage.querySelector('#natureAudio');
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

    // 메디컬 해부학 조명
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

    /* ---------------- 음향 & 대화 및 자연 BGM 제어 ---------------- */
    let soundEnabled = false;

    function applyAudioBalance(isRunPhase) {
      if (!soundEnabled) return;
      if (isRunPhase) {
        if (video) {
          video.muted = false;
          video.volume = 1.0;
        }
        if (natureAudio) {
          // 조깅 영상 속 대화가 선명하고 또렷하게 들리도록 자연 BGM 볼륨 부드럽게 더킹
          natureAudio.volume = 0.18;
        }
      } else {
        if (video) {
          video.muted = true;
        }
        if (natureAudio) {
          // 3D 스캔 및 교정 단계: 산뜻한 숲속 새소리와 경쾌한 어쿠스틱 악기 BGM
          natureAudio.volume = 0.50;
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
        soundBtn.setAttribute('aria-label', '음향 켜기 (대화 및 자연 BGM)');
        soundBtn.title = '클릭하여 조깅 대화 및 자연 새소리 BGM 듣기';
      }
    }

    function enableSound() {
      if (soundEnabled) return;
      soundEnabled = true;
      updateSoundUI();
      if (natureAudio) {
        natureAudio.play().catch(() => {});
      }
      if (video) {
        video.muted = false;
        video.volume = 1.0;
        video.play().catch(() => {});
      }
      applyAudioBalance(stage.dataset.phase === 'run');
    }

    function disableSound() {
      soundEnabled = false;
      updateSoundUI();
      if (natureAudio) {
        natureAudio.pause();
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

    // 비디오 자동 재생 보장
    if (video) {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch(() => {});
    }

    // 브라우저 최초 제스처 시 비디오 재생 보장
    const unlockAutoplay = () => {
      if (video && video.paused) video.play().catch(() => {});
      window.removeEventListener('click', unlockAutoplay);
      window.removeEventListener('touchstart', unlockAutoplay);
    };
    window.addEventListener('click', unlockAutoplay, { once: true });
    window.addEventListener('touchstart', unlockAutoplay, { once: true });

    let lastPhase = '';
    function setPhase(p, main, sub) {
      if (p === lastPhase) return;
      // 조깅 영상 진입 시 0초부터 시작하여 남녀의 활기찬 대화 음성이 첫마디부터 생생하게 재생
      if (p === 'run' && lastPhase !== 'run') {
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
      const xrOut = seg(t, 9.2, 10.0);
      const runIn = seg(t, 9.4, 10.2);
      const runOut = seg(t, 20.0, 21.0);

      const xrVis = fadeIn * (1 - xrOut);

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

      /* 3D 인체 및 골격 자세 업데이트: 조깅 영상 단계에서는 완전히 감추어 뒷모습 노출 원천 차단 */
      const isRunPhase = (t >= 9.2 && t < 20.2);
      applyAudioBalance(isRunPhase);

      if (isRunPhase) {
        model.root.visible = false;
        canvasWrap.style.opacity = '0';
      } else {
        model.root.visible = xrVis > 0.01;
        canvasWrap.style.opacity = '1';
        applyBlend(model, straighten);
        // 정면과 반측면 위주로 자연스럽게 보여주어 뒷모습으로 돌아가지 않음
        model.root.rotation.y = reduce ? 0.35 : Math.sin(el * 0.45) * 0.45;
        setModelOpacity(model, xrVis);
      }

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

      if (!isRunPhase) {
        renderer.render(scene, camera);
      }
    }

    requestAnimationFrame(frame);

    return {
      pause() {
        if (!running) return;
        running = false;
        pausedAt = performance.now();
        if (video) video.pause();
        if (natureAudio) natureAudio.pause();
      },
      resume() {
        if (running) return;
        t0 += performance.now() - pausedAt;
        running = true;
        requestAnimationFrame(frame);
        if (video) video.play().catch(() => {});
        if (soundEnabled && natureAudio) natureAudio.play().catch(() => {});
        resize();
      },
      resize
    };
  }

  window.initHero = initHero;
})();
