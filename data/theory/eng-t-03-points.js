/* 이론 도감 · 영어 — 빈출 문법 포인트 / 독해 푸는 법 */
QB.addTheory([
{
  id:'eng-t-point-01', subject:'eng', unit:'eng-gram', tier:'S',
  title:'9급 영어 문법 — 출제되는 자리만 열 가지',
  summary:'문법 문제는 어디를 볼지가 정해져 있다. **수 일치 · 시제 · 태 · 준동사 · 관계사 · 가정법 · 도치 · 비교**를 이 순서로 훑으면 답이 걸린다.',
  tip:'선택지를 읽기 전에 **주어와 동사부터 짝지어** 본다. 9급 문법 오류의 절반은 여기서 난다.',
  blocks:[
    { h:'① 수 일치 — 주어를 착각하게 만든다', items:[
      '**the number of** + 복수명사 = **단수** / **a number of** + 복수명사 = **복수**',
      '주어와 동사 사이에 낀 수식어는 무시한다: The box of books **is** heavy',
      '**each, every, either, neither, one of** + 복수명사 → 단수',
      '**news, furniture, equipment, information, advice, evidence** = 불가산 단수',
      '부분 표현(most of, half of, some of, all of) → **of 뒤의 명사**에 맞춘다'
    ]},
    { h:'② 시제 — 함께 오는 표시어가 힌트다', table:[
      ['시제','표시어'],
      ['현재완료','since, for, so far, already, yet, recently'],
      ['과거','yesterday, ago, last ~, in 1998 (완료와 함께 못 쓴다)'],
      ['과거완료','before/after 절보다 **더 앞선** 일'],
      ['시간·조건 부사절','**현재가 미래를 대신한다** — When he **comes**, I will call']
    ]},
    { h:'③ 태 — 목적어가 있는지 본다', items:[
      '자동사는 수동태가 안 된다: happen, occur, appear, arise, consist of, belong to, resemble',
      '“~와 결혼하다”는 **marry** (✕be married with), “~에 도착하다”는 **reach / arrive at**',
      '**이중 피동 금지** — 한국어 번역투가 그대로 옮겨진 오답이 자주 나온다',
      '감정 동사: 사람은 **-ed**(interested), 사물은 **-ing**(interesting)'
    ]},
    { h:'④ 준동사 — to부정사냐 동명사냐', table:[
      ['to부정사만','동명사만','뜻이 갈리는 것'],
      ['want, hope, decide, plan, refuse, afford, manage','enjoy, avoid, finish, mind, suggest, consider, admit, deny','remember/forget + to(앞으로) · -ing(과거)'],
      ['promise, expect, agree, offer','postpone, quit, give up, practice','stop + to(하려고 멈춤) · -ing(그만둠)'],
      ['—','—','try + to(노력) · -ing(시험 삼아)']
    ]},
    { h:'⑤ to 가 전치사인 표현 — 뒤에 동명사', items:[
      '**be used to -ing** 익숙하다 ↔ **used to + 동사원형** 예전에 ~하곤 했다',
      '**look forward to -ing**, **object to -ing**, **be accustomed to -ing**',
      '**contribute to -ing**, **be committed to -ing**, **with a view to -ing**'
    ]},
    { h:'⑥ 관계사', items:[
      '**that 은 계속적 용법(콤마 뒤)에 못 쓴다** — 콤마가 보이면 which/who',
      '**what** 은 선행사를 품는다 = the thing which. 앞에 명사가 있으면 what 은 틀렸다',
      '**관계부사** where/when/why/how — 뒤 문장이 완전하면 관계부사, 불완전하면 관계대명사',
      '**전치사 + 관계대명사** 뒤에는 완전한 문장이 온다: the house **in which** he lives'
    ]},
    { h:'⑦ 가정법 — 짝을 외운다', table:[
      ['종류','if절','주절'],
      ['가정법 과거','if + 과거동사(were)','would/could/might + 동사원형'],
      ['가정법 과거완료','if + **had p.p.**','would/could **have p.p.**'],
      ['혼합','if + had p.p.','would + 동사원형 (**now**와 함께)'],
      ['I wish','과거(지금 반대) / had p.p.(과거 반대)','—'],
      ['as if','과거 / had p.p.','—']
    ]},
    { h:'⑧ 도치 — 부정어가 앞에 나오면', items:[
      '**Never / Hardly / Scarcely / Little / Not only / No sooner** 가 문두 → 주어와 조동사가 뒤바뀐다',
      'Hardly **had he** entered when ~ / No sooner **had she** left than ~',
      'Only + 부사구가 문두일 때도 도치: Only then **did I** realize',
      '**So / Neither** 동의: So **do I** / Neither **do I**'
    ]},
    { h:'⑨ 비교', items:[
      '**the 비교급 ~, the 비교급 ~** : The higher the demand, the higher the price',
      '배수 표현은 **배수사 + as ~ as** 또는 **배수사 + 비교급 than**: three times as large as',
      '비교 대상을 맞춘다: My car is faster than **yours**(✕ than you)',
      '**superior / inferior / senior / prior** 는 than 이 아니라 **to**'
    ]},
    { h:'⑩ 주장·요구·명령·제안 + that절', items:[
      '**insist, demand, order, suggest, propose, recommend, require** 뒤 that절 → **(should) + 동사원형**',
      'It is **essential / necessary / important / imperative** that ~ 도 동사원형',
      '다만 **사실을 전달하는 뜻**이면 원형을 쓰지 않는다: He insisted that he **was** innocent'
    ]}
  ],
  cases:[
    { t:'수동태가 되면 to 가 돌아온다',
      d:'He made me wait. → I **was made to wait**. 사역·지각동사의 목적보어는 원형이지만 수동태에서는 to 가 되살아난다.' },
    { t:'전치사를 붙이면 틀리는 자리',
      d:'discuss **about**, mention **about**, marry **with**, reach **to** — 모두 틀렸다. 이들은 타동사라 목적어를 바로 받는다.' }
  ],
  cloze:[
    { s:'“a number of + 복수명사”는 {{복수}} 취급한다.', o:['단수','불가산','중성'] },
    { s:'시간·조건 부사절에서는 {{현재}}가 미래를 대신한다.', o:['미래','과거','현재완료'] },
    { s:'콤마가 있는 계속적 용법에서는 {{that}}을 쓸 수 없다.', o:['which','who','whom'] },
    { s:'가정법 과거완료의 주절은 {{would have p.p.}} 형태다.', o:['would + 동사원형','had p.p.','will have p.p.'] },
    { s:'“be used to”는 뒤에 {{동명사}}가 온다.', o:['동사원형','to부정사','과거분사'] },
    { s:'부정어가 문두에 오면 주어와 조동사가 {{도치}}된다.', o:['생략','반복','일치'] },
    { s:'“superior”는 than 이 아니라 {{to}}와 함께 쓴다.', o:['for','with','of'] },
    { s:'“It is essential that he ______ present”의 빈칸에는 {{be}}가 들어간다.', o:['is','was','being'] }
  ]
},

{
  id:'eng-t-point-02', subject:'eng', unit:'eng-read', tier:'S',
  title:'독해 — 유형마다 보는 자리가 다르다',
  summary:'시간이 모자라는 과목이다. **글을 다 읽고 답을 찾는 게 아니라, 유형에 맞는 자리만 먼저 본다.**',
  tip:'주제·요지는 **첫 문장과 마지막 문장**, 빈칸은 **빈칸 앞뒤 연결어**, 일치는 **선택지를 먼저** 읽는다.',
  blocks:[
    { h:'① 유형별로 먼저 볼 자리', table:[
      ['유형','먼저 보는 곳'],
      ['**주제 · 요지 · 제목**','첫 문장과 마지막 문장. 역접(But, However) 뒤가 대개 요지'],
      ['**빈칸 추론**','빈칸이 든 문장과 바로 앞뒤. 연결어가 방향을 알려 준다'],
      ['**내용 일치/불일치**','선택지를 먼저 읽고 본문에서 해당 부분만 찾는다'],
      ['**무관한 문장**','글의 소재는 같은데 **논지가 다른** 문장을 고른다'],
      ['**순서 배열**','대명사(it, they, this)와 연결어가 가리키는 앞 문장을 찾는다'],
      ['**문장 삽입**','주어진 문장의 연결어·대명사가 앞에 무엇을 요구하는지 본다']
    ]},
    { h:'② 연결어가 방향을 알려 준다', table:[
      ['방향','연결어'],
      ['**역접·대조**','however, but, yet, nevertheless, on the contrary, in contrast, whereas'],
      ['**인과**','therefore, thus, hence, consequently, as a result, accordingly'],
      ['**첨가**','moreover, furthermore, in addition, besides, likewise'],
      ['**예시**','for example, for instance, such as, to illustrate'],
      ['**요약·환언**','in short, in other words, that is, namely, to sum up']
    ]},
    { h:'③ 글의 전형적인 짜임', items:[
      '**통념 → 반박** : Many people believe ~ **However**, research shows ~ ← 반박 쪽이 요지',
      '**문제 → 해결** : 문제 제시 후 해결책. 요지는 해결책 쪽',
      '**주장 → 근거 → 재진술** : 첫 문장과 마지막 문장이 같은 말을 다르게 한다',
      '**시간 · 비교 나열** : 각 단락의 첫 문장만 이어 읽어도 흐름이 잡힌다'
    ]},
    { h:'④ 오답 선택지의 버릇', items:[
      '**너무 넓다** — 글은 한 사례를 말하는데 선택지는 분야 전체를 말한다',
      '**너무 좁다** — 글의 일부(예시 하나)만 담았다',
      '**본문에 없는 말** — 그럴듯하지만 근거 문장을 찾을 수 없다',
      '**반대로 뒤집었다** — increase ↔ decrease, not 이 붙거나 빠졌다',
      '일치 문제에서는 **only, always, never, all** 같은 단정어가 있으면 특히 의심한다'
    ]},
    { h:'⑤ 시간 배분', items:[
      '20문항 20~25분. 한 문항에 **1분**이 기준이다',
      '어휘·생활영어·문법을 **먼저** 끝내고 독해로 넘어간다. 앞쪽이 시간당 배점이 높다',
      '두 번 읽어도 안 잡히면 표시하고 넘어간다. 남은 문항을 푸는 편이 이득이다',
      '모르는 단어에 멈추지 않는다 — 접두사와 문맥으로 방향만 잡고 지나간다'
    ]},
    { h:'⑥ 모르는 단어를 문맥으로 넘기는 법', items:[
      '**부정 접두사**(un-, in-, dis-, non-, mis-)가 붙으면 반대 뜻',
      '**동격·환언 표시** — that is, or, 콤마로 묶인 설명이 뜻을 알려 준다',
      '**대조 표시**(but, unlike, while)가 있으면 앞말의 반대 뜻이다',
      '**예시**가 뒤따르면 그 예시가 곧 뜻이다'
    ]}
  ],
  cases:[
    { t:'첫 문장이 함정일 때', d:'통념을 소개하는 첫 문장을 요지로 고르는 오답이 흔하다. **However 가 보이면 그 뒤가 요지**다.' },
    { t:'문장 삽입', d:'주어진 문장이 “Yet this comes at a cost.” 라면 앞에는 장점이, 뒤에는 대가가 와야 한다. 그 경계가 답이다.' }
  ],
  cloze:[
    { s:'주제·요지 문제는 첫 문장과 {{마지막 문장}}을 먼저 본다.', o:['가운데 문장','가장 긴 문장','예시 문장'] },
    { s:'내용 일치 문제는 {{선택지}}를 먼저 읽는 편이 빠르다.', o:['본문 전체','마지막 문단','제목'] },
    { s:'“however, nevertheless”는 {{역접}}을 나타낸다.', o:['인과','첨가','예시'] },
    { s:'“consequently, as a result”는 {{인과}}를 나타낸다.', o:['역접','환언','예시'] },
    { s:'통념을 소개한 뒤 However 가 나오면 요지는 {{그 뒤}}에 있다.', o:['첫 문장','예시 안','제목'] },
    { s:'독해 20문항은 한 문항에 약 {{1분}}을 기준으로 배분한다.', o:['3분','30초','5분'] }
  ]
}
]);
