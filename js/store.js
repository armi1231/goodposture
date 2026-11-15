/* =========================================================
   데이터 저장소 (브라우저 IndexedDB)
   ---------------------------------------------------------
   ※ 순수 HTML/CSS/JS만으로는 서버가 없기 때문에, 이 파일은
     "이 브라우저 안에" 데이터를 저장합니다.
     실제 운영(여러 사람이 같은 회원·게시판을 공유)하려면
     이 파일의 load()/persist() 부분만 Firebase·Supabase 등
     서버 저장소로 교체하면 됩니다. 나머지 화면 코드는 그대로 둡니다.
   ========================================================= */
(function () {
  const DB_NAME = 'barunjase-platform';
  const DB_VER = 1;
  const KEY = 'db';
  const SESSION_KEY = 'bjs_session';

  /* ---------- IndexedDB 래퍼 (실패 시 localStorage) ---------- */
  function idb() {
    return new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function loadLocal() {
    try {
      const db = await idb();
      return await new Promise((res, rej) => {
        const t = db.transaction('kv', 'readonly').objectStore('kv').get(KEY);
        t.onsuccess = () => res(t.result || null);
        t.onerror = () => rej(t.error);
      });
    } catch (e) {
      const raw = localStorage.getItem(DB_NAME);
      return raw ? JSON.parse(raw) : null;
    }
  }
  async function persistLocal(data) {
    try {
      const db = await idb();
      await new Promise((res, rej) => {
        const t = db.transaction('kv', 'readwrite');
        t.objectStore('kv').put(data, KEY);
        t.oncomplete = res; t.onerror = () => rej(t.error);
      });
    } catch (e) {
      localStorage.setItem(DB_NAME, JSON.stringify(data));
    }
  }

  /* ---------- Supabase 클라우드 저장소 연동 ---------- */
  let _sbClient = null;
  function getSupabaseConfig() {
    const C = window.SITE_CONFIG || {};
    let url = C.supabaseUrl || 'https://jurwrizrcfzhzvfpgkot.supabase.co';
    let key = C.supabaseAnonKey || 'sb_publishable_DlVWQXL7L0adgtjsZZryiQ_Ufs2_8jH';
    try {
      const saved = localStorage.getItem('bjs_supabase');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.url) url = p.url;
        if (p.key) key = p.key;
      }
    } catch (e) {}
    return { url, key };
  }

  function getSupabase() {
    if (_sbClient) return _sbClient;
    const { url, key } = getSupabaseConfig();
    if (window.supabase && url && key) {
      try {
        _sbClient = window.supabase.createClient(url, key);
        return _sbClient;
      } catch (e) {
        console.warn('[Supabase] Init error:', e);
      }
    }
    return null;
  }

  async function loadFromSupabase() {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb.from('app_data').select('data').eq('key', KEY).maybeSingle();
      if (error) {
        if (error.code !== 'PGRST205') console.warn('[Supabase] Load warning:', error.message || error);
        return null;
      }
      return data && data.data ? data.data : null;
    } catch (e) {
      console.warn('[Supabase] Fetch failed:', e);
      return null;
    }
  }

  async function persistToSupabase(data) {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('app_data').upsert({
        key: KEY,
        data: data,
        updated_at: new Date().toISOString()
      });
      if (error) {
        if (error.code !== 'PGRST205') console.warn('[Supabase] Upsert warning:', error.message || error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[Supabase] Persist failed:', e);
      return false;
    }
  }

  /* 하이브리드 로드 & 저장: Supabase 원격 우선 + IndexedDB 로컬 캐시/오프라인 지원 */
  async function load() {
    try {
      const remote = await loadFromSupabase();
      if (remote) {
        persistLocal(remote).catch(() => {});
        return remote;
      }
    } catch (e) {}
    return await loadLocal();
  }

  async function persist(data) {
    await persistLocal(data);
    persistToSupabase(data).catch(() => {});
  }

  /* ---------- 유틸 ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();

  async function hash(str) {
    const salt = 'bjs::';
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    let h1 = 0x811c9dc5, h2 = 0x1234567;
    const s = salt + str;
    for (let i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619);
      h2 = Math.imul(h2 ^ s.charCodeAt(i), 2654435761);
    }
    return 'f' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  /* ---------- 초기 데이터 ---------- */
  function seed() {
    const C = window.SITE_CONFIG;
    const t = now();
    return {
      version: 5,
      settings: {
        formUrl: C.formUrl, eduFee: C.eduFee, bankInfo: C.bankInfo,
        appIos: C.appIos, appAndroid: C.appAndroid, rentalUrl: C.rentalUrl,
        heroJoggerVideo: C.heroJoggerVideo, contactPhone: C.contactPhone, kakaoId: C.kakaoId,
        quizUrl: C.quizUrl, lecture1Url: C.lecture1Url,
        guideName: C.guide.name, guideTitle: C.guide.title,
        recommenderName: C.recommender.name, recommenderNo: C.recommender.no,
        supabaseUrl: C.supabaseUrl || 'https://jurwrizrcfzhzvfpgkot.supabase.co',
        supabaseAnonKey: C.supabaseAnonKey || ''
      },
      users: [],
      rentalProducts: [
        { id: uid(), code: 'R1090', name: 'R1090 스킨', color: '스킨', kind: 'single', price: 37800, img: 'assets/products/r1090-skin.jpg',
          desc: '허리·복부·골반을 감싸는 하의형 착용 제품 (단품 · 중체)', contractUrl: C.qr.R1090, visible: true, order: 1 },
        { id: uid(), code: 'R1090', name: 'R1090 블랙', color: '블랙', kind: 'single', price: 37800, img: 'assets/products/r1090-black.jpg',
          desc: '허리·복부·골반을 감싸는 하의형 착용 제품 (단품 · 중체)', contractUrl: C.qr.R1090, visible: true, order: 2 },
        { id: uid(), code: 'SM880', name: 'SM880', color: '블랙', kind: 'single', price: 37800, img: 'assets/products/sm880.jpg',
          desc: '양면 착용 컬러 스포츠 테이핑, 바른 상체 자세 지원 (단품 · 상체)', contractUrl: C.qr.SM880, visible: true, order: 3 },
        { id: uid(), code: 'BB484', name: 'BB484 스킨', color: '스킨', kind: 'single', price: 19900, img: 'assets/products/bb484-skin.jpg',
          desc: '여성의 가슴 무게를 견인·지지해 바른 상체 자세를 돕는 제품 (단품 · 상체)', contractUrl: C.qr.BB484, visible: true, order: 4 },
        { id: uid(), code: 'BB484', name: 'BB484 블랙', color: '블랙', kind: 'single', price: 19900, img: 'assets/products/bb484-black.jpg',
          desc: '여성의 가슴 무게를 견인·지지해 바른 상체 자세를 돕는 제품 (단품 · 상체)', contractUrl: C.qr.BB484, visible: true, order: 5 },
        { id: uid(), code: 'BB484×2', name: 'BB484 2개 구성', color: '', kind: 'bundle', price: 39800,
          img: 'assets/products/bb484-skin.jpg', img2: 'assets/products/bb484-black.jpg',
          desc: '상체 BB484 두 개를 함께 쓰는 2개 구성 (스킨 + 블랙)', contractUrl: C.qr.BB484x2, visible: true, order: 6 },
        { id: uid(), code: 'BB484+R1090', name: 'BB484 + R1090', color: '', kind: 'bundle', price: 57700,
          img: 'assets/products/bb484-skin.jpg', img2: 'assets/products/r1090-skin.jpg',
          desc: '상체 BB484 + 중체 R1090을 함께 쓰는 2개 구성', contractUrl: C.qr.BB484_R1090, visible: true, order: 7 },
        { id: uid(), code: 'BB484+SM880', name: 'BB484 + SM880', color: '', kind: 'bundle', price: 57700,
          img: 'assets/products/bb484-skin.jpg', img2: 'assets/products/sm880.jpg',
          desc: '상체 BB484 + 상체 SM880을 함께 쓰는 2개 구성', contractUrl: C.qr.BB484_SM880, visible: true, order: 8 },
        { id: uid(), code: 'R1090+SM880', name: 'R1090 + SM880', color: '', kind: 'bundle', price: 75600,
          img: 'assets/products/r1090-skin.jpg', img2: 'assets/products/sm880.jpg',
          desc: '중체 R1090 + 상체 SM880을 함께 쓰는 2개 구성', contractUrl: C.qr.R1090_SM880, visible: true, order: 9 }
      ],
      materials: [
        { id: uid(), type: 'doc', title: '착한 창업 안내서 (최종본)', desc: '바른자세 렌탈 플랫폼 창업 안내 · 2026.10.21',
          pages: ['assets/brochure/p01.jpg', 'assets/brochure/p03.jpg', 'assets/brochure/p04.jpg', 'assets/brochure/p05.jpg',
                  'assets/brochure/p06.jpg', 'assets/brochure/p07.jpg', 'assets/brochure/p08.jpg'], url: '', createdAt: t }
      ],
      lectures: [
        /* 1단계: 온라인 입문교육 · 3시간 (01~09강) */
        { id: uid(), part: 1, order: 1, period: 1,
          title: '1교시 · 회사와 사업 이해 (01~03강)', minutes: 60,
          url: C.lecture1Url, quizUrl: C.quizUrl,
          subLectures: [
            '01강: 착한창업의 목적과 렌탈 플랫폼 사업자의 역할',
            '02강: 슬리밍고그룹 · 연구소와 제품 개발·공급 체계',
            '03강: 특허 · 인증 · 공식자료를 이해하고 활용하는 방법'
          ],
          activity: '회사와 사업에 대한 확인 퀴즈를 풀고, 내가 하는 일을 소개하는 30초 설명을 준비합니다.',
          desc: '착한창업의 목적과 가치 · 슬리밍고 연구개발 체계 · 특허/인증 공식자료 활용법 (1교시 60분 통합 영상 + 확인 퀴즈)' },
        { id: uid(), part: 1, order: 2, period: 2,
          title: '2교시 · 바른자세와 제품 기초 (04~06강)', minutes: 60, url: '',
          subLectures: [
            '04강: 바른자세의 개념과 일상생활 속 자세 습관',
            '05강: 목 · 어깨 · 허리 · 골반 · 다리의 생활 불편을 듣는 방법',
            '06강: R1090 · BB484 · 렌탈용 SM880의 특징과 차이'
          ],
          activity: '세 제품의 특징을 비교하고, 관심 있는 제품 한 가지를 쉬운 말로 설명해 봅니다.',
          desc: '바른자세의 개념과 일상 습관 · 부위별 불편 청취법 · R1090/BB484/SM880 제품 특징 비교' },
        { id: uid(), part: 1, order: 3, period: 3,
          title: '3교시 · 첫 고객 연결 (07~09강)', minutes: 60, url: '',
          subLectures: [
            '07강: 사이즈 확인 · 셀프시착 · 기본 관리와 착용 시 주의사항',
            '08강: 고객 초대 · 매장 체험 예약 · 전문헬퍼 연결 방법',
            '09강: 렌탈 신청의 흐름과 교육 이후 활동 준비'
          ],
          activity: '고객 초대 문구와 체험 예약 내용을 작성하고, 첫 고객을 만나는 과정을 연습합니다.',
          desc: '사이즈 확인 및 셀프시착 · 고객 초대와 매장 예약 · 렌탈 신청 흐름과 실무 준비' },

        /* 2단계: 온라인 실무교육 · 6시간 (10~27강) */
        { id: uid(), part: 2, order: 4, period: 4,
          title: '4교시 · 제품 상세 실무 (10~12강)', minutes: 60, url: '',
          subLectures: [
            '10강: R1090: 구성 · 사이즈 · 입고 벗는 방법',
            '11강: BB484: 구성 · 컵과 둘레 · 조절과 착용 확인',
            '12강: 렌탈용 SM880: 사양 · 착용 방향 · 지퍼 · 착탈의'
          ],
          desc: 'R1090/BB484/SM880 제품별 세부 규격, 착용 방향 및 올바른 착용·탈의 실무' },
        { id: uid(), part: 2, order: 5, period: 5,
          title: '5교시 · 측정과 시착 실무 (13~15강)', minutes: 60, url: '',
          subLectures: [
            '13강: 고객 동의 · 측정 위치 · 공식 사이즈표 활용',
            '14강: 고객 시착 지원과 착용 상태 · 편안함 확인',
            '15강: 잘못된 착용 사례와 불편 발생 시 대응'
          ],
          desc: '체형 측정 위치와 공식 사이즈표 · 고객 시착 피팅 지원 · 오착용 사례 및 대응법' },
        { id: uid(), part: 2, order: 6, period: 6,
          title: '6교시 · 관리와 사례 활용 (16~18강)', minutes: 60, url: '',
          subLectures: [
            '16강: 제품별 세탁 · 건조 · 보관 방법',
            '17강: 시연복 대여 · 반납 · 위생 관리',
            '18강: 고객 사례 · 비포애프터 · 공식 영상 활용'
          ],
          desc: '제품별 세탁·위생 관리 · 시연복 운영 기준 · 고객 비포애프터 및 공식 영상 활용법' },
        { id: uid(), part: 2, order: 7, period: 7,
          title: '7교시 · 고객 상담 실무 (19~21강)', minutes: 60, url: '',
          subLectures: [
            '19강: 고객의 필요를 듣는 질문과 경청',
            '20강: 제품 · 비용 설명과 고객 질문 응대',
            '21강: 매장 · 숍인숍 · 무점포 활동과 PA 상담 연결'
          ],
          desc: '고객 필요 경청 대화법 · 제품/비용 설명 스크립트 · 무점포·숍인숍 활동과 PA 협업' },
        { id: uid(), part: 2, order: 8, period: 8,
          title: '8교시 · 계약과 정산 실무 (22~24강)', minutes: 60, url: '',
          subLectures: [
            '22강: 렌탈 신청 · 동의 · 심사 · 계약 · 출고 절차',
            '23강: 계약기간 · 총액 · 교환 · 수리 · 취소 문의 안내',
            '24강: 사업자 유형별 수수료와 정산명세 확인'
          ],
          desc: '렌탈 계약·출고 5단계 절차 · 무상수리/교환/취소 규정 · 사업자 수수료 및 정산 체계' },
        { id: uid(), part: 2, order: 9, period: 9,
          title: '9교시 · 고객관리와 첫 30일 (25~27강)', minutes: 60, url: '',
          subLectures: [
            '25강: 제품 인수 안내 · 첫 사용 점검 · 문의 응대',
            '26강: 고객관리 기록 · 예약 · 홍보자료 활용',
            '27강: 종합 복습 · 학습 확인 · 첫 30일 활동계획'
          ],
          desc: '제품 인수 후 사용 점검 · 고객 관리 기록과 홍보자료 활용 · 첫 30일 실천 로드맵' }
      ],
      stores: [
        { id: uid(), name: '카페 드 슬리밍고 검단신도시점', region: '인천', naverUrl: 'https://naver.me/5eUNl5fj', address: '', phone: '', img: '' },
        { id: uid(), name: '카페 드 슬리밍고 합정역점', region: '서울', naverUrl: 'https://naver.me/xDJ2TZG7', address: '', phone: '', img: '' },
        { id: uid(), name: '카페 드 슬리밍고 동탄파라곤점', region: '경기', naverUrl: 'https://naver.me/xucy9APl', address: '', phone: '', img: '' },
        { id: uid(), name: '카페 드 슬리밍고 강남점', region: '서울', naverUrl: 'https://naver.me/xJixXHhV', address: '', phone: '', img: '' },
        { id: uid(), name: '카페 드 슬리밍고 제주중앙점', region: '제주', naverUrl: 'https://naver.me/xk1Pw0WA', address: '', phone: '', img: '' },
        { id: uid(), name: '카페 드 슬리밍고 울산남구점', region: '울산', naverUrl: 'https://naver.me/5mIoKouD', address: '', phone: '', img: '' }
      ],
      posts: { guestbook: [], consult: [], apply: [] }
    };
  }

  /* ---------- 공개 API ---------- */
  const Store = {
    data: null,
    uid, now, hash,

    async init() {
      this.data = await load();
      if (!this.data) this.data = seed();
      this.migrate();
      // 관리자 계정이 없으면 생성
      if (!this.data.users.some(u => u.isAdmin)) {
        const A = window.SITE_CONFIG.admin;
        this.data.users.push({
          id: uid(), loginId: A.loginId, pw: await hash(A.password), name: '관리자', birth: '', phone: '', address: '',
          gender: '', refName: '', refNo: '', joinedAt: now(), grade: 'dream', isAdmin: true, progress: {}
        });
      }
      await this.save();
    },
    save() { return persist(this.data); },

    /* 이전 버전 데이터 보정 */
    migrate() {
      const d = this.data, C = window.SITE_CONFIG, s = d.settings;
      if ((d.version || 1) < 2) {
        if (!s.contactPhone) s.contactPhone = C.contactPhone;
        if (!s.kakaoId) s.kakaoId = C.kakaoId;
        if (!s.guideName) s.guideName = C.guide.name;
        if (!s.guideTitle) s.guideTitle = C.guide.title;
        if (!s.heroJoggerVideo && C.heroJoggerVideo) s.heroJoggerVideo = C.heroJoggerVideo;
        d.rentalProducts.forEach(p => { if (p.code === 'SM880' && p.color === '네이비') p.color = '블랙'; });
        d.version = 2;
      }
      /* v3 — (1) 첨부 PDF의 착한렌탈 접속 QR 링크 연결
                (2) 2개 구성 상품 4종 추가
                (3) 온라인교육 1강 영상·퀴즈 링크
                (4) 예전 '수강 완료' 문자열 기록을 시청률 객체로 변환 */
      if ((d.version || 1) < 3) {
        const Q = (C && C.qr) || {};
        const byCode = { R1090: Q.R1090, SM880: Q.SM880, BB484: Q.BB484 };
        (d.rentalProducts || []).forEach(p => {
          if (!p.kind) p.kind = 'single';
          if (!p.contractUrl && p.kind !== 'bundle' && byCode[p.code]) p.contractUrl = byCode[p.code];
          if (!p.desc) p.desc = '';
        });
        const has = code => (d.rentalProducts || []).some(p => p.code === code && p.kind === 'bundle');
        const bundles = [
          ['BB484×2', 'BB484 2개 구성', 39800, 'assets/products/bb484-skin.jpg', 'assets/products/bb484-black.jpg',
            '상체 BB484 두 개를 함께 쓰는 2개 구성 (스킨 + 블랙)', Q.BB484x2],
          ['BB484+R1090', 'BB484 + R1090', 57700, 'assets/products/bb484-skin.jpg', 'assets/products/r1090-skin.jpg',
            '상체 BB484 + 중체 R1090을 함께 쓰는 2개 구성', Q.BB484_R1090],
          ['BB484+SM880', 'BB484 + SM880', 57700, 'assets/products/bb484-skin.jpg', 'assets/products/sm880.jpg',
            '상체 BB484 + 상체 SM880을 함께 쓰는 2개 구성', Q.BB484_SM880],
          ['R1090+SM880', 'R1090 + SM880', 75600, 'assets/products/r1090-skin.jpg', 'assets/products/sm880.jpg',
            '중체 R1090 + 상체 SM880을 함께 쓰는 2개 구성', Q.R1090_SM880]
        ];
        let ord = (d.rentalProducts || []).length;
        bundles.forEach(b => {
          if (has(b[0])) return;
          ord += 1;
          d.rentalProducts.push({ id: uid(), code: b[0], name: b[1], color: '', kind: 'bundle', price: b[2],
            img: b[3], img2: b[4], desc: b[5], contractUrl: b[6], visible: true, order: ord });
        });
        if (!s.quizUrl) s.quizUrl = C.quizUrl;
        if (!s.lecture1Url) s.lecture1Url = C.lecture1Url;
        const l1 = (d.lectures || []).filter(l => l.part === 1).sort((a, b) => a.order - b.order)[0];
        if (l1) {
          if (!l1.url) l1.url = C.lecture1Url;
          if (!l1.quizUrl) l1.quizUrl = C.quizUrl;
          if (l1.minutes !== 60) l1.minutes = 60;
        }
        (d.users || []).forEach(u => {
          if (!u.progress) return;
          Object.keys(u.progress).forEach(k => {
            const v = u.progress[k];
            if (typeof v === 'string') u.progress[k] = { pct: 100, done: true, quizAt: v, updatedAt: v };
          });
        });
        d.version = 3;
      }
      /* v4 — 메인 조깅 실사 영상 캐시 무효화 및 신규 영상(joggers_v6.mp4) 자동 갱신 */
      if ((d.version || 1) < 4) {
        s.heroJoggerVideo = 'assets/hero/joggers_v6.mp4?v=20261115_07';
        d.version = 4;
      }
      /* v5 — 12시간 정규 교육과정 9개 교시(27강) 및 플레이슬리밍고 2.1 커리큘럼 동기화 */
      if ((d.version || 1) < 5) {
        const fresh = seed().lectures;
        const oldL1 = (d.lectures || []).find(l => l.part === 1 && l.order === 1);
        if (oldL1 && fresh[0]) {
          fresh[0].id = oldL1.id;
          if (oldL1.watchSeconds) fresh[0].watchSeconds = oldL1.watchSeconds;
        }
        d.lectures = fresh;
        d.version = 5;
      }
      if (!s.supabaseUrl) s.supabaseUrl = C.supabaseUrl || 'https://jurwrizrcfzhzvfpgkot.supabase.co';
      if (!s.supabaseAnonKey) s.supabaseAnonKey = C.supabaseAnonKey || 'sb_publishable_DlVWQXL7L0adgtjsZZryiQ_Ufs2_8jH';
    },

    /* 세션 */
    currentUser() {
      const id = localStorage.getItem(SESSION_KEY);
      return id ? this.data.users.find(u => u.id === id) || null : null;
    },
    setSession(id) { id ? localStorage.setItem(SESSION_KEY, id) : localStorage.removeItem(SESSION_KEY); },

    async login(loginId, pw) {
      const u = this.data.users.find(x => x.loginId === loginId.trim());
      if (!u || u.pw !== await hash(pw)) return null;
      this.setSession(u.id);
      return u;
    },
    logout() { this.setSession(null); },

    async signup(info) {
      if (this.data.users.some(u => u.loginId === info.loginId)) throw new Error('이미 사용 중인 아이디입니다.');
      const u = Object.assign({
        id: uid(), joinedAt: now(), grade: 'ieum', isAdmin: false, progress: {}
      }, info, { pw: await hash(info.pw) });
      this.data.users.push(u);
      await this.save();
      this.setSession(u.id);
      return u;
    },

    /* 백업 */
    exportJSON() { return JSON.stringify(this.data, null, 2); },
    async importJSON(text) {
      const d = JSON.parse(text);
      if (!d || !d.users || !d.posts) throw new Error('올바른 백업 파일이 아닙니다.');
      this.data = d; await this.save();
    },
    async reset() { this.data = seed(); this.setSession(null); await this.init(); },

    /* Supabase 연동 제어 */
    getSupabaseConfig,
    async setSupabaseConfig(url, key) {
      if (this.data && this.data.settings) {
        this.data.settings.supabaseUrl = url;
        this.data.settings.supabaseAnonKey = key;
      }
      localStorage.setItem('bjs_supabase', JSON.stringify({ url, key }));
      _sbClient = null;
      return this.save();
    },
    async syncSupabase() {
      const remote = await loadFromSupabase();
      if (remote) {
        this.data = remote;
        await persistLocal(remote);
        return true;
      }
      return false;
    }
  };

  window.Store = Store;
})();
