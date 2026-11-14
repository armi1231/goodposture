/* =========================================================
   바른자세 렌탈 플랫폼 — 기본 설정
   관리자 페이지 > 사이트 설정에서 대부분 바꿀 수 있습니다.
   여기 값은 "처음 설치할 때"의 기본값입니다.
   ========================================================= */
window.SITE_CONFIG = {
  siteName: '바른자세 렌탈 플랫폼',
  company: '(주)슬리밍고그룹',
  department: '바른자세 렌탈 플랫폼',

  // 홈페이지 운영자 · 상담 · 추천인 연결
  guide: { title: '착한 창업 가이드', name: '이아름', phone: '010-9283-1231', kakao: 'armi1231' },

  // 창업 신청 구글폼 (비회원도 접속 가능)
  formUrl: 'https://forms.gle/mbbnv2uZjCnAXCveA',

  // 교육비
  eduFee: 30000,
  bankInfo: '입금 계좌는 관리자 페이지 > 사이트 설정에서 입력하세요',

  // 추천인 기본값 (회원가입 시 자동 입력)
  recommender: { name: '이아름', no: '1231' },

  // 플레이 슬리밍고 앱
  appIos: 'https://apps.apple.com/kr/app/id6478824396',
  appAndroid: 'https://play.google.com/store/search?q=%ED%94%8C%EB%A0%88%EC%9D%B4%20%EC%8A%AC%EB%A6%AC%EB%B0%8D%EA%B3%A0&c=apps',

  // 공통 렌탈 신청(전자계약) 링크 — 상품별 링크가 없을 때 사용
  rentalUrl: '',

  // 메인 3D 연출 마지막 장면을 실제 영상으로 바꾸고 싶다면 mp4 경로 입력 (예: assets/hero/joggers.mp4)
  heroJoggerVideo: 'https://assets.mixkit.co/videos/40754/40754-720.mp4',

  contactPhone: '010-9283-1231',
  kakaoId: 'armi1231',

  // 첫 관리자 계정 (최초 실행 시 1회 생성 → 로그인 후 마이페이지에서 비밀번호를 꼭 바꾸세요)
  admin: { loginId: 'admin', password: 'slimminggo1231!' }
};
