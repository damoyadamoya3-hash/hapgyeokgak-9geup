/* ══════════════════════════════════════════════════════════
   UI — 화면 렌더링
   ══════════════════════════════════════════════════════════ */
const UI = (() => {
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ── 화면 이동 ──────────────────────────────────────────
     내부 스택과 브라우저 히스토리를 함께 관리한다.
     그래야 폰의 뒤로가기 버튼·제스처가 앱을 나가지 않고
     이전 화면으로 돌아간다. */
  let stack = [];
  let onPop = null;          // 앱이 가로챌 기회 (풀이 중 이탈 확인 등)

  function paint(id){
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  function show(id, push = true){
    paint(id);
    if(push){
      stack.push(id);
      // 아티팩트 iframe 등 히스토리 조작이 막힌 환경에서도 앱은 동작해야 한다
      try{ window.history.pushState({ depth: stack.length }, ''); }catch(e){}
    }
  }

  /* 내부 스택만 되돌린다 (브라우저 히스토리는 건드리지 않음) */
  function popScreen(){
    if(stack.length <= 1){
      paint('scr-home');
      stack = ['scr-home'];
      return false;
    }
    stack.pop();
    paint(stack[stack.length - 1]);
    return true;
  }

  /* 화면 안의 ← 버튼 — 브라우저 히스토리를 통해 돌아가
     내부 스택과 브라우저 기록이 어긋나지 않게 한다 */
  function back(){
    if(stack.length > 1){
      try{ window.history.back(); return; }catch(e){}
    }
    popScreen();
  }

  window.addEventListener('popstate', () => {
    if(onPop && onPop() === false) return;   // 앱이 처리했으면 여기서 멈춘다
    popScreen();
  });

  function setPopHandler(fn){ onPop = fn; }
  function currentScreen(){ return stack[stack.length - 1] || 'scr-home'; }

  /* ── HUD ───────────────────────────────────────────── */
  function hud(){
    const li = Store.levelInfo(), t = Store.title();
    $('#hud-avatar').textContent = t.emoji;
    $('#hud-title').textContent  = Store.s.nick ? Store.s.nick + ' · ' + t.name : t.name;
    $('#hud-lv').textContent     = 'Lv.' + li.lv;
    $('#hud-xpfill').style.width = li.pct + '%';
    $('#hud-xptext').textContent = li.cur + ' / ' + li.need;
    $('#hud-streak').textContent = Store.s.streak;
    $('#hud-coin').textContent   = Store.s.coin;
  }

  /* ── 시작 안내 ──────────────────────────────────────
     처음 열면 모드 카드 7개가 전부 0 으로 보여서 어디서 시작할지
     알 수 없다. 첫 20문항을 풀 때까지만 순서를 안내한다. */
  function startGuide(onStep){
    const el = $('#start-guide');
    const s = Store.s;
    if(s.totalAnswered >= 20 || s.guideDone){ el.classList.add('hidden'); return; }

    const steps = [
      { key:'card',  icon:'📜', title:'이론 카드 한 장 읽기',
        desc:'개념을 먼저 잡아야 문제가 붙는다', done: Store.readCount() >= 1 },
      { key:'quest', icon:'🗺️', title:'스토리 퀘스트 한 판',
        desc:'10문항으로 감을 잡아 본다',       done: s.totalAnswered >= 1 },
      { key:'exam',  icon:'🗓️', title:'시험일 등록',
        desc:'오늘 몇 문항을 풀지 정해 준다',   done: !!s.examDate }
    ];
    const left = steps.filter(x => !x.done).length;

    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="sg-head">
        <span>🚩 이렇게 시작해 보세요</span>
        <button class="sg-close" id="sg-close" aria-label="시작 안내 닫기">✕</button>
      </div>
      <div class="sg-list">
        ${steps.map(x => `
          <button class="sg-step ${x.done ? 'done' : ''}" data-step="${x.key}" ${x.done ? 'disabled' : ''}>
            <span class="sg-icon">${x.done ? '✅' : x.icon}</span>
            <span class="sg-body"><b>${esc(x.title)}</b><em>${esc(x.desc)}</em></span>
            <span class="sg-go">${x.done ? '' : '▶'}</span>
          </button>`).join('')}
      </div>
      ${left === 0 ? '<p class="sg-msg">준비 끝! 이제 매일 조금씩 쌓아 가면 됩니다 👍</p>' : ''}`;

    $('#sg-close').addEventListener('click', () => {
      Sfx.tap();
      Store.s.guideDone = true; Store.save();
      el.classList.add('hidden');
    });
    $$('#start-guide [data-step]').forEach(b =>
      b.addEventListener('click', () => { Sfx.tap(); onStep(b.dataset.step); }));
  }

  /* ── 학습 계획 (D-day) ─────────────────────────────── */
  function planCard(onGo){
    const p = Store.plan();
    const el = $('#plan-card');
    const done = Math.min(p.todayN, p.goal);
    const ratio = p.goal ? Math.min(done / p.goal * 100, 100) : 0;

    const head = p.hasDate
      ? (p.days > 0
          ? `<b class="pc-dday">D-${p.days}</b><span class="pc-date">${esc(p.date)} 시험</span>`
          : p.days === 0
            ? `<b class="pc-dday">D-DAY</b><span class="pc-date">오늘이 시험일입니다</span>`
            : `<b class="pc-dday">D+${-p.days}</b><span class="pc-date">시험일이 지났어요</span>`)
      : `<b class="pc-dday pc-set">🗓️ 시험일 설정</b><span class="pc-date">눌러서 D-day를 켜세요</span>`;

    el.innerHTML = `
      <div class="pc-top">${head}
        <span class="pc-pct">진도 ${p.pct}%</span>
      </div>
      <div class="pc-bar"><i style="width:${p.pct}%"></i></div>
      <div class="pc-goal">
        <span>오늘 목표 <b>${done} / ${p.goal}</b>문항</span>
        <span class="pc-left">남은 문항 ${p.left}개</span>
      </div>
      <div class="pc-today"><i style="width:${ratio}%"></i></div>
      <div class="pc-split">
        <span class="pc-rev ${p.due > p.review ? 'over' : ''}" data-go="srs" role="button" tabindex="0">🔁 복습 <b>${p.review}</b>문항${
          p.due > p.review ? ` <small>(밀림 ${p.due})</small>` : ''}</span>
        <span class="pc-new" data-go="fresh" role="button" tabindex="0">✨ 새 문제 <b>${p.fresh}</b>문항</span>
      </div>
      ${p.capped ? `<p class="pc-warn">⚠️ 남은 날에 전부 보기는 어려워요.
        <b>약한 단원</b>과 <b>오답노트</b> 위주로 좁혀 가세요.</p>` : ''}`;

    /* 오늘 할 일을 알려만 주고 끝내면, 읽고 나서 다시 찾아 들어가야 한다.
       그 자리에서 바로 시작할 수 있어야 계획이 계획으로 남지 않는다.
       카드 자체를 누르면 시험일 설정이므로 전파를 멈춘다. */
    el.querySelectorAll('[data-go]').forEach(btn => {
      const go = e => { e.stopPropagation(); onGo && onGo(btn.dataset.go); };
      btn.addEventListener('click', go);
      btn.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(e); }
      });
    });
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

    // 최근 7일 출석 + 다음 연속 보상까지 남은 일수
    const week = Store.weekAttendance();
    const goal = Store.nextStreakGoal();
    const streak = Store.s.streak;
    $('#dc-streak').innerHTML = `
      <div class="ds-days">
        ${week.map(w => `<span class="ds-day ${w.on ? 'on' : ''} ${w.today ? 'now' : ''}">
          <i>${w.on ? '🔥' : '·'}</i><em>${w.day}</em></span>`).join('')}
      </div>
      <p class="ds-msg">${goal
        ? `<b>${streak}일</b> 연속 학습 중 — <b>${goal.label}</b>까지 ${Math.max(goal.days - streak, 0)}일
           <span class="ds-rw">+${goal.xp} XP · ${goal.coin}🪙</span>`
        : `<b>${streak}일</b> 연속 학습 중 — 모든 출석 보상을 받았습니다 👑`}</p>`;
  }

  /* ── 모드 카드 태그 ────────────────────────────────── */
  function modeTags(){
    const s = Store.s;
    const avg = Math.round(QB.SUBJECTS.reduce((a,x) => a + Store.subjectProgress(x.id), 0) / QB.SUBJECTS.length);
    $('#mc-quest-tag').textContent = `진행도 ${avg}%`;
    $('#mc-ox-tag').textContent    = `최고 ${s.bestOx}문제`;
    $('#mc-boss-tag').textContent  = `격파 ${s.bossKills}마리`;
    $('#mc-srs-tag').textContent   = `대기 ${Store.dueCards().length}문제`;
    const le = Store.lastExam();
    $('#mc-exam-tag').textContent  = le
      ? `응시 ${s.examCount}회 · 최근 ${Math.round(le.ok / le.n * 100)}점`
      : `응시 ${s.examCount}회`;
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

  let guideStep = null;
  let planGo = null;
  function setPlanGo(fn){ planGo = fn; }

  function home(){ hud(); startGuide(guideStep || (()=>{})); planCard(planGo || (()=>{})); daily(); modeTags(); subjects(); achievements(); }
  function setGuideHandler(fn){ guideStep = fn; }

  /* ── 선택 화면: 과목 목록 ──────────────────────────── */
  function selectSubject(title, note, cb, extra){
    $('#sel-title').textContent = title;
    const extraHtml = extra ? `<button class="stage stage-hero" data-pick="${extra.id}">
        <span class="st-no" style="background:${extra.color};color:#fff">${extra.emoji}</span>
        <span class="st-body"><h4>${esc(extra.name)}</h4><p>${esc(extra.desc)}</p></span>
        <span class="st-stars">▶</span>
      </button>` : '';
    $('#sel-body').innerHTML =
      (note ? `<div class="sel-note">${note}</div>` : '') +
      `<div class="stage-row">` + extraHtml + QB.SUBJECTS.map(s => {
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
        <span class="st-stars" style="color:var(--gold-ink)">${stars}</span>
      </button>`;
    }).join('') + `</div>`;
    $$('#sel-body [data-unit]').forEach(b =>
      b.addEventListener('click', () => { Sfx.tap(); cb(b.dataset.unit); }));
    show('scr-select');
  }

  /* ══════════ 상점 ══════════ */
  /* ── 계정 · 다른 기기에서 이어하기 ────────────────────
     정적 페이지라 계정 서버가 없다. 그래서 '로그인' 대신 진도 전체를
     한 줄의 코드로 옮긴다. 핵심은 불러오기가 덮어쓰기가 아니라
     합치기라는 점이다 — 그래야 두 기기를 번갈아 써도 잃지 않는다. */
  function sync(onChange){
    const sum = Store.summary ? Store.summary() : null;
    const cards = Object.keys(Store.s.cards).length;
    const lv = Store.levelInfo(Store.s.xp);
    const code = Store.exportData();

    $('#sync-body').innerHTML = `
      <div class="sync-card">
        <label class="sync-lab" for="sync-nick">이름표</label>
        <input id="sync-nick" class="sync-nick" maxlength="12" placeholder="예: 지훈"
               value="${esc(Store.s.nick || '')}">
        <p class="sync-note">기기를 오갈 때 누구 진도인지 알아보기 위한 표시입니다.</p>
      </div>

      <div class="sync-card">
        <h3 class="sync-h">지금 이 기기의 진도</h3>
        <div class="sync-grid">
          <div><b>Lv.${lv.lv}</b><span>레벨</span></div>
          <div><b>${Store.s.totalAnswered.toLocaleString()}</b><span>푼 문제</span></div>
          <div><b>${cards.toLocaleString()}</b><span>기록된 문항</span></div>
          <div><b>${Store.s.streak}일</b><span>연속 학습</span></div>
        </div>
      </div>

      <div class="sync-card">
        <h3 class="sync-h">1. 이 기기의 코드 만들기</h3>
        <p class="sync-note">아래 코드를 복사해 다른 기기의 <b>2번 칸</b>에 붙여 넣으세요.</p>
        <textarea id="sync-out" class="sync-box" readonly rows="3">${esc(code)}</textarea>
        <button class="btn-primary" id="sync-copy">📋 코드 복사 (${(code.length/1024).toFixed(0)}KB)</button>
      </div>

      <div class="sync-card">
        <h3 class="sync-h">2. 다른 기기의 코드 불러오기</h3>
        <p class="sync-note">
          <b>합치기</b>는 두 기록 중 더 많이 공부한 쪽을 남깁니다.
          번갈아 써도 잃는 것이 없으니 이쪽을 쓰세요.
        </p>
        <textarea id="sync-in" class="sync-box" rows="3" placeholder="여기에 코드를 붙여 넣으세요"></textarea>
        <button class="btn-primary" id="sync-merge">🔗 합치기</button>
        <button class="btn-ghost" id="sync-replace">이 기기를 코드로 덮어쓰기</button>
      </div>

      <p class="sync-foot">
        이 사이트는 서버 없이 기기 안에서만 돌아갑니다. 그래서 진도도 기기에 남습니다.
        코드는 그 진도를 통째로 옮기는 열쇠이니, 시험 전까지 한 번쯤 따로 보관해 두세요.
      </p>`;

    $('#sync-nick').addEventListener('change', e => {
      Store.s.nick = e.target.value.trim().slice(0, 12);
      Store.save(); hud();
      Fx.toast(Store.s.nick ? `${Store.s.nick} 님으로 저장했어요` : '이름표를 지웠어요', true, 1600);
    });

    $('#sync-copy').addEventListener('click', () => {
      const ta = $('#sync-out');
      ta.select(); ta.setSelectionRange(0, ta.value.length);
      const done = () => Fx.toast('코드를 복사했어요 📋 다른 기기에 붙여 넣으세요', true, 2600);
      if(navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, () => {
        try{ document.execCommand('copy'); done(); }
        catch(e){ Fx.toast('길게 눌러 직접 복사해 주세요'); }
      });
      else { try{ document.execCommand('copy'); done(); }catch(e){} }
    });

    $('#sync-merge').addEventListener('click', () => {
      const v = $('#sync-in').value.trim();
      if(!v) return Fx.toast('먼저 코드를 붙여 넣어 주세요');
      const r = Store.mergeData(v);
      if(!r) return Fx.toast('코드를 읽을 수 없어요. 전체를 복사했는지 확인해 주세요 😢');
      Fx.toast(`합쳤어요! 문항 ${r.added}개가 새로 들어왔습니다 (총 ${r.total}개)`, true, 3200);
      onChange && onChange();
      sync(onChange);
    });

    $('#sync-replace').addEventListener('click', () => {
      const v = $('#sync-in').value.trim();
      if(!v) return Fx.toast('먼저 코드를 붙여 넣어 주세요');
      if(!confirm('이 기기의 진도를 지우고 코드의 내용으로 바꿉니다. 계속할까요?')) return;
      if(Store.importData(v)){
        Fx.toast('불러오기 완료!', true);
        onChange && onChange();
        sync(onChange);
      } else Fx.toast('코드가 올바르지 않아요 😢');
    });

    show('scr-sync');
  }

  function shop(onBuy){
    const coin = Store.s.coin;
    $('#shop-body').innerHTML = `
      <div class="shop-head">
        <span style="font-size:26px">🪙</span>
        <span class="sh-coin">${coin}</span>
        <p>정답을 맞히면 코인이 쌓입니다.<br>5콤보마다 더 많이 들어옵니다.</p>
      </div>
      <div class="shop-list">
        ${Store.SHOP.map(it => {
          const own = Store.s.inv[it.id] || 0;
          const can = coin >= it.price;
          return `<div class="shop-item">
            <span class="si-emoji">${it.emoji}</span>
            <span class="si-body">
              <h4>${esc(it.name)}</h4>
              <p>${esc(it.desc)}</p>
              ${own ? `<span class="si-own">보유 ${own}개</span>` : ''}
            </span>
            <button class="si-buy" data-buy="${it.id}" ${can ? '' : 'disabled'}>
              ${it.price} 🪙
            </button>
          </div>`;
        }).join('')}
      </div>
      <p class="st-note">힌트는 풀이 화면 오른쪽 위 🔍 버튼으로 씁니다.
      하트 충전은 하트를 모두 잃었을 때 자동으로 물어봅니다.
      XP 부스터는 다음 한 판에 자동으로 적용됩니다.</p>`;

    $$('#shop-body [data-buy]').forEach(b =>
      b.addEventListener('click', () => {
        if(Store.buy(b.dataset.buy)){
          Sfx.coin();
          Fx.burstAt(b, ['🪙','✨'], 10);
          const it = Store.SHOP.find(x => x.id === b.dataset.buy);
          Fx.toast(`${it.emoji} ${it.name} 구입!`, true, 1600);
          shop(onBuy); hud();
        }else{
          Fx.toast('코인이 모자라요');
        }
      }));
    show('scr-shop');
  }

  /* ══════════ 오답노트 ══════════ */
  let noteTab = 'wrong';
  let noteSubject = 'all';       // 과목 필터
  let noteLimit = 30;            // 한 번에 그리는 개수 (전부 그리면 수백 개가 된다)
  const NOTE_PAGE = 30;

  function noteAnswerText(q){
    if(q.type === 'ox') return q.a ? 'O' : 'X';
    return '①②③④⑤'[q.a] + ' ' + (q.choices[q.a] || '');
  }

  function notes(onSolve){
    const all = noteTab === 'wrong'
      ? Store.wrongNotes()
      : Store.markedIds().map(id => ({ id, ...(Store.s.cards[id] || {n:0,ok:0,ng:0,box:0}), q: QB.byId(id) }))
              .filter(x => x.q);

    const filtered = noteSubject === 'all'
      ? all
      : all.filter(r => r.q.subject === noteSubject);
    const rows = filtered.slice(0, noteLimit);

    $$('.note-tab').forEach(t => t.classList.toggle('on', t.dataset.note === noteTab));

    // 과목 필터 — 해당 과목에 항목이 있을 때만 칩을 보여준다
    const counts = {};
    all.forEach(r => { counts[r.q.subject] = (counts[r.q.subject] || 0) + 1; });
    $('#note-filter').innerHTML = all.length ? `
      <button class="note-chip ${noteSubject === 'all' ? 'on' : ''}" data-nf="all">전체 ${all.length}</button>` +
      QB.SUBJECTS.filter(x => counts[x.id]).map(x => `
        <button class="note-chip ${noteSubject === x.id ? 'on' : ''}" data-nf="${x.id}">
          ${x.emoji} ${esc(x.name)} ${counts[x.id]}</button>`).join('') : '';

    $('#note-body').innerHTML = rows.length ? rows.map(r => {
      const q = r.q;
      const sub = QB.subject(q.subject) || { name:'', color:'var(--brand)' };
      const marked = Store.isMarked(q.id);
      return `<div class="note-item ${marked ? 'marked' : ''}" data-note-id="${q.id}">
        <button class="note-head">
          <span class="nh-body">
            <span class="nh-meta">
              <span class="nh-sub" style="background:${sub.color}">${esc(sub.name)}</span>
              ${r.ng ? `<span class="nh-cnt">${r.ng}번 틀림</span>` : ''}
              ${marked ? '<span style="font-size:12px">⭐</span>' : ''}
            </span>
            <span class="nh-q">${md(q.q.length > 110 ? q.q.slice(0, 110) + '…' : q.q)}</span>
          </span>
          <span class="nh-arrow">▼</span>
        </button>
        <div class="note-body">
          <div class="nb-ans">정답 · ${esc(noteAnswerText(q))}</div>
          <div class="nb-exp">${md(q.exp || '')}</div>
          ${q.tip ? `<div class="nb-tip">💡 ${md(q.tip)}</div>` : ''}
          <div class="nb-acts">
            <button class="btn-ghost" data-note-mark="${q.id}">${marked ? '⭐ 북마크 해제' : '☆ 북마크'}</button>
            <button class="btn-ghost" data-note-solve="${q.unit}" data-note-subject="${q.subject}">🎯 이 단원 풀기</button>
          </div>
        </div>
      </div>`;
    }).join('')
    : `<div class="st-empty">${noteTab === 'wrong'
        ? '아직 틀린 문제가 없어요.<br>문제를 풀다 보면 여기에 쌓입니다.'
        : '북마크한 문제가 없어요.<br>문제를 푼 뒤 해설 창의 ☆를 눌러 저장하세요.'}</div>`;

    // 더 보기
    if(filtered.length > rows.length){
      $('#note-body').insertAdjacentHTML('beforeend',
        `<button class="btn-ghost" id="note-more" style="width:100%;margin-top:4px">
           ▾ ${filtered.length - rows.length}개 더 보기
         </button>`);
      $('#note-more').addEventListener('click', () => {
        Sfx.tap();
        noteLimit += NOTE_PAGE;
        notes(onSolve);
      });
    }

    $$('#note-filter [data-nf]').forEach(b =>
      b.addEventListener('click', () => {
        Sfx.tap();
        noteSubject = b.dataset.nf;
        noteLimit = NOTE_PAGE;
        notes(onSolve);
      }));

    // 펼치기 / 접기
    $$('#note-body .note-head').forEach(h =>
      h.addEventListener('click', () => {
        Sfx.tap();
        h.parentElement.classList.toggle('open');
      }));
    // 북마크 토글
    $$('#note-body [data-note-mark]').forEach(b =>
      b.addEventListener('click', e => {
        e.stopPropagation();
        Store.toggleMark(b.dataset.noteMark);
        Sfx.coin();
        notes(onSolve);
      }));
    // 해당 단원 바로 풀기
    $$('#note-body [data-note-solve]').forEach(b =>
      b.addEventListener('click', e => {
        e.stopPropagation();
        Sfx.tap();
        onSolve(b.dataset.noteSolve, b.dataset.noteSubject);
      }));

    show('scr-note');
  }

  function setNoteTab(tab, onSolve){
    noteTab = tab; noteSubject = 'all'; noteLimit = NOTE_PAGE;
    notes(onSolve);
  }

  /* ══════════ 학습 분석 ══════════ */
  function stats(onPickUnit){
    const s   = Store.summary();
    // 아주 좁은 화면(320px대)에서는 14일치 날짜 라벨이 물리적으로 들어가지 않는다.
    const span = (window.innerWidth || 400) < 380 ? 7 : 14;
    const days = Store.recentDays(span);
    const us   = Store.unitStats();
    const peak = Math.max(1, ...days.map(d => d.n));
    const maxBox = Math.max(1, ...s.boxes);
    const accColor = a => a >= 80 ? 'var(--good)' : a >= 60 ? 'var(--gold)' : 'var(--bad)';

    // 과목별 집계
    const subj = QB.SUBJECTS.map(x => ({
      ...x,
      acc:  Store.subjectAccuracy(x.id),
      seen: Store.subjectSeen(x.id),
      total: QB.count(x.id)
    })).filter(x => x.total);

    /* 모의고사 성적 추이 — 수험 준비에서 가장 알고 싶은 것은
       '내가 나아지고 있는가'다. 회차 수만으로는 알 수 없다. */
    const log = Store.examLog().slice(0, 12).reverse();   // 오래된 것부터 최대 12회
    const examSection = log.length ? `
      <div class="st-sec">
        <h3>모의고사 성적 추이 <small>100점 만점 환산</small></h3>
        <div class="ex-chart">
          ${log.map((e, i) => {
            const sc = Math.round(e.ok / e.n * 100);
            const c  = sc >= 80 ? 'var(--good)' : sc >= 60 ? 'var(--gold)' : 'var(--bad)';
            const d  = new Date(e.t);
            const label = (d.getMonth() + 1) + '/' + d.getDate();
            return `<div class="ex-col ${i === log.length - 1 ? 'last' : ''}"
                         title="${label} · ${e.ok}/${e.n} (${sc}점)">
              <span class="ex-sc">${sc}</span>
              <span class="ex-bar-wrap"><i style="height:${Math.max(sc, 3)}%;background:${c}"></i></span>
              <span class="ex-lab">${label}</span>
            </div>`;
          }).join('')}
        </div>
        ${(() => {
          const last = log[log.length - 1];
          const subs = Object.keys(last.sub || {});
          if(subs.length < 2) return '';
          return `<h4 class="ex-h4">가장 최근 회차 · 과목별</h4>
            <div class="exam-table">${subs.map(sid => {
              const [ok, n] = last.sub[sid];
              const sub = QB.subject(sid) || { name:sid, emoji:'📘' };
              const a = n ? Math.round(ok / n * 100) : 0;
              return `<div class="exam-row">
                <span>${sub.emoji} ${esc(sub.name)}</span>
                <span class="ex-bar"><i style="width:${a}%;background:${a>=80?'var(--good)':a>=60?'var(--gold)':'var(--bad)'}"></i></span>
                <b>${ok}/${n}</b>
              </div>`;
            }).join('')}</div>`;
        })()}
        ${log.length >= 2 ? (() => {
          const first = Math.round(log[0].ok / log[0].n * 100);
          const last  = Math.round(log[log.length-1].ok / log[log.length-1].n * 100);
          const diff  = last - first;
          return `<p class="ex-note">${diff > 0
            ? `첫 회차보다 <b style="color:var(--good-ink)">${diff}점</b> 올랐어요.`
            : diff < 0
              ? `첫 회차보다 <b style="color:var(--bad-ink)">${-diff}점</b> 내려갔어요. 오답노트부터 훑어 보세요.`
              : '첫 회차와 같은 점수예요. 약한 단원을 좁혀 보세요.'}</p>`;
        })() : ''}
      </div>` : '';

    $('#stats-body').innerHTML = `
      <div class="st-sec">
        <h3>한눈에 보기</h3>
        <div class="st-grid">
          <div class="st-tile"><b>${s.answered}</b><span>총 푼 횟수</span></div>
          <div class="st-tile ${s.acc >= 70 ? 'good' : s.acc >= 50 ? '' : 'warn'}"><b>${s.acc}%</b><span>전체 정답률</span></div>
          <div class="st-tile info"><b>${s.seen}<small style="font-size:12px;color:var(--ink2)">/${s.total}</small></b><span>학습한 문항</span></div>
          <div class="st-tile"><b>${s.days}</b><span>학습한 날</span></div>
          <div class="st-tile info"><b>${s.due}</b><span>복습 대기</span></div>
          <div class="st-tile warn"><b>${s.wrong}</b><span>오답 보관</span></div>
          <div class="st-tile"><b>${s.cards}<small style="font-size:12px;color:var(--ink2)">/${s.cardTotal}</small></b><span>도감 수집</span></div>
        </div>
      </div>

      ${examSection}

      <div class="st-sec">
        <h3>최근 ${span === 7 ? '1주' : '2주'} 학습량 <small>막대 = 하루에 푼 문제 수</small></h3>
        <div class="st-chart">
          ${days.map((d, i) => {
            const h = Math.round(d.n / peak * 92);
            const okH = d.n ? Math.round(d.ok / d.n * h) : 0;
            return `<div class="st-bar ${i === days.length - 1 ? 'today' : ''}" title="${d.date} · ${d.n}문제 (정답 ${d.ok})">
              <span class="sb-stack" style="height:${Math.max(h, d.n ? 4 : 3)}px">
                <i class="sb-ng" style="display:block;height:${h - okH}px"></i>
                <i class="sb-ok" style="display:block;height:${okH}px"></i>
              </span>
              <span class="sb-lab">${d.label}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="st-legend">
          <span><i style="background:var(--good)"></i>정답</span>
          <span><i style="background:var(--bad)"></i>오답</span>
        </div>
      </div>

      <div class="st-sec">
        <h3>과목별 정답률</h3>
        <div class="st-list">
          ${subj.map(x => `
            <div class="st-row" style="cursor:default">
              <span style="font-size:20px">${x.emoji}</span>
              <span class="sr-body">
                <h4>${esc(x.name)} <em>${x.seen}/${x.total}문항 학습</em></h4>
                <span class="sr-bar"><i style="width:${x.acc}%;background:${accColor(x.acc)}"></i></span>
              </span>
              <span class="sr-acc" style="color:${x.seen ? accColor(x.acc) : 'var(--ink2)'}">${x.seen ? x.acc + '%' : '–'}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="st-sec">
        <h3>약한 단원 <small>정답률이 낮은 순 · 눌러서 바로 풀기</small></h3>
        <div class="st-list">
          ${us.length ? us.slice(0, 8).map(u => {
            const unit = QB.unit(u.unit) || { name:u.unit, emoji:'📘' };
            const sub  = QB.subject(u.subject) || { name:'' };
            return `<button class="st-row" data-weak="${u.unit}" data-weak-subject="${u.subject}">
              <span style="font-size:19px">${unit.emoji}</span>
              <span class="sr-body">
                <h4>${esc(unit.name)} <em>${esc(sub.name)} · ${u.n}회 풀이</em></h4>
                <span class="sr-bar"><i style="width:${u.acc}%;background:${accColor(u.acc)}"></i></span>
              </span>
              <span class="sr-acc" style="color:${accColor(u.acc)}">${u.acc}%</span>
            </button>`;
          }).join('')
          : '<div class="st-empty">아직 데이터가 없어요.<br>문제를 풀면 약한 단원을 찾아 드립니다.</div>'}
        </div>
      </div>

      <div class="st-sec">
        <h3>기억 정착도 <small>라이트너 박스 분포</small></h3>
        <div class="st-boxes">
          ${s.boxes.map((n, i) => `
            <div class="st-box" title="${i === 0 ? '새 문항·오답' : Store.INTERVAL[i] + '일 뒤 복습'} — ${n}문항">
              <span class="bx" style="height:${Math.max(Math.round(n / maxBox * 56), n ? 4 : 3)}px"></span>
              <span class="bl">${n}</span>
            </div>`).join('')}
        </div>
        <p class="st-note">왼쪽은 방금 틀렸거나 처음 본 문항, 오른쪽으로 갈수록 여러 번 연속으로 맞혀
        복습 간격이 길어진 문항입니다. <b>오른쪽 막대가 두꺼워지는 것이 진짜 실력</b>입니다.</p>
      </div>`;

    $$('#stats-body [data-weak]').forEach(b =>
      b.addEventListener('click', () => {
        Sfx.tap();
        onPickUnit(b.dataset.weak, b.dataset.weakSubject);
      }));
    show('scr-stats');
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
        <b style="font-family:var(--f-round);color:var(--brand-ink)">${read}/${cards.length}</b>
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
    $('#q-text').innerHTML = md(q.q).replace(/\n/g, '<br>');

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
           <span class="ci">${'①②③④⑤'[i] || (i+1)}</span><span>${md(c)}</span>
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
    $('#fb-exp').innerHTML = md(exp).replace(/\n/g, '<br>');
    const tip = $('#fb-tip');
    if(q.tip){ tip.innerHTML = '💡 ' + md(q.tip); tip.classList.remove('hidden'); }
    else tip.classList.add('hidden');
    $('#btn-next').textContent = (S.i + 1 >= S.queue.length && S.mode !== 'ox') ? '결과 보기 →' : '다음 →';

    // 북마크 버튼 — 지금 문항을 오답노트에 담아 둘 수 있다
    const mk = $('#btn-mark');
    const paint = () => {
      const on = Store.isMarked(q.id);
      mk.textContent = on ? '★' : '☆';
      mk.classList.toggle('on', on);
    };
    paint();
    mk.onclick = () => {
      const on = Store.toggleMark(q.id);
      paint();
      Sfx.coin();
      Fx.toast(on ? '⭐ 오답노트에 저장했어요' : '북마크를 해제했어요', on, 1500);
    };

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

  /* 실전 모의고사 — 정오를 숨기고 "선택했다"는 표시만 남긴다 */
  function markSilent(btn){
    if(!btn) return;
    Array.from($('#q-choices').children).forEach(b => { b.disabled = true; });
    btn.style.borderColor = 'var(--accent)';
    btn.style.background = 'color-mix(in srgb, var(--accent) 12%, transparent)';
    Sfx.tap();
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

    // 모의고사는 과목별 성적표를 먼저 보여준다
    const subTable = (S.mode === 'exam' && fin.bySub && Object.keys(fin.bySub).length > 1)
      ? `<h3 style="font-size:15px;margin:0 0 8px">📋 과목별 성적</h3>
         <div class="exam-table">${Object.keys(fin.bySub).map(sid => {
            const b = fin.bySub[sid], sub = QB.subject(sid) || { name:sid, emoji:'📘' };
            const a = b.n ? Math.round(b.ok / b.n * 100) : 0;
            return `<div class="exam-row">
              <span>${sub.emoji} ${esc(sub.name)}</span>
              <span class="ex-bar"><i style="width:${a}%;background:${a>=80?'var(--good)':a>=60?'var(--gold)':'var(--bad)'}"></i></span>
              <b>${b.ok}/${b.n}</b>
            </div>`;
         }).join('')}</div>` : '';

    $('#res-review').innerHTML = subTable + (S.wrongList.length
      ? `<h3 style="font-size:15px;margin:0 0 4px">📌 다시 볼 문제 ${S.wrongList.length}개</h3>` +
        S.wrongList.slice(0, 8).map(q => `
          <div class="rev-item">
            <div class="rq">${md(q.q.length > 90 ? q.q.slice(0,90) + '…' : q.q)}</div>
            <div class="ra">정답: ${q.type === 'ox' ? (q.a ? 'O' : 'X') : ('①②③④⑤'[q.a] + ' ' + esc(q.choices[q.a]||''))}</div>
          </div>`).join('')
      : `<div class="sel-note" style="text-align:center">틀린 문제 없음! 완벽합니다 ✨</div>`);

    // 방금 틀린 게 있으면 그 자리에서 바로잡을 길을 열어 준다
    const wrongBtn = $('#btn-res-wrong');
    const hasWrong = Store.wrongCards().length > 0;
    wrongBtn.classList.toggle('hidden', !hasWrong);
    if(hasWrong) wrongBtn.textContent = `📕 틀린 것만 다시 (${Store.wrongCards().length})`;

    if(win){ Sfx.win(); Fx.confetti(fin.acc === 100 ? 60 : 36); }
    else Sfx.lose();

    if(fin.leveled){
      setTimeout(() => { Sfx.levelup(); Fx.toast(`🎊 레벨 업! Lv.${fin.leveled} — ${Store.title().name}`, true, 3200); Fx.confetti(50); }, 700);
    }
    fin.newAch.forEach((a, i) =>
      setTimeout(() => { Sfx.unlock(); Fx.toast(`${a.e} 업적 달성: ${a.n}`, true, 2800); }, 1200 + i * 800));

    if(fin.streakReward){
      const r = fin.streakReward;
      setTimeout(() => {
        Sfx.levelup();
        Fx.confetti(60);
        Fx.toast(`🔥 ${r.label}! +${r.xp} XP · ${r.coin}🪙`, true, 3400);
      }, 1000);
    }

    show('scr-result');
  }

  return { $, $$, esc, show, back, popScreen, setPopHandler, currentScreen,
           hud, home, daily, planCard, startGuide, setGuideHandler, subjects, achievements,
           modeTags, selectSubject, selectUnit, question, reveal, result, sync, setPlanGo,
           codexList, cardDetail, bumpXp, stats, notes, setNoteTab, markSilent, shop };
})();
