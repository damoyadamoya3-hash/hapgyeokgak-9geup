/* 이론 도감 · 영어 — 문법 핵심 / 빈출 어휘 / 독해 전략 */
QB.addTheory([
{
  id:'eng-t-gram-01', subject:'eng', unit:'eng-gram', tier:'A',
  title:'9급 영문법 빈출 포인트 10',
  summary:'출제 지점은 매년 거의 같다. **수일치 · 시제 · 태 · 가정법 · 관계사 · 도치 · 병렬 · 준동사**.',
  tip:'"어법상 옳지 않은 것" 문제는 **동사부터** 본다 — 수·시제·태 순으로 훑으면 절반이 걸린다.',
  blocks:[
    { h:'① 수일치 함정', items:[
      '**The number of** + 복수명사 + **단수동사** ("~의 수")',
      '**A number of** + 복수명사 + **복수동사** ("많은 ~")',
      '**Each / Every / Either / Neither** + 단수동사',
      '주어와 동사 사이의 수식어구에 속지 않기: *The books on the shelf **are** …*',
      '**불가산명사**는 단수 취급: information, advice, equipment, furniture, luggage, news, evidence, homework'
    ]},
    { h:'② 시제', items:[
      '**현재완료는 명백한 과거 표현과 함께 쓸 수 없다**: ~~have been there last year~~ → **went**',
      '시간·조건의 부사절에서는 **현재가 미래를 대신**한다: *When he **comes**, I will call you.*',
      '**과거완료**는 과거보다 더 이전: *He had left before I arrived.*'
    ]},
    { h:'③ 가정법', table:[
      ['유형','if절','주절','가정 대상'],
      ['**가정법 과거**','과거동사(be→were)','would/could + 동사원형','**현재** 사실의 반대'],
      ['**가정법 과거완료**','had p.p.','would have p.p.','**과거** 사실의 반대'],
      ['**혼합 가정법**','had p.p.','would + 동사원형','과거 원인 → **현재** 결과'],
      ['**as if**','과거(같은 시점) / 과거완료(더 이전)','—','—']
    ]},
    { h:'④ 관계사', items:[
      '**계속적 용법(콤마)에는 that을 쓸 수 없다.**',
      '**what** = 선행사를 포함한 관계대명사 (the thing which)',
      '관계대명사가 목적어면 뒤에 **목적어를 또 쓰지 않는다**: ~~the book which I bought **it**~~',
      '**관계부사**(where/when/why/how)는 뒤에 **완전한 절**, 관계대명사는 **불완전한 절**'
    ]},
    { h:'⑤ 도치 — 부정어·부사구 문두', items:[
      '부정어(never, hardly, scarcely, seldom, little, no sooner, not only)가 문두 → **의문문 어순**으로 도치',
      '*Hardly **had he** arrived when it began to rain.*',
      '*No sooner **had she** left than the phone rang.*',
      '**Only + 부사구**가 문두일 때도 도치: *Only then **did I** realize …*'
    ]},
    { h:'⑥ 준동사 — to부정사 vs 동명사', items:[
      '**to가 전치사**여서 뒤에 -ing가 오는 표현: look forward to, be used to(익숙하다), object to, contribute to, be committed to, when it comes to',
      '**used to + 동사원형** = 과거의 습관 / **be used to + 동사원형** = ~에 사용되다',
      '**동명사만** 목적어로: enjoy, avoid, mind, finish, admit, suggest, consider, postpone, deny',
      '**to부정사만** 목적어로: want, hope, decide, promise, refuse, agree, expect, manage',
      '의미가 달라지는 것: remember/forget/regret + to(앞으로 할 일) vs -ing(이미 한 일)'
    ]},
    { h:'⑦ 주장·요구·명령·제안 동사', items:[
      'suggest, insist, demand, require, recommend, propose, order + that절 → **(should) + 동사원형**',
      '*I suggest that he **go**(not goes) to the doctor.*',
      '단, insist/suggest가 "**주장하다/시사하다**"의 뜻이면 일반 시제를 쓴다.'
    ]},
    { h:'⑧ 비교·기타 빈출', items:[
      '라틴계 비교급은 **to**를 쓴다: superior/inferior/senior/junior/prior **to**',
      '**prefer A to B**, **different from**, **despite/in spite of + 명사**(of 없이 despite)',
      '**병렬구조**: and/or/but으로 연결된 요소는 문법 형태를 맞춘다',
      '**it is no use + -ing**, **there is no + -ing**, **cannot help + -ing**, **be worth + -ing**'
    ]}
  ],
  cases:[
    { t:'밑줄부터 보면 늦는다',
      d:'주어와 동사를 먼저 짝지어 보라. 사이에 낀 수식어를 괄호로 지우면 **수 일치 오류가 그 자리에서 드러난다.**' },
    { t:'선택지가 짝으로 나오면',
      d:'is/are, to do/doing 처럼 **두 형태가 짝으로 제시되면 그 지점이 답인 경우가 많다.** 출제자가 그 문법을 묻고 있다는 신호다.' }
  ],
  cloze:[
    { s:'"The number of ~"는 {{단수}} 취급한다.', o:['복수','상황에 따라 다름','불가산'] },
    { s:'현재완료는 {{명백한 과거 표현}}과 함께 쓸 수 없다.', o:['미래 표현','현재 표현','빈도 부사'] },
    { s:'가정법 과거완료의 if절에는 {{had p.p.}}를 쓴다.', o:['과거동사','would have p.p.','현재동사'] },
    { s:'콤마가 있는 계속적 용법에는 관계대명사 {{that}}을 쓸 수 없다.', o:['which','who','whom'] },
    { s:'부정어가 문두에 오면 {{도치}}가 일어난다.', o:['생략','강조','반복'] },
    { s:'"look forward to"의 to는 전치사이므로 뒤에 {{동명사}}가 온다.', o:['동사원형','to부정사','과거분사'] },
    { s:'제안·요구 동사 뒤 that절에는 {{동사원형}}을 쓴다.', o:['과거동사','현재분사','to부정사'] },
    { s:'superior, inferior 뒤에는 than이 아니라 {{to}}를 쓴다.', o:['than','from','with'] }
  ]
},

{
  id:'eng-t-read-01', subject:'eng', unit:'eng-read', tier:'A',
  title:'독해 유형별 공략법',
  summary:'유형마다 **읽는 순서와 단서**가 다르다. 지문을 처음부터 다 읽는 것이 늘 최선은 아니다.',
  tip:'주제·요지·제목은 **However / Therefore / In short** 뒤를, 순서·삽입은 **지시어와 연결어**를 본다.',
  blocks:[
    { h:'유형별 접근', table:[
      ['유형','먼저 볼 곳','핵심 단서'],
      ['**주제·요지·제목**','첫 문장과 마지막 문장','**However, Yet, But** 뒤 / **Therefore, Thus, In short** 뒤'],
      ['**빈칸 추론**','빈칸 앞뒤 문장','빈칸이 포함된 문장의 **논리 관계**(대조·인과·예시)'],
      ['**순서 배열**','각 단락의 첫 단어','**지시어**(this, they, such) · **연결어**(However, As a result)'],
      ['**문장 삽입**','주어진 문장의 지시어','삽입 위치 **앞뒤의 논리적 단절**'],
      ['**무관한 문장**','글의 소재와 초점','소재는 같아도 **초점이 다른** 문장'],
      ['**내용 일치**','선택지를 먼저','선택지의 **키워드**를 지문에서 스캔']
    ]},
    { h:'제목 문제의 함정', items:[
      '지문의 어휘를 **그대로 반복한 선택지**는 부분 정보에 국한된 오답인 경우가 많다.',
      '정답은 보통 **패러프레이즈된 표현**으로 제시된다.',
      '지나치게 **넓은** 선택지(글 전체를 넘어섬)와 지나치게 **좁은** 선택지(예시 하나만)는 모두 오답.'
    ]},
    { h:'연결어로 읽는 논리', table:[
      ['관계','연결어'],
      ['**역접·대조**','However, Yet, Nevertheless, In contrast, On the other hand, Whereas'],
      ['**인과·결론**','Therefore, Thus, Hence, As a result, Consequently'],
      ['**예시**','For example, For instance, Such as'],
      ['**첨가**','Moreover, Furthermore, In addition, Besides'],
      ['**요약**','In short, In sum, To sum up, That is']
    ]},
    { h:'시간을 아끼는 순서', items:[
      '① 문제 유형을 먼저 확인한다 (무엇을 찾을지 정하고 읽는다)',
      '② 선택지를 훑어 **키워드**를 잡는다',
      '③ 지문을 읽되 **연결어에 표시**하며 논리 흐름을 따라간다',
      '④ 근거 문장을 찾으면 **그 자리에서 답을 고르고** 되돌아가지 않는다',
      '모르는 단어가 나와도 멈추지 않는다 — 문맥과 접사로 추론한다.'
    ]},
    { h:'접사로 뜻 추론하기', items:[
      '부정: **un-, in-/im-/il-/ir-, dis-, non-, mis-** (misunderstand, irrelevant)',
      '방향·정도: **pre-**(앞), **post-**(뒤), **sub-**(아래), **super-/sur-**(위·초과), **over-/under-**',
      '함께·반대: **co-/com-/con-**(함께), **anti-/counter-**(반대), **inter-**(사이)',
      '명사 접미사: -tion, -ment, -ness, -ity / 형용사: -ous, -ful, -less, -able / 동사: -ize, -ify, -en'
    ]}
  ],
  cases:[
    { t:'첫 문장을 고르면 틀리는 유형',
      d:'통념 → 반박 구조에서는 **However 뒤가 요지**다. 첫 문장은 반박당하려고 놓인 미끼인 경우가 많다.' },
    { t:'단정어가 보이면',
      d:'only, always, never, all 이 든 선택지는 본문이 조건을 달아 말한 것을 **단정으로 바꿔 놓은 오답**일 때가 많다.' }
  ],
  cloze:[
    { s:'주제·요지 문제에서는 {{However}} 같은 역접 연결어 뒤를 주목한다.', o:['For example','In addition','Such as'] },
    { s:'순서 배열 문제의 핵심 단서는 지시어와 {{연결어}}이다.', o:['어휘 수준','문장 길이','시제'] },
    { s:'제목 문제에서 지문 어휘를 그대로 반복한 선택지는 {{오답}}일 가능성이 높다.', o:['정답','근거','요지'] },
    { s:'"Consequently"는 {{인과·결론}} 관계를 나타낸다.', o:['역접','예시','첨가'] },
    { s:'접두사 "ir-"는 {{부정}}의 의미를 더한다.', o:['반복','강조','방향'] }
  ]
}
]);
