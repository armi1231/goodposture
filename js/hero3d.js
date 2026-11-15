/* =========================================================
   메인 3D 체형 측정 및 실사 조깅 연출 (v8 - 실사 의료 해부학 3D)
   ---------------------------------------------------------
   1) 첨부 실사 해부학 의료 스캔 모델 (Front / Side / Back / SideLeft)
      - 첨부 고해상도 해부학 스캔 이미지를 3D 표면 메쉬에 정밀 투영
      - 은은한 반투명 X-ray 유리질 피부 & 프레넬 외곽 청록 광채
      - 내측 골격(골반, 척추, 흉곽, 사지)의 사실적 입체감 완벽 구현
   2) 자연스러운 3D 전신 회전 (Front -> Side -> Back -> SideLeft)
      - 0.0s ~ 3.4s: 정면 및 3/4 반측면 AI 스캔 (52점 불균형 측정)
      - 3.4s ~ 7.2s: 측면(Side Profile) 집중 조명하며 실시간 정렬 교정
      - 7.2s ~ 9.2s: 360도 전신 회전하며 이상적인 98점 자세 확인
   3) 실시간 3D 골격 자세 교정 (52점 -> 98점)
      - 거북목(24° 전방 쏠림 및 고개 숙임 -> 수직 정렬)
      - 굽은등(흉추 후만 혹 -> 황금 S-curve 교정)
      - 말린 어깨 & 비대칭(어깨 말림 펴지고 수평 정렬)
      - 골반 전방경사(중립 수평 밸런스 회복)
      - 구부정한 무릎(곧게 뻗은 11자 다리 교정)
      - 신장(키) 5cm 자연스러운 감압 확장
   4) 문제 디스크(경추 C5-C6, 요추 L4-L5) 경고등 점등
      - 불균형 시 주황/적색 경고 펄스 -> 교정 완료 시 바이오 에메랄드/청록색 전환
   5) 40대 남녀 실사 조깅 영상 + 대화 음성 + 자연 새소리/어쿠스틱 BGM
   ========================================================= */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* 실사 해부학 이미지 슬라이스 데이터 (FrontWidth, FrontCenter, SideDepth, SideCenter) */
  const SLICES = [
    [5.0,-2.0,13.0,6.0],[43.0,-1.0,55.0,5.0],[58.0,-0.5,71.0,5.0],[63.0,-1.0,79.0,5.0],
    [64.0,-0.5,83.0,5.0],[68.0,-0.5,82.0,5.5],[70.0,-0.5,87.0,1.0],[64.0,-0.5,85.0,-2.0],
    [53.0,0.0,75.0,-2.0],[46.0,-0.5,69.0,-2.0],[42.0,-0.5,68.0,-1.5],[42.0,-0.5,45.0,11.0],
    [46.0,-0.5,46.0,13.5],[68.0,-0.5,49.0,17.0],[106.0,-0.5,56.0,19.5],[140.0,-0.5,67.0,19.0],
    [155.0,-1.0,78.0,18.5],[162.0,-0.5,86.0,16.5],[167.0,-1.0,95.0,13.0],[169.0,-1.0,102.0,9.5],
    [169.0,-1.0,108.0,6.5],[167.0,-1.0,109.0,4.0],[167.0,-1.0,108.0,2.5],[170.0,-0.5,101.0,3.0],
    [172.0,-0.5,94.0,2.5],[172.0,-0.5,92.0,1.5],[175.0,-1.0,87.0,0.0],[179.0,-1.0,83.0,-1.0],
    [188.0,-0.5,79.0,-1.0],[194.0,-0.5,80.0,-0.5],[202.0,-0.5,77.0,-2.0],[206.0,-0.5,78.0,-1.5],
    [208.0,-0.5,81.0,0.0],[211.0,0.0,87.0,4.0],[213.0,-1.0,89.0,6.0],[215.0,-1.0,93.0,9.0],
    [219.0,-1.0,94.0,10.5],[225.0,-1.0,95.0,12.0],[234.0,-0.5,97.0,11.0],[242.0,-0.5,99.0,9.0],
    [256.0,-0.5,99.0,6.0],[264.0,-0.5,97.0,2.0],[272.0,-0.5,91.0,-2.0],[275.0,-1.0,89.0,-2.0],
    [259.0,-1.0,86.0,-1.5],[258.0,-0.5,81.0,1.0],[256.0,-0.5,77.0,2.0],[129.0,0.0,74.0,2.5],
    [124.0,0.5,71.0,3.0],[119.0,0.0,67.0,4.0],[113.0,0.0,63.0,5.0],[107.0,0.0,59.0,6.0],
    [103.0,0.0,56.0,7.5],[101.0,0.0,56.0,8.5],[101.0,0.0,56.0,9.5],[99.0,0.0,56.0,11.5],
    [99.0,0.0,56.0,14.5],[103.0,0.0,56.0,18.5],[107.0,0.0,57.0,21.0],[110.0,-0.5,59.0,22.0],
    [113.0,0.0,61.0,23.0],[115.0,0.0,62.0,24.5],[115.0,0.0,61.0,25.0],[112.0,0.5,59.0,25.0],
    [109.0,0.0,56.0,24.5],[103.0,0.0,52.0,24.5],[99.0,0.0,48.0,24.5],[94.0,0.5,44.0,23.5],
    [89.0,0.0,41.0,23.0],[87.0,0.0,39.0,23.0],[83.0,0.0,37.0,23.0],[81.0,0.0,36.0,22.5],
    [81.0,0.0,37.0,22.0],[82.0,-0.5,42.0,21.5],[85.0,0.0,49.0,20.0],[85.0,0.0,63.0,16.0],
    [91.0,0.0,79.0,11.0],[105.0,0.0,107.0,-2.0],[114.0,0.5,112.0,-5.5],[104.0,0.5,91.0,-11.0]
  ];

  function loadTextureSafe(url) {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /* ---------------- 사실적 해부학 3D 메쉬 및 변형 모델 생성 ---------------- */
  function createRealisticAnatomicalModel() {
    const root = new THREE.Group();

    // 4방위 정밀 텍스처 로드
    const textures = {
      front: loadTextureSafe('assets/hero/human_front.png?v=20261115_08'),
      side: loadTextureSafe('assets/hero/human_side.png?v=20261115_08'),
      back: loadTextureSafe('assets/hero/human_back.png?v=20261115_08'),
      sideLeft: loadTextureSafe('assets/hero/human_side_left.png?v=20261115_08')
    };

    const nSlices = SLICES.length; // 80
    const nRads = 64;
    const totalVerts = (nSlices + 1) * (nRads + 1);

    const positions = new Float32Array(totalVerts * 3);
    const basePositions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices = [];

    const SCALE = 0.0028;
    const HEIGHT = 1.90;

    // 기저 3D 체형 메쉬 좌표 생성
    let vIdx = 0;
    for (let i = 0; i <= nSlices; i++) {
      const sliceIdx = Math.min(i, nSlices - 1);
      const s = SLICES[sliceIdx];
      const fw = (s[0] || 20) * SCALE;
      const fc = (s[1] || 0) * SCALE;
      const sd = (s[2] || 20) * SCALE;
      const sc = (s[3] || 0) * SCALE;

      const v = 1.0 - (i / nSlices);
      const y0 = v * HEIGHT;

      for (let j = 0; j <= nRads; j++) {
        const phi = (j / nRads) * Math.PI * 2;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        const x0 = fc + (fw * 0.5) * sinP;
        const z0 = sc + (sd * 0.5) * cosP;

        const pOffset = vIdx * 3;
        positions[pOffset] = x0;
        positions[pOffset + 1] = y0;
        positions[pOffset + 2] = z0;

        basePositions[pOffset] = x0;
        basePositions[pOffset + 1] = y0;
        basePositions[pOffset + 2] = z0;

        normals[pOffset] = sinP;
        normals[pOffset + 1] = 0;
        normals[pOffset + 2] = cosP;

        const uvOffset = vIdx * 2;
        uvs[uvOffset] = j / nRads;
        uvs[uvOffset + 1] = v;

        vIdx++;
      }
    }

    // 메쉬 인덱스 생성
    for (let i = 0; i < nSlices; i++) {
      for (let j = 0; j < nRads; j++) {
        const row1 = i * (nRads + 1);
        const row2 = (i + 1) * (nRads + 1);
        const a = row1 + j;
        const b = row2 + j;
        const c = row2 + (j + 1);
        const d = row1 + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    // 멀티 앵글 3D 셰이더 머티리얼 (의료 X-ray 프레넬 광채)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        mapFront: { value: textures.front },
        mapSide: { value: textures.side },
        mapBack: { value: textures.back },
        mapSideLeft: { value: textures.sideLeft },
        straighten: { value: 0.0 },
        scanY: { value: 1.0 },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vLocalPos = position;
          vLocalNormal = normal;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D mapFront;
        uniform sampler2D mapSide;
        uniform sampler2D mapBack;
        uniform sampler2D mapSideLeft;
        uniform float straighten;
        uniform float scanY;
        uniform float opacity;

        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec2 vUv;

        void main() {
          float vy = clamp(vLocalPos.y / 1.904, 0.0, 1.0);

          // 3D 공간 좌표 -> 텍스처 UV 매핑
          float uFront = clamp((vLocalPos.x / 0.896) + 0.5, 0.0, 1.0);
          float uBack  = clamp((-vLocalPos.x / 0.896) + 0.5, 0.0, 1.0);
          float uSide  = clamp((vLocalPos.z / 0.896) + 0.5, 0.0, 1.0);
          float uSideL = clamp((-vLocalPos.z / 0.896) + 0.5, 0.0, 1.0);

          vec4 cFront = texture2D(mapFront, vec2(uFront, vy));
          vec4 cBack  = texture2D(mapBack,  vec2(uBack,  vy));
          vec4 cSide  = texture2D(mapSide,  vec2(uSide,  vy));
          vec4 cSideL = texture2D(mapSideLeft, vec2(uSideL, vy));

          // 국소 표면 법선 기반 4방향 블렌딩
          vec3 ln = normalize(vLocalNormal);
          float wFront = pow(max(0.0, ln.z), 2.2);
          float wBack  = pow(max(0.0, -ln.z), 2.2);
          float wSide  = pow(max(0.0, -ln.x), 2.2);
          float wSideL = pow(max(0.0, ln.x), 2.2);

          float totalW = wFront + wBack + wSide + wSideL + 0.0001;
          vec4 col = (cFront * wFront + cBack * wBack + cSide * wSide + cSideL * wSideL) / totalW;

          // 투명 배경 영역 즉시 폐기 (팔과 허리, 다리 사이 빈공간 보존)
          if (col.a < 0.06) discard;

          // 의료 3D X-ray 반투명 프레넬 림 광채
          float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
          vec3 rimColor = mix(vec3(0.38, 0.92, 1.0), vec3(0.48, 1.0, 0.72), straighten);
          vec3 rgb = mix(col.rgb, rimColor, fresnel * 0.38);

          // AI 수직 스캔 레이저 빔 투광 효과
          float dScan = abs(vLocalPos.y - scanY);
          if (dScan < 0.038) {
            float laser = (1.0 - dScan / 0.038);
            rgb += vec3(0.45, 1.0, 0.72) * laser * 0.70;
          }

          gl_FragColor = vec4(rgb, col.a * opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    });

    const mesh = new THREE.Mesh(geom, material);
    root.add(mesh);

    // 척추 문제 디스크 경고등 (경추 C5-C6, 요추 L4-L5)
    function createWarningDisc(radius) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, radius * 0.22, 16, 32),
        new THREE.MeshStandardMaterial({
          color: 0xff4400,
          emissive: 0xff2200,
          emissiveIntensity: 1.4,
          transparent: true,
          opacity: 0.92
        })
      );
      ring.rotation.x = Math.PI / 2;
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.55, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.95 })
      );
      g.add(ring, core);
      return { group: g, ring, core };
    }

    const discNeck = createWarningDisc(0.048);
    const discLumbar = createWarningDisc(0.056);
    root.add(discNeck.group);
    root.add(discLumbar.group);

    // 단일 좌표 변형 함수 (디스크 위치 추적용)
    function deformPoint(x0, y0, z0, straighten) {
      const bad = 1.0 - straighten;
      const heightLoss = bad * 0.05 * Math.min(1.0, y0 / 1.5);
      let y = y0 - heightLoss;
      let z = z0;
      let x = x0;

      // 무릎
      const kneeDist = Math.abs(y - 0.52);
      if (kneeDist < 0.28) {
        z += bad * Math.sin((1.0 - kneeDist / 0.28) * Math.PI * 0.5) * 0.12;
      }
      // 골반
      const pelvisDist = Math.abs(y - 0.96);
      if (pelvisDist < 0.16) {
        z += bad * Math.cos((pelvisDist / 0.16) * Math.PI * 0.5) * 0.06;
      }
      // 굽은등
      const backDist = Math.abs(y - 1.34);
      if (backDist < 0.18) {
        z -= bad * Math.cos((backDist / 0.18) * Math.PI * 0.5) * 0.13;
      }
      // 어깨
      const shoulderDist = Math.abs(y - 1.52);
      if (shoulderDist < 0.10) {
        const f = Math.cos((shoulderDist / 0.10) * Math.PI * 0.5);
        if (Math.abs(x0) > 0.05) z += bad * f * 0.09;
        if (x0 > 0.0) y -= bad * f * 0.028;
      }
      // 거북목
      if (y > 1.55) {
        const neckT = Math.min(1.0, (y - 1.55) / 0.35);
        const fwd = neckT * neckT * 0.20 * bad;
        z += fwd;
        y -= bad * neckT * 0.035;

        const dy = y - 1.62;
        const dz = z - (z0 + fwd);
        const p = -bad * 0.36;
        y = 1.62 + (dy * Math.cos(p) - dz * Math.sin(p));
        z = (z0 + fwd) + (dy * Math.sin(p) + dz * Math.cos(p));
      }
      return new THREE.Vector3(x, y, z);
    }

    // 실시간 3D 골격 자세 교정 (거북목, 굽은등, 말린어깨, 무릎 굽힘 -> 바른자세)
    function applyPostureDeformation(straighten) {
      const bad = 1.0 - straighten;
      const posAttr = geom.attributes.position;
      const count = totalVerts;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const x0 = basePositions[idx];
        const y0 = basePositions[idx + 1];
        const z0 = basePositions[idx + 2];

        // 1. 신장 단축 (나쁜 자세 시 키 5cm 줄어듦)
        const heightLoss = bad * 0.05 * Math.min(1.0, y0 / 1.5);
        let curY = y0 - heightLoss;
        let curZ = z0;
        let curX = x0;

        // 2. 구부정한 무릎 (Knee Flexion 21°)
        const kneeDist = Math.abs(curY - 0.52);
        if (kneeDist < 0.28) {
          const kf = Math.sin((1.0 - kneeDist / 0.28) * Math.PI * 0.5);
          curZ += bad * kf * 0.12;
        }

        // 3. 골반 전방경사 (Pelvic Tilt 14°)
        const pelvisDist = Math.abs(curY - 0.96);
        if (pelvisDist < 0.16) {
          const pf = Math.cos((pelvisDist / 0.16) * Math.PI * 0.5);
          curZ += bad * pf * 0.06;
        }

        // 4. 굽은 등 (Thoracic Kyphosis 18°)
        const backDist = Math.abs(curY - 1.34);
        if (backDist < 0.18) {
          const bf = Math.cos((backDist / 0.18) * Math.PI * 0.5);
          curZ -= bad * bf * 0.13;
        }

        // 5. 말린 어깨 및 우측 어깨 처짐 (Rounded Shoulders 18°)
        const shoulderDist = Math.abs(curY - 1.52);
        if (shoulderDist < 0.10) {
          const sf = Math.cos((shoulderDist / 0.10) * Math.PI * 0.5);
          if (Math.abs(x0) > 0.05) curZ += bad * sf * 0.09;
          if (x0 > 0.0) curY -= bad * sf * 0.028;
        }

        // 6. 거북목 (Forward Head Posture 24° & 고개 숙임)
        if (curY > 1.55) {
          const neckT = Math.min(1.0, (curY - 1.55) / 0.35);
          const fwd = neckT * neckT * 0.20 * bad;
          curZ += fwd;
          curY -= bad * neckT * 0.035;

          const dy = curY - 1.62;
          const dz = curZ - (z0 + fwd);
          const p = -bad * 0.36;
          curY = 1.62 + (dy * Math.cos(p) - dz * Math.sin(p));
          curZ = (z0 + fwd) + (dy * Math.sin(p) + dz * Math.cos(p));
        }

        posAttr.setXYZ(i, curX, curY, curZ);
      }

      posAttr.needsUpdate = true;
      geom.computeVertexNormals();

      // 디스크 위치 추적 및 발광 상태 업데이트
      const pNeck = deformPoint(0, 1.48, 0.02, straighten);
      const pLumbar = deformPoint(0, 0.96, -0.01, straighten);
      discNeck.group.position.copy(pNeck);
      discLumbar.group.position.copy(pLumbar);

      // 경고등 색상 변화: 불균형(주황) -> 바른자세(에메랄드/청록)
      const isWarn = straighten < 0.85;
      const warnColor = new THREE.Color(0xff4400);
      const okColor = new THREE.Color(0x00e5ff);
      const activeColor = warnColor.clone().lerp(okColor, straighten);

      [discNeck, discLumbar].forEach((d, idx) => {
        d.ring.material.color.copy(activeColor);
        d.ring.material.emissive.copy(activeColor);
        if (isWarn) {
          const pulse = 1.0 + Math.sin(performance.now() * 0.007 + idx * 1.5) * 0.22;
          d.group.scale.setScalar(pulse);
        } else {
          d.group.scale.setScalar(1.0);
        }
      });
    }

    return {
      root,
      mesh,
      update(straighten, scanY, opacity) {
        material.uniforms.straighten.value = straighten;
        material.uniforms.scanY.value = scanY;
        material.uniforms.opacity.value = opacity;
        applyPostureDeformation(straighten);
      }
    };
  }

  /* ---------------- 메인 히어로 3D 초기화 ---------------- */
  function initHero(opts) {
    opts = opts || {};
    const stage = opts.stage || document.getElementById('heroStage');
    const canvasWrap = opts.canvasWrap || document.getElementById('heroCanvas');
    if (!stage || !canvasWrap) return null;

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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x0a2f35, 1.0));
    const key = new THREE.DirectionalLight(0xfff8ee, 1.25);
    key.position.set(2.4, 4.2, 3.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 1.1);
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

    /* 실사 해부학 의료 스캔 3D 모델 */
    const model = createRealisticAnatomicalModel();
    scene.add(model.root);

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

    /* 21초 전체 루프: 인체 체형 측정 -> 바른자세 교정 -> 자세 98점 -> 40대 남녀 실사 조깅 영상 */
    const LOOP = 21;
    let running = true, t0 = performance.now(), pausedAt = 0, cycleStart = 0;

    function frame(nowMs) {
      if (!running) return;
      requestAnimationFrame(frame);
      const el = (nowMs - t0) / 1000;
      if (el - cycleStart >= LOOP) cycleStart = el;
      const t = reduce ? 8 : el - cycleStart;

      const fadeIn = seg(t, 0, 0.8);
      const xrOut = seg(t, 9.2, 9.9);
      const xrVis = fadeIn * (1 - xrOut);

      let straighten = 0.0;

      // 단계별 순백색 타이핑 문구 및 3D 회전 제어
      if (t < 3.4) {
        // [1단계: AI 체형 측정] 52점 불균형 스캔
        straighten = 0.0;
        setPhase('scan', 'AI 해부학 정밀 체형 측정', '경추 24° · 굽은등 · 골반 비대칭 분석');
        // 정면 및 3/4 반측면 호흡 회전
        model.root.rotation.y = reduce ? 0.25 : Math.sin(el * 0.7) * 0.24;
      } else if (t < 7.2) {
        // [2단계: 실시간 교정] 52점 -> 98점 드라마틱 자세 정렬
        straighten = ease(seg(t, 3.8, 7.0));
        setPhase('fix', '입는 바른자세 · 실시간 정렬 교정', '머리를 들고 · 어깨를 펴고 · 골반의 중심을 세웁니다');
        // 측면(Side Profile 85°)으로 부드럽게 회전하여 거북목과 굽은등이 펴지는 드라마틱한 변화 집중 조명
        const toSide = ease(seg(t, 3.4, 4.8));
        model.root.rotation.y = reduce ? 0.25 : lerp(0.18, Math.PI * 0.48, toSide);
      } else if (t < 9.2) {
        // [3단계: 자세 완성] 98점 이상적 밸런스 회복
        straighten = 1.0;
        setPhase('done', '자세점수 98점 · 이상적인 밸런스 회복', '척추 24마디 완벽 정렬 · 바른 자세 완성');
        // 측면 -> 후면(180°) -> 반측면 -> 정면(360°) 전신 회전 확인
        const spin = ease(seg(t, 7.2, 9.1));
        model.root.rotation.y = reduce ? 0.25 : lerp(Math.PI * 0.48, Math.PI * 2.0, spin);
      } else {
        // [4단계: 40대 남녀 실사 조깅 영상]
        straighten = 1.0;
        setPhase('run', '', '');
      }

      const isRunPhase = (t >= 9.2 && t < 20.2);
      applyAudioBalance(isRunPhase);

      /* 수직 스캔 레이저 라인 */
      const sy = .1 + (Math.sin(el * 1.5) * .5 + .5) * 1.72;
      scan.position.set(0, sy, .26);
      scanGlow.position.set(0, sy, .25);
      scan.material.opacity = .95 * xrVis * (1 - straighten * .45);
      scanGlow.material.opacity = .16 * xrVis;

      floor.visible = xrVis > .01;
      ring.material.opacity = .55 * xrVis;
      polar.material.opacity = .3 * xrVis;
      ring.scale.setScalar(1 + Math.sin(el * 3) * .03);

      /* 3D 실사 해부학 모델 업데이트 */
      if (isRunPhase) {
        model.root.visible = false;
        canvasWrap.style.opacity = '0';
      } else {
        model.root.visible = xrVis > 0.01;
        canvasWrap.style.opacity = '1';
        model.update(straighten, sy, xrVis);
      }

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
