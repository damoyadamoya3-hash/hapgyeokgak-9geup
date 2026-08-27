/* 이론 도감 · 영어 — 동사 패턴 / 시험장에서 쓰는 문법 판별 순서 */
QB.addTheory([
{
  id:'eng-t-more-01', subject:'eng', unit:'eng-gram', tier:'S',
  title:'동사가 문장을 결정한다 — 5형식과 자주 틀리는 동사',
  summary:'영어 문장의 뼈대는 **동사가 무엇을 요구하는가**로 정해진다. 목적어를 받는지, 보어를 받는지, 전치사가 필요한지만 알면 어순 문제는 거의 풀린다.',
  tip:'헷갈리면 **동사 뒤에 무엇이 오는지**만 본다. `discuss`는 about 없이 바로, `explain`은 사람 앞에 to 가 필요하다.',
  blocks:[
    { h:'① 전치사를 붙이면 틀리는 타동사', items:[
      '**discuss** the issue (✕ discuss about) · **mention** it (✕ mention about)',
      '**enter** the room (✕ enter into ~ 단, enter into an agreement 는 가능)',
      '**marry** her (✕ marry with) · **resemble** him (✕ resemble with)',
      '**reach** the station (✕ reach to) · **attend** the meeting (✕ attend to = 돌보다)',
      '**answer** the question · **approach** the man · **accompany** her'
    ]},
    { h:'② 전치사가 반드시 필요한 자동사', items:[
      '**graduate from** · **arrive at/in** · **apologize to** 사람 **for** 일',
      '**object to** · **consist of** · **result in**(초래) ↔ **result from**(기인)',
      '**deal with** · **cope with** · **refer to** · **account for**'
    ]},
    { h:'③ 4형식 → 3형식 전환의 전치사', table:[
      ['전치사','동사'],
      ['**to**','give, send, lend, show, teach, tell, offer, pay'],
      ['**for**','buy, make, cook, find, get, choose, order'],
      ['**of**','ask, inquire, require, beg'],
      ['4형식이 안 되는 동사','explain, introduce, suggest, announce, describe, propose']
    ]},
    { h:'④ 5형식 — 목적보어의 형태가 갈린다', table:[
      ['동사','목적보어'],
      ['**사역** make, have, let','**동사원형** (be made **to** V — 수동은 to 부활)'],
      ['**준사역** help','동사원형 **또는** to V 둘 다 가능'],
      ['**준사역** get','**to V** (get him to do)'],
      ['**지각** see, hear, watch, feel','동사원형(완료) / **-ing**(진행 중)'],
      ['**want·expect·allow·advise·force**','**to V**'],
      ['**consider·find·think**','명사 · 형용사 · (to be) 보어']
    ]},
    { h:'⑤ 자동사와 타동사가 헷갈리는 짝', table:[
      ['자동사(스스로)','타동사(대상을)'],
      ['**rise** – rose – risen (오르다)','**raise** – raised – raised (올리다)'],
      ['**lie** – lay – lain (눕다)','**lay** – laid – laid (놓다)'],
      ['**sit** – sat – sat (앉다)','**seat** – seated (앉히다)'],
      ['**fall** – fell – fallen','**fell** – felled (베어 넘기다)'],
      ['lie – lied – lied (거짓말하다)','— (규칙변화, 뜻이 다름)']
    ]},
    { h:'⑥ 시제·태에서 자주 걸리는 자리', items:[
      '**자동사는 수동태가 없다**: happen, occur, appear, disappear, remain, consist of, belong to, resemble, lack',
      '**타동사인데 진행형이 어색한 동사**: know, believe, resemble, belong, contain, own',
      '**have been to**(다녀왔다) ↔ **have gone to**(가고 없다)',
      '**used to V**(예전에 ~했다) ↔ **be used to -ing**(익숙하다) ↔ **be used to V**(~하는 데 쓰이다)'
    ]}
  ],
  cases:[
    { t:'수동태로 바뀌면 to 가 살아난다', d:'사역동사 make 의 목적보어는 원형이지만, 수동태에서는 `He was made **to** wait.` 처럼 to 가 되살아난다. 지각동사도 마찬가지다(`He was seen **to** enter.`).' }
  ],
  cloze:[
    { s:'“그 문제를 논의하다”는 {{discuss the issue}}로 쓴다.', o:['discuss about the issue','discuss on the issue','discuss with the issue'] },
    { s:'“졸업하다”는 {{graduate from}}으로 쓴다.', o:['graduate','graduate at','graduate of'] },
    { s:'buy 는 4형식을 3형식으로 바꿀 때 전치사 {{for}}를 쓴다.', o:['to','of','with'] },
    { s:'사역동사 make 의 목적보어는 {{동사원형}}이다.', o:['to부정사','현재분사','과거분사'] },
    { s:'“올리다”라는 뜻의 타동사는 {{raise}}이다.', o:['rise','arise','arouse'] },
    { s:'“~에 익숙하다”는 {{be used to -ing}}이다.', o:['used to V','be used to V','be using to'] }
  ]
},

{
  id:'eng-t-more-02', subject:'eng', unit:'eng-gram', tier:'A',
  title:'문법 문제를 푸는 순서 — 밑줄부터 보지 않는다',
  summary:'밑줄 친 곳을 하나씩 뜯어보면 시간이 모자란다. **주어와 동사를 먼저 짝짓고**, 그다음 정해진 순서로 훑으면 대부분 걸린다.',
  tip:'순서는 **수 일치 → 시제 → 태 → 준동사 → 접속·관계사 → 어순·병렬**. 앞 세 가지에서 절반이 걸린다.',
  blocks:[
    { h:'① 1단계 — 주어와 동사를 짝짓는다', items:[
      '주어와 동사 사이의 수식어(전치사구·관계절·분사구)를 **괄호로 묶어 지운다**',
      'The books (on the shelf) **are** mine — 주어는 books',
      '주어가 **동명사구·to부정사·명사절**이면 **단수**',
      '**there is/are** 는 뒤의 명사에 맞춘다'
    ]},
    { h:'② 2단계 — 시제 표시어를 찾는다', items:[
      'since / for / already / yet → **현재완료**',
      'ago / last / in 1998 / yesterday → **과거** (현재완료와 못 쓴다)',
      'by the time / before / after 절보다 앞선 일 → **과거완료**',
      '시간·조건 부사절 → **현재가 미래를 대신한다**'
    ]},
    { h:'③ 3단계 — 목적어가 있는지 본다 (태)', items:[
      '동사 뒤에 목적어가 있는데 수동태면 **틀렸다**',
      '목적어가 없는데 능동태면 **의심한다** (자동사인지 확인)',
      '자동사는 애초에 수동이 불가능: happen, occur, arise, consist of, belong to'
    ]},
    { h:'④ 4단계 — 준동사의 자리', items:[
      '동사가 이미 있는데 또 동사가 보이면 → **준동사나 접속사가 빠졌다**',
      '분사구문: 주어가 **하는 쪽이면 -ing**, **당하는 쪽이면 p.p.**',
      '**감정 동사**: 사람 -ed / 사물 -ing',
      '동사에 따라 to V / -ing 가 갈린다 (remember·stop·try 는 뜻까지 달라진다)'
    ]},
    { h:'⑤ 5단계 — 접속사·관계사', items:[
      '뒤 문장이 **완전**하면 관계부사·접속사, **불완전**하면 관계대명사',
      '**that** 은 콤마 뒤(계속적 용법)에 못 쓴다',
      '**what** 앞에는 선행사가 없어야 한다',
      '전치사 + 관계대명사 뒤에는 **완전한 문장**'
    ]},
    { h:'⑥ 6단계 — 병렬과 어순', items:[
      '**and / or / but** 앞뒤는 문법적 성격이 같아야 한다 (to V ↔ to V, -ing ↔ -ing)',
      '**not only A but also B**, **both A and B**, **either A or B** 도 마찬가지',
      '간접의문문은 **의문사 + 주어 + 동사** 어순 (✕ I wonder what is it)',
      '부정어 문두 → **도치**. Only + 부사구 문두 → 도치'
    ]},
    { h:'⑦ 시험장에서 아끼는 요령', items:[
      '어법 문제는 **한 문항 1분**을 넘기지 않는다. 두 번 읽어 안 잡히면 표시하고 넘어간다',
      '해석이 안 돼도 **구조만으로** 걸리는 자리가 많다 — 수 일치·병렬·태',
      '밑줄 넷 중 **가장 흔한 함정부터** 확인한다: 수 일치와 태',
      '선택지에 **두 형태가 짝으로** 나오면(is/are, to do/doing) 그 지점이 답인 경우가 많다'
    ]}
  ],
  cloze:[
    { s:'문법 문제는 먼저 {{주어와 동사}}를 짝지어 본다.', o:['밑줄','선택지','어휘'] },
    { s:'주어가 동명사구이면 동사는 {{단수}}로 받는다.', o:['복수','과거','수동'] },
    { s:'“ago, last year”가 있으면 {{과거}} 시제를 쓴다.', o:['현재완료','과거완료','현재'] },
    { s:'관계사 뒤 문장이 불완전하면 {{관계대명사}}를 쓴다.', o:['관계부사','접속사','전치사'] },
    { s:'and 앞뒤는 문법적 성격이 같아야 한다 — 이를 {{병렬}}이라 한다.', o:['도치','생략','일치'] },
    { s:'간접의문문의 어순은 의문사 + {{주어 + 동사}}이다.', o:['동사 + 주어','조동사 + 주어','주어만'] }
  ]
}
]);
