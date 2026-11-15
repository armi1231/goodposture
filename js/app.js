/* =========================================================
   바른자세 렌탈 플랫폼 — 화면/라우터
   ========================================================= */
(function () {
  'use strict';
  const S = window.Store;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => Number(n || 0).toLocaleString('ko-KR') + '원';
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = (iso, time) => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` + (time ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : ''); };
  const nl2br = s => esc(s).replace(/\n/g, '<br>');
  const set = () => S.data.settings;
  const me = () => S.currentUser();
  const isAdmin = () => !!(me() && me().isAdmin);

  /* ---------- 등급 ---------- */
  const GRADES = [
    { key: 'ieum', name: '이음', motto: '인연을 잇고', desc: '회원가입을 마친 첫 단계', icon: 'link' },
    { key: 'nurim', name: '누림', motto: '일상의 가치를 누리고', desc: '가입 후 입는 바른자세를 렌탈한 고객', icon: 'sun' },
    { key: 'saeum', name: '새움', motto: '새로운 꿈을 틔우고', desc: '렌탈 여부와 상관없이 착한 렌탈 창업을 신청한 분 (교육비 입금 확인 후 온라인 강의 오픈)', icon: 'sprout' },
    { key: 'pium', name: '피움', motto: '가능성을 피우고', desc: '온라인교육 3시간 이수 · 월 렌탈료 4배 임시사업권', icon: 'flower' },
    { key: 'irum', name: '이룸', motto: '첫 번째 목표를 이루고', desc: '1년 이내 누적 렌탈매출 50만원 달성 · 월 렌탈료 8배 정식사업권 · 제주 웰니스캠프 초대', icon: 'tree' },
    { key: 'dream', name: '드림', motto: '더 큰 꿈을 향해 도전한다', desc: '웰니스캠프 수료 · (주)슬리밍고그룹 창업 신청 VVIP와 동일한 자격 혜택', icon: 'star' }
  ];
  const gIdx = k => GRADES.findIndex(g => g.key === k);
  const gName = k => (GRADES[gIdx(k)] || GRADES[0]).name;
  const ICONS = {
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sprout: '<path d="M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z"/>',
    flower: '<circle cx="12" cy="9" r="2.4"/><path d="M12 6.6c0-2.6 3.4-2.6 3.4 0M14.4 9c2.6 0 2.6 3.4 0 3.4M12 11.4c0 2.6-3.4 2.6-3.4 0M9.6 9c-2.6 0-2.6-3.4 0-3.4M12 12v9M12 17c2-2 4-2 5-1"/>',
    tree: '<path d="M12 22v-6M7 16h10l-5-13z"/><path d="M8.5 11h7"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'
  };
  const icon = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ''}</svg>`;
  const badge = k => `<span class="grade-badge g-${k}">${gName(k)}</span>`;

  /* ---------- 교육 시청률 ---------- */
  const watchOf = (u, l) => (u && u.progress && u.progress[l.id]) || null;
  const lecDone = (u, l) => { const w = watchOf(u, l); return !!(w && (w.done || w.quizAt)); };
  const lecPct = (u, l) => { const w = watchOf(u, l); return w && w.pct ? Math.min(100, Math.round(w.pct)) : 0; };
  const quizUrlOf = l => l.quizUrl || set().quizUrl || '';

  /* ---------- UI 유틸 ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function modal(html, opts = {}) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-bg" data-close></div><div class="modal-box"><button class="modal-x" data-close aria-label="닫기">×</button>${html}</div></div>`;
    document.body.classList.add('modal-open');
    const close = () => { root.innerHTML = ''; document.body.classList.remove('modal-open'); opts.onClose && opts.onClose(); };
    $$('[data-close]', root).forEach(b => b.addEventListener('click', close));
    const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    return { el: $('.modal-box', root), close };
  }
  function qrSvg(text, cell = 4) {
    if (!window.qrcode || !text) return '';
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      const q = qrcode(0, 'M'); q.addData(text); q.make();
      return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
    } catch (e) { return ''; }
  }
  function fileToDataURL(file, max = 1400, q = .82) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', q));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  async function readImages(input, limit = 5) {
    const files = Array.from(input.files || []).slice(0, limit);
    const out = [];
    for (const f of files) if (f.type.startsWith('image/')) out.push(await fileToDataURL(f));
    return out;
  }
  function ytId(url) {
    if (!url) return '';
    const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  const blobURLs = new Map();
  function mediaSrc(item) {
    if (item.blob instanceof Blob) {
      if (!blobURLs.has(item.id)) blobURLs.set(item.id, URL.createObjectURL(item.blob));
      return blobURLs.get(item.id);
    }
    return item.url || '';
  }
  function formData(form) {
    const o = {};
    new FormData(form).forEach((v, k) => { if (typeof v === 'string') o[k] = v.trim(); });
    $$('input[type=checkbox]', form).forEach(c => { if (c.name) o[c.name] = c.checked; });
    return o;
  }
  function confirmBox(msg) { return window.confirm(msg); }

  /* ---------- 착한 창업 가이드 (운영자 · 상담 · 추천인) ---------- */
  const guide = () => { const s = set(); return { title: s.guideTitle || '착한 창업 가이드', name: s.guideName || '이아름', phone: s.contactPhone || '', kakao: s.kakaoId || '' }; };
  const refChip = (cls = '') => { const s = set(); return `<span class="ref-chip ${cls}">추천인 <b>${esc(s.recommenderName)}</b><i></i>추천번호 <b>${esc(s.recommenderNo)}</b></span>`; };
  function guideCard(mode = 'card') {
    const g = guide();
    const tel = g.phone.replace(/[^0-9]/g, '');
    if (mode === 'line') return `<p class="guide-line">${refChip()} 상담 <b>${esc(g.title)} ${esc(g.name)}</b>
      ${g.phone ? `<a href="tel:${tel}">📞 ${esc(g.phone)}</a>` : ''} ${g.kakao ? `<button type="button" class="kakao-chip" data-copy="${esc(g.kakao)}">카카오톡 ID : ${esc(g.kakao)}</button>` : ''}</p>`;
    return `<div class="guide-card ${mode}">
      <div class="gd-who"><span class="gd-ava">${icon('sprout')}</span>
        <div><small>(주)슬리밍고그룹 바른자세 렌탈 플랫폼</small><b>${esc(g.title)} ${esc(g.name)}</b>
        <p>렌탈 상담 · 창업 상담 · 추천인 연결을 직접 도와드립니다.</p>${refChip()}</div></div>
      <div class="gd-contacts">
        ${g.phone ? `<a class="gd-btn tel" href="tel:${tel}"><small>전화 · 문자 상담</small>${esc(g.phone)}</a>` : ''}
        ${g.kakao ? `<button type="button" class="gd-btn kakao" data-copy="${esc(g.kakao)}"><small>카카오톡 ID (눌러서 복사)</small>${esc(g.kakao)}</button>` : ''}
      </div>
    </div>`;
  }

  /* ---------- 공통 조각 ---------- */
  const pageHead = (kicker, title, sub) => `
    <section class="page-head"><div class="wrap">
      <p class="eyebrow">${kicker}</p><h1>${title}</h1>${sub ? `<p class="lead">${sub}</p>` : ''}
    </div></section>`;
  const formLink = () => esc(set().formUrl);
  const ctaBand = () => `
    <section class="cta-band"><div class="wrap cta-inner">
      <div><p class="eyebrow light">착한 창업 · 바른자세 렌탈 플랫폼</p>
      <h2>치킨 한 마리 값으로<br>나는 재테크를 시작한다</h2>
      <p>개설비 0원, 온라인 교육비 3만원. 바른 자세를 빌려드리는 일이 당신의 새로운 사업이 됩니다.</p></div>
      <div class="cta-actions">
        <a class="btn btn-cta btn-lg" href="${formLink()}" target="_blank" rel="noopener">창업 신청서 작성하기 →</a>
        <a class="btn btn-white btn-lg" href="#/consult/write?cat=창업상담">창업 상담 남기기</a>
        <p class="cta-ref">신청서 작성 시 ${refChip('light')}</p>
      </div>
    </div>
    <div class="wrap cta-guide">${guideCard('dark')}</div></section>`;

  const visibleProducts = () => S.data.rentalProducts.filter(p => p.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const singleProducts = () => visibleProducts().filter(p => p.kind !== 'bundle');
  const bundleProducts = () => visibleProducts().filter(p => p.kind === 'bundle');

  function productCard(p, mode) {
    const link = p.contractUrl || set().rentalUrl;
    const imgs = (p.kind === 'bundle' ? [p.img, p.img2] : [p.img]).filter(Boolean);
    return `
      <article class="product-card ${p.kind === 'bundle' ? 'bundle' : ''}">
        <div class="product-img ${imgs.length > 1 ? 'duo' : ''}">${imgs.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy"${p.kind === 'bundle' ? ` style="--i:${i}"` : ''}>`).join('')}</div>
        <div class="product-body">
          <p class="product-code">${p.kind === 'bundle' ? '<b class="kind-b">2개 구성</b> ' : ''}${esc(p.code || '')}${p.color ? ' · ' + esc(p.color) : ''}</p>
          <h3>${esc(p.name)}</h3>
          <p class="product-desc">${esc(p.desc)}</p>
          <p class="product-price"><small>월</small> ${won(p.price)}</p>
          ${mode === 'rental' ? `
            <div class="product-actions">${refChip('sm')}
              ${link ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener">온라인 렌탈계약</a>
                        <button class="btn btn-line" data-qr="${esc(link)}" data-name="${esc(p.name)}">QR 보기</button>`
                     : `<a class="btn btn-primary" href="#/consult/write?cat=렌탈상담&title=${encodeURIComponent(p.name + ' 렌탈 신청')}">렌탈 신청하기</a>`}
            </div>` : `
            <div class="product-actions-grid">
              ${['R1090', 'SM880', 'BB484'].includes(p.code) ? `<button class="btn btn-line btn-sm" data-play-code="${esc(p.code)}">▶ 착용법 영상</button>` : ''}
              <a class="btn btn-primary btn-sm" href="#/rental">렌탈 신청 →</a>
            </div>`}
        </div>
      </article>`;
  }

  /* 바로 접속 QR 타일 (착한렌탈 접속 QR) */
  function qrTile(p) {
    const link = p.contractUrl || set().rentalUrl;
    if (!link) return '';
    return `<article class="qr-tile reveal">
      <div class="qt-qr">${qrSvg(link, 4)}</div>
      <div class="qt-body">
        <p class="product-code">${p.kind === 'bundle' ? '2개 구성' : '단품'} · ${esc(p.code || '')}</p>
        <h4>${esc(p.name)}</h4>
        <p class="qt-price"><small>월</small> ${won(p.price)}</p>
        <a class="btn btn-line btn-sm" href="${esc(link)}" target="_blank" rel="noopener">QR 링크 열기</a>
      </div>
    </article>`;
  }

  /* =======================================================
     홈
     ======================================================= */
  function viewHome() {
    const prods = visibleProducts();
    return `
    <div id="home-start"></div>

    <section class="sec sec-chicken"><div class="wrap chicken-grid">
      <div class="chicken-card reveal">
        <p class="eyebrow">착한 창업이 쉬운 이유</p>
        <h2>치킨 한 마리 값,<br><span class="hl">3만원</span>이면 충분합니다</h2>
        <div class="equation">
          <div class="eq-item"><b>0원</b><span>개설비</span></div>
          <i>+</i>
          <div class="eq-item"><b>30,000원</b><span>온라인 교육비</span></div>
          <i>=</i>
          <div class="eq-item eq-result"><b>창업 준비 끝</b><span>누구나 시작</span></div>
        </div>
        <p class="muted">대한민국 특허 상품 '입는 바른자세' 5종을 렌탈로 안내하는 착한 렌탈 창업입니다.</p>
        <div class="cta-with-ref"><a class="btn btn-cta btn-lg" href="${formLink()}" target="_blank" rel="noopener">지금 창업 신청하기 →</a>${refChip()}</div>
      </div>
      <ol class="steps reveal">
        <li><b>01</b><div><h4>창업 신청서 작성</h4><p>구글폼으로 비회원도 바로 신청할 수 있어요.</p></div></li>
        <li><b>02</b><div><h4>온라인 교육비 3만원 입금</h4><p>입금 계좌는 신청서와 창업접수 게시판에서 안내합니다.</p></div></li>
        <li><b>03</b><div><h4>홈페이지 회원가입 · 접수글 등록</h4><p>창업접수 게시판에 "신청서 접수 · 입금 완료"를 남겨 주세요.</p></div></li>
        <li><b>04</b><div><h4>새움 등급 승인 · 온라인 강의 오픈</h4><p>입금 확인 후 홈페이지에서 동영상 강의를 들을 수 있어요.</p></div></li>
        <li><b>05</b><div><h4>3시간 이수 → 피움 · 4배 임시사업권</h4><p>나머지 6시간은 내가 가능한 시간에 온라인으로!</p></div></li>
      </ol>
    </div></section>

    <section class="sec sec-numbers"><div class="wrap numbers">
      <div class="num reveal"><b>0<small>원</small></b><span>개설비</span></div>
      <div class="num reveal"><b>3<small>만원</small></b><span>온라인 교육비</span></div>
      <div class="num reveal"><b>12<small>시간</small></b><span>기본교육 (온라인 9 + 오프라인 3)</span></div>
      <div class="num reveal"><b>4<small>배</small></b><span>온라인 3시간 이수 시 임시사업권</span></div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">01 제품 안내</p><h2>입는 바른자세, 5가지 렌탈 상품</h2>
      <p class="lead">대한민국 특허 상품인 입는 바른자세를 직접 체험하고 선택하도록 안내합니다.</p></div>
      <div class="product-grid">${prods.map(p => productCard(p)).join('')}</div>
      <div class="center" style="margin:-10px 0 24px"><a class="btn btn-line" href="#/rental">2개 구성 세트 요금 보기 →</a></div>
      <div class="center">${refChip()}<br><br><a class="btn btn-primary btn-lg" href="#/rental">렌탈 신청 바로가기</a> <a class="btn btn-line btn-lg" href="#/products">제품 자료 · 영상 보기</a></div>
    </div></section>

    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">02 수수료 기준</p><h2>성과를 계산하는 세 가지 기준</h2>
      <p class="lead">수수료 = 일반 고객 월 렌탈료 × 적용 배수</p></div>
      ${multiplierCards()}
      <div class="center"><a class="btn btn-line" href="#/startup#fee">상품별 수수료 · 정산 일정 자세히 보기</a></div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">03 성장 단계</p><h2>잇고 · 누리고 · 틔우고 · 피우고 · 이루고 · 꿈꾸다</h2>
      <p class="lead">회원가입부터 제주 웰니스캠프까지, 여섯 단계로 함께 성장합니다.</p></div>
      ${gradeJourney()}
    </div></section>

    ${campSection()}

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">04 교육</p><h2>총 12시간, 내 일정에 맞춰 배웁니다</h2></div>
      ${eduBreakdown()}
    </div></section>

    ${appBand()}

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">05 전국 매장</p><h2>가까운 카페 드 슬리밍고에서 체험하세요</h2>
      <p class="lead">렌탈 후 A/S 접수 및 기타 문의는 매장으로 방문하거나 문의하실 수 있습니다.</p></div>
      ${storeGrid(S.data.stores)}
    </div></section>

    ${ctaBand()}`;
  }

  function multiplierCards() {
    return `<div class="multi-grid">
      <div class="multi reveal"><b>4<small>배</small></b><div><h4>기본 사업권 (입문 3시간 이수)</h4><p>온라인 입문 3시간(01~09강) 이수 후 사업승인 인정서 발급 즉시 시작 (계약 1년)</p><span class="tag">스타트 · 4배 사업권</span></div></div>
      <div class="multi reveal hot"><b>8<small>배</small></b><div><h4>50만점 달성 시 일일 승급!</h4><p>총 12시간 교육 이수 + 누적 50만점 달성 시 월말 기다리지 않고 즉시 승급</p><span class="tag">성장 업그레이드 · 8배 사업권</span></div></div>
      <div class="multi reveal"><b>응원금</b><div><h4>매월 바르게 응원금</h4><p>50만점 달성자 모두에게 회사 총계약 약정료 점수 균등 배분 (월 유지조건 없음)</p><span class="tag">공동분배 나눔 혜택</span></div></div>
    </div>`;
  }

  function gradeJourney(current) {
    const ci = current ? gIdx(current) : -1;
    return `<ol class="journey">${GRADES.map((g, i) => `
      <li class="j-step reveal ${i <= ci ? 'reached' : ''} ${i === ci ? 'current' : ''}">
        <div class="j-icon g-${g.key}">${icon(g.icon)}</div>
        <p class="j-motto">${g.motto}</p>
        <h4>${g.name}</h4>
        <p class="j-desc">${g.desc}</p>
      </li>`).join('')}</ol>`;
  }

  function campSection() {
    return `<section class="sec camp"><div class="wrap camp-inner">
      <div class="camp-copy reveal">
        <p class="eyebrow light">50만점 달성 축하 특전 01</p>
        <h2>제주 본사 웰니스캠프 초청 (1박 2일 참가비 0원)</h2>
        <p>누적 50만점을 달성하신 창업자를 제주도 본사 웰니스캠프에 정중히 초청합니다. 1박 2일간 전문 세미나와 숙소, 식대는 전액 본사에서 무상 지원하며(항공권 본인 부담), 입는 바른자세의 깊은 가치와 제주 힐링 여행을 함께 누립니다.</p>
        <ul class="camp-list"><li>1박 2일 참가비 0원 (숙소 · 식대 전액 지원)</li><li>입는 바른자세 전문가 심화 과정</li><li>제주 본사 웰니스 힐링 프로그램</li><li>PA사업부 창업 기회 제공 (VVIP 조건 면제)</li></ul>
      </div>
      <div class="camp-art" aria-hidden="true">
        <svg viewBox="0 0 400 300"><defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff"/><stop offset="1" stop-color="#5cc6e8"/></linearGradient></defs>
        <rect width="400" height="300" rx="28" fill="url(#sea)"/><circle cx="310" cy="70" r="34" fill="#fff6c9"/>
        <path d="M0 190 Q100 110 200 150 T400 130 V300 H0Z" fill="#7fcf8a"/><path d="M120 165 Q200 40 290 160Z" fill="#4c9f6a"/>
        <path d="M0 230 Q120 200 240 225 T400 215 V300 H0Z" fill="#3a8b5c"/><path d="M0 262 Q200 240 400 262 V300 H0Z" fill="#2c7350"/></svg>
      </div>
    </div></section>`;
  }

  function eduBreakdown() {
    return `<div class="edu-bar reveal">
        <div class="eb eb-1" style="flex:3"><b>1단계: 온라인 입문 3시간</b><span>01~09강 · 이수 즉시 4배 사업권 시작</span></div>
        <div class="eb eb-2" style="flex:6"><b>2단계: 온라인 실무 6시간</b><span>10~27강 · 50만점 달성 시 8배 승급</span></div>
        <div class="eb eb-3" style="flex:3"><b>3단계: 오프라인 실습 3시간</b><span>180분 현장 실습 · 첫 30일 로드맵</span></div>
      </div>
      <div class="edu-cards">
        <div class="card reveal"><h4>${icon('sprout')} 12시간 체계적 전문 교육 (교육비 3만원)</h4><p>온라인 9시간(20분씩 27강)과 오프라인 현장 실습 3시간(180분)으로 구성됩니다. 처음 3시간(01~09강)을 이수하면 즉시 4배 사업권이 승인되며, 1교시(01~03강) 60분 통합 영상과 퀴즈를 온라인에서 바로 수강할 수 있습니다.</p></div>
        <div class="card reveal"><h4>${icon('link')} 오프라인 현장 실습 3시간 & 수료 기준</h4><p>R1090·BB484·SM880 제품 체험, 고객 시착 지원, 상담 및 계약 역할연습, 첫 30일 활동계획을 완성합니다. <b>구매나 계약 실적은 교육 수료 조건이 아니며</b>, 누구나 차근차근 바른자세 가이드로 성장할 수 있습니다.</p></div>
      </div>`;
  }

  function appBand() {
    const s = set();
    return `<section class="sec app-band"><div class="wrap app-inner">
      <div class="app-mockup reveal" aria-hidden="true">
        <img src="assets/app/play_slimminggo_mockup.png?v=20261115_15" alt="슬리밍고그룹 플레이 슬리밍고 2.1 앱" loading="lazy">
      </div>
      <div class="app-copy reveal">
        <p class="eyebrow">플레이 슬리밍고 2.1 앱</p>
        <h2>자세를 읽고, 습관을 바꾸는 AI</h2>
        <p class="lead">슬리밍고그룹이 직접 개발한 AI 자세측정 전문 앱 <b>플레이 슬리밍고 2.1</b>.<br>스마트폰 카메라로 사진 한 장을 찍으면 거북목·굽은 등·골반 비대칭 등 내 자세점수를 즉시 확인하고, 체형에 꼭 맞는 입는 바른자세 솔루션까지 안내받을 수 있습니다.</p>
        <div class="app-btns">
          <a class="store-btn" href="${esc(s.appIos)}" target="_blank" rel="noopener"><small>Download on the</small>App Store</a>
          <a class="store-btn" href="${esc(s.appAndroid)}" target="_blank" rel="noopener"><small>GET IT ON</small>Google Play</a>
          <a class="btn btn-line" href="#/app">앱 자세히 보기</a>
        </div>
      </div>
    </div></section>`;
  }

  function storeGrid(stores) {
    return `<div class="store-grid">${stores.map((s, i) => `
      <article class="store-card reveal">
        <div class="store-img ${s.img ? '' : 'noimg'} tone-${i % 4}">
          ${s.img ? `<img src="${esc(s.img)}" alt="${esc(s.name)}" loading="lazy">` :
          `<div class="store-ph"><img class="store-logo" src="assets/brand/${i % 2 ? 'cafe-logo-white' : 'cafe-logo'}.png" alt="cafe de SLIMMING GO"><em>${esc(s.name.replace('카페 드 슬리밍고', '').trim())}</em></div>`}
          <span class="store-region">${esc(s.region || '')}</span>
        </div>
        <div class="store-body">
          <h3>${esc(s.name)}</h3>
          ${s.address ? `<p class="store-addr">${esc(s.address)}</p>` : `<p class="store-addr muted">위치·사진은 네이버 플레이스에서 확인하세요</p>`}
          ${s.phone ? `<p class="store-tel"><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></p>` : ''}
          <div class="store-actions">
            <a class="btn btn-naver btn-sm" href="${esc(s.naverUrl)}" target="_blank" rel="noopener">네이버 플레이스</a>
            <a class="btn btn-line btn-sm" href="#/consult/write?cat=기타상담&title=${encodeURIComponent('[A/S] ' + s.name)}">A/S 접수</a>
          </div>
        </div>
      </article>`).join('')}</div>`;
  }

  /* =======================================================
     착한창업 상세
     ======================================================= */
  function viewStartup() {
    return `${pageHead('착한 창업', '바른 자세를 전하는 일,<br>당신의 새로운 사업이 됩니다', '개설비 0원 · 온라인 교육비 3만원 · 기본교육 12시간')}
    <section class="sec"><div class="wrap narrow">
      <div class="letter reveal">
        <p>새로운 시작과 건강한 일상을 꿈꾸시는 모든 분들을 진심으로 환영합니다.</p>
        <p>우리 몸의 모든 활력과 건강의 기초는 바로 내 몸의 중심 기둥인 <b>'바른 자세'</b>로부터 시작됩니다. 뼈와 골격이 바른 정렬을 이루고, 굽어진 척추와 말린 어깨가 시원하게 펴질 때, 숨 쉬는 공기와 흐르는 혈액이 온몸을 원활히 순환하며 스스로 치유하고 회복하는 자연 생명력을 갖게 됩니다. 바른 자세는 단순한 외면의 곧음을 넘어, 삶의 질과 평생 건강을 지탱하는 가장 본질적인 뿌리입니다.</p>
        <p>슬리밍고그룹의 <b>'전국민 바른자세 만들기 문화캠페인'</b>은 단순한 제품 판매나 렌탈 비즈니스가 아닌, 전 세대의 삶을 지키는 <b>공익적 문화운동</b>입니다. 무거운 책가방과 스마트폰에 굽어가는 <b>아동·청소년</b>, 장시간 좌식 생활과 피로에 지친 <b>청년·중장년층</b>, 그리고 건강하고 활기찬 노후를 준비하는 <b>시니어 세대</b>까지—모든 이웃이 바른자세로 건강한 웃음을 되찾도록 돕는 따뜻한 공동체적 연대입니다.</p>
        <p>이 뜻깊은 문화캠페인에 동참하실 수 있도록 우리는 창업의 모든 문턱을 없앴습니다. <b>가맹비 0원, 인테리어 0원, 재고 부담 0원</b>. 오직 치킨 한 마리 값인 <b>3만 원의 12시간 진정성 있는 교육</b>만으로 누구나 우리 동네와 이웃의 자세를 바로 세우는 정직한 <b>'바른자세 건강 가이드'</b>로 출발하실 수 있습니다.</p>
        <p>물건을 강매하거나 매달 실적에 쫓길 필요가 전혀 없습니다. 고객이 가까운 매장에서 특허받은 입는 바른자세를 직접 체험하고, 몸의 변화를 스스로 느껴 선택할 수 있도록 돕는 정직한 안내자로서 함께 손잡고 걷는 동행입니다.</p>
        <p class="letter-em">이곳을 찾아주신 분이 창업을 결심한 예비 파트너이든, 혹은 나 자신과 가족의 건강을 돌보고자 하는 동행자이든 상관없습니다.<br>바른자세로 몸을 바로 세우고 마음을 잇는 이 건강한 여정에 언제나 함께하겠습니다.</p>
        <div class="letter-sign">
          <small>(주)슬리밍고그룹 바른자세 렌탈 플랫폼</small>
          <b>착한 창업 가이드 ${esc(guide().name)}</b>
          <span>${guide().phone ? `<a href="tel:${guide().phone.replace(/[^0-9]/g, '')}">📞 ${esc(guide().phone)}</a>` : ''}${guide().kakao ? ` · <button type="button" class="kakao-chip" data-copy="${esc(guide().kakao)}">카카오톡 ID : ${esc(guide().kakao)}</button>` : ''}</span>
        </div>
      </div>
    </div></section>

    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">시작 조건</p><h2>시작은 가볍게, 성장은 함께</h2></div>
      <div class="numbers light">
        <div class="num"><b>0<small>원</small></b><span>개설비</span></div>
        <div class="num"><b>3<small>만원</small></b><span>온라인 교육비</span></div>
        <div class="num"><b>5<small>평</small></b><span>매장 체험 공간</span></div>
        <div class="num"><b>12<small>시간</small></b><span>기본교육</span></div>
      </div>
      <p class="fine center">시연상품·공간비 등은 별도입니다. 매장이 없을 경우 특별상담 이후 조건 충족 시 창업 가능합니다.</p>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">왜 바른자세 시장인가</p><h2>주변 모두가 고객입니다</h2>
        <p class="lead">앉아서 일하고, 오래 걷고, 다시 앉는 하루. 바른 자세는 특별한 사람의 관심사가 아니라 모든 세대의 생활 문제입니다.</p></div>
      <div class="why-grid">
        <div class="why reveal"><b>01</b><h3>낮은 진입장벽</h3><p>교육비 3만원. 가맹비 · 인테리어 · 임대료가 없습니다.</p></div>
        <div class="why reveal"><b>02</b><h3>렌탈 수수료로 지속 수익</h3><p>렌탈 계약마다 수수료가 발생하고, 선납 보증금이 없습니다.</p></div>
        <div class="why reveal"><b>03</b><h3>4회 동행 멘토링</h3><p>12시간 교육과 함께 첫 고객 상담부터 계약까지 본사가 동행합니다.</p></div>
      </div>
      <p class="fine">출처: 착한 렌탈 창업 본사 홈페이지(rental.slimminggo.com) 안내 내용을 참고해 정리했습니다. 세부 조건은 상담 및 계약 시 안내됩니다.</p>
    </div></section>

    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">비용 비교</p><h2>언제까지 비싼 창업비에 잠 못 이루실 건가요?</h2></div>
      <div class="table-wrap"><table class="table compare-table">
        <thead><tr><th>항목</th><th>일반 매장형 창업</th><th class="hl-col">착한 렌탈 창업</th></tr></thead>
        <tbody>
          <tr><td>권리금 · 월세</td><td>필요</td><td class="hl-col">필요 없음</td></tr>
          <tr><td>인테리어 · 장비</td><td>필요</td><td class="hl-col">필요 없음</td></tr>
          <tr><td>인건비</td><td>직원 고용 필요</td><td class="hl-col">1인 활동</td></tr>
          <tr><td>재고 부담</td><td>원재료 · 상품 매입</td><td class="hl-col">없음</td></tr>
          <tr><td>영업 시간</td><td>매장 운영 시간에 묶임</td><td class="hl-col">자유 (본업 병행)</td></tr>
          <tr><td>보증금</td><td>임대보증금 선납</td><td class="hl-col">선납 없음 · 18회차 완납 시 20% 전액 반환</td></tr>
          <tr><td>시작 지원</td><td>오픈 교육 위주</td><td class="hl-col">12시간 교육 + 4회 동행</td></tr>
          <tr><td>시작 비용</td><td>수천만 원 이상</td><td class="hl-col"><b>3만원</b></td></tr>
        </tbody>
      </table></div>
      <p class="fine">* 일반 매장형 창업 비용은 업종 · 지역 · 규모에 따라 다릅니다. * 세부 조건은 상담 및 계약 시 안내합니다. (출처: rental.slimminggo.com)</p>

      <h3 class="sub-title">매장 · 재고 · 직원 ZERO</h3>
      <p>고정비가 없으니 리스크도 낮습니다. 계약할 때마다 쌓이는 <b>[ 수익구조 ]</b>입니다.</p>
      <ol class="flow4">
        <li class="reveal"><b>STEP 1</b><span>렌탈 계약 체결</span></li>
        <li class="reveal"><b>STEP 2</b><span>판매수수료 발생</span></li>
        <li class="reveal"><b>STEP 3</b><span>20% 안심 적립 (80% 지급)</span></li>
        <li class="reveal"><b>STEP 4</b><span>18회차 납입 시 20% 전액 반환</span></li>
      </ol>
      <p class="fine">* 수익은 개인 활동에 따라 다릅니다. 수수료 기준은 본사 공식 보상플랜에 따릅니다.</p>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">검증된 기술</p><h2>고객이 찾을 수밖에 없는 바른자세 기술</h2>
        <p class="lead">입는 바른자세는 국가대표 경기복을 만든 기술에서 출발했습니다.</p></div>
      <div class="proof-grid">
        <div class="proof reveal"><b>24<small>개국</small></b><span>인정받은 기술</span></div>
        <div class="proof reveal"><b>9<small>건</small></b><span>특허 등록</span></div>
        <div class="proof reveal"><b>Class 1</b><span>의료기기 등록</span></div>
        <div class="proof reveal"><b>A<small>등급</small></b><span>기술 평가</span></div>
        <div class="proof reveal"><b>혁신성장</b><span>유형 인증</span></div>
        <div class="proof reveal"><b>봅슬레이</b><span>스켈레톤 경기복 제작</span></div>
      </div>
      <p class="fine">출처: 착한 렌탈 창업 본사 홈페이지(rental.slimminggo.com). 인증서 · 특허증은 본사 홈페이지에서 확인할 수 있습니다.</p>
    </div></section>

    <section class="sec" id="fee"><div class="wrap">
      <div class="sec-head reveal">
        <p class="eyebrow">공식 보상플랜</p>
        <h2>3개의 보상플랜과 2개의 특전</h2>
        <p class="lead">누구나 공평하게 시작하고, 함께 나눌수록 커지는 슬리밍고그룹 착한창업의 투명한 보상 시스템입니다.</p>
      </div>

      <div class="plans-wrap">
        <!-- 01. 기본수수료 4배 -> 8배 일일 승급 -->
        <div class="plan-card hot reveal">
          <div class="plan-head">
            <span class="plan-badge">01</span>
            <h3>사업 시작 기본수수료 4배 ➔ 8배 일일 즉시 승급</h3>
            <span class="plan-tag">1년 계약 · 일일 승급</span>
          </div>
          <div class="plan-body">
            <p><b>온라인 입문교육 3시간(01~09강)</b>을 이수하면 사업승인 인정서가 발급되며, 그날부터 <b>4배 사업권</b>으로 1년 계약이 시작됩니다.<br>
            총 12시간 교육 이수 후 <b>누적 50만점</b>을 달성하면, 월말까지 기다릴 필요 없이 <b>당일 즉시 8배로 일일 승급</b>되어 정식 사업권 혜택을 누립니다.</p>
            
            <div class="table-wrap"><table class="table plan-table">
              <thead><tr><th>상품명</th><th>산정 점수</th><th>기본 4배 수수료</th><th class="hl">승급 8배 수수료</th></tr></thead>
              <tbody>
                <tr><td><b>R1090 (중체 하의)</b></td><td>37,800점</td><td>151,200원</td><td class="hl"><b>302,400원</b></td></tr>
                <tr><td><b>BB484 (상체)</b></td><td>19,900점</td><td>79,600원</td><td class="hl"><b>159,200원</b></td></tr>
                <tr><td><b>SM880 (상체 테이핑)</b></td><td>37,800점</td><td>151,200원</td><td class="hl"><b>302,400원</b></td></tr>
              </tbody>
            </table></div>
            <div class="plan-box">
              <b>🔄 1년 후 재계약 안내</b>
              <p>사업권 계약기간은 사업 첫날부터 1년입니다. 1년 후 재계약 시 교육비 3만 원 납부 및 12시간 재교육을 통해 기존 인정받은 8배 사업권 자격과 혜택을 그대로 연장 유지합니다.</p>
            </div>
          </div>
        </div>

        <!-- 02. 매월 바르게 응원금 -->
        <div class="plan-card reveal">
          <div class="plan-head">
            <span class="plan-badge">02</span>
            <h3>매월 바르게 응원금</h3>
            <span class="plan-tag">월 유지조건 없음 · 균등 분배</span>
          </div>
          <div class="plan-body">
            <p>누적 50만점 판매를 달성한 모든 창업자에게 회사의 성장을 함께 나누는 <b>'매월 바르게 응원금'</b>을 지급합니다.<br>
            <strong style="color:var(--forest)">★ 매월 추가 판매 실적을 채워야 하는 '월 유지조건'이 전혀 없습니다!</strong></p>
            <div class="plan-box">
              <b>📊 배분 기준 및 계산 공식</b>
              <p><code>해당 월 회사의 총계약 약정료 점수 ÷ 지급 대상 인원수 (균등 배분)</code></p>
              <p>예) 해당 월 회사 총계약 약정료 10,000,000점 ÷ 대상자 20명 = <b>1인당 500,000원</b> 균등 지급 (부가세 포함, 세금 공제 전)</p>
              <p><small>* 지급 기간: 50만점 달성월의 익월 매출분부터 최초 1년 계약 종료 전월 매출분까지 매월 25일 정기 지급</small></p>
            </div>
          </div>
        </div>

        <!-- 03. 창업 소개 수수료 100% -->
        <div class="plan-card reveal">
          <div class="plan-head">
            <span class="plan-badge">03</span>
            <h3>창업 소개 수수료 100%</h3>
            <span class="plan-tag">1인당 최대 200만원 · 소급 100% 전액 지급</span>
          </div>
          <div class="plan-body">
            <p>내가 직접 소개한 창업자가 4배 기간 동안 받는 판매수수료의 <b>100%를 본인에게 그대로 매칭 지급</b>합니다 (1인당 최대 약 200만 원 한도).<br>
            소개 시점에 본인이 50만점을 달성하지 못했더라도 걱정하지 마세요. 1년 계약기간 내 본인이 50만점을 달성하면 <b>이전에 발생한 소개수수료까지 전액 100% 소급 지급</b>됩니다!</p>
            <div class="plan-box">
              <b>💡 본사 공식 발표 소급 지급 실례</b>
              <p>창업자 5명을 소개해 각 27만점씩 총 135만점 달성 시 ➔ 본인이 1년 내 50만점 달성 즉시 <b>540만 원 전액 소급 지급!</b> (매월 25일 지급)</p>
            </div>
          </div>
        </div>

        <!-- 04. 50만점 달성 축하 2대 특전 -->
        <div class="plan-card privilege reveal">
          <div class="plan-head">
            <span class="plan-badge gold">04</span>
            <h3>50만점 달성 축하 2개의 특전</h3>
            <span class="plan-tag gold">제주 캠프 0원 · PA 창업 특혜</span>
          </div>
          <div class="plan-body">
            <div class="grid2" style="margin-top:12px">
              <div class="plan-box gold">
                <b>🌴 특전 01 · 제주 본사 웰니스캠프 초청</b>
                <p>누적 50만점 달성 시 1박 2일 제주 본사 웰니스캠프에 전액 무료(참가비 0원)로 초청합니다. 숙소, 식대, 최고급 전문 세미나 전액 본사 지원 (항공권만 본인 부담).</p>
              </div>
              <div class="plan-box gold">
                <b>🏢 특전 02 · 상위 PA사업부 창업 기회 제공</b>
                <p>오프라인 거점 매장을 운영하는 상위 PA사업부 창업 시, 까다로운 VVIP 달성 조건을 전액 면제해 드립니다 (1개월 내 신청 시 1,300만 원 / 1개월 이후 2,000만 원 특별 혜택).</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 정산 및 지급일 안내 -->
      <div class="sec-head reveal" style="margin-top:40px">
        <p class="eyebrow">투명한 정산</p>
        <h2>매출 적용 기간과 정산 · 지급일 안내</h2>
        <p class="lead">정직하고 투명한 정산 시스템으로 신뢰를 약속합니다.</p>
      </div>

      <div class="table-wrap"><table class="pay-schedule-table">
        <thead><tr><th>구분</th><th>매출 집계 기간</th><th>지급일</th><th>지급 항목 및 세부 사항</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="pay-tag green">판매수수료 1차</span></td>
            <td>매월 1일 ~ 15일 마감</td>
            <td><b>익월 3일</b></td>
            <td>해당 기간 발생한 기본 4배 / 승급 8배 판매수수료</td>
          </tr>
          <tr>
            <td><span class="pay-tag green">판매수수료 2차</span></td>
            <td>매월 16일 ~ 말일 마감</td>
            <td><b>익월 18일</b></td>
            <td>해당 기간 발생한 기본 4배 / 승급 8배 판매수수료</td>
          </tr>
          <tr>
            <td><span class="pay-tag blue">월 마감 항목</span></td>
            <td>전월 1일 ~ 말일 마감</td>
            <td><b>익월 25일</b></td>
            <td>창업 소개수수료 100%, 매월 바르게 응원금, 프로모션 수당</td>
          </tr>
          <tr>
            <td><span class="pay-tag gold">★ 20% 적립금 전액 반환</span></td>
            <td>고객 18회차 납입 완료 시</td>
            <td><b>익월 25일</b></td>
            <td><b>판매자 면책 완료</b> 및 선납 없이 적립되었던 <b>20% 보증금 전액 100% 반환</b> (무이자)</td>
          </tr>
        </tbody>
      </table></div>

      <div class="plan-box" style="margin-top:16px">
        <b>🛡️ 20% 적립금 제도와 18회차 완전 면책</b>
        <p>초기 보증금 선납 부담 없이 발생 수수료의 20%를 안전하게 적립하고 80%를 정산일에 즉시 지급받습니다. 고객이 18회차 납입을 완료하면 판매자의 모든 사후 책임이 완전히 면책되며, 그동안 적립된 <b>20% 적립금 전액이 익월 25일에 100% 환급</b>됩니다.</p>
      </div>

      <p class="notice" style="margin-top:20px">※ 계산표 및 사례는 슬리밍고그룹 공식 사업운영 안내에 따른 것이며, 실제 지급액은 본인의 활동 실적과 정산 명세에 따릅니다.</p>
    </div></section>

    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">고객 서비스</p><h2>오래 사용하는 제품을 위해</h2></div>
      <div class="svc-grid">
        <div class="svc reveal"><small>339제도</small><b>개당 330,000원</b><p>서비스계약기간 중 동일 상품의 새 제품으로 교체합니다. 다른 품목으로 교환할 수 없으며, 단종된 경우에는 기능이 가장 유사한 대체상품을 제공합니다.</p></div>
        <div class="svc reveal"><small>무상수리</small><b>제품 인도일부터 3년</b><p>형태 변경은 무상수리 대상에서 제외됩니다. 고객 실수로 발생한 수리는 원인·상태·수리 범위에 따라 유상 처리될 수 있으며, 사유와 예상 비용을 먼저 안내하고 고객 동의 후 진행합니다.</p></div>
      </div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">성장 단계</p><h2>여섯 단계 회원 등급</h2></div>
      ${gradeJourney()}
    </div></section>

    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">교육 과정</p><h2>총 12시간 = 온라인 9시간 + 오프라인 3시간</h2></div>
      ${eduBreakdown()}
    </div></section>
    ${ctaBand()}`;
  }

  /* =======================================================
     제품소개 (설명자료 · 영상)
     ======================================================= */
  function viewProducts() {
    const docs = S.data.materials.filter(m => m.type === 'doc');
    const vids = S.data.materials.filter(m => m.type === 'video');
    return `${pageHead('제품소개', '특허받은 입는 바른자세', '대한민국 특허 상품인 입는 바른자세를 직접 체험하고 선택하도록 안내합니다.')}
    <section class="sec"><div class="wrap">
      <div class="product-grid">${visibleProducts().map(p => productCard(p)).join('')}</div>
    </div></section>
    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head row"><div><p class="eyebrow">자료실</p><h2>제품 설명자료 · 제품 영상</h2></div>
        ${isAdmin() ? `<a class="btn btn-primary" href="#/admin/materials">+ 자료/영상 등록</a>` : ''}</div>
      <div class="tabs" role="tablist"><button class="tab on" data-tab="vid">제품 영상 <span>${vids.length}</span></button><button class="tab" data-tab="doc">설명자료 <span>${docs.length}</span></button></div>
      <div class="tab-panel" data-panel="vid">
        ${vids.length ? `<div class="media-grid">${vids.map(v => videoCard(v)).join('')}</div>` : `<div class="empty">아직 등록된 제품 영상이 없습니다.${isAdmin() ? ' 관리자 페이지에서 유튜브 링크나 영상 파일을 올려 주세요.' : ''}</div>`}
      </div>
      <div class="tab-panel" data-panel="doc" hidden>
        ${docs.length ? `<div class="media-grid">${docs.map(d => docCard(d)).join('')}</div>` : `<div class="empty">아직 등록된 설명자료가 없습니다.</div>`}
      </div>
    </div></section>`;
  }
  function videoCard(v) {
    const id = ytId(v.url);
    const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
    const badge = v.productCode ? `<span class="media-badge">${esc(v.productCode)}</span>` : '';
    return `<button class="media-card" data-video="${esc(v.id)}">
      <div class="media-thumb video ${thumb ? '' : 'noimg'}">${thumb ? `<img src="${thumb}" alt="${esc(v.title)}" loading="lazy">` : ''}<span class="play">▶</span>${badge}</div>
      <div class="media-body">
        <h4>${esc(v.title)}</h4>
        ${v.subTitle ? `<p class="media-sub">${esc(v.subTitle)}</p>` : ''}
        <p class="media-desc">${esc(v.desc || '')}</p>
        ${v.notice ? `<div class="media-notice-hint">💡 복합 착용 참고 · 게시판 문의 안내</div>` : ''}
      </div></button>`;
  }
  function docCard(d) {
    const cover = (d.pages && d.pages[0]) || '';
    return `<button class="media-card" data-doc="${esc(d.id)}">
      <div class="media-thumb ${cover ? '' : 'noimg'}">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : '<span class="doc-ic">PDF</span>'}</div>
      <div class="media-body"><h4>${esc(d.title)}</h4><p>${esc(d.desc || '')}${d.pages && d.pages.length ? ` · ${d.pages.length}쪽` : ''}</p></div></button>`;
  }
  function playerHTML(item) {
    const id = ytId(item.url);
    if (id) return `<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${esc(item.title)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    const src = mediaSrc(item);
    if (src) return `<div class="player"><video src="${esc(src)}" controls playsinline></video></div>`;
    return `<div class="player empty-player"><p>영상 준비 중입니다</p></div>`;
  }
  function openVideoModal(v) {
    if (!v) return;
    const noticeHtml = v.notice ? `
      <div class="video-notice-card">
        <div class="vnc-head"><span class="vnc-badge">💡 착용 가이드 안내</span> <b>입는 바른자세 복합 착용 참고</b></div>
        <p class="vnc-text">${esc(v.notice)}</p>
        <div class="vnc-action">
          <span>영상 속 제품이나 착용법에 대해 궁금하신 점이 있으신가요?</span>
          <a href="#/consult/write?cat=제품문의&title=${encodeURIComponent((v.productCode || '입는 바른자세') + ' 제품 착용 문의')}" class="btn btn-primary btn-sm" data-close>상담문의 게시판 바로가기 →</a>
        </div>
      </div>` : '';
    modal(`<h3>${esc(v.title)}</h3>
      ${playerHTML(v)}
      ${noticeHtml}
      <div class="video-modal-info">
        ${v.subTitle ? `<p class="vmi-sub"><b>${esc(v.subTitle)}</b></p>` : ''}
        <p class="muted">${esc(v.desc || '')}</p>
      </div>`, { wide: true });
  }
  function mountProducts(el) {
    $$('.tab', el).forEach(t => t.addEventListener('click', () => {
      $$('.tab', el).forEach(x => x.classList.toggle('on', x === t));
      $$('.tab-panel', el).forEach(p => p.hidden = p.dataset.panel !== t.dataset.tab);
    }));
    $$('[data-video]', el).forEach(b => b.addEventListener('click', () => {
      const v = S.data.materials.find(m => m.id === b.dataset.video);
      openVideoModal(v);
    }));
    $$('[data-play-code]', el).forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      const code = b.dataset.playCode;
      const v = S.data.materials.find(m => m.type === 'video' && m.productCode === code);
      if (v) openVideoModal(v);
    }));
    $$('[data-doc]', el).forEach(b => b.addEventListener('click', () => {
      const d = S.data.materials.find(m => m.id === b.dataset.doc);
      modal(`<h3>${esc(d.title)}</h3><p class="muted">${esc(d.desc || '')}</p>
        ${d.url ? `<p><a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">자료 열기 / 다운로드</a></p>` : ''}
        <div class="doc-pages">${(d.pages || []).map(p => `<img src="${esc(p)}" alt="" loading="lazy">`).join('')}</div>`, { wide: true });
    }));
  }

  /* =======================================================
     렌탈신청
     ======================================================= */
  function viewRental() {
    const s = set();
    const singles = singleProducts(), bundles = bundleProducts();
    return `${pageHead('렌탈신청', '바른 자세를 빌려드립니다', '원하는 상품을 고르고 온라인으로 바로 렌탈 계약을 진행하세요. 각 상품의 QR을 스마트폰으로 찍으면 착한렌탈 접속 화면으로 바로 이동합니다.')}
    <section class="sec"><div class="wrap">
      ${isAdmin() ? `<div class="admin-strip">관리자: <a href="#/admin/rental">렌탈 상품 추가 · 수정 · 삭제 →</a> <span style="margin:0 6px">|</span> <a href="#/admin/rentalApplies">렌탈접수 관리 현황 →</a></div>` : ''}
      <div class="rental-notice-banner">
        <div class="rnb-icon">📋</div>
        <div class="rnb-body">
          <h4>S폼 전자계약서 서명을 완료하셨나요?</h4>
          <p>비에스온에서 신용체크 및 카카오톡 S폼 전자계약 서명을 마치셨다면, <b>렌탈접수 게시판</b>에 신분증 사진(앞면)과 계약 제품 규격(컬러/사이즈)을 등록해 주세요. 확인 즉시 본사 및 관리자 승인 후 택배 발송 또는 가까운 매장 방문 수령으로 안전하게 전달해 드립니다.</p>
        </div>
        <a class="btn" href="#/rentalApply/write">렌탈 계약 접수하기 →</a>
      </div>
      ${s.rentalUrl ? `<div class="rental-hero card"><div><h3>온라인 렌탈 계약 바로가기</h3><p class="muted">상품 선택부터 전자계약까지 한 번에 진행할 수 있어요.</p>
        <a class="btn btn-primary btn-lg" href="${esc(s.rentalUrl)}" target="_blank" rel="noopener">렌탈 계약하기</a> ${refChip()}</div><div class="qr">${qrSvg(s.rentalUrl, 5)}</div></div>` : ''}

      <div class="rental-block">
        <div class="rb-head"><div><p class="eyebrow">단품</p><h2>5가지 단품 렌탈</h2></div><span class="rb-tag">바로 접속 QR 포함</span></div>
        <div class="product-grid rental">${singles.map(p => productCard(p, 'rental')).join('')}</div>
      </div>

      <div class="rental-block">
        <div class="rb-head"><div><p class="eyebrow">2개 구성</p><h2>함께 쓰면 더 좋은 2개 구성 세트</h2></div><span class="rb-tag alt">월 39,800 · 57,700 · 75,600원</span></div>
        <p class="rb-desc">상체와 중체를 한 번에 준비하는 세트입니다. QR로 착한렌탈 접속 후 그대로 신청할 수 있어요.</p>
        <div class="product-grid rental bundle">${bundles.map(p => productCard(p, 'rental')).join('')}</div>
      </div>

      <div class="qr-board">
        <div class="qb-head">
          <div><p class="eyebrow">QR 바로 접속</p><h2>상품별 착한렌탈 접속 QR</h2>
          <p class="muted">스마트폰 카메라로 QR을 찍으면 해당 상품의 렌탈 신청 화면이 바로 열립니다. PC에서는 QR 링크 열기를 눌러 주세요.</p></div>
          <span class="qb-chip">${singles.length}개 단품 + ${bundles.length}개 세트</span>
        </div>
        <div class="qr-grid">${[...singles, ...bundles].map(qrTile).join('')}</div>
      </div>

      ${guideCard()}
      <div class="info-row">
        <div class="card"><h4>렌탈 상담이 필요하신가요?</h4><p>상담문의 게시판에 '렌탈상담'으로 남기시거나, 착한 창업 가이드에게 바로 연락하세요.</p><a class="btn btn-line" href="#/consult/write?cat=렌탈상담">렌탈 상담 남기기</a></div>
        <div class="card"><h4>직접 입어보고 싶다면</h4><p>가까운 카페 드 슬리밍고 매장에서 체험할 수 있어요.</p><a class="btn btn-line" href="#/stores">매장 찾기</a></div>
        <div class="card"><h4>A/S · 고객 서비스</h4><p>무상수리 3년, 339제도(개당 330,000원 새 제품 교체)를 운영합니다.</p><a class="btn btn-line" href="#/startup#fee">자세히</a></div>
      </div>
    </div></section>`;
  }
  function mountRental(el) {
    $$('[data-qr]', el).forEach(b => b.addEventListener('click', () => {
      modal(`<div class="qr-modal"><h3>${esc(b.dataset.name)}</h3><p class="muted">스마트폰 카메라로 찍으면 렌탈 계약 페이지로 이동합니다.</p><div class="qr big">${qrSvg(b.dataset.qr, 8)}</div><a class="btn btn-primary" href="${esc(b.dataset.qr)}" target="_blank" rel="noopener">링크로 열기</a></div>`);
    }));
  }

  /* =======================================================
     매장안내
     ======================================================= */
  function viewStores() {
    return `${pageHead('매장안내', '전국 카페 드 슬리밍고', '렌탈 후 A/S 접수 및 기타 문의는 매장으로 방문하거나 문의하실 수 있습니다.')}
    <section class="sec"><div class="wrap">
      ${isAdmin() ? `<div class="admin-strip">관리자: <a href="#/admin/stores">매장 주소·사진·전화 입력 →</a></div>` : ''}
      ${guideCard('line')}
      ${storeGrid(S.data.stores)}
    </div></section>`;
  }

  /* =======================================================
     플레이 슬리밍고 앱
     ======================================================= */
  function viewApp() {
    const s = set();
    return `${pageHead('플레이 슬리밍고 2.1', '자세를 읽고, 습관을 바꾸는 AI', '슬리밍고그룹이 개발한 AI 체형 측정 전문 앱으로, 사진 한 장으로 자세점수와 부위별 문제점을 즉시 확인합니다.')}
    <section class="sec"><div class="wrap app-detail">
      <div class="app-hero-mockup reveal" aria-hidden="true">
        <img src="assets/app/play_slimminggo_mockup.png?v=20261115_15" alt="슬리밍고그룹 플레이 슬리밍고 2.1 앱 화면" loading="lazy">
      </div>
      <div class="app-detail-content reveal">
        <div class="app-features">
          <div class="card"><h4>📸 촬영 한 번으로 AI 골격 분석</h4><p>특수 검사판이나 검사복 없이 스마트폰 카메라만으로 정면·측면 촬영부터 3D 분석까지 빠르게 끝납니다.</p></div>
          <div class="card"><h4>🔍 한눈에 보는 문제점</h4><p>거북목·굽은 등·말린 어깨·골반 경사 등 정상 체형과 내 체형을 입체적으로 비교하고 통증 유발 부위를 쉽게 보여줍니다.</p></div>
          <div class="card"><h4>🌿 체형 맞춤 솔루션</h4><p>맞춤 스트레칭과 바른 생활습관, 특허받은 입는 바른자세 제품(R1090·BB484·SM880)까지 내 몸에 꼭 맞게 안내합니다.</p></div>
          <div class="card"><h4>🪑 좌식 생활 앉은 자세 체크</h4><p>서 있는 자세뿐 아니라 하루 중 가장 오랜 시간을 보내는 책상 및 운전 시 앉은 자세까지 정밀하게 측정합니다.</p></div>
        </div>
        <div class="app-download card">
          <h3>플레이 슬리밍고 2.1 다운로드</h3>
          <div class="dl-row">
            <div><div class="qr">${qrSvg(s.appIos, 5)}</div><a class="store-btn dark" href="${esc(s.appIos)}" target="_blank" rel="noopener"><small>Download on the</small>App Store</a></div>
            <div><div class="qr">${qrSvg(s.appAndroid, 5)}</div><a class="store-btn dark" href="${esc(s.appAndroid)}" target="_blank" rel="noopener"><small>GET IT ON</small>Google Play</a></div>
          </div>
          <p class="fine">앱에서 측정한 자세점수와 분석 결과를 들고 가까운 카페 드 슬리밍고 매장에서 입는 바른자세를 직접 체험해 보세요.</p>
        </div>
      </div>
    </div></section>`;
  }

  /* =======================================================
     로그인 / 회원가입 / 계정 찾기
     ======================================================= */
  function viewLogin(prefId = '') {
    return `${pageHead('로그인', '다시 만나 반가워요')}
    <section class="sec"><div class="wrap auth">
      <form class="card form" id="loginForm">
        <label>아이디<input name="loginId" required autocomplete="username" value="${esc(prefId)}"></label>
        <label>비밀번호<input name="pw" type="password" required autocomplete="current-password"></label>
        <button class="btn btn-primary btn-lg block">로그인</button>
        <div class="auth-sub-links">
          <a href="#/find-account?tab=id">아이디 찾기</a>
          <span class="sep">|</span>
          <a href="#/find-account?tab=pw${prefId ? '&id=' + encodeURIComponent(prefId) : ''}">비밀번호 재설정</a>
          <span class="sep">|</span>
          <a href="#/signup">회원가입</a>
        </div>
      </form>
    </div></section>`;
  }
  function mountLogin(el) {
    $('#loginForm', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = formData(e.target);
      const u = await S.login(f.loginId, f.pw);
      if (!u) return toast('아이디 또는 비밀번호를 확인해 주세요.');
      toast(`${u.name}님, 환영합니다!`);
      const back = sessionStorage.getItem('bjs_back'); sessionStorage.removeItem('bjs_back');
      location.hash = back || (u.isAdmin ? '#/admin' : '#/mypage');
    });
  }

  /* 아이디 / 비밀번호 찾기 */
  function viewFindAccount(activeTab = 'id', query = {}) {
    const isPw = activeTab === 'pw';
    const initId = query.id || '';
    return `${pageHead('계정 찾기', isPw ? '비밀번호 재설정' : '아이디 찾기', '가입 시 등록하신 회원 정보로 확인합니다.')}
    <section class="sec"><div class="wrap auth">
      <div class="card form">
        <div class="find-tabs" role="tablist">
          <a class="find-tab ${!isPw ? 'on' : ''}" href="#/find-account?tab=id">아이디 찾기</a>
          <a class="find-tab ${isPw ? 'on' : ''}" href="#/find-account?tab=pw${initId ? '&id=' + encodeURIComponent(initId) : ''}">비밀번호 재설정</a>
        </div>

        ${!isPw ? `
          <!-- 아이디 찾기 -->
          <form id="findIdForm">
            <label>이름<input name="name" required placeholder="가입 시 등록한 실명"></label>
            <label>연락처<input name="phone" type="tel" required placeholder="010-0000-0000"></label>
            <button class="btn btn-primary btn-lg block" style="margin-top:12px">아이디 찾기</button>
          </form>
          <div id="idResult"></div>
        ` : `
          <!-- 비밀번호 재설정 -->
          <form id="findPwForm">
            <label>아이디<input name="loginId" required placeholder="아이디" value="${esc(initId)}"></label>
            <label>이름<input name="name" required placeholder="가입 시 등록한 실명"></label>
            <label>연락처<input name="phone" type="tel" required placeholder="010-0000-0000"></label>
            <div style="border-top:1px dashed #d5ece0;margin:18px 0 14px;padding-top:14px">
              <label>새 비밀번호<input name="newPw" type="password" required minlength="6" placeholder="영문·숫자 조합 6자리 이상" autocomplete="new-password"></label>
              <label>새 비밀번호 확인<input name="newPw2" type="password" required minlength="6" placeholder="새 비밀번호 다시 입력" autocomplete="new-password"></label>
            </div>
            <button class="btn btn-primary btn-lg block">비밀번호 재설정</button>
          </form>
          <div id="pwResult"></div>
        `}

        <div class="auth-sub-links" style="margin-top:22px">
          <a href="#/login">← 로그인 화면으로 돌아가기</a>
          <span class="sep">|</span>
          <a href="#/signup">회원가입</a>
        </div>
      </div>
    </div></section>`;
  }

  function mountFindAccount(el) {
    const fId = $('#findIdForm', el);
    if (fId) {
      fId.addEventListener('submit', e => {
        e.preventDefault();
        const f = formData(fId);
        try {
          const res = S.findId({ name: f.name, phone: f.phone });
          const resBox = $('#idResult', el);
          if (!res) {
            resBox.innerHTML = `<div class="found-card" style="border-color:#ffb27f;background:#fff8f3">
              <div class="fc-icon">⚠️</div>
              <h4>일치하는 회원을 찾을 수 없습니다</h4>
              <p class="muted" style="font-size:0.86rem;margin-bottom:12px">입력하신 이름과 연락처를 다시 확인해 주세요.<br>아직 가입하지 않으셨다면 회원가입을 먼저 진행해 주세요.</p>
              <a class="btn btn-line btn-sm" href="#/signup">회원가입 하러 가기</a>
            </div>`;
            return;
          }
          resBox.innerHTML = `<div class="found-card">
            <div class="fc-icon">🎉</div>
            <h4>회원님의 아이디를 찾았습니다</h4>
            <div class="found-box">
              <b class="found-id">${esc(res.loginId)}</b>
              <span class="found-date">가입일: ${fmtDate(res.joinedAt, true)}</span>
            </div>
            <div class="found-actions">
              <a class="btn btn-primary" href="#/login?id=${encodeURIComponent(res.loginId)}">이 아이디로 로그인하기</a>
              <a class="btn btn-line" href="#/find-account?tab=pw&id=${encodeURIComponent(res.loginId)}">비밀번호도 재설정</a>
            </div>
          </div>`;
        } catch (err) {
          toast(err.message);
        }
      });
    }

    const fPw = $('#findPwForm', el);
    if (fPw) {
      fPw.addEventListener('submit', async e => {
        e.preventDefault();
        const f = formData(fPw);
        if (f.newPw !== f.newPw2) return toast('새 비밀번호가 서로 일치하지 않습니다.');
        if (f.newPw.length < 6) return toast('새 비밀번호는 6자리 이상이어야 합니다.');
        try {
          await S.resetPassword({ loginId: f.loginId, name: f.name, phone: f.phone, newPw: f.newPw });
          const resBox = $('#pwResult', el);
          fPw.style.display = 'none';
          resBox.innerHTML = `<div class="found-card">
            <div class="fc-icon">🔒✨</div>
            <h4>비밀번호가 성공적으로 변경되었습니다!</h4>
            <p class="muted" style="margin-bottom:16px">새로운 비밀번호로 지금 바로 로그인하실 수 있습니다.</p>
            <a class="btn btn-primary btn-lg block" href="#/login?id=${encodeURIComponent(f.loginId)}">새 비밀번호로 로그인하기</a>
          </div>`;
          toast('비밀번호를 성공적으로 재설정했습니다.');
        } catch (err) {
          toast(err.message);
        }
      });
    }
  }

  function profileFields(u, isNew) {
    const s = set();
    const v = k => esc(u ? u[k] : '');
    return `
      ${isNew ? `
        <div class="grid2">
          <label>아이디<input name="loginId" required minlength="4" pattern="[A-Za-z0-9_]{4,20}" title="영문·숫자 4~20자" placeholder="영문·숫자 4~20자"></label>
          <span></span>
          <label>비밀번호<input name="pw" type="password" required minlength="6" autocomplete="new-password"></label>
          <label>비밀번호 확인<input name="pw2" type="password" required minlength="6" autocomplete="new-password"></label>
        </div>` : ''}
      <div class="grid2">
        <label>이름${isNew ? '' : ' <small class="lock">수정 불가</small>'}<input name="name" ${isNew ? 'required' : 'readonly'} value="${v('name')}"></label>
        <label>생년월일<input name="birth" type="date" required value="${v('birth')}"></label>
        <label>연락처<input name="phone" type="tel" required placeholder="010-0000-0000" value="${v('phone')}"></label>
        <fieldset class="radios"><legend>성별</legend>
          <label><input type="radio" name="gender" value="여성" ${u && u.gender === '여성' ? 'checked' : ''} required> 여성</label>
          <label><input type="radio" name="gender" value="남성" ${u && u.gender === '남성' ? 'checked' : ''}> 남성</label>
        </fieldset>
      </div>
      <label>실거주지 주소
        <div class="addr-row"><input name="zip" placeholder="우편번호" readonly value="${v('zip')}"><button type="button" class="btn btn-line" id="addrBtn">주소 검색</button></div>
        <input name="address" required placeholder="기본 주소" value="${v('address')}">
        <input name="address2" placeholder="상세 주소" value="${v('address2')}">
      </label>
      <div class="grid2">
        <label>추천인 이름 <small>착한 창업 가이드</small><input name="refName" value="${u ? v('refName') : esc(s.recommenderName)}" readonly></label>
        <label>추천인 번호<input name="refNo" value="${u ? v('refNo') : esc(s.recommenderNo)}" readonly></label>
      </div>`;
  }
  function bindAddress(el) {
    const b = $('#addrBtn', el); if (!b) return;
    b.addEventListener('click', () => {
      if (!window.daum || !daum.Postcode) { toast('주소 검색을 불러오지 못했어요. 직접 입력해 주세요.'); return; }
      new daum.Postcode({ oncomplete: d => {
        $('[name=zip]', el).value = d.zonecode;
        $('[name=address]', el).value = d.roadAddress || d.jibunAddress;
        $('[name=address2]', el).focus();
      } }).open();
    });
  }
  function viewSignup() {
    return `${pageHead('회원가입', '인연을 잇는 첫걸음, 이음', '가입하면 이음 등급으로 시작합니다. 창업 신청 후 접수글을 남기면 새움 등급으로 등업됩니다.')}
    <section class="sec"><div class="wrap auth wide">
      <form class="card form" id="signupForm">
        ${profileFields(null, true)}
        <label class="agree"><input type="checkbox" name="agree" required> 개인정보(이름·생년월일·연락처·주소·성별) 수집·이용에 동의합니다. <small>회원 관리, 창업 교육 및 렌탈 상담 안내 목적으로만 사용합니다.</small></label>
        <button class="btn btn-primary btn-lg block">가입하기</button>
      </form>
    </div></section>`;
  }
  function mountSignup(el) {
    bindAddress(el);
    $('#signupForm', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = formData(e.target);
      if (f.pw !== f.pw2) return toast('비밀번호가 서로 다릅니다.');
      try {
        const u = await S.signup({ loginId: f.loginId, pw: f.pw, name: f.name, birth: f.birth, phone: f.phone, gender: f.gender,
          zip: f.zip, address: f.address, address2: f.address2, refName: f.refName, refNo: f.refNo });
        toast(`${u.name}님, 이음 등급으로 가입되었습니다!`);
        location.hash = '#/mypage';
      } catch (err) { toast(err.message); }
    });
  }

  /* =======================================================
     마이페이지
     ======================================================= */
  function partProgress(u, part) {
    const ls = S.data.lectures.filter(l => l.part === part);
    const done = ls.filter(l => lecDone(u, l)).length;
    const mins = ls.filter(l => lecDone(u, l)).reduce((a, l) => a + (+l.minutes || 0), 0);
    return { total: ls.length, done, mins, all: ls.length > 0 && done === ls.length };
  }
  function viewMypage() {
    const u = me();
    const p1 = partProgress(u, 1), p2 = partProgress(u, 2);
    const myPosts = ['rentalApply', 'apply', 'consult', 'guestbook'].flatMap(b => (S.data.posts[b] || []).filter(p => p.authorId === u.id).map(p => ({ ...p, board: b })));
    return `${pageHead('마이페이지', `${esc(u.name)}님의 바른자세 여정`)}
    <section class="sec"><div class="wrap my-grid">
      <aside class="my-side">
        <div class="card grade-card g-${u.grade}">
          <p class="muted">현재 등급</p>
          <div class="gc-row">${icon((GRADES[gIdx(u.grade)] || GRADES[0]).icon, 'big')}<div><b>${gName(u.grade)}</b><span>${(GRADES[gIdx(u.grade)] || GRADES[0]).motto}</span></div></div>
          <p class="gc-desc">${(GRADES[gIdx(u.grade)] || GRADES[0]).desc}</p>
          <dl class="kv"><dt>아이디</dt><dd>${esc(u.loginId)}</dd><dt>회원가입일</dt><dd>${fmtDate(u.joinedAt)} <small class="lock">수정 불가</small></dd></dl>
        </div>
        <div class="card">
          <h4>온라인 교육 진행</h4>
          <div class="prog"><span>1부 필수 3시간</span><b>${p1.done}/${p1.total}</b><i style="--p:${p1.total ? p1.done / p1.total * 100 : 0}%"></i></div>
          ${(() => { const l1 = S.data.lectures.filter(l => l.part === 1).sort((a, b) => a.order - b.order)[0]; if (!l1) return ''; const pc = lecPct(u, l1); return `<div class="prog watch"><span>1강 영상 시청률</span><b>${pc}%</b><i style="--p:${pc}%"></i></div>`; })()}
          <div class="prog"><span>2부 자율 6시간</span><b>${p2.done}/${p2.total}</b><i style="--p:${p2.total ? p2.done / p2.total * 100 : 0}%"></i></div>
          <a class="btn btn-line block" href="#/edu">강의실 가기</a>
        </div>
        ${gIdx(u.grade) < 2 && !u.isAdmin ? `<div class="card hl-card"><h4>창업을 시작하려면</h4><p>① 신청서 작성 → ② 교육비 3만원 입금 → ③ 창업접수 게시판에 글 남기기</p>${guideCard('line')}
          <a class="btn btn-cta block" href="${formLink()}" target="_blank" rel="noopener">창업 신청서 작성</a>
          <a class="btn btn-line block" href="#/apply/write">창업접수 글쓰기</a></div>` : ''}
      </aside>
      <div class="my-main">
        <div class="card">
          <h3>회원정보 관리</h3>
          <form class="form" id="profileForm">${profileFields(u, false)}
            <button class="btn btn-primary">정보 저장</button></form>
        </div>
        <div class="card">
          <h3>비밀번호 변경</h3>
          <form class="form grid3" id="pwForm">
            <label>현재 비밀번호<input type="password" name="cur" required autocomplete="current-password"></label>
            <label>새 비밀번호<input type="password" name="pw" required minlength="6" autocomplete="new-password"></label>
            <label>새 비밀번호 확인<input type="password" name="pw2" required minlength="6" autocomplete="new-password"></label>
            <button class="btn btn-line">변경</button>
          </form>
        </div>
        <div class="card">
          <h3>내가 쓴 글</h3>
          ${myPosts.length ? `<ul class="mini-list">${myPosts.sort((a, b) => b.date.localeCompare(a.date)).map(p => `<li><a href="#/${p.board}/view/${p.id}"><span class="tag">${BOARDS[p.board].short}</span>${esc(p.title)}</a><time>${fmtDate(p.date)}</time></li>`).join('')}</ul>` : '<p class="muted">아직 작성한 글이 없습니다.</p>'}
        </div>
        <div class="card"><h3>성장 단계</h3>${gradeJourney(u.grade)}</div>
      </div>
    </div></section>`;
  }
  function mountMypage(el) {
    bindAddress(el);
    $('#profileForm', el).addEventListener('submit', async e => {
      e.preventDefault();
      const u = me(), f = formData(e.target);
      Object.assign(u, { birth: f.birth, phone: f.phone, gender: f.gender, zip: f.zip, address: f.address, address2: f.address2 });
      await S.save(); toast('회원정보를 저장했습니다.');
    });
    $('#pwForm', el).addEventListener('submit', async e => {
      e.preventDefault();
      const u = me(), f = formData(e.target);
      if (u.pw !== await S.hash(f.cur)) return toast('현재 비밀번호가 맞지 않습니다.');
      if (f.pw !== f.pw2) return toast('새 비밀번호가 서로 다릅니다.');
      u.pw = await S.hash(f.pw); await S.save(); e.target.reset(); toast('비밀번호를 변경했습니다.');
    });
  }

  /* =======================================================
     온라인교육
     ======================================================= */
  function viewEdu() {
    const u = me();
    const can = u && (u.isAdmin || gIdx(u.grade) >= 2);
    const head = pageHead('온라인교육', '착한 창업 온라인 강의실', '총 12시간 = 온라인 9시간 + 오프라인 3시간');
    if (!can) {
      return `${head}<section class="sec"><div class="wrap narrow">
        ${guideCard()}
        <div class="lock-panel card">
          <div class="lock-ic">🔒</div>
          <h2>새움 등급부터 수강할 수 있어요</h2>
          <p>교육비 입금이 확인되면 관리자가 새움 등급으로 등업하고, 바로 강의가 열립니다.</p>
          <ol class="steps compact">
            <li><b>1</b><div><h4>창업 신청서 작성</h4><p><a href="${formLink()}" target="_blank" rel="noopener">구글폼 바로가기 →</a></p></div></li>
            <li><b>2</b><div><h4>온라인 교육비 3만원 입금</h4><p>${esc(set().bankInfo)}</p></div></li>
            <li><b>3</b><div><h4>회원가입 후 창업접수 게시판에 글 남기기</h4><p>${u ? '<a href="#/apply/write">접수글 쓰기 →</a>' : '<a href="#/signup">회원가입 →</a> · <a href="#/login">로그인</a>'}</p></div></li>
          </ol>
        </div>
        ${eduBreakdown()}
      </div></section>`;
    }
    const p1 = partProgress(u, 1);
    const lecList = part => S.data.lectures.filter(l => l.part === part).sort((a, b) => a.order - b.order).map((l, i) => {
      const done = lecDone(u, l), pc = lecPct(u, l);
      const subs = (l.subLectures || []).map(s => `<li>${esc(s)}</li>`).join('');
      const act = l.activities ? `<div class="lec-act-box">📝 <b>실천 과제:</b> ${esc(l.activities)}</div>` : '';
      return `<li class="lec ${done ? 'done' : ''}">
        <span class="lec-no">${done ? '✓' : i + 1}</span>
        <div class="lec-info">
          <h4>${esc(l.title)} ${done ? '<em class="ok-chip">이수 완료</em>' : pc > 0 ? `<em class="pct-chip">${pc}% 시청</em>` : ''}</h4>
          <p>${esc(l.desc || '')} · <b>${l.minutes}분</b> ${l.url || l.blob ? '' : '<em class="soon">영상 준비 중</em>'}${!done && pc > 0 && pc < 100 ? ' · 100% 시청 + 퀴즈 제출 필요' : ''}</p>
          ${subs ? `<ul class="lec-sub-items">${subs}</ul>` : ''}
          ${act}
        </div>
        <button class="btn ${done ? 'btn-line' : 'btn-primary'} btn-sm" data-lec="${l.id}">${done ? '다시 보기' : pc > 0 ? '이어서 보기' : '수강하기'}</button>
      </li>`;
    }).join('');
    return `${head}<section class="sec"><div class="wrap">
      ${isAdmin() ? `<div class="admin-strip">관리자: <a href="#/admin/lectures">강의 영상 등록·수정 →</a></div>` : ''}
      ${p1.all && gIdx(u.grade) < 3 && !u.isAdmin ? `<div class="banner ok">🎉 1단계 필수 3시간(01~09강)을 모두 이수했어요! 관리자 확인 후 <b>피움 등급(월 렌탈료 4배 사업권)</b>으로 등업됩니다.</div>` : ''}
      ${eduBreakdown()}
      <div class="lec-wrap">
        <div class="lec-part"><div class="lec-head"><h3>1단계: 온라인 입문교육 · 3시간</h3><span class="tag">이수 즉시 4배 사업권 시작 (01~09강)</span></div><ul class="lec-list">${lecList(1)}</ul></div>
        <div class="lec-part"><div class="lec-head"><h3>2단계: 온라인 실무교육 · 6시간</h3><span class="tag soft">자율 이수 · 50만점 달성 시 8배 승급 (10~27강)</span></div><ul class="lec-list">${lecList(2)}</ul></div>
        <div class="lec-part offline card">
          <div class="lec-head">
            <h3>3단계: 오프라인 현장 실습 · 3시간 (180분)</h3>
            <span class="tag">직접 입어보고, 설명해보고, 첫 활동계획 완성</span>
          </div>
          <p class="lead" style="margin-top:10px">가까운 전국 카페 드 슬리밍고 지정 매장에서 진행되며, 전문 헬퍼가 1:1로 함께 동행하여 실무를 안내합니다.</p>
          <div class="offline-grid">
            <div class="offline-card"><small>1단계 · 15분</small><b>준비와 기본 안내</b><p>제품·위생·동의사항 확인 및 실습 순서 이해</p></div>
            <div class="offline-card"><small>2단계 · 60분</small><b>제품별 직접 체험</b><p>R1090 · BB484 · SM880 착용 방향, 사이즈, 착탈의 및 관리 연습</p></div>
            <div class="offline-card"><small>3단계 · 35분</small><b>고객 시착 지원 실습</b><p>고객 동의 획득, 신체 측정 및 사이즈 선택, 올바른 착용 상태 점검</p></div>
            <div class="offline-card"><small>4단계 · 35분</small><b>상담·계약 역할연습</b><p>고객 생활불편 경청, 제품·비용 설명 및 렌탈 신청 절차 롤플레잉</p></div>
            <div class="offline-card"><small>5단계 · 35분</small><b>학습 확인 및 활동 준비</b><p>개인별 실습 피드백 및 첫 30일 활동계획서 완성</p></div>
          </div>

          <div class="plan-box" style="margin-top:20px">
            <b>✅ 교육 수료 안내</b>
            <p>온라인 27강과 오프라인 실습 3시간(180분)을 이수하고, 학습 확인 활동 및 첫 활동계획서 작성을 마치면 정식 수료가 확정됩니다.<br>
            <strong style="color:var(--cta-d)">※ 제품 구매나 계약 실적은 교육 수료 조건이 절대 아닙니다.</strong> 누구나 부담 없이 배움에 전념할 수 있습니다.</p>
          </div>

          <div style="margin-top:20px">
            <h4>📅 수료 후 첫 30일 실천 로드맵</h4>
            <div class="table-wrap"><table class="table roadmap-table">
              <thead><tr><th>기간</th><th>실천할 일</th></tr></thead>
              <tbody>
                <tr><td><b>1주차</b></td><td>담당 매장과 연결하고, 고객 소개문과 무료 체험 예약을 준비합니다.</td></tr>
                <tr><td><b>2주차</b></td><td>체험·상담을 실전처럼 연습하고 고객의 예상 질문과 답변을 정리합니다.</td></tr>
                <tr><td><b>3주차</b></td><td>모바일 렌탈 신청 절차와 제품 인수 후 고객 안내 매뉴얼을 점검합니다.</td></tr>
                <tr><td><b>4주차</b></td><td>고객관리 기록과 활동 내용을 돌아보고 다음 달 실행 계획을 세웁니다.</td></tr>
              </tbody>
            </table></div>
          </div>
          <p style="margin-top:18px"><a class="btn btn-primary" href="#/consult/write?cat=창업상담&title=${encodeURIComponent('오프라인 교육 일정 신청')}">오프라인 현장 실습 일정 신청하기</a></p>
        </div>
      </div>
    </div></section>`;
  }
  function mountEdu(el) {
    $$('[data-lec]', el).forEach(b => b.addEventListener('click', () => openLecture(b.dataset.lec)));
  }
  function openLecture(id) {
    const u = me(), l = S.data.lectures.find(x => x.id === id);
    if (!u || !l) return;
    l.quizUrl = quizUrlOf(l);
    const m = modal('<div id="lecHost"></div>', {
      wide: true,
      onClose: () => { if (window.LecturePlayer) window.LecturePlayer.stop(); }
    });
    if (!window.LecturePlayer) { m.close(); return toast('강의 플레이어를 불러오지 못했습니다.'); }
    window.LecturePlayer.mount($('#lecHost', m.el), l, {
      user: u, S,
      onComplete: () => { render(); }
    });
  }

  /* =======================================================
     게시판 (렌탈접수 · 창업접수 · 상담문의 · 방명록)
     ======================================================= */
  const BOARDS = {
    rentalApply: {
      title: '렌탈접수 게시판',
      short: '렌탈접수',
      desc: '비에스온 렌탈신청 및 카카오톡 S폼 전자계약서 서명 완료 후 신분증 사진(앞면)과 계약 제품 규격을 등록해 주세요. 관리자 승인 확인 후 제품이 안전하게 발송됩니다. 작성한 글은 본인과 관리자만 볼 수 있습니다.',
      memberOnly: true,
      privateAll: true,
      layout: 'list'
    },
    apply: {
      title: '창업접수 게시판',
      short: '창업접수',
      desc: '창업 신청서 접수 및 교육비 입금 완료를 남겨 주세요. 관리자 확인 후 새움 등급으로 등업되고 온라인 강의가 열립니다. 작성한 글은 본인과 관리자만 볼 수 있습니다.',
      memberOnly: true,
      privateAll: true,
      layout: 'list'
    },
    consult: {
      title: '상담문의',
      short: '상담',
      desc: '렌탈상담 · 창업상담 · 기타상담을 남겨 주세요. 비밀글은 작성자와 관리자만 볼 수 있습니다.',
      categories: ['렌탈상담', '창업상담', '기타상담'],
      allowSecret: true,
      guestWrite: true,
      layout: 'list'
    },
    guestbook: {
      title: '방명록',
      short: '방명록',
      desc: '바른자세 이야기, 체험 후기, 응원의 한마디를 자유롭게 남겨 주세요.',
      guestWrite: true,
      layout: 'feed'
    }
  };

  const RENTAL_CATALOG = {
    R1090: {
      code: 'R1090',
      name: '입는 바른자세 R1090 (남녀공용)',
      price: 37800,
      colors: ['스킨', '블랙'],
      sizes: ['22', '33', '44', '55', '66', '77', '88', '99']
    },
    BB484: {
      code: 'BB484',
      name: '입는 바른자세 BB484 (여성전용)',
      price: 19900,
      colors: ['스킨', '블랙'],
      underbusts: ['70', '75', '80', '85', '90', '95', '100'],
      sizeMap: {
        '70': ['C', 'D', 'E'],
        '75': ['B', 'C', 'D', 'E'],
        '80': ['B', 'C', 'D', 'E'],
        '85': ['B', 'C', 'D', 'E'],
        '90': ['B', 'C', 'D'],
        '95': ['B', 'C', 'D'],
        '100': ['B', 'C']
      }
    },
    SM880: {
      code: 'SM880',
      name: '입는 바른자세 SM880 (체형교정)',
      price: 37800,
      colors: ['단일'],
      sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
    }
  };

  function rentalApplyGuide() {
    return `<div class="rental-apply-guide">
      <div class="rag-step"><span class="rag-num">1</span><div class="rag-text"><b>비에스온 렌탈신청</b><small>온라인 신용체크 및 렌탈가능 여부 확인</small></div></div>
      <div class="rag-step"><span class="rag-num">2</span><div class="rag-text"><b>S폼 전자계약 서명</b><small>카카오톡으로 수신된 전자계약서 서명 완료</small></div></div>
      <div class="rag-step"><span class="rag-num">3</span><div class="rag-text"><b>신분증 & 규격 접수</b><small>주민번호 뒷자리 마스킹 후 규격·수량 체크</small></div></div>
      <div class="rag-step"><span class="rag-num">4</span><div class="rag-text"><b>관리자 승인 & 수령</b><small>확인 즉시 택배발송 또는 매장 직접 방문수령</small></div></div>
    </div>`;
  }
  const unlocked = new Set(); // 비회원 비밀번호로 연 글

  function canRead(b, p) {
    const u = me();
    if (u && (u.isAdmin || p.authorId === u.id)) return true;
    if (unlocked.has(p.id)) return true;
    if (BOARDS[b].privateAll) return false;
    if (p.secret) return false;
    return true;
  }
  function canDelete(p) {
    const u = me();
    return u && (u.isAdmin || p.authorId === u.id);
  }

  function viewBoardList(b, page, query) {
    const B = BOARDS[b];
    const u = me();
    if (B.memberOnly && !u) return needLogin(B.title);
    let posts = S.data.posts[b].slice().sort((x, y) => y.date.localeCompare(x.date));
    if (B.privateAll && !isAdmin()) posts = posts.filter(p => p.authorId === u.id);
    const cat = query.cat || '';
    if (cat) posts = posts.filter(p => p.category === cat);
    const per = B.layout === 'feed' ? 9 : 12, pages = Math.max(1, Math.ceil(posts.length / per));
    page = Math.min(Math.max(1, page), pages);
    const slice = posts.slice((page - 1) * per, page * per);
    const total = posts.length;
    let body;
    if (!slice.length) body = `<div class="empty">아직 글이 없습니다. 첫 글을 남겨 주세요!</div>`;
    else if (B.layout === 'feed') body = `<div class="feed">${slice.map(p => `
        <a class="feed-card" href="#/${b}/view/${p.id}">
          ${p.images && p.images[0] ? `<div class="feed-img"><img src="${p.images[0]}" alt="" loading="lazy">${p.images.length > 1 ? `<span>+${p.images.length - 1}</span>` : ''}</div>` : ''}
          <div class="feed-body"><h4>${esc(p.title)}</h4><p>${esc((p.body || '').slice(0, 90))}</p>
          <div class="meta"><span>${esc(p.author)}</span><time>${fmtDate(p.date)}</time></div></div>
        </a>`).join('')}</div>`;
    else if (b === 'rentalApply') body = `<div class="board-table"><div class="bt-head"><span>번호</span><span>상태</span><span>계약일자</span><span>렌탈 품목 / 규격 요약</span><span>수령방식</span><span>월 렌탈료</span><span>신청자</span><span>접수일</span></div>
        ${slice.map((p, i) => {
          const locked = !canRead(b, p);
          const isDone = p.status === 'approved';
          const itemsSummary = (p.extra && p.extra.items && p.extra.items.length)
            ? p.extra.items.map(it => (it.productCode === 'SM880' || it.color === '단일') ? `${it.productCode} (${it.size}) × ${it.qty}` : `${it.productCode} (${it.color}/${it.size}) × ${it.qty}`).join(', ')
            : (p.title || '렌탈 계약 내역');
          const totalFee = (p.extra && p.extra.totalPrice) || 0;
          const deliveryTxt = (p.extra && p.extra.deliveryType === 'pickup')
            ? `🏬 매장수령 (${(p.extra.pickup && p.extra.pickup.storeName) || '매장'})`
            : `📦 택배발송`;
          return `<a class="bt-row ${locked ? 'locked' : ''}" href="#/${b}/view/${p.id}">
            <span class="bt-no">${total - (page - 1) * per - i}</span>
            <span class="bt-cat"><i class="cat ${isDone ? 'c-rental-done' : 'c-rental-wait'}">${isDone ? '승인완료' : '승인대기'}</i></span>
            <span class="bt-date">${esc((p.extra && p.extra.contractDate) || fmtDate(p.date))}</span>
            <span class="bt-title">${p.secret ? '🔒 ' : ''}${locked ? '비밀글입니다' : esc(itemsSummary)}${p.extra && p.extra.tracking ? ' <em class="replied">발송완료</em>' : ''}</span>
            <span class="bt-delivery" style="font-size:0.84rem;color:var(--forest)">${esc(deliveryTxt)}</span>
            <span class="bt-fee" style="font-size:0.9rem;font-weight:800;color:var(--forest-d)">${totalFee ? won(totalFee) : '-'}</span>
            <span class="bt-author">${esc(maskName(p.author, locked))}</span>
            <span class="bt-date">${fmtDate(p.date)}</span>
          </a>`; }).join('')}</div>`;
    else body = `<div class="board-table"><div class="bt-head"><span>번호</span>${B.categories || B.privateAll ? '<span>구분</span>' : ''}<span>제목</span><span>글쓴이</span><span>날짜</span></div>
        ${slice.map((p, i) => {
          const locked = !canRead(b, p);
          return `<a class="bt-row ${locked ? 'locked' : ''}" href="#/${b}/view/${p.id}">
            <span class="bt-no">${total - (page - 1) * per - i}</span>
            ${B.categories ? `<span class="bt-cat"><i class="cat c-${B.categories.indexOf(p.category)}">${esc(p.category)}</i></span>` : ''}
            ${B.privateAll ? `<span class="bt-cat"><i class="cat ${p.status === 'approved' ? 'c-ok' : 'c-wait'}">${p.status === 'approved' ? '승인완료' : '확인대기'}</i></span>` : ''}
            <span class="bt-title">${p.secret ? '🔒 ' : ''}${locked ? '비밀글입니다' : esc(p.title)}${p.reply ? ' <em class="replied">답변완료</em>' : ''}</span>
            <span class="bt-author">${esc(maskName(p.author, locked))}</span>
            <span class="bt-date">${fmtDate(p.date)}</span>
          </a>`; }).join('')}</div>`;

    return `${pageHead('커뮤니티', B.title, B.desc)}
    <section class="sec"><div class="wrap">
      <div class="board-tabs">${Object.keys(BOARDS).map(k => `<a href="#/${k}" class="${k === b ? 'on' : ''}">${BOARDS[k].title}</a>`).join('')}</div>
      ${b === 'rentalApply' ? rentalApplyGuide() : ''}
      ${b === 'apply' ? applyGuide() : ''}
      ${b === 'consult' ? guideCard() : guideCard('line')}
      <div class="board-bar">
        ${B.categories ? `<div class="chips"><a href="#/${b}" class="${!cat ? 'on' : ''}">전체</a>${B.categories.map(c => `<a href="#/${b}?cat=${encodeURIComponent(c)}" class="${cat === c ? 'on' : ''}">${c}</a>`).join('')}</div>` : '<span></span>'}
        <a class="btn btn-primary" href="#/${b}/write${cat ? '?cat=' + encodeURIComponent(cat) : ''}">글쓰기</a>
      </div>
      ${body}
      ${pages > 1 ? `<nav class="pager">${Array.from({ length: pages }, (_, i) => `<a href="#/${b}/p/${i + 1}${cat ? '?cat=' + encodeURIComponent(cat) : ''}" class="${i + 1 === page ? 'on' : ''}">${i + 1}</a>`).join('')}</nav>` : ''}
    </div></section>`;
  }
  const maskName = (n, locked) => locked && n ? n[0] + '*'.repeat(Math.max(1, n.length - 1)) : n;
  function applyGuide() {
    const s = set();
    return `<div class="apply-guide card">
      <div><b>1</b><p>창업 신청서 작성<br><a href="${formLink()}" target="_blank" rel="noopener">구글폼 열기 →</a><br><small>추천인 ${esc(s.recommenderName)} · 추천번호 ${esc(s.recommenderNo)}</small></p></div>
      <div><b>2</b><p>교육비 ${won(s.eduFee)} 입금<br><small>${esc(s.bankInfo)}</small></p></div>
      <div><b>3</b><p>이 게시판에 접수글 작성<br><small>입금자명·입금일 기재</small></p></div>
      <div><b>4</b><p>관리자 확인 후<br><b class="g">새움 등급 · 강의 오픈</b></p></div>
    </div>`;
  }
  function needLogin(title) {
    sessionStorage.setItem('bjs_back', location.hash);
    return `${pageHead('회원 전용', title)}<section class="sec"><div class="wrap narrow"><div class="card center lock-panel">
      <div class="lock-ic">🔑</div><h2>로그인이 필요해요</h2><p>회원가입 후 이용할 수 있습니다.</p>
      <p><a class="btn btn-primary" href="#/login">로그인</a> <a class="btn btn-line" href="#/signup">회원가입</a></p></div></div></section>`;
  }

  function viewBoardWrite(b, query) {
    const B = BOARDS[b], u = me();
    if (B.memberOnly && !u) return needLogin(B.title);
    if (b === 'rentalApply') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const userPhone = u ? (u.phone || '') : '';
      const userAddr = u ? (u.address || '') : '';
      const userAddr2 = u ? (u.address2 || '') : '';
      const userZip = u ? (u.zip || '') : '';
      const stores = S.data.stores || [];
      return `${pageHead('커뮤니티', '렌탈접수 게시판 글쓰기', '카카오톡 S폼 전자계약서 서명 완료 후 신분증 사진(앞면)과 계약 제품 규격을 등록해 주세요.')}
      <section class="sec"><div class="wrap narrow">
        ${rentalApplyGuide()}
        <form class="card form" id="rentalPostForm">
          <input type="hidden" name="secret" value="1">
          
          <div class="rental-section-title"><i>📄</i> 1. 전자계약 기본 정보</div>
          <div class="grid2">
            <label>신청자 성함<input name="author" required maxlength="20" value="${esc(u ? u.name : '')}" readonly></label>
            <label>신청자 연락처<input name="applicantPhone" required maxlength="20" value="${esc(userPhone)}" placeholder="010-0000-0000"></label>
          </div>
          <div class="grid2">
            <label>렌탈 전자계약 체결일자<input name="contractDate" type="date" required value="${todayStr}"></label>
            <label>계약 체결 상태<input value="비에스온 S폼 전자계약서 서명 완료" readonly style="background:#f6fbf8;font-weight:700;color:var(--forest)"></label>
          </div>

          <div class="rental-section-title"><i>🪪</i> 2. 신분증 사진 (앞면) 첨부</div>
          <div class="idcard-card">
            <div class="idcard-warn">
              <span class="idcard-warn-icon">⚠️</span>
              <div>
                <b>[개인정보 보호 필수] 주민등록번호 뒷자리 6자리는 반드시 가려주세요!</b><br>
                생년월일과 뒷자리 첫째 자리(성별 구분)까지만 보이게 하시고, <b>나머지 뒷자리 6자리는 포스트잇, 스티커, 사진 편집 등으로 반드시 가린 후</b> 업로드해 주세요.<br>
                <small>예시: 900101 - 1****** (앞면 사진만 첨부 / 비밀글로 관리자만 안전하게 확인합니다)</small>
              </div>
            </div>
            <div class="idcard-upload-box" id="idCardBox">
              <input type="file" id="idCardInput" accept="image/*">
              <div class="idcard-upload-icon">📷</div>
              <div class="idcard-upload-prompt">마스킹된 신분증 앞면 사진 업로드 (클릭 또는 파일 선택)</div>
              <div class="idcard-upload-sub">JPG, PNG, GIF 이미지 파일 지원 (자동 최적화 저장)</div>
            </div>
            <div id="idCardPreviewWrap" style="display:none;" class="idcard-preview-wrap">
              <img id="idCardThumb" class="idcard-thumb" src="" alt="신분증 미리보기">
              <div class="idcard-preview-info">
                <b>신분증 사진 첨부 완료</b>
                <span>주민번호 뒷자리 마스킹 확인 완료</span>
              </div>
              <button type="button" id="idCardRemoveBtn" class="idcard-remove-btn">사진 변경/삭제</button>
            </div>
          </div>

          <div class="rental-section-title"><i>👗</i> 3. 렌탈 계약 제품 규격 · 컬러 · 사이즈 선택</div>
          <p class="muted" style="margin-top:-6px;margin-bottom:12px;font-size:0.86rem">전자계약서에 서명하신 품목과 동일하게 선택해 주세요. 여러 제품을 계약하셨다면 [+ 렌탈 품목 추가하기]를 눌러 모두 추가할 수 있습니다.</p>
          
          <div class="rental-items-wrap" id="rentalItemsWrap"></div>
          <button type="button" class="rental-add-btn" id="addRentalItemBtn">+ 렌탈 품목 추가하기</button>

          <div class="rental-total-card">
            <div class="rtc-info">
              <h4>총 렌탈 품목 <span id="totalItemCount">1종</span></h4>
              <p>※ 카카오톡 S폼 전자계약서에 서명하신 월 렌탈 금액과 동일한지 확인해 주세요.</p>
            </div>
            <div class="rtc-price">
              <span class="rtc-label">총 월 렌탈료 합계</span>
              <span class="rtc-val" id="totalPriceDisplay">월 37,800원</span>
            </div>
          </div>

          <div class="rental-section-title"><i>🚚</i> 4. 제품 수령 방식 선택</div>
          <div class="delivery-type-selector">
            <label class="dt-option active" id="dtOptionCourier">
              <input type="radio" name="deliveryType" value="courier" checked>
              <div class="dt-option-text">
                <b>📦 택배 발송 (무료 배송)</b>
                <p>기재해 주신 배송지 주소로 택배를 안전하게 발송해 드립니다.</p>
              </div>
            </label>
            <label class="dt-option" id="dtOptionPickup">
              <input type="radio" name="deliveryType" value="pickup">
              <div class="dt-option-text">
                <b>🏬 매장 방문 직접 수령</b>
                <p>가까운 카페 드 슬리밍고 매장을 방문하여 피팅 및 직접 수령합니다.</p>
              </div>
            </label>
          </div>

          <!-- 택배 발송 폼 -->
          <div class="delivery-box" id="courierBox">
            <div class="grid2">
              <label>받는 분 성함<input name="deliveryReceiver" value="${esc(u ? u.name : '')}" placeholder="성함"></label>
              <label>받는 분 연락처<input name="deliveryPhone" value="${esc(userPhone)}" placeholder="010-0000-0000"></label>
            </div>
            <label>배송지 주소</label>
            <div class="addr-search-row" style="margin-bottom:8px">
              <input name="deliveryZip" value="${esc(userZip)}" placeholder="우편번호" readonly style="max-width:130px">
              <button type="button" class="btn btn-line btn-sm" id="rentalAddrBtn">우편번호 찾기</button>
            </div>
            <input name="deliveryAddress" value="${esc(userAddr)}" placeholder="기본주소" readonly style="margin-bottom:8px">
            <input name="deliveryAddress2" value="${esc(userAddr2)}" placeholder="상세주소 및 동/호수 입력">
            <label style="margin-top:10px">배송 요청사항<input name="deliveryMemo" placeholder="예: 부재 시 문 앞에 놓아주세요"></label>
          </div>

          <!-- 매장 방문 수령 폼 -->
          <div class="delivery-box" id="pickupBox" style="display:none;">
            <label>방문 수령 매장 선택
              <select name="pickupStoreId">
                ${stores.map(st => `<option value="${st.id}">${esc(st.name)} (${esc(st.region || '매장')}) - ${esc(st.address || '매장안내 참고')}</option>`).join('')}
              </select>
            </label>
            <div class="grid2" style="margin-top:10px">
              <label>수령 희망자 성함<input name="pickupReceiver" value="${esc(u ? u.name : '')}"></label>
              <label>수령자 연락처<input name="pickupPhone" value="${esc(userPhone)}"></label>
            </div>
            <label>방문 예정일 / 요청사항<input name="pickupMemo" placeholder="예: 11월 20일 오후 방문 예정입니다."></label>
          </div>

          <div class="rental-section-title"><i>📝</i> 5. 기타 요청사항 / 메모 (선택)</div>
          <label>추가 문의 및 전달사항<textarea name="body" rows="3" placeholder="본사 렌탈 관리자에게 전달할 내용이 있다면 자유롭게 적어 주세요."></textarea></label>

          <div style="background:#eef7f2;border:1px solid #c7e8d5;border-radius:12px;padding:14px 18px;margin:16px 0;font-size:0.88rem;color:var(--forest-d)">
            🔒 <b>비밀글 자동 적용</b>: 등록된 계약 정보 및 신분증 사진은 작성자 본인과 관리자만 안전하게 확인할 수 있습니다.
          </div>

          <div class="form-actions">
            <a class="btn btn-line" href="#/rentalApply">취소</a>
            <button class="btn btn-primary btn-lg" id="submitRentalApplyBtn">렌탈 접수 완료하기</button>
          </div>
        </form>
      </div></section>`;
    }
    const cat = query.cat || (B.categories ? B.categories[0] : '');
    const title = query.title || '';
    return `${pageHead('커뮤니티', B.title + ' 글쓰기')}
    <section class="sec"><div class="wrap narrow">
      ${b !== 'guestbook' ? guideCard('line') : ''}
      <form class="card form" id="postForm">
        ${B.categories ? `<fieldset class="radios cats"><legend>말머리</legend>${B.categories.map(c => `<label><input type="radio" name="category" value="${c}" ${c === cat ? 'checked' : ''}> ${c}</label>`).join('')}</fieldset>` : ''}
        <label>제목<input name="title" required maxlength="80" value="${esc(title || (b === 'apply' && u ? `[창업접수] ${u.name} · 신청서 접수 및 교육비 입금 완료` : ''))}"></label>
        <div class="grid2">
          <label>글쓴이<input name="author" required maxlength="20" value="${esc(u ? u.name : '')}" ${u ? 'readonly' : ''}></label>
          <label>날짜<input value="${fmtDate(new Date().toISOString())}" readonly></label>
          ${!u ? `<label>글 비밀번호 <small>(수정·삭제·비밀글 확인용 4자리 이상)</small><input name="guestPw" type="password" required minlength="4"></label>` : ''}
        </div>
        ${b === 'apply' ? `
          <div class="grid2">
            <label>입금자명<input name="depositor" required value="${esc(u.name)}"></label>
            <label>입금일<input name="depositDate" type="date" required></label>
          </div>
          <label class="agree"><input type="checkbox" name="formDone" required> 창업 신청서(구글폼) 작성을 완료했습니다.</label>
          <label class="agree"><input type="checkbox" name="paid" required> 온라인 교육비 ${won(set().eduFee)} 입금을 완료했습니다.</label>` : ''}
        <label>내용<textarea name="body" rows="9" required placeholder="${b === 'apply' ? '연락 가능한 시간, 희망 교육 방식(매장/헬퍼 방문) 등을 자유롭게 적어 주세요.' : '내용을 입력해 주세요.'}"></textarea></label>
        <label>사진 첨부 <small>(최대 5장, 자동으로 용량을 줄여 저장합니다)</small><input type="file" name="images" accept="image/*" multiple id="imgInput"></label>
        <div class="thumbs" id="thumbs"></div>
        ${B.allowSecret ? `<label class="agree"><input type="checkbox" name="secret" checked> 비밀글로 남기기 <small>(작성자와 관리자만 볼 수 있어요)</small></label>` : ''}
        <div class="form-actions"><a class="btn btn-line" href="#/${b}">취소</a><button class="btn btn-primary">등록하기</button></div>
      </form>
    </div></section>`;
  }
  function mountBoardWrite(el, b) {
    if (b === 'rentalApply') {
      const form = $('#rentalPostForm', el);
      if (!form) return;
      let idCardDataUrl = '';
      const idBox = $('#idCardBox', el);
      const idInput = $('#idCardInput', el);
      const idPrevWrap = $('#idCardPreviewWrap', el);
      const idThumb = $('#idCardThumb', el);
      const idRemove = $('#idCardRemoveBtn', el);

      idInput.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          idCardDataUrl = await fileToDataURL(file, 1400, 0.82);
          idThumb.src = idCardDataUrl;
          idBox.style.display = 'none';
          idPrevWrap.style.display = 'flex';
        } catch (err) {
          toast('이미지를 처리하지 못했습니다.');
        }
      });
      idRemove.addEventListener('click', () => {
        idCardDataUrl = '';
        idInput.value = '';
        idThumb.src = '';
        idPrevWrap.style.display = 'none';
        idBox.style.display = 'block';
      });

      // Delivery type toggle
      const optCourier = $('#dtOptionCourier', el);
      const optPickup = $('#dtOptionPickup', el);
      const courierBox = $('#courierBox', el);
      const pickupBox = $('#pickupBox', el);
      $$('input[name=deliveryType]', el).forEach(r => {
        r.addEventListener('change', () => {
          if (r.value === 'courier') {
            optCourier.classList.add('active');
            optPickup.classList.remove('active');
            courierBox.style.display = 'block';
            pickupBox.style.display = 'none';
          } else {
            optPickup.classList.add('active');
            optCourier.classList.remove('active');
            courierBox.style.display = 'none';
            pickupBox.style.display = 'block';
          }
        });
      });

      // Address search
      const addrBtn = $('#rentalAddrBtn', el);
      if (addrBtn) {
        addrBtn.addEventListener('click', () => {
          if (!window.daum || !daum.Postcode) { toast('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.'); return; }
          new daum.Postcode({
            oncomplete: d => {
              $('[name=deliveryZip]', el).value = d.zonecode;
              $('[name=deliveryAddress]', el).value = d.roadAddress || d.jibunAddress;
              $('[name=deliveryAddress2]', el).focus();
            }
          }).open();
        });
      }

      // Rental items state
      let rentalItems = [
        { code: 'R1090', color: '스킨', size: '55', underbust: '75', cup: 'B', qty: 1 }
      ];

      function renderItems() {
        const wrap = $('#rentalItemsWrap', el);
        wrap.innerHTML = rentalItems.map((item, idx) => {
          const cat = RENTAL_CATALOG[item.code];
          const unitPrice = cat.price;
          const subtotal = unitPrice * item.qty;
          const isBB = item.code === 'BB484';
          const isSM = item.code === 'SM880';

          return `<div class="rental-item-card" data-idx="${idx}">
            <div class="ric-head">
              <div class="ric-title">
                <span class="ric-badge">품목 #${idx + 1}</span>
                <b>${esc(cat.name)}</b>
              </div>
              ${rentalItems.length > 1 ? `<button type="button" class="ric-remove" data-del-item="${idx}">✕ 삭제</button>` : ''}
            </div>
            <div class="ric-grid">
              <label>제품 선택
                <select class="item-code" data-idx="${idx}">
                  <option value="R1090" ${item.code === 'R1090' ? 'selected' : ''}>R1090 (남녀공용 - 월 37,800원)</option>
                  <option value="BB484" ${item.code === 'BB484' ? 'selected' : ''}>BB484 (여성전용 - 월 19,900원)</option>
                  <option value="SM880" ${item.code === 'SM880' ? 'selected' : ''}>SM880 (체형교정 - 월 37,800원)</option>
                </select>
              </label>
              <label>컬러
                ${isSM ? `
                  <select class="item-color" data-idx="${idx}" disabled style="background:#f6fbf8;font-weight:700;color:var(--forest)">
                    <option value="단일">단일 (선택없음)</option>
                  </select>
                ` : `
                  <select class="item-color" data-idx="${idx}">
                    ${cat.colors.map(c => {
                      const disabled = (isBB && item.underbust === '100' && c === '스킨');
                      return `<option value="${c}" ${item.color === c ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${c}${disabled ? ' (100사이즈 불가)' : ''}</option>`;
                    }).join('')}
                  </select>
                `}
              </label>
              <label>사이즈 선택
                ${isBB ? `
                  <div class="ric-bb-split">
                    <select class="item-underbust" data-idx="${idx}">
                      ${cat.underbusts.map(ub => `<option value="${ub}" ${item.underbust === ub ? 'selected' : ''}>${ub}</option>`).join('')}
                    </select>
                    <select class="item-cup" data-idx="${idx}">
                      ${(cat.sizeMap[item.underbust] || ['B', 'C']).map(cp => `<option value="${cp}" ${item.cup === cp ? 'selected' : ''}>${cp}컵</option>`).join('')}
                    </select>
                  </div>` : `
                  <select class="item-size" data-idx="${idx}">
                    ${cat.sizes.map(sz => `<option value="${sz}" ${item.size === sz ? 'selected' : ''}>${sz}</option>`).join('')}
                  </select>`}
              </label>
              <label>수량
                <select class="item-qty" data-idx="${idx}">
                  ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}" ${item.qty === n ? 'selected' : ''}>${n}개</option>`).join('')}
                </select>
              </label>
              <div class="ric-subtotal">
                <small>월 렌탈료 소계</small>
                <span>${won(subtotal)}</span>
              </div>
            </div>
            ${isBB && item.underbust === '100' ? `<span class="ric-hint">※ BB484 100 사이즈는 블랙 컬러만 제공됩니다.</span>` : ''}
            ${isSM ? `<span class="ric-hint">※ SM880은 컬러 선택 없이 단일 제품으로 사이즈만 선택하시면 됩니다.</span>` : ''}
          </div>`;
        }).join('');

        // Recalculate totals
        const totalCount = rentalItems.reduce((acc, it) => acc + (+it.qty || 1), 0);
        const totalPrice = rentalItems.reduce((acc, it) => acc + (RENTAL_CATALOG[it.code].price * (+it.qty || 1)), 0);
        $('#totalItemCount', el).textContent = `${rentalItems.length}종 (${totalCount}개)`;
        $('#totalPriceDisplay', el).textContent = `월 ${won(totalPrice)}`;

        // Attach item events
        $$('.item-code', wrap).forEach(sel => sel.addEventListener('change', e => {
          const i = +e.target.dataset.idx;
          const newCode = e.target.value;
          const newCat = RENTAL_CATALOG[newCode];
          rentalItems[i].code = newCode;
          rentalItems[i].color = newCat.colors[0];
          if (newCode === 'BB484') {
            rentalItems[i].underbust = '75';
            rentalItems[i].cup = 'B';
            rentalItems[i].size = '75(B)';
          } else if (newCode === 'SM880') {
            rentalItems[i].color = '단일';
            rentalItems[i].size = newCat.sizes[3] || 'M';
          } else {
            rentalItems[i].size = newCat.sizes[3] || newCat.sizes[0];
          }
          renderItems();
        }));

        $$('.item-color', wrap).forEach(sel => sel.addEventListener('change', e => {
          const i = +e.target.dataset.idx;
          rentalItems[i].color = e.target.value;
        }));

        $$('.item-size', wrap).forEach(sel => sel.addEventListener('change', e => {
          const i = +e.target.dataset.idx;
          rentalItems[i].size = e.target.value;
        }));

        $$('.item-underbust', wrap).forEach(sel => sel.addEventListener('change', e => {
          const i = +e.target.dataset.idx;
          const ub = e.target.value;
          rentalItems[i].underbust = ub;
          const availableCups = RENTAL_CATALOG.BB484.sizeMap[ub] || ['B', 'C'];
          if (!availableCups.includes(rentalItems[i].cup)) rentalItems[i].cup = availableCups[0];
          if (ub === '100') rentalItems[i].color = '블랙';
          rentalItems[i].size = `${ub}(${rentalItems[i].cup})`;
          renderItems();
        }));

        $$('.item-cup', wrap).forEach(sel => sel.addEventListener('change', e => {
          const i = +e.target.dataset.idx;
          rentalItems[i].cup = e.target.value;
          rentalItems[i].size = `${rentalItems[i].underbust}(${rentalItems[i].cup})`;
        }));

        $$('.item-qty', wrap).forEach(sel => sel.addEventListener('change', e => {
          const i = +e.target.dataset.idx;
          rentalItems[i].qty = +e.target.value;
          renderItems();
        }));

        $$('[data-del-item]', wrap).forEach(btn => btn.addEventListener('click', e => {
          const i = +btn.dataset.delItem;
          rentalItems.splice(i, 1);
          renderItems();
        }));
      }

      renderItems();

      $('#addRentalItemBtn', el).addEventListener('click', () => {
        rentalItems.push({ code: 'R1090', color: '스킨', size: '55', underbust: '75', cup: 'B', qty: 1 });
        renderItems();
      });

      // Submit
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const f = formData(form), u = me();
        if (!idCardDataUrl) return toast('주민번호 뒷자리를 마스킹한 신분증 사진(앞면)을 첨부해 주세요.');
        if (!rentalItems.length) return toast('렌탈 품목을 최소 1개 이상 선택해 주세요.');

        if (f.deliveryType === 'courier') {
          if (!f.deliveryAddress) return toast('택배를 받으실 배송지 주소를 입력해 주세요.');
          if (!f.deliveryReceiver) return toast('받는 분 성함을 입력해 주세요.');
          if (!f.deliveryPhone) return toast('받는 분 연락처를 입력해 주세요.');
        } else {
          if (!f.pickupStoreId) return toast('방문 수령하실 매장을 선택해 주세요.');
          if (!f.pickupReceiver) return toast('수령 희망자 성함을 입력해 주세요.');
          if (!f.pickupPhone) return toast('수령자 연락처를 입력해 주세요.');
        }

        const itemsData = rentalItems.map(it => {
          const cat = RENTAL_CATALOG[it.code];
          const finalSize = it.code === 'BB484' ? `${it.underbust}(${it.cup})` : it.size;
          const finalColor = it.code === 'SM880' ? '단일' : it.color;
          return {
            productCode: it.code,
            productName: cat.name,
            color: finalColor,
            size: finalSize,
            qty: it.qty,
            unitPrice: cat.price,
            subtotal: cat.price * it.qty
          };
        });

        const totalPrice = itemsData.reduce((s, it) => s + it.subtotal, 0);
        const itemsSummary = itemsData.map(it => (it.productCode === 'SM880' || it.color === '단일') ? `${it.productCode} (${it.size}) × ${it.qty}` : `${it.productCode} (${it.color}/${it.size}) × ${it.qty}`).join(', ');
        const pickupStore = S.data.stores.find(st => st.id === f.pickupStoreId) || null;

        const post = {
          id: S.uid(),
          title: `[렌탈접수] ${u ? u.name : f.author} · ${itemsSummary} (월 ${won(totalPrice)})`,
          body: f.body || '',
          author: u ? u.name : f.author,
          authorId: u ? u.id : null,
          guestPw: null,
          date: S.now(),
          images: [],
          category: '',
          secret: true,
          status: 'wait',
          extra: {
            contractDate: f.contractDate,
            applicantPhone: f.applicantPhone,
            idCardImage: idCardDataUrl,
            items: itemsData,
            totalPrice: totalPrice,
            deliveryType: f.deliveryType,
            delivery: f.deliveryType === 'courier' ? {
              receiver: f.deliveryReceiver,
              phone: f.deliveryPhone,
              zip: f.deliveryZip,
              address: f.deliveryAddress,
              address2: f.deliveryAddress2,
              memo: f.deliveryMemo
            } : null,
            pickup: f.deliveryType === 'pickup' ? {
              storeId: f.pickupStoreId,
              storeName: pickupStore ? pickupStore.name : '',
              storeAddress: pickupStore ? pickupStore.address : '',
              storePhone: pickupStore ? pickupStore.phone : '',
              receiver: f.pickupReceiver,
              phone: f.pickupPhone,
              memo: f.pickupMemo
            } : null,
            tracking: null,
            adminMemo: ''
          }
        };

        S.data.posts.rentalApply.push(post);
        try {
          await S.save();
        } catch (err) {
          S.data.posts.rentalApply.pop();
          return toast('저장 공간이 부족합니다. 신분증 사진 용량을 줄여서 다시 시도해 주세요.');
        }
        toast('렌탈 계약이 성공적으로 접수되었습니다. 관리자 확인 후 승인 처리됩니다.');
        location.hash = `#/rentalApply/view/${post.id}`;
      });
      return;
    }
    const form = $('#postForm', el); if (!form) return;
    let imgs = [];
    $('#imgInput', el).addEventListener('change', async e => {
      imgs = await readImages(e.target, 5);
      $('#thumbs', el).innerHTML = imgs.map(s => `<img src="${s}" alt="">`).join('');
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = formData(form), u = me();
      const post = {
        id: S.uid(), title: f.title, body: f.body, author: u ? u.name : f.author, authorId: u ? u.id : null,
        guestPw: !u && f.guestPw ? await S.hash(f.guestPw) : null, date: S.now(), images: imgs,
        category: f.category || '', secret: !!f.secret, status: 'wait'
      };
      if (b === 'apply') post.extra = { depositor: f.depositor, depositDate: f.depositDate, formDone: !!f.formDone, paid: !!f.paid };
      S.data.posts[b].push(post);
      try { await S.save(); } catch (err) { S.data.posts[b].pop(); return toast('저장 공간이 부족해요. 사진 수를 줄여 주세요.'); }
      if (!u) unlocked.add(post.id);
      toast(b === 'apply' ? '접수되었습니다. 관리자 확인 후 새움 등급으로 등업됩니다.' : '등록되었습니다.');
      location.hash = `#/${b}/view/${post.id}`;
    });
  }

  function viewBoardPost(b, id) {
    const B = BOARDS[b];
    const p = S.data.posts[b].find(x => x.id === id);
    if (!p) return `${pageHead('커뮤니티', B.title)}<section class="sec"><div class="wrap"><div class="empty">글을 찾을 수 없습니다.</div></div></section>`;
    if (B.memberOnly && !me()) return needLogin(B.title);
    if (!canRead(b, p)) {
      return `${pageHead('커뮤니티', B.title)}<section class="sec"><div class="wrap narrow"><div class="card center lock-panel">
        <div class="lock-ic">🔒</div><h2>비밀글입니다</h2><p>작성자와 관리자만 볼 수 있어요.</p>
        ${p.guestPw ? `<form id="unlockForm" class="unlock"><input type="password" name="pw" placeholder="글 비밀번호" required><button class="btn btn-primary">확인</button></form>` : `<p><a class="btn btn-primary" href="#/login">로그인</a></p>`}
        <p><a href="#/${b}">목록으로</a></p></div></div></section>`;
    }
    const author = S.data.users.find(x => x.id === p.authorId);

    if (b === 'rentalApply') {
      const isDone = p.status === 'approved';
      const ex = p.extra || {};
      const items = ex.items || [];
      const totalPrice = ex.totalPrice || items.reduce((s, it) => s + (it.subtotal || 0), 0);
      const isCourier = ex.deliveryType === 'courier' || !ex.deliveryType;
      const del = ex.delivery || {};
      const pik = ex.pickup || {};

      return `${pageHead('커뮤니티', '렌탈접수 게시판', '렌탈 계약 신청 및 접수 세부 내역입니다.')}
      <section class="sec"><div class="wrap narrow">
        <article class="card post">
          <header class="post-head">
            <span class="cat ${isDone ? 'c-rental-done' : 'c-rental-wait'}">${isDone ? '승인완료' : '렌탈계약완료 승인대기'}</span>
            <h2>🔒 ${esc(p.title)}</h2>
            <div class="meta">
              <span>신청자 <b>${esc(p.author)}</b>${author && isAdmin() ? ' ' + badge(author.grade) : ''}</span>
              <time>접수일: ${fmtDate(p.date, true)}</time>
            </div>
          </header>

          <div class="rental-section-title"><i>📄</i> 렌탈 전자계약 기본 정보</div>
          <dl class="kv apply-kv">
            <dt>렌탈 계약 체결일자</dt><dd><b>${esc(ex.contractDate || fmtDate(p.date))}</b></dd>
            <dt>신청자 연락처</dt><dd>${esc(ex.applicantPhone || (author && author.phone) || '-')}</dd>
            <dt>계약서 서명 여부</dt><dd><b class="g">비에스온 S폼 전자계약서 서명 완료 ✓</b></dd>
            <dt>승인 처리 상태</dt><dd><span class="cat ${isDone ? 'c-rental-done' : 'c-rental-wait'}">${isDone ? '승인완료 (택배 발송 및 출고 진행)' : '렌탈계약완료 승인대기 (관리자 확인 중)'}</span></dd>
          </dl>

          <div class="rental-section-title"><i>👗</i> 렌탈 신청 제품 규격 및 옵션 내역</div>
          <table class="rental-spec-table">
            <thead>
              <tr>
                <th>#</th>
                <th>제품명</th>
                <th>컬러</th>
                <th>사이즈</th>
                <th>수량</th>
                <th style="text-align:right">월 렌탈료</th>
                <th style="text-align:right">소계</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, i) => `<tr>
                <td>${i + 1}</td>
                <td><b>${esc(it.productName || it.productCode)}</b></td>
                <td>${it.productCode === 'SM880' || it.color === '단일' ? '<span class="muted">단일</span>' : esc(it.color)}</td>
                <td><b style="color:var(--forest-d)">${esc(it.size)}</b></td>
                <td>${it.qty}개</td>
                <td style="text-align:right">${won(it.unitPrice)}</td>
                <td style="text-align:right"><b>${won(it.subtotal)}</b></td>
              </tr>`).join('') || '<tr><td colspan="7" class="center muted">선택된 품목이 없습니다.</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5"><b>총 월 렌탈료 합계</b></td>
                <td colspan="2" style="text-align:right;color:var(--forest-d);font-size:1.15rem"><b>월 ${won(totalPrice)}</b></td>
              </tr>
            </tfoot>
          </table>

          <div class="rental-section-title"><i>🚚</i> 제품 수령 방식 및 배송 정보</div>
          ${isCourier ? `
            <dl class="kv apply-kv">
              <dt>수령 방식</dt><dd><b>📦 택배 발송 (무료 배송)</b></dd>
              <dt>받는 분</dt><dd>${esc(del.receiver || p.author)} (${esc(del.phone || ex.applicantPhone || '-')})</dd>
              <dt>배송 주소</dt><dd>[${esc(del.zip || '-')}] ${esc(del.address || '')} ${esc(del.address2 || '')}</dd>
              <dt>배송 요청사항</dt><dd>${esc(del.memo || '없음')}</dd>
              ${ex.tracking ? `<dt>운송장 정보</dt><dd><b class="g">🚚 ${esc(ex.tracking.carrier)} : ${esc(ex.tracking.code)}</b> (발송 완료: ${fmtDate(ex.tracking.date)})</dd>` : '<dt>배송 현황</dt><dd><span class="muted">관리자 승인 후 송장번호가 등록됩니다.</span></dd>'}
            </dl>` : `
            <dl class="kv apply-kv">
              <dt>수령 방식</dt><dd><b>🏬 매장 방문 직접 수령</b></dd>
              <dt>수령 매장</dt><dd><b>${esc(pik.storeName || '선택 매장')}</b> ${pik.storeAddress ? `<br><small class="muted">${esc(pik.storeAddress)}</small>` : ''}</dd>
              <dt>수령인 / 연락처</dt><dd>${esc(pik.receiver || p.author)} (${esc(pik.phone || ex.applicantPhone || '-')})</dd>
              <dt>방문 예정 / 메모</dt><dd>${esc(pik.memo || '없음')}</dd>
            </dl>`}

          <div class="rental-section-title"><i>🪪</i> 신분증 사진 (앞면) 확인</div>
          <div class="rental-idcard-display">
            <div class="rid-head">
              <b>마스킹된 신분증 사진 (앞면)</b>
              <small class="muted">주민번호 뒷자리 6자리 마스킹 보호 적용</small>
            </div>
            ${ex.idCardImage ? `
              <div class="rid-img-wrap">
                <img id="rentalIdCardImg" src="${ex.idCardImage}" alt="신분증 사진">
              </div>
              <p style="font-size:0.8rem;color:var(--muted);margin-top:6px">※ 이미지를 클릭하시면 원본 크기로 크게 보실 수 있습니다.</p>` : '<p class="muted">등록된 신분증 사진이 없습니다.</p>'}
          </div>

          ${p.body ? `<div class="rental-section-title"><i>📝</i> 고객 메모 / 추가 요청사항</div><div class="post-body">${nl2br(p.body)}</div>` : ''}

          ${ex.adminMemo ? `<div class="reply"><p class="reply-h">관리자 메모 / 처리 안내 <time>${fmtDate(ex.adminMemoDate || p.date, true)}</time></p><div>${nl2br(ex.adminMemo)}</div></div>` : ''}

          ${isAdmin() ? `
            <div class="admin-rental-action">
              <h4>관리자 · 렌탈 계약 승인 및 배송 관리</h4>
              <p style="font-size:0.9rem;margin-bottom:14px">신청자: <b>${esc(p.author)}</b> (${author ? esc(author.loginId) : '회원'}) · 렌탈 합계: <b>월 ${won(totalPrice)}</b></p>
              <div class="btn-row" style="margin-bottom:18px">
                ${!isDone ? `
                  <button class="btn btn-primary" id="btnApproveRental">✓ 렌탈 계약 승인완료 처리</button>` : `
                  <span class="cat c-rental-done" style="font-size:0.95rem;padding:6px 14px">✓ 승인완료 상태</span>
                  <button class="btn btn-line btn-sm" id="btnCancelApproveRental">승인대기로 변경</button>`}
              </div>
              <form class="form" id="rentalTrackingForm">
                <h5 style="margin:0 0 10px;font-size:0.95rem;color:var(--forest-d)">배송 운송장 및 관리자 처리 메모</h5>
                <div class="grid2">
                  <label>택배사
                    <select name="carrier">
                      <option value="CJ대한통운" ${(ex.tracking && ex.tracking.carrier === 'CJ대한통운') ? 'selected' : ''}>CJ대한통운</option>
                      <option value="우체국택배" ${(ex.tracking && ex.tracking.carrier === '우체국택배') ? 'selected' : ''}>우체국택배</option>
                      <option value="한진택배" ${(ex.tracking && ex.tracking.carrier === '한진택배') ? 'selected' : ''}>한진택배</option>
                      <option value="롯데택배" ${(ex.tracking && ex.tracking.carrier === '롯데택배') ? 'selected' : ''}>롯데택배</option>
                      <option value="로젠택배" ${(ex.tracking && ex.tracking.carrier === '로젠택배') ? 'selected' : ''}>로젠택배</option>
                      <option value="기타/직접전달" ${(ex.tracking && ex.tracking.carrier === '기타/직접전달') ? 'selected' : ''}>기타 / 직접전달</option>
                    </select>
                  </label>
                  <label>운송장번호<input name="trackingCode" value="${esc((ex.tracking && ex.tracking.code) || '')}" placeholder="숫자만 입력"></label>
                </div>
                <label>관리자 처리 메모<textarea name="adminMemo" rows="2" placeholder="고객에게 안내할 메모나 관리상 특이사항을 적어 주세요.">${esc(ex.adminMemo || '')}</textarea></label>
                <button class="btn btn-line btn-sm">운송장 및 메모 저장</button>
              </form>
            </div>` : ''}

          <footer class="post-foot">
            <a class="btn btn-line" href="#/rentalApply">목록으로</a>
            ${canDelete(p) ? `<button class="btn btn-danger" id="delBtn">삭제</button>` : ''}
          </footer>
        </article>
      </div></section>`;
    }

    return `${pageHead('커뮤니티', B.title)}
    <section class="sec"><div class="wrap narrow">
      <article class="card post">
        <header class="post-head">
          ${p.category ? `<span class="cat c-${(B.categories || []).indexOf(p.category)}">${esc(p.category)}</span>` : ''}
          ${b === 'apply' ? `<span class="cat ${p.status === 'approved' ? 'c-ok' : 'c-wait'}">${p.status === 'approved' ? '승인완료' : '확인대기'}</span>` : ''}
          <h2>${p.secret ? '🔒 ' : ''}${esc(p.title)}</h2>
          <div class="meta"><span>글쓴이 <b>${esc(p.author)}</b>${author && isAdmin() ? ' ' + badge(author.grade) : ''}</span><time>${fmtDate(p.date, true)}</time></div>
        </header>
        ${p.extra ? `<dl class="kv apply-kv"><dt>입금자명</dt><dd>${esc(p.extra.depositor)}</dd><dt>입금일</dt><dd>${esc(p.extra.depositDate)}</dd><dt>신청서</dt><dd>${p.extra.formDone ? '작성 완료' : '-'}</dd><dt>교육비</dt><dd>${p.extra.paid ? '입금 완료' : '-'}</dd></dl>` : ''}
        <div class="post-body">${nl2br(p.body)}</div>
        ${p.images && p.images.length ? `<div class="post-imgs">${p.images.map(s => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>` : ''}
        ${p.reply ? `<div class="reply"><p class="reply-h">관리자 답변 <time>${fmtDate(p.reply.date, true)}</time></p><div>${nl2br(p.reply.body)}</div></div>` : ''}
        ${isAdmin() && b === 'apply' && author ? `
          <div class="admin-box">
            <h4>관리자 · 등업 처리</h4>
            <p>${esc(author.name)} (${esc(author.loginId)}) · 현재 ${badge(author.grade)} · 1부 이수 ${partProgress(author, 1).done}/${partProgress(author, 1).total}</p>
            <div class="btn-row">
              <button class="btn btn-primary" data-approve="saeum">입금 확인 · 새움 승인 (강의 오픈)</button>
              <button class="btn btn-line" data-approve="pium">피움 등업 (4배 임시사업권)</button>
            </div>
          </div>` : ''}
        ${isAdmin() && b !== 'apply' ? `
          <form class="admin-box form" id="replyForm"><h4>관리자 답변</h4><textarea name="reply" rows="4" required>${esc(p.reply ? p.reply.body : '')}</textarea><button class="btn btn-primary">답변 ${p.reply ? '수정' : '등록'}</button></form>` : ''}
        <footer class="post-foot">
          <a class="btn btn-line" href="#/${b}">목록</a>
          ${canDelete(p) || (p.guestPw && unlocked.has(p.id)) ? `<button class="btn btn-danger" id="delBtn">삭제</button>` : ''}
        </footer>
      </article>
    </div></section>`;
  }
  function mountBoardPost(el, b, id) {
    const p = S.data.posts[b].find(x => x.id === id); if (!p) return;
    if (b === 'rentalApply') {
      const img = $('#rentalIdCardImg', el);
      if (img) {
        img.addEventListener('click', () => {
          modal(`<h3>신분증 사진 (앞면)</h3><div style="text-align:center;padding:10px 0;"><img src="${img.src}" style="max-width:100%;max-height:80vh;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.15)" alt="신분증 확대보기"></div>`);
        });
      }
      const del = $('#delBtn', el);
      if (del) {
        del.addEventListener('click', async () => {
          if (!confirmBox('이 렌탈접수 글을 삭제할까요?')) return;
          S.data.posts.rentalApply = S.data.posts.rentalApply.filter(x => x.id !== id);
          await S.save();
          toast('삭제했습니다.');
          location.hash = '#/rentalApply';
        });
      }
      const btnApprove = $('#btnApproveRental', el);
      if (btnApprove) {
        btnApprove.addEventListener('click', async () => {
          p.status = 'approved';
          await S.save();
          toast('렌탈 계약을 승인완료 처리했습니다.');
          render();
        });
      }
      const btnCancel = $('#btnCancelApproveRental', el);
      if (btnCancel) {
        btnCancel.addEventListener('click', async () => {
          p.status = 'wait';
          await S.save();
          toast('승인대기 상태로 변경했습니다.');
          render();
        });
      }
      const trackForm = $('#rentalTrackingForm', el);
      if (trackForm) {
        trackForm.addEventListener('submit', async e => {
          e.preventDefault();
          const f = formData(trackForm);
          if (!p.extra) p.extra = {};
          if (f.trackingCode) {
            p.extra.tracking = {
              carrier: f.carrier,
              code: f.trackingCode,
              date: S.now()
            };
          }
          p.extra.adminMemo = f.adminMemo || '';
          p.extra.adminMemoDate = S.now();
          await S.save();
          toast('운송장 및 관리자 메모를 저장했습니다.');
          render();
        });
      }
      return;
    }
    const uf = $('#unlockForm', el);
    if (uf) uf.addEventListener('submit', async e => {
      e.preventDefault();
      if (await S.hash(formData(uf).pw) === p.guestPw) { unlocked.add(p.id); render(); } else toast('비밀번호가 맞지 않습니다.');
    });
    const del = $('#delBtn', el);
    if (del) del.addEventListener('click', async () => {
      if (!confirmBox('이 글을 삭제할까요?')) return;
      S.data.posts[b] = S.data.posts[b].filter(x => x.id !== id); await S.save(); toast('삭제했습니다.'); location.hash = '#/' + b;
    });
    const rf = $('#replyForm', el);
    if (rf) rf.addEventListener('submit', async e => {
      e.preventDefault(); p.reply = { body: formData(rf).reply, date: S.now() }; await S.save(); toast('답변을 저장했습니다.'); render();
    });
    $$('[data-approve]', el).forEach(btn => btn.addEventListener('click', async () => {
      const author = S.data.users.find(x => x.id === p.authorId); if (!author) return;
      const target = btn.dataset.approve;
      if (gIdx(author.grade) < gIdx(target)) author.grade = target;
      p.status = 'approved'; await S.save(); toast(`${author.name}님을 ${gName(target)} 등급으로 등업했습니다.`); render();
    }));
  }

  /* =======================================================
     관리자
     ======================================================= */
  const ADMIN_TABS = { members: '회원·등급', rentalApplies: '렌탈접수', applies: '창업접수', eduProg: '교육 시청현황', rental: '렌탈상품', materials: '제품자료·영상', lectures: '온라인강의', stores: '매장', settings: '사이트 설정', backup: '백업' };
  function viewAdmin(tab) {
    if (!isAdmin()) return needLogin('관리자');
    tab = ADMIN_TABS[tab] ? tab : 'members';
    return `${pageHead('관리자', '사이트 관리')}
    <section class="sec admin"><div class="wrap">
      <nav class="admin-tabs">${Object.entries(ADMIN_TABS).map(([k, v]) => {
        let count = '';
        if (k === 'rentalApplies') count = (S.data.posts.rentalApply || []).filter(p => p.status !== 'approved').length || '';
        else if (k === 'applies') count = (S.data.posts.apply || []).filter(p => p.status !== 'approved').length || '';
        return `<a href="#/admin/${k}" class="${k === tab ? 'on' : ''}">${v}${count ? ` <i>${count}</i>` : ''}</a>`;
      }).join('')}</nav>
      <div class="admin-body">${ADMIN_VIEWS[tab]()}</div>
    </div></section>`;
  }
  const ADMIN_VIEWS = {
    members() {
      const users = S.data.users.filter(u => !u.isAdmin).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
      const counts = GRADES.map(g => `<span class="grade-badge g-${g.key}">${g.name} ${users.filter(u => u.grade === g.key).length}</span>`).join('');
      return `<div class="admin-head"><h3>회원 ${users.length}명</h3><div class="badges">${counts}</div></div>
        <input class="search" id="memberSearch" placeholder="이름 · 아이디 · 연락처 검색">
        <div class="table-wrap"><table class="table admin-table" id="memberTable">
          <thead><tr><th>이름</th><th>아이디</th><th>연락처</th><th>가입일</th><th>추천인</th><th>1부 이수</th><th>등급</th><th></th></tr></thead>
          <tbody>${users.map(u => { const p1 = partProgress(u, 1); return `<tr data-q="${esc((u.name + u.loginId + u.phone).toLowerCase())}">
            <td><b>${esc(u.name)}</b></td><td>${esc(u.loginId)}</td><td>${esc(u.phone)}</td><td>${fmtDate(u.joinedAt)}</td>
            <td>${esc(u.refName)} ${esc(u.refNo)}</td><td>${p1.all ? '<b class="ok">✓ 완료</b>' : `${p1.done}/${p1.total}`}</td>
            <td><select data-grade="${u.id}">${GRADES.map(g => `<option value="${g.key}" ${u.grade === g.key ? 'selected' : ''}>${g.name}</option>`).join('')}</select></td>
            <td><button class="btn btn-line btn-sm" data-member="${u.id}">상세</button></td></tr>`; }).join('') || '<tr><td colspan="8" class="center muted">아직 회원이 없습니다.</td></tr>'}</tbody>
        </table></div>`;
    },
    rentalApplies() {
      const ps = (S.data.posts.rentalApply || []).slice().sort((a, b) => b.date.localeCompare(a.date));
      const waitCount = ps.filter(p => p.status !== 'approved').length;
      const doneCount = ps.filter(p => p.status === 'approved').length;
      const totalMonthly = ps.reduce((s, p) => s + ((p.extra && p.extra.totalPrice) || 0), 0);
      return `<div class="admin-head"><h3>렌탈접수 관리 ${ps.length}건</h3><a class="btn btn-line btn-sm" href="#/rentalApply">게시판으로</a></div>
        <div class="rental-stat-grid">
          <div class="rst-card"><span class="rst-label">총 접수 건수</span><span class="rst-val">${ps.length}건</span></div>
          <div class="rst-card ${waitCount > 0 ? 'highlight' : ''}"><span class="rst-label">승인대기</span><span class="rst-val">${waitCount}건</span></div>
          <div class="rst-card"><span class="rst-label">승인완료</span><span class="rst-val">${doneCount}건</span></div>
          <div class="rst-card"><span class="rst-label">월 렌탈료 총액</span><span class="rst-val">${won(totalMonthly)}</span></div>
        </div>
        <div class="table-wrap"><table class="table admin-table"><thead><tr><th>상태</th><th>계약일자</th><th>신청자</th><th>렌탈 품목 / 규격 요약</th><th>월 렌탈료</th><th>수령방식</th><th>접수일</th><th></th></tr></thead>
        <tbody>${ps.map(p => {
          const a = S.data.users.find(u => u.id === p.authorId);
          const isDone = p.status === 'approved';
          const itemsSummary = (p.extra && p.extra.items && p.extra.items.length)
            ? p.extra.items.map(it => (it.productCode === 'SM880' || it.color === '단일') ? `${it.productCode} (${it.size}) × ${it.qty}` : `${it.productCode} (${it.color}/${it.size}) × ${it.qty}`).join(', ')
            : (p.title || '렌탈 계약 신청');
          const totalFee = (p.extra && p.extra.totalPrice) || 0;
          const deliveryTxt = (p.extra && p.extra.deliveryType === 'pickup')
            ? `🏬 매장수령 (${(p.extra.pickup && p.extra.pickup.storeName) || '매장'})`
            : `📦 택배발송`;
          return `<tr>
            <td><span class="cat ${isDone ? 'c-rental-done' : 'c-rental-wait'}">${isDone ? '승인완료' : '승인대기'}</span></td>
            <td>${esc((p.extra && p.extra.contractDate) || fmtDate(p.date))}</td>
            <td><b>${esc(p.author)}</b><br><small class="muted">${a ? esc(a.loginId) : ''} · ${esc((p.extra && p.extra.applicantPhone) || (a && a.phone) || '')}</small></td>
            <td>${esc(itemsSummary)}</td>
            <td><b>${totalFee ? won(totalFee) : '-'}</b></td>
            <td>${esc(deliveryTxt)}</td>
            <td>${fmtDate(p.date)}</td>
            <td><a class="btn btn-line btn-sm" href="#/rentalApply/view/${p.id}">보기·승인</a></td>
          </tr>`;
        }).join('') || '<tr><td colspan="8" class="center muted">접수된 렌탈 내역이 없습니다.</td></tr>'}</tbody></table></div>`;
    },
    applies() {
      const ps = S.data.posts.apply.slice().sort((a, b) => b.date.localeCompare(a.date));
      return `<div class="admin-head"><h3>창업접수 ${ps.length}건</h3><a class="btn btn-line btn-sm" href="#/apply">게시판으로</a></div>
        <div class="table-wrap"><table class="table admin-table"><thead><tr><th>상태</th><th>작성자</th><th>입금자</th><th>입금일</th><th>현재 등급</th><th>접수일</th><th></th></tr></thead>
        <tbody>${ps.map(p => { const a = S.data.users.find(u => u.id === p.authorId); return `<tr>
          <td><span class="cat ${p.status === 'approved' ? 'c-ok' : 'c-wait'}">${p.status === 'approved' ? '승인완료' : '확인대기'}</span></td>
          <td>${esc(p.author)}</td><td>${esc(p.extra && p.extra.depositor)}</td><td>${esc(p.extra && p.extra.depositDate)}</td>
          <td>${a ? badge(a.grade) : '-'}</td><td>${fmtDate(p.date)}</td>
          <td><a class="btn btn-line btn-sm" href="#/apply/view/${p.id}">보기·승인</a></td></tr>`; }).join('') || '<tr><td colspan="7" class="center muted">접수된 글이 없습니다.</td></tr>'}</tbody></table></div>`;
    },
    rental() {
      const ps = S.data.rentalProducts.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      return `<div class="admin-head"><h3>렌탈 상품 ${ps.length}개</h3><button class="btn btn-primary" data-edit-product="">+ 상품 추가</button></div>
        <p class="muted">상품마다 온라인 렌탈계약 링크를 넣으면 렌탈신청 화면에 계약 버튼과 QR이 자동으로 생깁니다.</p>
        <div class="admin-list">${ps.map((p, i) => `<div class="al-row">
          <img src="${esc(p.img)}" alt=""><div class="al-info"><b>${esc(p.name)}</b> <small>${esc(p.code)} · ${esc(p.color)}</small><p>월 ${won(p.price)} · ${p.contractUrl ? '계약링크 ✓' : '<span class="warn">계약링크 없음</span>'} · ${p.visible === false ? '<span class="warn">숨김</span>' : '노출'}</p></div>
          <div class="al-act"><button class="btn btn-line btn-sm" data-move="${p.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn btn-line btn-sm" data-move="${p.id}" data-dir="1" ${i === ps.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-line btn-sm" data-edit-product="${p.id}">수정</button><button class="btn btn-danger btn-sm" data-del-product="${p.id}">삭제</button></div></div>`).join('')}</div>`;
    },
    materials() {
      const ms = S.data.materials;
      return `<div class="admin-head"><h3>제품 자료 · 영상 ${ms.length}개</h3><div><button class="btn btn-primary" data-edit-mat="" data-type="video">+ 제품 영상</button> <button class="btn btn-primary" data-edit-mat="" data-type="doc">+ 설명자료</button></div></div>
        <div class="admin-list">${ms.map(m => `<div class="al-row"><span class="al-type ${m.type}">${m.type === 'video' ? '영상' : '자료'}</span>
          <div class="al-info"><b>${esc(m.title)}</b><p>${esc(m.desc || '')}</p></div>
          <div class="al-act"><button class="btn btn-line btn-sm" data-edit-mat="${m.id}" data-type="${m.type}">수정</button><button class="btn btn-danger btn-sm" data-del-mat="${m.id}">삭제</button></div></div>`).join('') || '<p class="muted">등록된 자료가 없습니다.</p>'}</div>`;
    },
    lectures() {
      const part = n => S.data.lectures.filter(l => l.part === n).sort((a, b) => a.order - b.order);
      const rows = n => part(n).map(l => `<div class="al-row"><span class="al-type">${n}부</span><div class="al-info"><b>${esc(l.title)}</b><p>${l.minutes}분 · ${l.url ? (ytId(l.url) ? '유튜브 ✓' : '링크 ✓') : l.blob ? '영상파일 ✓' : '<span class="warn">영상 없음</span>'}</p></div>
        <div class="al-act"><button class="btn btn-line btn-sm" data-edit-lec="${l.id}">수정</button><button class="btn btn-danger btn-sm" data-del-lec="${l.id}">삭제</button></div></div>`).join('');
      return `<div class="admin-head"><h3>온라인 강의</h3><button class="btn btn-primary" data-edit-lec="">+ 강의 추가</button></div>
        <p class="muted">유튜브 '일부 공개' 링크를 넣는 방법을 추천합니다. 1부 강의를 모두 이수하면 회원관리에 '✓ 완료'가 표시됩니다.</p>
        <h4 class="sub-title">1부 · 필수 3시간</h4><div class="admin-list">${rows(1)}</div>
        <h4 class="sub-title">2부 · 자율 6시간</h4><div class="admin-list">${rows(2)}</div>`;
    },
    stores() {
      return `<div class="admin-head"><h3>매장 ${S.data.stores.length}곳</h3><button class="btn btn-primary" data-edit-store="">+ 매장 추가</button></div>
        <div class="admin-list">${S.data.stores.map(s => `<div class="al-row">${s.img ? `<img src="${esc(s.img)}" alt="">` : '<span class="al-type">사진없음</span>'}
          <div class="al-info"><b>${esc(s.name)}</b><p>${esc(s.address || '주소 미입력')} ${s.phone ? '· ' + esc(s.phone) : ''}</p></div>
          <div class="al-act"><button class="btn btn-line btn-sm" data-edit-store="${s.id}">수정</button><button class="btn btn-danger btn-sm" data-del-store="${s.id}">삭제</button></div></div>`).join('')}</div>`;
    },
    eduProg() {
      const l1 = S.data.lectures.filter(l => l.part === 1).sort((a, b) => a.order - b.order)[0];
      if (!l1) return '<p class="muted">1부 강의가 없습니다. 온라인강의 탭에서 먼저 등록해 주세요.</p>';
      const users = S.data.users.filter(u => !u.isAdmin);
      const rows = users.map(u => {
        const w = watchOf(u, l1) || {};
        const pc = Math.round(w.pct || 0), done = lecDone(u, l1);
        const watchedMin = Math.round((w.watched || 0) / 60);
        return `<tr>
          <td><b>${esc(u.name)}</b><br><small class="muted">${esc(u.loginId)}</small></td>
          <td>${esc(u.phone || '-')}</td>
          <td><div class="ap-cell"><div class="ap-bar"><i style="width:${pc}%"></i></div><b>${pc}%</b></div></td>
          <td>${watchedMin}분${w.duration ? ` / ${Math.round(w.duration / 60)}분` : ''}</td>
          <td>${done ? '<b class="ok">✓ 이수 완료</b>' : pc > 0 ? '<span class="warn">진행 중</span>' : '<span class="muted">미시작</span>'}</td>
          <td>${w.quizAt ? fmtDate(w.quizAt, true) : '-'}</td>
          <td>${w.updatedAt ? fmtDate(w.updatedAt, true) : '-'}</td></tr>`;
      }).join('') || '<tr><td colspan="7" class="center muted">아직 회원이 없습니다.</td></tr>';
      const doneN = users.filter(u => lecDone(u, l1)).length;
      const avg = users.length ? Math.round(users.reduce((a, u) => a + lecPct(u, l1), 0) / users.length) : 0;
      return `<div class="admin-head"><h3>1강 시청 현황</h3>
          <div class="badges"><span class="grade-badge g-ieum">평균 ${avg}%</span><span class="grade-badge g-pium">이수 ${doneN}/${users.length}명</span></div></div>
        <p class="muted">회원이 실제로 재생한 구간을 초 단위로 집계합니다(구간 이동은 제외). 100% 시청 + 퀴즈 제출 확인에 체크하면 '이수 완료'로 바뀝니다.</p>
        <div class="card" style="margin-bottom:16px"><h4>${esc(l1.title)}</h4><p class="muted">${esc(l1.url || '영상 링크 없음')} · ${l1.minutes}분</p></div>
        <div class="table-wrap"><table class="table admin-table">
          <thead><tr><th>회원</th><th>연락처</th><th>시청률</th><th>시청 시간</th><th>이수</th><th>퀴즈 제출</th><th>최근 활동</th></tr></thead>
          <tbody>${rows}</tbody></table></div>`;
    },
    settings() {
      const s = set();
      const f = (k, label, ph = '', type = 'text') => `<label>${label}<input name="${k}" type="${type}" value="${esc(s[k] || '')}" placeholder="${esc(ph)}"></label>`;
      return `<form class="form card" id="settingsForm">
        <h3>사이트 설정</h3>
        ${f('formUrl', '창업 신청 구글폼 링크', 'https://forms.gle/...')}
        <div class="grid2">${f('eduFee', '온라인 교육비(원)', '30000', 'number')}${f('bankInfo', '교육비 입금 계좌 안내', '예) ○○은행 000-000000 (주)슬리밍고그룹')}</div>
        ${f('rentalUrl', '공통 온라인 렌탈계약 링크 (선택)', '상품별 링크가 없을 때 사용')}
        ${f('quizUrl', '온라인교육 퀴즈(구글폼) 링크', 'https://docs.google.com/forms/d/e/.../viewform')}
        ${f('lecture1Url', '1강 유튜브 링크', 'https://youtu.be/...')}
        <div class="grid2">${f('appIos', '플레이 슬리밍고 App Store 링크')}${f('appAndroid', '플레이 슬리밍고 Google Play 링크')}</div>
        <div class="grid2">${f('recommenderName', '기본 추천인 이름')}${f('recommenderNo', '기본 추천인 번호')}</div>
        <div class="grid3">${f('guideTitle', '운영자 호칭', '착한 창업 가이드')}${f('guideName', '운영자 이름')}${f('kakaoId', '카카오톡 ID')}</div>
        <div class="grid2">${f('contactPhone', '상담 전화번호')}${f('heroJoggerVideo', '메인 조깅 장면 실사 영상(mp4 경로, 선택)', 'assets/hero/joggers_v6.mp4')}</div>
        
        <div class="card" style="margin-top:16px;background:#f3fbf6;border:1.5px solid #a8dfc1;padding:18px">
          <h4>☁️ Supabase 클라우드 저장소 연동</h4>
          <p class="fine" style="margin:4px 0 12px">여러 방문자나 관리자 기기 간에 데이터(회원·게시판·설정)를 실시간 공유합니다.</p>
          ${f('supabaseUrl', 'Supabase 프로젝트 URL', 'https://jurwrizrcfzhzvfpgkot.supabase.co')}
          ${f('supabaseAnonKey', 'Supabase Anon (Public) Key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')}
          <p class="fine">※ Supabase 콘솔 > Project Settings > API > Project API keys 에 있는 <code>anon</code> <code>public</code> 키를 붙여넣으세요.</p>
        </div>

        <button class="btn btn-primary" style="margin-top:16px">저장</button>
      </form>`;
    },
    backup() {
      return `<div class="card"><h3>데이터 백업 · 복원</h3>
        <p class="muted">현재 이 홈페이지는 서버 없이 <b>이 브라우저 안에</b> 데이터를 저장합니다. 정기적으로 백업 파일을 내려받아 두세요. (업로드한 영상 파일은 백업에 포함되지 않습니다)</p>
        <div class="btn-row"><button class="btn btn-primary" id="exportBtn">백업 파일 내려받기</button>
        <label class="btn btn-line">백업 파일로 복원<input type="file" id="importInput" accept="application/json" hidden></label>
        <button class="btn btn-danger" id="resetBtn">처음 상태로 초기화</button></div></div>`;
    }
  };

  function mountAdmin(el, tab) {
    if (!isAdmin()) return;
    const save = async (msg) => { await S.save(); if (msg) toast(msg); render(); };

    // 회원
    const ms = $('#memberSearch', el);
    if (ms) ms.addEventListener('input', () => { const q = ms.value.toLowerCase(); $$('#memberTable tbody tr', el).forEach(r => r.hidden = q && !(r.dataset.q || '').includes(q)); });
    $$('[data-grade]', el).forEach(sel => sel.addEventListener('change', async () => {
      const u = S.data.users.find(x => x.id === sel.dataset.grade); u.grade = sel.value; await S.save(); toast(`${u.name}님 → ${gName(u.grade)} 등급`);
    }));
    $$('[data-member]', el).forEach(b => b.addEventListener('click', () => {
      const u = S.data.users.find(x => x.id === b.dataset.member);
      const p1 = partProgress(u, 1), p2 = partProgress(u, 2);
      const m = modal(`<h3>${esc(u.name)} ${badge(u.grade)}</h3>
        <dl class="kv"><dt>아이디</dt><dd>${esc(u.loginId)}</dd><dt>생년월일</dt><dd>${esc(u.birth)}</dd><dt>성별</dt><dd>${esc(u.gender)}</dd>
        <dt>연락처</dt><dd>${esc(u.phone)}</dd><dt>주소</dt><dd>${esc([u.zip, u.address, u.address2].filter(Boolean).join(' '))}</dd>
        <dt>가입일</dt><dd>${fmtDate(u.joinedAt, true)}</dd><dt>교육</dt><dd>1부 ${p1.done}/${p1.total} · 2부 ${p2.done}/${p2.total}</dd>
        <dt>1강 시청률</dt><dd>${(() => { const l1 = S.data.lectures.filter(l => l.part === 1).sort((a, b) => a.order - b.order)[0]; if (!l1) return '-'; const w = watchOf(u, l1); return `${lecPct(u, l1)}% ${lecDone(u, l1) ? '· 퀴즈 제출 완료 ' + fmtDate(w.quizAt, true) : '· 미완료'}`; })()}</dd></dl>
        <form class="form" id="refForm"><div class="grid2"><label>추천인 이름<input name="refName" value="${esc(u.refName)}"></label><label>추천인 번호<input name="refNo" value="${esc(u.refNo)}"></label></div>
        <div class="btn-row"><button class="btn btn-primary">추천인 저장</button><button type="button" class="btn btn-danger" id="delMember">회원 삭제</button></div></form>`);
      $('#refForm', m.el).addEventListener('submit', async e => { e.preventDefault(); Object.assign(u, formData(e.target)); m.close(); await save('저장했습니다.'); });
      $('#delMember', m.el).addEventListener('click', async () => { if (!confirmBox(`${u.name}님을 삭제할까요?`)) return; S.data.users = S.data.users.filter(x => x !== u); m.close(); await save('삭제했습니다.'); });
    }));

    // 렌탈 상품
    $$('[data-move]', el).forEach(b => b.addEventListener('click', async () => {
      const ps = S.data.rentalProducts.slice().sort((a, c) => (a.order || 0) - (c.order || 0));
      const i = ps.findIndex(p => p.id === b.dataset.move), j = i + (+b.dataset.dir);
      [ps[i], ps[j]] = [ps[j], ps[i]]; ps.forEach((p, k) => p.order = k + 1); await save();
    }));
    $$('[data-del-product]', el).forEach(b => b.addEventListener('click', async () => {
      if (!confirmBox('이 렌탈 상품을 삭제할까요?')) return;
      S.data.rentalProducts = S.data.rentalProducts.filter(p => p.id !== b.dataset.delProduct); await save('삭제했습니다.');
    }));
    $$('[data-edit-product]', el).forEach(b => b.addEventListener('click', () => {
      const p = S.data.rentalProducts.find(x => x.id === b.dataset.editProduct) || { code: '', name: '', color: '', price: '', desc: '', img: '', contractUrl: '', visible: true };
      const m = modal(`<h3>렌탈 상품 ${p.id ? '수정' : '추가'}</h3><form class="form" id="pf">
        <div class="grid2"><label>상품명<input name="name" required value="${esc(p.name)}"></label><label>모델 코드<input name="code" value="${esc(p.code)}"></label>
        <label>색상<input name="color" value="${esc(p.color)}"></label><label>월 렌탈료(원)<input name="price" type="number" required value="${esc(p.price)}"></label></div>
        <label>설명<textarea name="desc" rows="2">${esc(p.desc)}</textarea></label>
        <label>온라인 렌탈계약 링크 <small>(전자계약 페이지 주소 — QR 자동 생성)</small><input name="contractUrl" value="${esc(p.contractUrl)}" placeholder="https://"></label>
        <div class="grid2"><label>구성<select name="kind"><option value="single" ${p.kind !== 'bundle' ? 'selected' : ''}>단품</option><option value="bundle" ${p.kind === 'bundle' ? 'selected' : ''}>2개 구성(세트)</option></select></label>
        <label>월 렌탈료 표시 확인<input value="${p.price ? won(p.price) : ''}" readonly></label></div>
        <label>상품 이미지 1<input type="file" accept="image/*" id="pImg"></label>
        <div class="thumbs" id="pThumb">${p.img ? `<img src="${esc(p.img)}" alt="">` : ''}</div>
        <label>상품 이미지 2 <small>(2개 구성일 때 오른쪽 제품)</small><input type="file" accept="image/*" id="pImg2"></label>
        <div class="thumbs" id="pThumb2">${p.img2 ? `<img src="${esc(p.img2)}" alt="">` : ''}</div>
        <label class="agree"><input type="checkbox" name="visible" ${p.visible !== false ? 'checked' : ''}> 렌탈신청 화면에 노출</label>
        <button class="btn btn-primary">저장</button></form>`);
      let img = p.img, img2 = p.img2 || '';
      $('#pImg', m.el).addEventListener('change', async e => { img = (await readImages(e.target, 1))[0] || img; $('#pThumb', m.el).innerHTML = `<img src="${img}" alt="">`; });
      $('#pImg2', m.el).addEventListener('change', async e => { img2 = (await readImages(e.target, 1))[0] || img2; $('#pThumb2', m.el).innerHTML = `<img src="${img2}" alt="">`; });
      $('#pf', m.el).addEventListener('submit', async e => {
        e.preventDefault(); const f = formData(e.target);
        const data = { name: f.name, code: f.code, color: f.color, price: +f.price, desc: f.desc, contractUrl: f.contractUrl, visible: f.visible, img, img2, kind: f.kind === 'bundle' ? 'bundle' : 'single' };
        if (p.id) Object.assign(p, data); else S.data.rentalProducts.push(Object.assign({ id: S.uid(), order: S.data.rentalProducts.length + 1 }, data));
        m.close(); await save('저장했습니다.');
      });
    }));

    // 자료·영상
    $$('[data-del-mat]', el).forEach(b => b.addEventListener('click', async () => {
      if (!confirmBox('삭제할까요?')) return; S.data.materials = S.data.materials.filter(x => x.id !== b.dataset.delMat); await save('삭제했습니다.');
    }));
    $$('[data-edit-mat]', el).forEach(b => b.addEventListener('click', () => {
      const type = b.dataset.type;
      const it = S.data.materials.find(x => x.id === b.dataset.editMat) || { type, title: '', desc: '', url: '', pages: [] };
      const m = modal(`<h3>${type === 'video' ? '제품 영상' : '설명자료'} ${it.id ? '수정' : '등록'}</h3><form class="form" id="mf">
        <label>제목<input name="title" required value="${esc(it.title)}"></label>
        <label>설명<textarea name="desc" rows="2">${esc(it.desc)}</textarea></label>
        ${type === 'video' ? `
          <label>유튜브 링크 또는 영상 주소<input name="url" value="${esc(it.url)}" placeholder="https://youtu.be/..."></label>
          <label>또는 영상 파일 업로드 <small>(100MB 이하, 이 브라우저에 저장)</small><input type="file" accept="video/*" id="mVid"></label>`
        : `<label>PDF·자료 링크 (선택)<input name="url" value="${esc(it.url)}" placeholder="구글드라이브 등 공유 링크"></label>
          <label>자료 이미지(페이지) 업로드 <small>(여러 장 선택 가능)</small><input type="file" accept="image/*" multiple id="mImgs"></label>
          <div class="thumbs" id="mThumbs">${(it.pages || []).map(s => `<img src="${esc(s)}" alt="">`).join('')}</div>`}
        <button class="btn btn-primary">저장</button></form>`);
      let pages = it.pages || [], blob = it.blob || null;
      const mi = $('#mImgs', m.el);
      if (mi) mi.addEventListener('change', async e => { pages = []; for (const f of e.target.files) pages.push(await fileToDataURL(f, 1600)); $('#mThumbs', m.el).innerHTML = pages.map(s => `<img src="${s}" alt="">`).join(''); });
      const mv = $('#mVid', m.el);
      if (mv) mv.addEventListener('change', e => { const f = e.target.files[0]; if (f && f.size > 100 * 1024 * 1024) { toast('100MB 이하 파일만 올릴 수 있어요. 유튜브 링크를 추천합니다.'); e.target.value = ''; return; } blob = f || blob; });
      $('#mf', m.el).addEventListener('submit', async e => {
        e.preventDefault(); const f = formData(e.target);
        const data = { type, title: f.title, desc: f.desc, url: f.url || '', pages, blob, createdAt: it.createdAt || S.now() };
        if (it.id) { Object.assign(it, data); blobURLs.delete(it.id); } else S.data.materials.unshift(Object.assign({ id: S.uid() }, data));
        m.close(); await save('저장했습니다.');
      });
    }));

    // 강의
    $$('[data-del-lec]', el).forEach(b => b.addEventListener('click', async () => {
      if (!confirmBox('강의를 삭제할까요?')) return; S.data.lectures = S.data.lectures.filter(x => x.id !== b.dataset.delLec); await save('삭제했습니다.');
    }));
    $$('[data-edit-lec]', el).forEach(b => b.addEventListener('click', () => {
      const l = S.data.lectures.find(x => x.id === b.dataset.editLec) || { part: 1, order: 99, title: '', minutes: 60, url: '', desc: '' };
      const m = modal(`<h3>강의 ${l.id ? '수정' : '추가'}</h3><form class="form" id="lf">
        <div class="grid3"><label>구분<select name="part"><option value="1" ${l.part === 1 ? 'selected' : ''}>1부 필수</option><option value="2" ${l.part === 2 ? 'selected' : ''}>2부 자율</option></select></label>
        <label>순서<input name="order" type="number" value="${l.order}"></label><label>강의 시간(분)<input name="minutes" type="number" required value="${l.minutes}"></label></div>
        <label>강의 제목<input name="title" required value="${esc(l.title)}"></label>
        <label>설명<input name="desc" value="${esc(l.desc)}"></label>
        <label>유튜브 링크 또는 영상 주소<input name="url" value="${esc(l.url)}" placeholder="https://youtu.be/... (일부 공개 추천)"></label>
        <label>퀴즈(구글폼) 링크 <small>비워두면 사이트 설정의 기본 퀴즈 링크를 사용합니다</small><input name="quizUrl" value="${esc(l.quizUrl || '')}" placeholder="https://docs.google.com/forms/..."></label>
        <label>또는 영상 파일 업로드 <small>(이 브라우저에만 저장됨)</small><input type="file" accept="video/*" id="lVid"></label>
        <button class="btn btn-primary">저장</button></form>`);
      let blob = l.blob || null;
      $('#lVid', m.el).addEventListener('change', e => { blob = e.target.files[0] || blob; });
      $('#lf', m.el).addEventListener('submit', async e => {
        e.preventDefault(); const f = formData(e.target);
        const data = { part: +f.part, order: +f.order, minutes: +f.minutes, title: f.title, desc: f.desc, url: f.url, quizUrl: f.quizUrl || '', blob };
        if (l.id) { Object.assign(l, data); blobURLs.delete(l.id); } else S.data.lectures.push(Object.assign({ id: S.uid() }, data));
        m.close(); await save('저장했습니다.');
      });
    }));

    // 매장
    $$('[data-del-store]', el).forEach(b => b.addEventListener('click', async () => {
      if (!confirmBox('매장을 삭제할까요?')) return; S.data.stores = S.data.stores.filter(x => x.id !== b.dataset.delStore); await save('삭제했습니다.');
    }));
    $$('[data-edit-store]', el).forEach(b => b.addEventListener('click', () => {
      const s = S.data.stores.find(x => x.id === b.dataset.editStore) || { name: '카페 드 슬리밍고 ', region: '', naverUrl: '', address: '', phone: '', img: '' };
      const m = modal(`<h3>매장 ${s.id ? '수정' : '추가'}</h3><form class="form" id="sf">
        <div class="grid2"><label>매장명<input name="name" required value="${esc(s.name)}"></label><label>지역<input name="region" value="${esc(s.region)}" placeholder="서울"></label></div>
        <label>네이버 플레이스 링크<input name="naverUrl" value="${esc(s.naverUrl)}"></label>
        <label>주소<input name="address" value="${esc(s.address)}"></label>
        <label>전화번호<input name="phone" value="${esc(s.phone)}"></label>
        <label>매장 사진<input type="file" accept="image/*" id="sImg"></label><div class="thumbs" id="sThumb">${s.img ? `<img src="${esc(s.img)}" alt="">` : ''}</div>
        <button class="btn btn-primary">저장</button></form>`);
      let img = s.img;
      $('#sImg', m.el).addEventListener('change', async e => { img = (await readImages(e.target, 1))[0] || img; $('#sThumb', m.el).innerHTML = `<img src="${img}" alt="">`; });
      $('#sf', m.el).addEventListener('submit', async e => {
        e.preventDefault(); const f = formData(e.target); const data = Object.assign(f, { img });
        if (s.id) Object.assign(s, data); else S.data.stores.push(Object.assign({ id: S.uid() }, data));
        m.close(); await save('저장했습니다.');
      });
    }));

    // 설정
    const sf = $('#settingsForm', el);
    if (sf) sf.addEventListener('submit', async e => {
      e.preventDefault();
      const f = formData(sf);
      f.eduFee = +f.eduFee || 30000;
      Object.assign(S.data.settings, f);
      if (S.setSupabaseConfig) await S.setSupabaseConfig(f.supabaseUrl, f.supabaseAnonKey);
      await save('설정을 저장했습니다.');
      syncGlobal();
    });

    // 백업
    const ex = $('#exportBtn', el);
    if (ex) ex.addEventListener('click', () => {
      const blob = new Blob([S.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `barunjase-backup-${fmtDate(S.now()).replace(/\./g, '')}.json`; a.click();
    });
    const im = $('#importInput', el);
    if (im) im.addEventListener('change', async () => {
      const f = im.files[0]; if (!f) return;
      if (!confirmBox('현재 데이터를 백업 파일 내용으로 바꿀까요?')) return;
      try { await S.importJSON(await f.text()); toast('복원했습니다.'); render(); } catch (err) { toast(err.message); }
    });
    const rs = $('#resetBtn', el);
    if (rs) rs.addEventListener('click', async () => { if (!confirmBox('모든 회원·게시글·설정을 지우고 처음 상태로 되돌릴까요? 되돌릴 수 없습니다.')) return; await S.reset(); toast('초기화했습니다.'); location.hash = '#/'; });
  }

  /* =======================================================
     라우터
     ======================================================= */
  let hero = null;
  let _lastSilentSync = 0;
  function silentSync() {
    if (Date.now() - _lastSilentSync < 4000) return;
    _lastSilentSync = Date.now();
    if (S && S.syncSupabase) {
      S.syncSupabase().catch(() => {});
    }
  }
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '').split('#')[0];
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const query = {};
    if (qs) qs.split('&').forEach(kv => { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' ')); });
    return { parts, query };
  }

  function render() {
    const { parts, query } = parseHash();
    const [a, b, c] = parts;
    const view = $('#view');
    let html = '', mount = null;

    if (a === 'mypage' || a === 'edu' || a === 'admin') {
      silentSync();
    }

    if (!a) { html = viewHome(); }
    else if (a === 'startup') html = viewStartup();
    else if (a === 'products') { html = viewProducts(); mount = mountProducts; }
    else if (a === 'rental') { html = viewRental(); mount = mountRental; }
    else if (a === 'stores') html = viewStores();
    else if (a === 'app') html = viewApp();
    else if (a === 'login') { html = viewLogin(query.id || ''); mount = mountLogin; }
    else if (a === 'find-account' || a === 'find') { html = viewFindAccount(query.tab || 'id', query); mount = mountFindAccount; }
    else if (a === 'signup') { html = viewSignup(); mount = mountSignup; }
    else if (a === 'mypage') { if (!me()) html = needLogin('마이페이지'); else { html = viewMypage(); mount = mountMypage; } }
    else if (a === 'edu') { html = viewEdu(); mount = mountEdu; }
    else if (a === 'admin') { html = viewAdmin(b); mount = el => mountAdmin(el, b); }
    else if (BOARDS[a]) {
      if (b === 'write') { html = viewBoardWrite(a, query); mount = el => mountBoardWrite(el, a); }
      else if (b === 'view') { html = viewBoardPost(a, c); mount = el => mountBoardPost(el, a, c); }
      else html = viewBoardList(a, b === 'p' ? +c : 1, query);
    }
    else html = `${pageHead('404', '페이지를 찾을 수 없습니다')}<section class="sec"><div class="wrap center"><a class="btn btn-primary" href="#/">홈으로</a></div></section>`;

    view.innerHTML = html;
    if (mount) mount(view);

    // 히어로
    const heroEl = $('#hero');
    const isHome = !a;
    heroEl.hidden = !isHome;
    document.body.classList.toggle('is-home', isHome);
    if (isHome) {
      if (!hero && window.THREE && window.initHero) {
        const vid = $('#heroVideo');
        const vSrc = (set().heroJoggerVideo || '').trim();
        const targetSrc = (vSrc && !vSrc.includes('joggers.mp4') && !vSrc.includes('joggers_v6.mp4'))
          ? vSrc
          : 'assets/hero/joggers_v6.mp4?v=20261115_11';
        if (vid && vid.getAttribute('src') !== targetSrc) {
          vid.setAttribute('src', targetSrc);
          vid.load();
        }
        hero = window.initHero({
          stage: $('#heroStage'), canvasWrap: $('#heroCanvas'),
          scanVideoEl: $('#heroScanVideo'), videoEl: vid,
          typeEl: $('#heroTyping'), runCaption: $('#runCaption'),
          soundBtn: $('#heroSoundBtn'), natureAudio: $('#natureAudio'),
          hud: { score: $('#hudScore'), bar: $('#hudBar'), neck: $('#hudNeck'), shoulder: $('#hudShoulder'), pelvis: $('#hudPelvis'), knee: $('#hudKnee'), caption: null }
        });
      } else if (hero) hero.resume();
    } else if (hero) hero.pause();

    // 활성 메뉴
    $$('.gnb a').forEach(x => x.classList.toggle('on', x.getAttribute('href') === '#/' + (a || '')));
    document.body.classList.remove('nav-open');
    $('#menuToggle').setAttribute('aria-expanded', 'false');
    syncUser();
    observeReveal();

    // 앵커 (#/startup#fee)
    const anchor = location.hash.split('#')[2];
    if (anchor && document.getElementById(anchor)) setTimeout(() => document.getElementById(anchor).scrollIntoView({ behavior: 'smooth' }), 50);
    else window.scrollTo(0, 0);
  }

  function syncUser() {
    const u = me();
    const html = u
      ? `<a href="#/mypage" class="user-chip">${badge(u.grade)} ${esc(u.name)}님</a>${u.isAdmin ? '<a href="#/admin" class="admin-link">관리자</a>' : ''}<button class="link-btn" id="logoutBtn">로그아웃</button>`
      : `<a href="#/login" class="link-btn">로그인</a><a href="#/signup" class="link-btn">회원가입</a>`;
    $('#userArea').innerHTML = html;
    let mob = $('#gnbUser');
    if (!mob) { mob = document.createElement('div'); mob.id = 'gnbUser'; mob.className = 'gnb-user'; $('#gnb').appendChild(mob); }
    mob.innerHTML = html.replace('id="logoutBtn"', 'data-logout');
    $$('#logoutBtn, [data-logout]').forEach(b => b.addEventListener('click', () => { S.logout(); toast('로그아웃했습니다.'); location.hash = '#/'; render(); }));
  }
  function syncGlobal() {
    $$('.js-form-link').forEach(a => a.href = set().formUrl);
    const s = set();
    $('#footerContact').textContent = '';
  }

  let io;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(e => e.classList.add('in')); return; }
    io && io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    $$('.reveal').forEach(e => io.observe(e));
  }

  /* ---------- 시작 ---------- */
  async function boot() {
    await S.init();
    syncGlobal();
    $('#menuToggle').addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      $('#menuToggle').setAttribute('aria-expanded', open);
    });
    $('.gnb-drop-btn').addEventListener('click', e => e.currentTarget.parentElement.classList.toggle('open'));
    window.addEventListener('hashchange', render);

    // 타 기기(PC·모바일) 실시간 진행현황 동기화 이벤트 수신
    window.addEventListener('bjs_sync', () => {
      syncGlobal();
      render();
    });

    // 화면 복귀 / 포커스 시 클라우드 자동 동기화 (모바일 백그라운드 복귀 대응)
    let lastFocusSync = 0;
    const triggerSync = () => {
      if (Date.now() - lastFocusSync < 3000) return;
      lastFocusSync = Date.now();
      if (S && S.syncSupabase) {
        S.syncSupabase().then(() => {
          syncGlobal();
          render();
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') triggerSync();
    });
    window.addEventListener('focus', triggerSync);
    document.addEventListener('click', async e => {
      const b = e.target.closest('[data-copy]'); if (!b) return;
      const id = b.dataset.copy;
      try { await navigator.clipboard.writeText(id); toast(`카카오톡 ID '${id}'를 복사했어요. 카카오톡 › 친구 추가 › ID로 추가에 붙여 넣으세요.`); }
      catch (err) { window.prompt('카카오톡 ID를 복사해 주세요', id); }
    });
    window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
    $('.scroll-cue').addEventListener('click', e => { e.preventDefault(); $('#home-start').scrollIntoView({ behavior: 'smooth' }); });
    document.addEventListener('visibilitychange', () => { if (!hero) return; document.hidden ? hero.pause() : (!$('#hero').hidden && hero.resume()); });
    render();
  }
  boot();
})();
