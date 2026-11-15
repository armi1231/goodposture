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

  // 착한렌탈 상품별 접속 QR 링크 (첨부 PDF의 QR을 그대로 디코딩한 주소)
  //  → 네이버 QR 단축주소(https://m.site.naver.com/xxxx) 가 착한렌탈(bs-on) 상품 상세로 연결됩니다.
  qr: {
    BB484: 'https://m.site.naver.com/2kSFq',
    R1090: 'https://m.site.naver.com/2kSEX',
    SM880: 'https://m.site.naver.com/2kSFK',
    BB484x2: 'https://m.site.naver.com/2kSGh',
    R1090_SM880: 'https://m.site.naver.com/2kSLx',
    BB484_R1090: 'https://m.site.naver.com/2kSMB',
    BB484_SM880: 'https://m.site.naver.com/2kSN4'
  },

  // 온라인교육 1강
  lecture1Url: 'https://youtu.be/4S4BHab9BXA',
  quizUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfipUAMTvmf-6oCSzDkCocRULzjJznfi1ZkH-j_ONtOFJiNjQ/viewform',

  // 메인 3D 연출 마지막 장면을 실제 영상으로 바꾸고 싶다면 mp4 경로 입력 (예: assets/hero/joggers.mp4)
  //  비워두면(권장) 3D로 만든 정면 조깅 남녀 장면이 재생됩니다.
  heroJoggerVideo: 'assets/hero/joggers_v6.mp4?v=20261115_07',

  contactPhone: '010-9283-1231',
  kakaoId: 'armi1231',

  // 첫 관리자 계정 (최초 실행 시 1회 생성 → 로그인 후 마이페이지에서 비밀번호를 꼭 바꾸세요)
  admin: { loginId: 'admin', password: 'slimminggo1231!' }
};
