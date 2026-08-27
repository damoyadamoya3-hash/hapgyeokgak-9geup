/* 이론 도감 · 영어 — 어휘·숙어 / 생활영어 */
QB.addTheory([
{
  id:'eng-t-vocab-01', subject:'eng', unit:'eng-vocab', tier:'A',
  title:'9급 빈출 어휘와 구동사',
  summary:'낱개 암기보다 **뜻이 같은 무리**와 **반의 짝**으로 묶는 편이 오래 간다. 동의어 문제는 대개 이 묶음 안에서 나온다.',
  tip:'접두사만 알아도 절반은 찍힌다. **부정(un-, in-, dis-, mis-) · 방향(pre-, post-, sub-, super-) · 함께(co-, con-)**',
  blocks:[
    { h:'① 늘리다 / 줄이다', table:[
      ['방향','단어'],
      ['**강화·증가**','bolster, reinforce, buttress, augment, amplify, escalate'],
      ['**악화**','exacerbate, aggravate, worsen, compound'],
      ['**완화**','alleviate, mitigate, relieve, ease, allay'],
      ['**축소·감소**','curtail, diminish, dwindle, taper, abate']
    ]},
    { h:'② 판단·검토', items:[
      '**scrutinize** 면밀히 조사하다 (= examine closely, inspect, pore over)',
      '**assess / appraise / evaluate** 평가하다 · **discern** 분별하다',
      '**substantiate** 입증하다 (= corroborate, verify) ↔ **refute** 반박하다',
      '**ambiguous / vague / obscure** 모호한 ↔ **explicit / unequivocal / lucid** 분명한'
    ]},
    { h:'③ 태도·성향', items:[
      '**meticulous / scrupulous / thorough** 꼼꼼한 ↔ careless, sloppy',
      '**reluctant / hesitant / disinclined** 꺼리는 ↔ eager, willing',
      '**tenacious / persistent** 끈질긴 · **prudent / discreet** 신중한',
      '**arrogant / haughty** 거만한 ↔ **humble / modest** 겸손한',
      '**indifferent / apathetic** 무관심한 · **impartial / unbiased** 공정한'
    ]},
    { h:'④ 행정 영어에서 자주 나오는 말', items:[
      '**comply with** 준수하다 (= abide by, conform to, adhere to)',
      '**supersede** 대체하다 · **implement** 시행하다 · **enact** 제정하다',
      '**mandate** 의무화하다·위임 · **waive** 포기하다·면제하다',
      '**pertinent / relevant / germane** 관련 있는 ↔ irrelevant, extraneous',
      '**concise / succinct / terse** 간결한 ↔ verbose, redundant',
      '**tentative / provisional** 잠정적인 ↔ definitive, conclusive'
    ]},
    { h:'⑤ 구동사 — 헷갈리는 짝', table:[
      ['구동사','뜻','주의'],
      ['**call off**','취소하다 (= cancel)','**put off** = 연기하다'],
      ['**put up with**','참다 (= tolerate)','put off 와 혼동 금지'],
      ['**do away with**','폐지하다 (= abolish)','—'],
      ['**account for**','① 설명하다 ② 차지하다','두 뜻 모두 출제'],
      ['**carry out**','수행하다 (= implement)','carry on = 계속하다'],
      ['**come up with**','생각해 내다','—'],
      ['**look into**','조사하다 (= investigate)','look after = 돌보다'],
      ['**turn down**','거절하다 (= reject)','turn in = 제출하다'],
      ['**fill in / out**','서식을 작성하다','**fill someone in** = 알려 주다']
    ]},
    { h:'⑥ 접사로 뜻 추론하기', items:[
      '부정: **un-, in-/im-/il-/ir-, dis-, non-, mis-** — irrelevant, misinterpret',
      '방향·정도: **pre-**(앞) **post-**(뒤) **sub-**(아래) **super-/sur-**(위·초과) **over-/under-**',
      '함께·반대: **co-/com-/con-**(함께) **anti-/counter-**(반대) **inter-**(사이) **trans-**(넘어)',
      '명사화: -tion, -ment, -ness, -ity / 형용사화: -ous, -ful, -less, -able / 동사화: -ize, -ify, -en'
    ]}
  ],
  cases:[
    { t:'접두사만으로 절반',
      d:'irrelevant, misinterpret 처럼 **부정 접두사** 하나만 알아도 방향이 잡힌다. 모르는 단어에 멈추지 말고 방향만 잡고 지나간다.' },
    { t:'헷갈리는 구동사 세 짝',
      d:'**call off**(취소) ↔ **put off**(연기), **look into**(조사) ↔ **look after**(돌봄), **turn down**(거절) ↔ **turn in**(제출).' }
  ],
  cloze:[
    { s:'"면밀히 조사하다"에 해당하는 단어는 {{scrutinize}}이다.', o:['stipulate','speculate','substantiate'] },
    { s:'악화시키다는 뜻의 단어는 {{exacerbate}}이다.', o:['alleviate','mitigate','allay'] },
    { s:'"준수하다"를 뜻하는 표현은 {{comply with}}이다.', o:['come up with','do away with','put up with'] },
    { s:'"call off"는 {{취소하다}}라는 뜻이다.', o:['연기하다','수행하다','거절하다'] },
    { s:'"tentative"는 {{잠정적인}}이라는 뜻이다.', o:['확정적인','철저한','관련 있는'] },
    { s:'접두사 "ir-"는 {{부정}}의 뜻을 더한다.', o:['반복','강조','방향'] }
  ]
},

{
  id:'eng-t-conv-01', subject:'eng', unit:'eng-conv', tier:'A',
  title:'생활영어 관용 표현 정리',
  summary:'생활영어는 **문맥에 맞는 반응**을 고르는 문제다. 표현의 뜻만 알면 대부분 풀린다.',
  tip:'"Would/Do you mind ~?"에 **승낙은 No**. 이 하나만 틀려도 한 문제가 날아간다.',
  blocks:[
    { h:'① 응답의 함정', items:[
      '**Would you mind ~ing?** — 승낙 "**No, not at all.**" / 거절 "Yes, I would."',
      '**Do you mind if I ~?** — 승낙 "Not at all. / Go ahead." ',
      '**How do you like ~?** — 기호·방식을 묻는 말. **Yes/No 로 답할 수 없다**',
      '**Would you like some more?** — 사양은 "**No, thanks. I am full.**"'
    ]},
    { h:'② 동의·공감', items:[
      '**You can say that again.** 내 말이 그 말이다 (강한 동의)',
      '**I couldn\'t agree more.** 전적으로 동의한다',
      '**I know the feeling.** 그 심정 안다 · **Tell me about it.** 누가 아니래',
      '**I am all ears.** 귀 기울여 듣고 있다'
    ]},
    { h:'③ 유보·거절·회의', items:[
      '**Let me sleep on it.** 하루 생각해 보겠다 · **Let me think it over.**',
      '**Let\'s play it by ear.** 상황 봐가며 정하자',
      '**I wouldn\'t count on it.** 기대하지 않는 게 좋겠다',
      '**It is a long shot.** 가능성이 희박하다',
      '**It is out of the question.** 절대 안 된다 (↔ out of question = 문제없다)'
    ]},
    { h:'④ 자신감·수락', items:[
      '**It is in the bag.** 따 놓은 당상이다 · **Consider it done.** 맡겨만 달라',
      '**You bet. / No sweat. / Piece of cake.** 물론이지, 문제없다',
      '**Be my guest.** 얼마든지 그렇게 하세요 · **You have my word.** 약속한다'
    ]},
    { h:'⑤ 실수·망각·바쁨', items:[
      '**It slipped my mind.** 깜빡했다 · **It rings a bell.** 어디서 들어본 것 같다',
      '**It is on the tip of my tongue.** 입 안에서 맴돈다',
      '**I am swamped (with work).** 눈코 뜰 새 없이 바쁘다',
      '**I lost my train of thought.** 하려던 말을 잊었다'
    ]},
    { h:'⑥ 그 밖의 빈출', table:[
      ['표현','뜻'],
      ['**It is on me. / My treat.**','내가 낼게 (↔ split the bill, go Dutch)'],
      ['**Can I get back to you?**','나중에 답해도 될까요?'],
      ['**Could you fill me in?**','빠진 내용을 알려 주시겠어요?'],
      ['**Water under the bridge**','이미 지난 일'],
      ['**It serves you right.**','쌤통이다'],
      ['**Better late than never.**','늦더라도 안 하는 것보다 낫다'],
      ['**Not again!**','또야! (짜증)'],
      ['**Can\'t complain.**','그런대로 괜찮다']
    ]}
  ],
  cases:[
    { t:'mind 물음의 함정',
      d:'Would you mind ~? 는 ‘꺼리십니까’라는 뜻이다. 그래서 **승낙이 No**다. Yes 라고 답하면 거절이 된다.' },
    { t:'the 하나로 뒤집히는 표현',
      d:'**out of question** = 문제없다 / **out of the question** = 절대 안 된다. 정반대다.' }
  ],
  cloze:[
    { s:'"Would you mind opening the window?"에 승낙하려면 {{No}}로 답한다.', o:['Yes','Sure, I would','Of course I do'] },
    { s:'"You can say that again."은 {{강한 동의}}를 뜻한다.', o:['다시 말해 달라는 요청','반대 의사','놀라움'] },
    { s:'"Let me sleep on it."은 {{하루 생각해 보겠다}}는 뜻이다.', o:['그 자리에서 자겠다','거절하겠다','동의하겠다'] },
    { s:'가능성이 희박하다는 뜻의 표현은 {{It is a long shot}}이다.', o:['It is in the bag','Consider it done','No sweat'] },
    { s:'"It slipped my mind."는 {{깜빡 잊었다}}는 뜻이다.', o:['말이 헛나왔다','생각이 바뀌었다','마음에 걸린다'] },
    { s:'"fill someone in"은 {{빠진 정보를 알려 주다}}라는 뜻이다.', o:['서류를 대신 쓰다','자리를 대신하다','빈칸을 채우다'] }
  ]
}
]);
