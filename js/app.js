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
            </div>` : `<a class="product-more" href="#/rental">렌탈 신청 →</a>`}
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
      <div class="multi reveal"><b>4<small>배</small></b><div><h4>기본 적용</h4><p>교육 이수 후 바로 적용합니다.</p><span class="tag">피움 · 임시사업권</span></div></div>
      <div class="multi reveal"><b>8<small>배</small></b><div><h4>누적 50만점 이상</h4><p>1년 계약기간 중 달성 시, 익월부터 적용합니다.</p><span class="tag">이룸 · 정식사업권</span></div></div>
      <div class="multi reveal hot"><b>10<small>배</small></b><div><h4>월 실적</h4><p>월 100만점 이상 달성 시 당월 적용</p><span class="tag">월 실적 보너스</span></div></div>
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
        <p class="eyebrow light">이룸 등급 특별 초대</p>
        <h2>제주 웰니스캠프 1박 2일</h2>
        <p>이룸 등급에 오른 분을 회사가 제주로 초대합니다. 항공료만 부담하면 1박 2일간 식대와 숙소는 모두 무상 제공. 특허받은 입는 바른자세를 더 깊이 알아보고, 제주에서 힐링 여행도 함께합니다.</p>
        <ul class="camp-list"><li>식대 · 숙소 무상 제공</li><li>입는 바른자세 심화 세미나</li><li>제주 힐링 여행</li><li>수료 시 <b>드림 등급</b> · VVIP 동일 자격</li></ul>
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
        <div class="eb eb-1" style="flex:3"><b>온라인 3시간</b><span>필수 · 이수 즉시 4배 임시사업권</span></div>
        <div class="eb eb-2" style="flex:6"><b>온라인 6시간</b><span>내가 가능한 시간에 자율 이수</span></div>
        <div class="eb eb-3" style="flex:3"><b>오프라인 3시간</b><span>매장 또는 1:1 방문</span></div>
      </div>
      <div class="edu-cards">
        <div class="card reveal"><h4>${icon('sprout')} 온라인 9시간</h4><p>홈페이지 온라인교육 메뉴에서 동영상 강의로 수강합니다. 처음 3시간을 이수하면 월 렌탈료 4배의 임시사업권이 생깁니다.</p></div>
        <div class="card reveal"><h4>${icon('link')} 오프라인 3시간</h4><p>지정된 매장에서 개별 일정을 따로 맞추거나, 전문 헬퍼가 직접 방문해 1:1로 진행합니다.</p></div>
      </div>`;
  }

  function appBand() {
    const s = set();
    return `<section class="sec app-band"><div class="wrap app-inner">
      <div class="phone reveal" aria-hidden="true">
        <div class="phone-screen">
          <p class="ps-title">AI 자세 분석</p>
          <svg viewBox="0 0 120 220" class="ps-body"><circle cx="60" cy="26" r="13"/><path d="M60 40v70M36 56h48M60 110l-16 60M60 110l16 60M36 56l-8 46M84 56l8 46"/><path class="ps-line" d="M60 8v200"/></svg>
          <p class="ps-score">자세점수 <b>98</b></p>
        </div>
      </div>
      <div class="app-copy reveal">
        <p class="eyebrow">플레이 슬리밍고 앱</p>
        <h2>사진 한 장으로 내 자세 점수를 확인하세요</h2>
        <p class="lead">슬리밍고가 직접 개발한 AI 자세측정 앱. 스마트폰으로 자세를 찍으면 자세점수와 문제점을 바로 확인하고, 체형에 맞는 해결책까지 안내받을 수 있어요.</p>
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
        <p>새로운 시작을 준비하시는 창업자 여러분을 환영합니다.</p>
        <p>한 나라의 미래는 다음 세대의 건강한 성장과 오늘을 살아가는 사람들의 활기찬 일상에서 시작됩니다. 미래의 성장동력이 될 아동·청소년, 사회의 현재를 이끄는 청년·장년층, 건강하고 멋진 노후를 준비하는 시니어까지. 바른 자세는 모든 세대가 일상에서 함께 가꾸어야 할 기본입니다.</p>
        <p>우리는 이러한 필요에 응답하는 가장 기본적이고 현실적인 대안으로, 생활 속에서 실천할 수 있는 바른 자세 솔루션을 제안합니다. 공부하고 일하고 걷는 매일의 순간에 바른 자세를 더하는 것, 그 가까운 실천에서 바른자세 사업의 가치와 가능성을 찾습니다.</p>
        <p>국내 최초 바른 자세 습관 교정 제품 플랫폼과 연결하는 렌탈 중개 창업은 고객의 체험과 선택을 돕는 사업입니다. 개설비 0원, 5평의 체험 공간과 기존 매장의 숍인숍 활용으로 시작의 부담을 낮췄습니다.</p>
        <p>별도 매장이 없는 경우에도 특별상담 이후 조건을 충족하면 창업할 수 있습니다. 온라인 상담과 방문 체험을 중심으로 준비하며, 본사의 교육과 전문 헬퍼의 현장 영업 지원이 함께합니다.</p>
        <p>고객에게는 생애 전반에 걸쳐 바른 자세를 경험할 기회를, 여러분에게는 지역사회의 건강한 일상에 기여하며 새로운 가능성을 펼칠 기회를 전하고자 합니다.</p>
        <p class="letter-em">시작은 가볍게, 고객과의 신뢰는 단단하게.<br>모든 세대의 바른 일상을 향한 여러분의 도전에 함께하겠습니다.</p>
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
          <tr><td>보증금</td><td>임대보증금 선납</td><td class="hl-col">선납 없음 · 수수료 20% 적립</td></tr>
          <tr><td>시작 지원</td><td>오픈 교육 위주</td><td class="hl-col">12시간 교육 + 4회 동행</td></tr>
          <tr><td>시작 비용</td><td>수천만 원 이상</td><td class="hl-col"><b>3만원</b></td></tr>
        </tbody>
      </table></div>
      <p class="fine">* 일반 매장형 창업 비용은 업종 · 지역 · 규모에 따라 다릅니다. * 세부 조건은 상담 및 계약 시 안내합니다. (출처: rental.slimminggo.com)</p>

      <h3 class="sub-title">매장 · 재고 · 직원 ZERO</h3>
      <p>고정비가 없으니 리스크도 낮습니다. 계약할 때마다 쌓이는 <b>[ 수익구조 ]</b>입니다.</p>
      <ol class="flow4">
        <li class="reveal"><b>STEP 1</b><span>렌탈 계약</span></li>
        <li class="reveal"><b>STEP 2</b><span>수수료 발생</span></li>
        <li class="reveal"><b>STEP 3</b><span>20% 적립</span></li>
        <li class="reveal"><b>STEP 4</b><span>적립분 지급</span></li>
      </ol>
      <p class="fine">* 수익은 개인 활동에 따라 다릅니다. 수수료 기준은 상담 시 안내합니다.</p>
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
      <div class="sec-head reveal"><p class="eyebrow">수수료 기준</p><h2>성과를 계산하는 세 가지 기준</h2><p class="lead">수수료 = 일반 고객 월 렌탈료 × 적용 배수</p></div>
      ${multiplierCards()}
      <p class="fine">8배의 '익월'은 실적을 달성한 달의 다음 달입니다.</p>

      <h3 class="sub-title">상품별 수수료 <small>공제 전 산출액</small></h3>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>상품</th><th>월 렌탈료</th><th>4배</th><th>8배</th><th>10배</th></tr></thead>
        <tbody>${[['R1090', 37800], ['BB484', 19900], ['SM880', 37800]].map(([n, p]) => `<tr><td><b>${n}</b></td><td>${won(p)}</td><td>${won(p * 4)}</td><td>${won(p * 8)}</td><td>${won(p * 10)}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="check-box">
        <h4>정산 전에 확인하세요</h4>
        <ul><li>상품별 정산기준금액과 실적 인정일</li><li>취소·반품에 따른 차감 및 수수료 반환</li><li>상향 배수의 적용일·유지 조건과 지급 대상</li><li>보증금 적립·선택한 헬퍼 비용·세금 등 정산 항목</li></ul>
      </div>
      <p class="notice">계산표는 확정 수익이나 매월 반복 지급을 의미하지 않습니다. 실제 지급액과 지급 횟수는 수수료 약정과 정산명세에 따릅니다.</p>
    </div></section>

    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">정산 일정</p><h2>월 두 번, 정해진 날에 정산</h2></div>
      <div class="pay-grid">
        <div class="pay reveal"><small>매월 15일 마감</small><b>익월 3일 지급</b></div>
        <div class="pay reveal"><small>매월 말일 마감</small><b>익월 18일 지급</b></div>
      </div>
      <h3 class="sub-title">보증금이 없는 경우</h3>
      <p>발생 수수료의 20%를 보증금으로 적립하고, 나머지 80%를 정산일에 지급합니다.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>발생 수수료 / 기본 4배</th><th>20% 적립</th><th>80% 지급 대상</th></tr></thead>
        <tbody>${[['R1090', 151200], ['BB484', 79600], ['SM880', 151200]].map(([n, v]) => `<tr><td><b>${n}</b> / ${won(v)}</td><td>${won(v * .2)}</td><td>${won(v * .8)}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="fine">보증금이 없는 경우의 예시이며, 세금·헬퍼 비용·취소 환수 등은 반영하지 않았습니다.</p>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">고객 서비스</p><h2>오래 사용하는 제품을 위해</h2></div>
      <div class="svc-grid">
        <div class="svc reveal"><small>339제도</small><b>개당 330,000원</b><p>서비스계약기간 중 동일 상품의 새 제품으로 교체합니다. 다른 품목으로 교환할 수 없으며, 단종된 경우에는 기능이 가장 유사한 대체상품을 제공합니다.</p></div>
        <div class="svc reveal"><small>무상수리</small><b>제품 인도일부터 3년</b><p>형태 변경은 무상수리 대상에서 제외됩니다. 고객 실수로 발생한 수리는 원인·상태·수리 범위에 따라 유상 처리될 수 있으며, 사유와 예상 비용을 먼저 안내하고 고객 동의 후 진행합니다.</p></div>
      </div>
    </div></section>

    <section class="sec sec-tint"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">성장 단계</p><h2>여섯 단계 회원 등급</h2></div>
      ${gradeJourney()}
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head reveal"><p class="eyebrow">교육</p><h2>총 12시간 = 온라인 9시간 + 오프라인 3시간</h2></div>
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
    return `<button class="media-card" data-video="${esc(v.id)}">
      <div class="media-thumb video ${thumb ? '' : 'noimg'}">${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : ''}<span class="play">▶</span></div>
      <div class="media-body"><h4>${esc(v.title)}</h4><p>${esc(v.desc || '')}</p></div></button>`;
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
  function mountProducts(el) {
    $$('.tab', el).forEach(t => t.addEventListener('click', () => {
      $$('.tab', el).forEach(x => x.classList.toggle('on', x === t));
      $$('.tab-panel', el).forEach(p => p.hidden = p.dataset.panel !== t.dataset.tab);
    }));
    $$('[data-video]', el).forEach(b => b.addEventListener('click', () => {
      const v = S.data.materials.find(m => m.id === b.dataset.video);
      modal(`<h3>${esc(v.title)}</h3>${playerHTML(v)}<p class="muted">${esc(v.desc || '')}</p>`, { wide: true });
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
      ${isAdmin() ? `<div class="admin-strip">관리자: <a href="#/admin/rental">렌탈 상품 추가 · 수정 · 삭제 →</a></div>` : ''}
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
    return `${pageHead('플레이 슬리밍고', 'AI 자세측정 앱, 플레이 슬리밍고', '슬리밍고가 직접 개발한 앱으로, 사진을 찍어 내 자세점수와 문제점을 바로 확인할 수 있어요.')}
    <section class="sec"><div class="wrap app-detail">
      <div class="app-features">
        <div class="card"><h4>📸 촬영 한 번으로 체형 점수</h4><p>검사판이나 검사복 없이 스마트폰만으로 촬영부터 분석까지 빠르게 끝납니다.</p></div>
        <div class="card"><h4>🔍 한눈에 보는 문제점</h4><p>정상 체형과 내 체형을 눈으로 비교하고, 체형별 통증 예상 부위를 쉽게 보여줍니다.</p></div>
        <div class="card"><h4>🌿 맞춤 해결책</h4><p>스트레칭, 운동, 바른 생활자세, 특허받은 입는 바른자세까지 체형에 맞게 안내합니다.</p></div>
        <div class="card"><h4>🪑 앉은 자세도 체크</h4><p>서 있는 자세뿐 아니라 일상에서 가장 오래 취하는 앉은 자세까지 측정합니다.</p></div>
      </div>
      <div class="app-download card">
        <h3>앱 다운로드</h3>
        <div class="dl-row">
          <div><div class="qr">${qrSvg(s.appIos, 5)}</div><a class="store-btn dark" href="${esc(s.appIos)}" target="_blank" rel="noopener"><small>Download on the</small>App Store</a></div>
          <div><div class="qr">${qrSvg(s.appAndroid, 5)}</div><a class="store-btn dark" href="${esc(s.appAndroid)}" target="_blank" rel="noopener"><small>GET IT ON</small>Google Play</a></div>
        </div>
        <p class="fine">앱에서 측정한 결과를 들고 가까운 매장에서 입는 바른자세를 체험해 보세요.</p>
      </div>
    </div></section>`;
  }

  /* =======================================================
     로그인 / 회원가입
     ======================================================= */
  function viewLogin() {
    return `${pageHead('로그인', '다시 만나 반가워요')}
    <section class="sec"><div class="wrap auth">
      <form class="card form" id="loginForm">
        <label>아이디<input name="loginId" required autocomplete="username"></label>
        <label>비밀번호<input name="pw" type="password" required autocomplete="current-password"></label>
        <button class="btn btn-primary btn-lg block">로그인</button>
        <p class="center muted">아직 회원이 아니신가요? <a href="#/signup">회원가입</a></p>
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
    const myPosts = ['apply', 'consult', 'guestbook'].flatMap(b => S.data.posts[b].filter(p => p.authorId === u.id).map(p => ({ ...p, board: b })));
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
      return `<li class="lec ${done ? 'done' : ''}">
        <span class="lec-no">${done ? '✓' : i + 1}</span>
        <div class="lec-info"><h4>${esc(l.title)} ${done ? '<em class="ok-chip">이수 완료</em>' : pc > 0 ? `<em class="pct-chip">${pc}% 시청</em>` : ''}</h4>
          <p>${esc(l.desc || '')} · ${l.minutes}분 ${l.url || l.blob ? '' : '<em class="soon">영상 준비 중</em>'}${!done && pc > 0 && pc < 100 ? ' · 100% 시청 + 퀴즈 제출 필요' : ''}</p></div>
        <button class="btn ${done ? 'btn-line' : 'btn-primary'} btn-sm" data-lec="${l.id}">${done ? '다시 보기' : pc > 0 ? '이어서 보기' : '수강하기'}</button>
      </li>`;
    }).join('');
    return `${head}<section class="sec"><div class="wrap">
      ${isAdmin() ? `<div class="admin-strip">관리자: <a href="#/admin/lectures">강의 영상 등록·수정 →</a></div>` : ''}
      ${p1.all && gIdx(u.grade) < 3 && !u.isAdmin ? `<div class="banner ok">🎉 1부 필수 3시간을 모두 이수했어요! 관리자 확인 후 <b>피움 등급(월 렌탈료 4배 임시사업권)</b>으로 등업됩니다.</div>` : ''}
      ${eduBreakdown()}
      <div class="lec-wrap">
        <div class="lec-part"><div class="lec-head"><h3>1부 · 필수 3시간</h3><span class="tag">이수 시 4배 임시사업권</span></div><ul class="lec-list">${lecList(1)}</ul></div>
        <div class="lec-part"><div class="lec-head"><h3>2부 · 자율 6시간</h3><span class="tag soft">가능한 시간에 자유롭게</span></div><ul class="lec-list">${lecList(2)}</ul></div>
        <div class="lec-part offline card">
          <h3>오프라인 · 3시간</h3>
          <div class="grid2">
            <div><h4>📍 지정 매장 개별 일정</h4><p class="muted">가까운 카페 드 슬리밍고 매장에서 일정을 따로 맞춰 진행합니다.</p></div>
            <div><h4>🚗 전문 헬퍼 1:1 방문</h4><p class="muted">전문 헬퍼가 직접 방문해 1:1로 진행합니다.</p></div>
          </div>
          <a class="btn btn-primary" href="#/consult/write?cat=창업상담&title=${encodeURIComponent('오프라인 교육 일정 신청')}">오프라인 교육 일정 신청</a>
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
     게시판 (창업접수 · 상담문의 · 방명록)
     ======================================================= */
  const BOARDS = {
    apply: { title: '창업접수 게시판', short: '창업접수', desc: '창업 신청서 접수 및 교육비 입금 완료를 남겨 주세요. 관리자 확인 후 새움 등급으로 등업되고 온라인 강의가 열립니다. 작성한 글은 본인과 관리자만 볼 수 있습니다.',
      memberOnly: true, privateAll: true, layout: 'list' },
    consult: { title: '상담문의', short: '상담', desc: '렌탈상담 · 창업상담 · 기타상담을 남겨 주세요. 비밀글은 작성자와 관리자만 볼 수 있습니다.',
      categories: ['렌탈상담', '창업상담', '기타상담'], allowSecret: true, guestWrite: true, layout: 'list' },
    guestbook: { title: '방명록', short: '방명록', desc: '바른자세 이야기, 체험 후기, 응원의 한마디를 자유롭게 남겨 주세요.', guestWrite: true, layout: 'feed' }
  };
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
  const ADMIN_TABS = { members: '회원·등급', applies: '창업접수', eduProg: '교육 시청현황', rental: '렌탈상품', materials: '제품자료·영상', lectures: '온라인강의', stores: '매장', settings: '사이트 설정', backup: '백업' };
  function viewAdmin(tab) {
    if (!isAdmin()) return needLogin('관리자');
    tab = ADMIN_TABS[tab] ? tab : 'members';
    return `${pageHead('관리자', '사이트 관리')}
    <section class="sec admin"><div class="wrap">
      <nav class="admin-tabs">${Object.entries(ADMIN_TABS).map(([k, v]) => `<a href="#/admin/${k}" class="${k === tab ? 'on' : ''}">${v}${k === 'applies' ? ` <i>${S.data.posts.apply.filter(p => p.status !== 'approved').length || ''}</i>` : ''}</a>`).join('')}</nav>
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
      const f = (k, label, ph = '', type = 'text') => `<label>${label}<input name="${k}" type="${type}" value="${esc(s[k])}" placeholder="${esc(ph)}"></label>`;
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
        <button class="btn btn-primary">저장</button>
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
    if (sf) sf.addEventListener('submit', async e => { e.preventDefault(); const f = formData(sf); f.eduFee = +f.eduFee || 30000; Object.assign(S.data.settings, f); await save('설정을 저장했습니다.'); syncGlobal(); });

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

    if (!a) { html = viewHome(); }
    else if (a === 'startup') html = viewStartup();
    else if (a === 'products') { html = viewProducts(); mount = mountProducts; }
    else if (a === 'rental') { html = viewRental(); mount = mountRental; }
    else if (a === 'stores') html = viewStores();
    else if (a === 'app') html = viewApp();
    else if (a === 'login') { html = viewLogin(); mount = mountLogin; }
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
          : 'assets/hero/joggers_v6.mp4?v=20261115_09';
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
