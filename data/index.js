/* ══════════════════════════════════════════════════════════
   문제 은행 레지스트리
   각 데이터 팩(data/questions/*.js)이 QB.add([...])로 등록한다.
   ══════════════════════════════════════════════════════════ */
window.QB = {
  /* 과목 정의 ------------------------------------------------ */
  SUBJECTS: [
    { id: 'kor',   name: '국어',        emoji: '📖', color: '#e0435a',
      desc: '문법·어문규정·독해·문학·한자성어' },
    { id: 'eng',   name: '영어',        emoji: '🔤', color: '#3d5a80',
      desc: '어휘·생활영어·문법·독해' },
    { id: 'his',   name: '한국사(한능검)', emoji: '🏯', color: '#7b5ea7',
      desc: '한국사능력검정시험 심화 대비 · 선사~현대' },
    { id: 'edu',   name: '교육학개론',   emoji: '🎓', color: '#2e9e6b',
      desc: '교육철학·교육사·교육심리·교육과정·교육행정·교육평가' },
    { id: 'law',   name: '행정법총론',   emoji: '⚖️', color: '#f4b942',
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
      this.items.push(q);
    }
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
