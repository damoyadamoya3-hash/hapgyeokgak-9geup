/* ══════════════════════════════════════════════════════════
   UI — 화면 렌더링
   ══════════════════════════════════════════════════════════ */
const UI = (() => {
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  let history = [];

  function show(id, push = true){
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
    if(push) history.push(id);
    window.scrollTo(0, 0);
  }
  function back(){
    history.pop();
    show(history.pop() || 'scr-home');
  }

  /* ── HUD ───────────────────────────────────────────── */
  function hud(){
    const li = Store.levelInfo(), t = Store.title();
    $('#hud-avatar').textContent = t.emoji;
    $('#hud-title').textContent  = t.name;
    $('#hud-lv').textContent     = 'Lv.' + li.lv;
    $('#hud-xpfill').style.width = li.pct + '%';
    $('#hud-xptext').textContent = li.cur + ' / ' + li.need;
    $('#hud-streak').textContent = Store.s.streak;
    $('#hud-coin').textContent   = Store.s.coin;
  }

  /* ── 일일 임무 ─────────────────────────────────────── */
  function daily(){
    const d = Store.daily();
    const now = new Date();
    $('#dc-date').textContent = `${now.getMonth()+1}월 ${now.getDate()}일 · 자정에 갱신`;
    const done = d.tasks.filter(t => t.done).length;
    $('#dc-progress').textContent = `${done} / ${d.tasks.length}`;
    $('#dc-list').innerHTML = d.tasks.map(t => `
      <li class="${t.done ? 'done' : ''}">
        <span class="dc-chk">${t.done ? '✔' : ''}</span>
        <span>${esc(t.text)} <b style="color:var(--ink2);font-size:11px">(${Math.min(t.prog,t.goal)}/${t.goal})</b></span>
        <span class="dc-rw">+${t.xp}XP · ${t.coin}🪙</span>
      </li>`).join('');
  }

  /* ── 모드 카드 태그 ────────────────────────────────── */
  function modeTags(){
    const s = Store.s;
    const avg = Math.round(QB.SUBJECTS.reduce((a,x) => a + Store.subjectProgress(x.id), 0) / QB.SUBJECTS.length);
    $('#mc-quest-tag').textContent = `진행도 ${avg}%`;
    $('#mc-ox-tag').textContent    = `최고 ${s.bestOx}문제`;
    $('#mc-boss-tag').textContent  = `격파 ${s.bossKills}마리`;
    $('#mc-srs-tag').textContent   = `대기 ${Store.dueCards().length}문제`;
    $('#mc-exam-tag').textContent  = `응시 ${s.examCount}회`;
    $('#mc-wrong-tag').textContent = `${Store.wrongCards().length}문제 수감`;
    const ct = $('#mc-codex-tag');
    if(ct) ct.textContent = `수집 ${Store.readCount()}/${QB.theory.length}장`;
  }

  /* ── 과목 현황 ─────────────────────────────────────── */
  function subjects(){
    $('#subject-grid').innerHTML = QB.SUBJECTS.map(s => {
      const total = QB.count(s.id), seen = Store.subjectSeen(s.id);
      const pct = total ? Math.round(seen / total * 100) : 0;
      const acc = Store.subjectAccuracy(s.id);
      return `<button class="subj-card" data-subject="${s.id}">
        <div class="sc-top"><span class="sc-emoji">${s.emoji}</span><h4>${esc(s.name)}</h4>
          <span class="sc-n">${total}문항</span></div>
        <div class="mini-bar"><i style="width:${pct}%;background:${s.color}"></i></div>
        <div class="sc-foot"><span>학습 ${seen}/${total}</span><span>정답률 ${acc}%</span></div>
      </button>`;
    }).join('');
  }

  /* ── 업적 ──────────────────────────────────────────── */
  function achievements(){
    $('#ach-grid').innerHTML = Store.ACHS.map(a => `
      <div class="ach ${Store.s.ach[a.id] ? 'on' : ''}" title="${esc(a.n)}">
        <div class="ae">${a.e}</div><div class="an">${esc(a.n)}</div>
      </div>`).join('');
  }

  function home(){ hud(); daily(); modeTags(); subjects(); achievements(); }

  /* ── 선택 화면: 과목 목록 ──────────────────────────── */
  function selectSubject(title, note, cb){
    $('#sel-title').textContent = title;
    $('#sel-body').innerHTML =
      (note ? `<div class="sel-note">${note}</div>` : '') +
      `<div class="stage-row">` + QB.SUBJECTS.map(s => {
        const n = QB.count(s.id);
        return `<button class="stage ${n ? '' : 'locked'}" data-pick="${s.id}" ${n?'':'disabled'}>
          <span class="st-no" style="background:${s.color};color:#fff">${s.emoji}</span>
          <span class="st-body"><h4>${esc(s.name)}</h4><p>${esc(s.desc)}</p></span>
          <span class="st-stars">${n ? n + '문항' : '준비중'}</span>
        </button>`;
      }).join('') + `</div>`;
    $$('#sel-body [data-pick]').forEach(b =>
      b.addEventListener('click', () => { Sfx.tap(); cb(b.dataset.pick); }));
    show('scr-select');
  }

  /* ── 선택 화면: 단원(스테이지) 목록 ────────────────── */
  function selectUnit(sid, cb){
    const sub = QB.subject(sid);
    $('#sel-title').textContent = sub.emoji + ' ' + sub.name;
    const units = QB.UNITS[sid] || [];
    $('#sel-body').innerHTML = `<div class="stage-row">` + units.map((u, i) => {
      const n = QB.byUnit(u.id).length;
      const rec = Store.s.units[u.id] || { stars:0, best:0 };
      const prev = i === 0 ? null : Store.s.units[units[i-1].id];
      const locked = n === 0;
      const stars = '★★★'.slice(0, rec.stars) + '☆☆☆'.slice(0, 3 - rec.stars);
      return `<button class="stage ${locked ? 'locked' : ''} ${rec.stars ? 'clear' : ''}"
                data-unit="${u.id}" ${locked ? 'disabled' : ''}>
        <span class="st-no">${locked ? '🔒' : (i + 1)}</span>
        <span class="st-body"><h4>${u.emoji} ${esc(u.name)}</h4>
          <p>${n ? n + '문항 · 최고 ' + rec.best + '%' : '문항 준비중'}</p></span>
        <span class="st-stars" style="color:var(--gold)">${stars}</span>
      </button>`;
    }).join('') + `</div>`;
    $$('#sel-body [data-unit]').forEach(b =>
      b.addEventListener('click', () => { Sfx.tap(); cb(b.dataset.unit); }));
    show('scr-select');
  }

  /* ══════════ 이론 도감 ══════════ */

  /* 굵게: **텍스트** → <b> */
  function md(s){ return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  function codexList(sid, onOpen, onDrillUnit){
    const sub = QB.subject(sid);
    const cards = QB.theoryBySubject(sid);
    $('#sel-title').textContent = '📜 ' + sub.name + ' 이론 도감';
    const read = Store.readCount(sid);
    const pct = cards.length ? Math.round(read / cards.length * 100) : 0;

    // 단원별로 묶어서 표시
    const units = (QB.UNITS[sid] || []).filter(u => QB.theoryByUnit(u.id).length);
    $('#sel-body').innerHTML = `
      <div class="codex-stat">
        <span>📖 수집률</span><span class="cs-bar"><i style="width:${pct}%"></i></span>
        <b style="font-family:var(--f-round);color:var(--brand)">${read}/${cards.length}</b>
      </div>
      ${cards.length ? '' : '<div class="sel-note">이 과목의 이론 카드는 준비 중입니다.</div>'}
      ${units.map(u => `
        <h3 style="font-size:16px;margin:20px 0 10px">${u.emoji} ${esc(u.name)}
          <button class="btn-ghost" data-drill-unit="${u.id}"
            style="float:right;padding:4px 12px;font-size:12px">🧠 단원 세뇌</button></h3>
        <div class="codex-grid">${QB.theoryByUnit(u.id).map(c => {
          const r = Store.s.readCards[c.id];
          return `<button class="tcard ${r && r.read ? 'read' : ''}" data-card="${c.id}">
            <span class="tier tier-${c.tier}">${c.tier}</span>
            <h4>${esc(c.title)}</h4>
            <p>${esc((c.summary||'').slice(0,58))}${(c.summary||'').length>58?'…':''}</p>
            <span class="tfoot">
              <span>${r && r.read ? '✅ 열람' : '🔒 미열람'}</span>
              ${c.cloze.length ? `<span>🧠 빈칸 ${c.cloze.length}</span>` : ''}
              ${c.cases.length ? `<span>⚖️ 판례 ${c.cases.length}</span>` : ''}
            </span></button>`;
        }).join('')}</div>`).join('')}`;

    $$('#sel-body [data-card]').forEach(b =>
      b.addEventListener('click', () => { Sfx.tap(); onOpen(b.dataset.card); }));
    $$('#sel-body [data-drill-unit]').forEach(b =>
      b.addEventListener('click', e => { e.stopPropagation(); Sfx.tap(); onDrillUnit(b.dataset.drillUnit); }));
    show('scr-select');
  }

  function cardDetail(cid, onDrill, onQuiz){
    const c = QB.theoryById(cid);
    if(!c) return;
    const first = Store.markRead(cid);
    const sub = QB.subject(c.subject);

    $('#card-title').textContent = sub.emoji + ' ' + sub.name;
    $('#card-body').innerHTML = `
      <div class="tc-head">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <span class="tier tier-${c.tier}" style="position:static">${c.tier}</span>
          <span style="font-size:11.5px;color:var(--ink2)">${esc((QB.unit(c.unit)||{}).name || '')}</span>
        </div>
        <h3>${esc(c.title)}</h3>
        <p class="tc-sum">${md(c.summary || '')}</p>
      </div>
      ${c.tip ? `<div class="tc-tip">💡 <b>암기 팁</b> — ${md(c.tip)}</div>` : ''}
      ${c.blocks.map(b => `
        <div class="tc-block">
          ${b.h ? `<h4>${esc(b.h)}</h4>` : ''}
          ${b.items ? `<ul>${b.items.map(i => `<li>${md(i)}</li>`).join('')}</ul>` : ''}
          ${b.table ? `<table class="tc-table">
            <thead><tr>${b.table[0].map(h => `<th>${md(h)}</th>`).join('')}</tr></thead>
            <tbody>${b.table.slice(1).map(r => `<tr>${r.map(d => `<td>${md(d)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>` : ''}
        </div>`).join('')}
      ${c.cases.length ? `<div class="tc-block"><h4>⚖️ 관련 판례</h4>
        ${c.cases.map(k => `<div class="tc-case"><div class="ct">${esc(k.t)}</div><div class="cd">${md(k.d)}</div></div>`).join('')}
      </div>` : ''}
      <div class="tc-actions">
        <button class="btn-ghost" id="btn-card-quiz">📝 관련 문제 풀기</button>
        <button class="btn-primary" id="btn-card-drill">🧠 세뇌 암기 시작</button>
      </div>`;

    $('#btn-card-drill').addEventListener('click', () => { Sfx.tap(); onDrill(cid); });
    $('#btn-card-quiz').addEventListener('click', () => { Sfx.tap(); onQuiz(c.unit, c.subject); });

    if(first){
      Store.addXp(15); Store.addCoin(5); hud();
      Sfx.unlock();
      Fx.toast('📜 새 이론 카드 수집! +15 XP', true, 2200);
      Fx.confetti(18);
    }
    show('scr-card');
  }

  /* ── 문제 렌더링 ───────────────────────────────────── */
  function question(S, onAnswer){
    const q = Engine.current(S);
    const sub = QB.subject(q.subject);
    const cfg = S.cfg;

    $('#pb-mode').textContent = cfg.label;
    const denom = (S.mode === 'ox') ? '∞' : (S.mode === 'boss' ? S.bossMax : S.queue.length);
    $('#pb-count').textContent = `${S.i + 1} / ${denom}`;
    const pct = (S.mode === 'ox') ? 0
      : S.mode === 'boss' ? (1 - S.bossHp / S.bossMax) * 100
      : (S.i / S.queue.length) * 100;
    $('#pb-fill').style.width = pct + '%';

    // 하트
    $('#pb-hearts').innerHTML = cfg.hearts
      ? '❤️'.repeat(Math.max(S.hearts,0)) + '🖤'.repeat(Math.max(cfg.hearts - S.hearts, 0)) : '';

    // 콤보
    const cb = $('#combo-badge');
    if(S.combo >= 2){ cb.classList.remove('hidden'); $('#combo-n').textContent = S.combo; }
    else cb.classList.add('hidden');

    // 본문
    $('#q-subject').textContent = sub ? sub.name : q.subject;
    $('#q-subject').style.background = sub ? sub.color : 'var(--brand)';
    $('#q-source').textContent = q.src || '';
    const pas = $('#q-passage');
    if(q.passage){ pas.textContent = q.passage; pas.classList.remove('hidden'); }
    else pas.classList.add('hidden');
    $('#q-text').innerHTML = esc(q.q).replace(/\n/g, '<br>');

    // 선택지
    const box = $('#q-choices');
    if(q.type === 'ox'){
      box.className = 'ox-row';
      box.innerHTML = `
        <button class="ox-btn o" data-ans="1">O</button>
        <button class="ox-btn x" data-ans="0">X</button>`;
    }else{
      box.className = 'q-choices';
      box.innerHTML = q.choices.map((c, i) =>
        `<button class="choice" data-ans="${i}">
           <span class="ci">${'①②③④⑤'[i] || (i+1)}</span><span>${esc(c)}</span>
         </button>`).join('');
    }
    Array.from(box.children).forEach(b =>
      b.addEventListener('click', () => onAnswer(q.type === 'ox' ? b.dataset.ans === '1' : +b.dataset.ans, b)));

    $('#feedback').classList.add('hidden');
    $('#q-card').classList.remove('shake');
  }

  /* ── 정답/오답 표시 ────────────────────────────────── */
  function reveal(S, res, clicked){
    const q = res.q;
    const box = $('#q-choices');
    Array.from(box.children).forEach(b => {
      b.disabled = true;
      const v = q.type === 'ox' ? (b.dataset.ans === '1') : +b.dataset.ans;
      if(q.type === 'ox' ? (v === !!q.a) : (v === q.a)) b.classList.add('correct');
      else if(b === clicked) b.classList.add('wrong');
    });

    const fb = $('#feedback');
    fb.className = 'feedback ' + (res.ok ? 'ok' : 'no');
    $('#fb-icon').textContent  = res.ok ? '✅' : '❌';
    $('#fb-title').textContent = res.ok
      ? (res.combo >= 5 ? `정답! ${res.combo}연속 🔥` : '정답!')
      : '오답…';
    $('#fb-xp').textContent = '+' + res.gain + ' XP';
    let exp = q.exp || '';
    if(!res.ok && q.type === 'ox') exp = `정답은 ${q.a ? 'O' : 'X'}. ` + exp;
    if(!res.ok && q.type === 'mcq') exp = `정답은 ${'①②③④⑤'[q.a]}번. ` + exp;
    $('#fb-exp').textContent = exp;
    const tip = $('#fb-tip');
    if(q.tip){ tip.innerHTML = '💡 ' + esc(q.tip); tip.classList.remove('hidden'); }
    else tip.classList.add('hidden');
    $('#btn-next').textContent = (S.i + 1 >= S.queue.length && S.mode !== 'ox') ? '결과 보기 →' : '다음 →';

    if(res.ok){
      Sfx.correct();
      if(res.combo >= 3) Sfx.combo(res.combo);
      const r = clicked ? clicked.getBoundingClientRect() : {left:innerWidth/2,top:innerHeight/2,width:0,height:0};
      Fx.floatText(r.left + r.width/2 - 20, r.top - 10, '+' + res.gain);
      if(res.combo >= 3) Fx.burst(r.left + r.width/2, r.top, ['🔥','⚡','✨'], 8 + res.combo);
    }else{
      Sfx.wrong();
      $('#q-card').classList.add('shake');
      Fx.flash('rgba(208,47,60,.32)');
    }
    fb.classList.remove('hidden');
  }

  /* 보너스 XP를 피드백 패널 수치에 즉시 반영하고 튀어오르게 한다 */
  function bumpXp(amount, note){
    if(!amount) return;
    const el = $('#fb-xp');
    const cur = parseInt((el.textContent.match(/\d+/) || [0])[0], 10);
    el.textContent = '+' + (cur + amount) + ' XP' + (note ? ' ' + note : '');
    el.style.transition = 'none'; el.style.transform = 'scale(1.35)';
    requestAnimationFrame(() => {
      el.style.transition = 'transform .3s cubic-bezier(.2,1.6,.4,1)';
      el.style.transform = 'none';
    });
  }

  /* ── 결과 ──────────────────────────────────────────── */
  function result(S, fin){
    const win = S.mode === 'boss' ? S.reason === 'kill' : fin.acc >= 60;
    $('#res-emoji').textContent = fin.acc === 100 ? '🏆' : win ? '🎉' : '😵';
    $('#res-title').textContent = S.mode === 'boss'
      ? (win ? '보스 격파!' : '패배…')
      : (win ? '스테이지 클리어!' : '아쉬워요');
    let sub = '';
    if(S.mode === 'quest' && fin.stars) sub = '★'.repeat(fin.stars) + '☆'.repeat(3 - fin.stars) + ' 획득';
    else if(S.mode === 'ox') sub = `60초 동안 ${S.correct}문제 정답!`;
    else if(S.reason === 'heart') sub = '하트를 모두 잃었어요';
    else sub = `${Math.round((Date.now() - S.startedAt)/1000)}초 소요`;
    $('#res-sub').textContent = sub;

    $('#res-correct').textContent = S.correct;
    $('#res-wrong').textContent   = S.wrong;
    $('#res-acc').textContent     = fin.acc + '%';
    $('#res-combo').textContent   = S.maxCombo;
    $('#res-xp').textContent      = '+' + S.xp + ' XP';
    $('#res-coin').textContent    = '+' + S.coin + ' 🪙';

    $('#res-review').innerHTML = S.wrongList.length
      ? `<h3 style="font-size:15px;margin:0 0 4px">📌 다시 볼 문제 ${S.wrongList.length}개</h3>` +
        S.wrongList.slice(0, 8).map(q => `
          <div class="rev-item">
            <div class="rq">${esc(q.q.length > 90 ? q.q.slice(0,90) + '…' : q.q)}</div>
            <div class="ra">정답: ${q.type === 'ox' ? (q.a ? 'O' : 'X') : ('①②③④⑤'[q.a] + ' ' + esc(q.choices[q.a]||''))}</div>
          </div>`).join('')
      : `<div class="sel-note" style="text-align:center">틀린 문제 없음! 완벽합니다 ✨</div>`;

    if(win){ Sfx.win(); Fx.confetti(fin.acc === 100 ? 60 : 36); }
    else Sfx.lose();

    if(fin.leveled){
      setTimeout(() => { Sfx.levelup(); Fx.toast(`🎊 레벨 업! Lv.${fin.leveled} — ${Store.title().name}`, true, 3200); Fx.confetti(50); }, 700);
    }
    fin.newAch.forEach((a, i) =>
      setTimeout(() => { Sfx.unlock(); Fx.toast(`${a.e} 업적 달성: ${a.n}`, true, 2800); }, 1200 + i * 800));

    show('scr-result');
  }

  return { $, $$, esc, show, back, hud, home, daily, subjects, achievements,
           modeTags, selectSubject, selectUnit, question, reveal, result,
           codexList, cardDetail, bumpXp };
})();
