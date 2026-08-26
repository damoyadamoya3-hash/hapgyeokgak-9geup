/* 보강팩 — 국어 비문학 독해 / 영어 독해·생활영어 */
QB.add([
/* ───────── 국어 비문학 독해 ───────── */
{ id:'kor-read-021', subject:'kor', unit:'kor-read', type:'mcq', src:'기출 빈출논점',
  passage:'평가의 목적이 선발일 때와 학습 촉진일 때, 좋은 문항의 조건은 서로 달라진다. 선발이 목적이라면 응시자를 넓게 흩어 놓는 문항, 곧 정답률이 중간쯤이고 상위 집단과 하위 집단을 잘 갈라 놓는 문항이 좋다. 반면 학습 촉진이 목적이라면 대다수가 맞히더라도 핵심 개념을 정확히 짚어 주는 문항이 더 유용하다. 같은 문항을 두고 "좋다"와 "나쁘다"가 갈리는 이유가 여기에 있다.',
  q:'윗글의 내용과 일치하는 것은?',
  choices:[
    '정답률이 높은 문항은 어떤 경우에도 좋지 않다.',
    '문항의 좋고 나쁨은 평가의 목적에 따라 달라진다.',
    '변별도가 높은 문항이 언제나 학습에 유리하다.',
    '선발과 학습 촉진은 같은 조건의 문항을 요구한다.'],
  a:1,
  exp:'마지막 문장이 요지다. 목적(선발 vs 학습 촉진)에 따라 좋은 문항의 조건이 달라진다는 것이 글의 핵심이다. ①③은 지나친 일반화, ④는 글과 반대다.',
  tip:'"~인 이유가 여기에 있다"로 끝나면 그 앞이 요지' },

{ id:'kor-read-022', subject:'kor', unit:'kor-read', type:'mcq', src:'기출 빈출논점',
  passage:'㉠ 공문서는 읽는 사람이 한 번에 이해할 수 있어야 한다. ㉡ 그러기 위해 한 문장에 하나의 정보만 담고, 수식어를 최소화한다. ㉢ 또한 결론을 앞에 두고 근거를 뒤에 배치하는 두괄식 구성이 권장된다. ㉣ 최근에는 공공기관도 사회관계망 서비스를 적극적으로 활용하고 있다.',
  q:'㉠~㉣ 중 글의 흐름상 삭제해야 할 문장은?',
  choices:['㉠','㉡','㉢','㉣'],
  a:3,
  exp:'㉠~㉢은 모두 공문서 작성 방법이라는 하나의 주제를 다루지만, ㉣은 홍보 매체 활용이라는 다른 화제로 벗어난다.' },

{ id:'kor-read-023', subject:'kor', unit:'kor-read', type:'mcq', src:'기출 빈출논점',
  passage:'(가) 그러나 이 방식은 학생이 스스로 사고할 기회를 빼앗는다는 비판을 받는다.\n(나) 전통적 수업에서 교사는 지식을 체계적으로 정리해 전달한다.\n(다) 이에 따라 최근에는 학생이 질문을 던지고 자료를 탐색하도록 이끄는 수업이 확대되고 있다.',
  q:'글의 순서로 가장 적절한 것은?',
  choices:['(가)-(나)-(다)','(나)-(가)-(다)','(다)-(나)-(가)','(나)-(다)-(가)'],
  a:1,
  exp:'현행 방식 소개(나) → 역접 "그러나"로 비판 제시(가) → "이에 따라"로 대안 제시(다) 순이다. 접속어가 순서를 결정한다.' },

{ id:'kor-read-024', subject:'kor', unit:'kor-read', type:'mcq', src:'기출 빈출논점',
  q:'다음 개요의 흐름상 ㉠에 들어갈 내용으로 가장 적절한 것은?\n\nⅠ. 서론: 학교 행정업무 과중의 실태\nⅡ. 본론\n  1. 원인 — 공문 처리 증가, 인력 부족\n  2. ㉠\nⅢ. 결론: 교육 활동에 집중할 수 있는 여건 마련',
  choices:[
    '역사적 배경 — 학교 행정업무 제도가 변해 온 과정 정리',
    '해결 방안 — 업무 경감 시스템 도입, 행정 전담 인력 배치',
    '제도 비판 — 현행 교원 자격 제도의 구조적 문제점 분석',
    '인구 변화 — 학생 수 감소가 학교 현장에 미친 사회적 영향'],
  a:1,
  exp:'본론에서 원인을 다루었으므로 다음은 **해결 방안**이 오고, 결론의 "여건 마련"과도 자연스럽게 이어진다. 개요 문제는 **상하 관계와 결론과의 호응**을 본다.' },

{ id:'kor-read-025', subject:'kor', unit:'kor-read', type:'ox', src:'기출 빈출논점',
  q:'퇴고할 때는 글 전체의 통일성 → 문단의 응집성 → 문장·어휘의 정확성 순으로, 큰 단위에서 작은 단위로 살피는 것이 효율적이다.',
  a:true,
  exp:'어휘부터 고치면 나중에 문단을 통째로 들어낼 때 그 노력이 버려진다. 글 수준 → 문단 수준 → 문장 수준 순의 하향식 점검이 원칙이다.' },

{ id:'kor-read-026', subject:'kor', unit:'kor-read', type:'mcq', src:'기출 빈출논점',
  q:'다음 중 높임 표현이 바르게 쓰인 것은?',
  choices:[
    '주문하신 커피 나오셨습니다.',
    '고객님, 이 상품은 품절이십니다.',
    '할아버지께서 방에 계십니다.',
    '사장님의 말씀이 계시겠습니다.'],
  a:2,
  exp:'③은 주체(할아버지)를 특수 어휘 "계시다"로 바르게 높였다. ①②는 사물 존칭, ④는 "말씀이 있으시겠습니다"로 간접 높임을 써야 한다.' },

/* ───────── 영어 독해 ───────── */
{ id:'eng-read-021', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Feedback is most useful when it is specific and timely. Telling a student "good job" confirms the outcome but says nothing about what to repeat. Telling the same student "your second paragraph states the claim clearly and supports it with evidence" identifies the behavior worth repeating. Delay weakens feedback in a similar way: by the time a graded paper is returned weeks later, the student no longer remembers the choices that produced the result.',
  q:'What is the main point of the passage?',
  choices:[
    'Feedback should always be positive and centred on encouragement.',
    'Feedback works best when it is specific and given promptly.',
    'Numerical grades are more useful to students than written comments.',
    'Students should evaluate their own writing rather than be told.'],
  a:1,
  exp:'첫 문장이 주제문이고, 이후 두 예시가 각각 specific과 timely를 뒷받침한다. ①③④는 지문에 근거가 없다.',
  tip:'첫 문장이 일반 진술이면 그것이 주제문일 확률이 높다' },

{ id:'eng-read-022', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'A common misconception is that multitasking saves time. In reality, the brain does not process two demanding tasks at once; it switches between them. Each switch carries a cost — a brief period during which performance drops while attention reorients. ______, people who frequently switch tasks take longer to finish the same work than those who complete tasks in sequence.',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?',
  choices:['Nonetheless','Accordingly','For example','In contrast'],
  a:1,
  exp:'전환 비용이라는 원인에서 "더 오래 걸린다"는 결과가 도출되므로 인과의 Accordingly(따라서)가 적절하다.' },

{ id:'eng-read-023', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Administrative discretion is often described as a necessary evil. It is necessary because no rule can anticipate every situation an official will face. It is treated as an evil because discretion opens the door to inconsistency and favoritism. Recent scholarship, however, suggests a third view: discretion is neither good nor bad in itself, and what matters is whether the reasons behind each decision can be examined afterward.',
  q:'According to the passage, what determines whether discretion is acceptable?',
  choices:[
    'The sheer number of written rules that already exist.',
    'Whether the reasoning behind decisions can be reviewed.',
    'The rank of the official who happens to be exercising it.',
    'Whether the citizens affected agree with the final outcome.'],
  a:1,
  exp:'마지막 문장의 "whether the reasons behind each decision can be examined afterward"가 근거다. 행정법의 이유제시·사후 통제 논의와 이어진다.' },

{ id:'eng-read-024', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Some schools have replaced letter grades with narrative reports. Supporters argue that narratives describe what a student can actually do, while a letter compresses months of work into a single symbol. ① Critics respond that narratives are time-consuming to write and hard to compare across students. ② Others note that universities still require numerical records for admission. ③ School libraries have expanded their digital collections in recent years. ④ The debate therefore turns on a trade-off between richness of information and ease of comparison.',
  q:'글의 흐름상 어색한 문장은?',
  choices:['①','②','③','④'],
  a:2,
  exp:'③ 도서관 장서 확충은 성적 표기 방식 논쟁과 무관하다. ①②는 반대 논거, ④는 결론이다.' },

{ id:'eng-read-025', subject:'eng', unit:'eng-read', type:'ox', src:'기출 빈출논점',
  q:'내용 일치 문제에서는 지문을 모두 읽기 전에 선택지의 키워드를 먼저 확인하는 것이 효율적이다.',
  a:true,
  exp:'무엇을 찾을지 정한 뒤 읽으면 불필요한 정독을 줄일 수 있다. 다만 주제·제목 문제는 전체 흐름을 봐야 하므로 이 전략이 통하지 않는다.' },

/* ───────── 영어 생활영어 ───────── */
{ id:'eng-conv-021', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: I\'ve been trying to fix this printer for an hour.\nB: ______\nA: Thanks, but I think I\'ll just call the technician.',
  choices:[
    'Want me to take a look?',
    'That\'s none of my business.',
    'You should have known better.',
    'I told you so.'],
  a:0,
  exp:'A가 "고맙지만 기술자를 부르겠다"고 답하므로, B는 **도움을 제안**한 것이어야 자연스럽다.' },

{ id:'eng-conv-022', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'다음 대화 중 어색한 것은?',
  choices:[
    'A: How\'s it going? / B: Can\'t complain.',
    'A: Do you happen to know where the office is? / B: It\'s on the third floor.',
    'A: I\'m sorry I\'m late. / B: Never mind, we just started.',
    'A: Would you like some more? / B: Yes, I\'m full.'],
  a:3,
  exp:'더 먹겠냐는 물음에 "네, 배가 부릅니다"는 앞뒤가 맞지 않는다. "No, thanks. I\'m full."이 자연스럽다.' },

{ id:'eng-conv-023', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: Should we go ahead with the plan or wait?\nB: ______ Let\'s see how the budget looks first.',
  choices:[
    'Let\'s play it by ear.',
    'It\'s a done deal.',
    'You have my word.',
    'Better safe than sorry.'],
  a:0,
  exp:'"play it by ear"는 미리 정하지 않고 **상황을 봐가며 결정하자**는 뜻으로, 예산을 먼저 보자는 뒷문장과 이어진다.' },

{ id:'eng-conv-024', subject:'eng', unit:'eng-conv', type:'ox', src:'기출 빈출논점',
  q:'"I\'m all ears."는 상대의 말을 듣고 싶지 않다는 뜻이다.',
  a:false,
  exp:'"귀 기울여 듣고 있으니 어서 말해 보라"는 **경청의 표현**이다. 함께 알아둘 표현: I\'m all set(준비됐다), I\'m swamped(정신없이 바쁘다), It slipped my mind(깜빡했다).' },

{ id:'eng-conv-025', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: Do you think the proposal will be approved?\nB: ______ The committee has rejected similar ones before.',
  choices:[
    'I wouldn\'t count on it.',
    'It\'s in the bag.',
    'You can bet on it.',
    'No doubt about it.'],
  a:0,
  exp:'위원회가 유사한 제안을 이미 거절한 적이 있다고 했으므로 **회의적인 반응**이 자연스럽다. "I wouldn\'t count on it."은 "기대하지 않는 게 좋겠다"는 뜻이다.' },

{ id:'eng-conv-026', subject:'eng', unit:'eng-conv', type:'ox', src:'기출 빈출논점',
  q:'"It\'s on me."는 "내가 계산하겠다"는 뜻이다.',
  a:true,
  exp:'"This is on me." 또는 "My treat."도 같은 뜻이다. 반대로 각자 내자는 말은 "Let\'s split the bill." 또는 "Let\'s go Dutch."다.' }
]);
