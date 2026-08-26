/* ══════════════════════════════════════════════════════════
   문제 은행 레지스트리
   각 데이터 팩(data/questions/*.js)이 QB.add([...])로 등록한다.
   ══════════════════════════════════════════════════════════ */
window.QB = {
  /* 과목 정의 ------------------------------------------------ */
  SUBJECTS: [
    { id: 'kor',   name: '국어',        emoji: '📖', color: '#d02f3c',
      desc: '문법·어문규정·독해·문학·한자성어' },
    { id: 'eng',   name: '영어',        emoji: '🔤', color: '#2f5fbf',
      desc: '어휘·생활영어·문법·독해' },
    { id: 'his',   name: '한국사(한능검)', emoji: '🏯', color: '#6b4fb8',
      desc: '한국사능력검정시험 심화 대비 · 선사~현대' },
    { id: 'edu',   name: '교육학개론',   emoji: '🎓', color: '#1e9e62',
      desc: '교육철학·교육사·교육심리·교육과정·교육행정·교육평가' },
    { id: 'law',   name: '행정법총론',   emoji: '⚖️', color: '#c8930a',
      desc: '행정법통론·행정작용법·행정구제법·행정절차·정보공개' }
  ],

  /* 스테이지(단원) 정의 -------------------------------------- */
  UNITS: {
    kor: [
      { id:'kor-gram',  name:'문법·어문규정', emoji:'✏️' },
      { id:'kor-word',  name:'어휘·한자성어', emoji:'🈶' },
      { id:'kor-read',  name:'비문학 독해',   emoji:'🔍' },
      { id:'kor-lit',   name:'문학',          emoji:'🌸' }
    ],
    eng: [
      { id:'eng-vocab', name:'어휘·숙어',     emoji:'📕' },
      { id:'eng-conv',  name:'생활영어',      emoji:'💬' },
      { id:'eng-gram',  name:'문법',          emoji:'🧩' },
      { id:'eng-read',  name:'독해',          emoji:'📰' }
    ],
    his: [
      { id:'his-pre',   name:'선사~남북국',   emoji:'🗿' },
      { id:'his-gor',   name:'고려',          emoji:'🏰' },
      { id:'his-jos',   name:'조선 전기',     emoji:'👑' },
      { id:'his-jos2',  name:'조선 후기',     emoji:'📜' },
      { id:'his-mod',   name:'개항기·대한제국', emoji:'🚂' },
      { id:'his-jap',   name:'일제강점기',    emoji:'✊' },
      { id:'his-con',   name:'현대',          emoji:'🇰🇷' }
    ],
    edu: [
      { id:'edu-phil',  name:'교육철학·교육사', emoji:'🏛️' },
      { id:'edu-psy',   name:'교육심리',      emoji:'🧠' },
      { id:'edu-cur',   name:'교육과정',      emoji:'📐' },
      { id:'edu-meth',  name:'교수·학습',     emoji:'🧑‍🏫' },
      { id:'edu-eval',  name:'교육평가·통계', emoji:'📊' },
      { id:'edu-adm',   name:'교육행정·경영', emoji:'🏫' },
      { id:'edu-soc',   name:'교육사회·생활지도', emoji:'🤝' },
      { id:'edu-law',   name:'교육법규·제도', emoji:'📋' }
    ],
    law: [
      { id:'law-gen',   name:'행정법 통론',   emoji:'🧭' },
      { id:'law-act',   name:'행정행위',      emoji:'📌' },
      { id:'law-leg',   name:'행정입법',      emoji:'📗' },
      { id:'law-proc',  name:'행정절차·정보공개', emoji:'🗂️' },
      { id:'law-enf',   name:'행정의 실효성 확보', emoji:'🔨' },
      { id:'law-comp',  name:'손해전보(배상·보상)', emoji:'💰' },
      { id:'law-suit',  name:'행정쟁송',      emoji:'🏛️' }
    ]
  },

  /* 보스 정의 ------------------------------------------------ */
  BOSSES: {
    kor: { name:'띄어쓰기 마왕',   sprite:'👺', hp:10, taunt:'너의 맞춤법 실력을 보여봐라!' },
    eng: { name:'어휘 드래곤',     sprite:'🐉', hp:10, taunt:'Do you even vocabulary?' },
    his: { name:'연표 요괴',       sprite:'👻', hp:12, taunt:'연도를 뒤섞어 주마…' },
    edu: { name:'교육학 현자',     sprite:'🧙', hp:12, taunt:'이론가의 이름을 대보거라.' },
    law: { name:'판례 골렘',       sprite:'🗿', hp:12, taunt:'대법원은 어떻게 판시했는가.' }
  },

  /* ── 이론 도감(개념 카드) 저장소 ─────────────────────────────
     card = {
       id, subject, unit, title,
       tier   : 'S'|'A'|'B'        중요도(수집 등급)
       summary: '한 줄 요약',
       blocks : [{ h:'소제목', items:['항목', ...], table:[[..],[..]] }]
       cases  : [{ t:'판례 표시', d:'요지' }]        (선택)
       cloze  : [{ s:'문장 {{정답}} 문장', o:['오답1','오답2','오답3'] }]
       tip    : '암기 팁'
     }
     ────────────────────────────────────────────────────────── */
  theory: [],
  addTheory(arr){
    if(!Array.isArray(arr)) return;
    for(const c of arr){
      if(!c || !c.title) continue;
      c.tier = c.tier || 'B';
      c.blocks = c.blocks || [];
      c.cases  = c.cases  || [];
      c.cloze  = c.cloze  || [];
      c.id = c.id || (c.subject + '-t-' + (this.theory.length + 1));
      this.theory.push(c);
    }
  },
  theoryBySubject(sid){ return this.theory.filter(c => c.subject === sid); },
  theoryByUnit(uid){ return this.theory.filter(c => c.unit === uid); },
  theoryById(id){ return this.theory.find(c => c.id === id); },

  /* 문제 저장소 ---------------------------------------------- */
  items: [],
  add(arr){
    if(!Array.isArray(arr)) return;
    for(const q of arr){
      if(!q || !q.q) continue;
      // 기본값 보정
      q.type = q.type || (Array.isArray(q.choices) ? 'mcq' : 'ox');
      q.id   = q.id || (q.subject + '-' + (this.items.length + 1));
      q.src  = q.src || 'AI 파생문제';
      // 해설이나 문두가 선택지 번호(①, "2번")를 지칭하면 순서를 섞을 수 없다.
      // 섞는 순간 "②는 주동문이다" 같은 해설이 엉뚱한 선택지를 가리키게 된다.
      if(q.type === 'mcq' && q.fixedOrder === undefined){
        q.fixedOrder = /[①②③④⑤]|\d\s*번/.test((q.exp || '') + (q.tip || '') + (q.q || ''));
      }
      this.items.push(q);
    }
  },

  /* 이론 카드의 cloze(빈칸)를 실제 문항으로 자동 변환 --------
     → 세뇌 모드에서 풀 수 있고, SRS·오답노트에도 그대로 편입된다. */
  buildClozeQuestions(){
    const made = [];
    for(const c of this.theory){
      c.cloze.forEach((cz, i) => {
        const m = /\{\{(.+?)\}\}/.exec(cz.s);
        if(!m) return;
        const answer = m[1];
        const opts = [answer, ...(cz.o || [])].slice(0, 4);
        // 결정적 셔플(카드 id 기반) — 새로고침해도 답 위치가 고정된다
        const seed = (c.id + i).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
        for(let k = opts.length - 1; k > 0; k--){
          const j = (seed * (k + 3)) % (k + 1);
          [opts[k], opts[j]] = [opts[j], opts[k]];
        }
        made.push({
          id: c.id + '#cz' + i,
          subject: c.subject, unit: c.unit,
          type: 'mcq', cloze: true, cardId: c.id,
          src: '이론 도감 · ' + c.title,
          q: cz.s.replace(/\{\{.+?\}\}/, ' ______ '),
          choices: opts,
          a: opts.indexOf(answer),
          exp: cz.e || (c.summary || ''),
          tip: c.tip
        });
      });
    }
    this.add(made);
    return made.length;
  },

  /* 조회 헬퍼 ------------------------------------------------ */
  bySubject(sid){ return this.items.filter(q => q.subject === sid); },
  byUnit(uid){ return this.items.filter(q => q.unit === uid); },
  byId(id){ return this.items.find(q => q.id === id); },
  count(sid){ return sid ? this.bySubject(sid).length : this.items.length; },
  subject(sid){ return this.SUBJECTS.find(s => s.id === sid); },
  unit(uid){
    for(const k in this.UNITS){
      const u = this.UNITS[k].find(x => x.id === uid);
      if(u) return u;
    }
    return null;
  }
};
