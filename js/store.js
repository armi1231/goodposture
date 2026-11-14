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
  async function load() {
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
  async function persist(data) {
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
      version: 2,
      settings: {
        formUrl: C.formUrl, eduFee: C.eduFee, bankInfo: C.bankInfo,
        appIos: C.appIos, appAndroid: C.appAndroid, rentalUrl: C.rentalUrl,
        heroJoggerVideo: C.heroJoggerVideo, contactPhone: C.contactPhone, kakaoId: C.kakaoId,
        guideName: C.guide.name, guideTitle: C.guide.title,
        recommenderName: C.recommender.name, recommenderNo: C.recommender.no
      },
      users: [],
      rentalProducts: [
        { id: uid(), code: 'R1090', name: 'R1090 스킨', color: '스킨', price: 37800, img: 'assets/products/r1090-skin.jpg',
          desc: '허리·복부·골반을 감싸는 하의형 착용 제품', contractUrl: '', visible: true, order: 1 },
        { id: uid(), code: 'R1090', name: 'R1090 블랙', color: '블랙', price: 37800, img: 'assets/products/r1090-black.jpg',
          desc: '허리·복부·골반을 감싸는 하의형 착용 제품', contractUrl: '', visible: true, order: 2 },
        { id: uid(), code: 'SM880', name: 'SM880', color: '블랙', price: 37800, img: 'assets/products/sm880.jpg',
          desc: '양면 착용 컬러 스포츠 테이핑, 바른 상체 자세 지원', contractUrl: '', visible: true, order: 3 },
        { id: uid(), code: 'BB484', name: 'BB484 스킨', color: '스킨', price: 19900, img: 'assets/products/bb484-skin.jpg',
          desc: '여성의 가슴 무게를 견인·지지해 바른 상체 자세를 돕는 제품', contractUrl: '', visible: true, order: 4 },
        { id: uid(), code: 'BB484', name: 'BB484 블랙', color: '블랙', price: 19900, img: 'assets/products/bb484-black.jpg',
          desc: '여성의 가슴 무게를 견인·지지해 바른 상체 자세를 돕는 제품', contractUrl: '', visible: true, order: 5 }
      ],
      materials: [
        { id: uid(), type: 'doc', title: '착한 창업 안내서 (최종본)', desc: '바른자세 렌탈 플랫폼 창업 안내 · 2026.10.21',
          pages: ['assets/brochure/p01.jpg', 'assets/brochure/p03.jpg', 'assets/brochure/p04.jpg', 'assets/brochure/p05.jpg',
                  'assets/brochure/p06.jpg', 'assets/brochure/p07.jpg', 'assets/brochure/p08.jpg'], url: '', createdAt: t }
      ],
      lectures: [
        { id: uid(), part: 1, order: 1, title: '바른자세 렌탈 플랫폼의 이해', minutes: 60, url: '', desc: '착한 창업의 구조와 사업 철학' },
        { id: uid(), part: 1, order: 2, title: '입는 바른자세 4품목 완전정복', minutes: 60, url: '', desc: 'R1090 · SM880 · BB484 제품 특징과 착용 안내' },
        { id: uid(), part: 1, order: 3, title: '렌탈 계약 · 수수료 · 정산 기준', minutes: 60, url: '', desc: '4배·8배·10배 기준과 월 2회 정산' },
        { id: uid(), part: 2, order: 1, title: '고객 상담과 체험 안내 실전', minutes: 60, url: '', desc: '' },
        { id: uid(), part: 2, order: 2, title: '5평 체험 공간과 숍인숍 운영', minutes: 60, url: '', desc: '' },
        { id: uid(), part: 2, order: 3, title: '플레이 슬리밍고 AI 자세측정 활용', minutes: 60, url: '', desc: '' },
        { id: uid(), part: 2, order: 4, title: 'SNS와 지역 커뮤니티 홍보', minutes: 60, url: '', desc: '' },
        { id: uid(), part: 2, order: 5, title: '고객 서비스: 339제도와 무상수리', minutes: 60, url: '', desc: '' },
        { id: uid(), part: 2, order: 6, title: '사업자 윤리와 관련 법규', minutes: 60, url: '', desc: '' }
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
        if (!s.heroJoggerVideo) s.heroJoggerVideo = C.heroJoggerVideo;
        d.rentalProducts.forEach(p => { if (p.code === 'SM880' && p.color === '네이비') p.color = '블랙'; });
        d.version = 2;
      }
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
    async reset() { this.data = seed(); this.setSession(null); await this.init(); }
  };

  window.Store = Store;
})();
