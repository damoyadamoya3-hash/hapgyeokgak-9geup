/* 영어 · 어휘 / 생활영어 / 문법 / 독해 */
QB.add([
/* ───────── 어휘 ───────── */
{ id:'eng-vocab-001', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nThe manager decided to ‘curtail’ the project due to budget cuts.',
  choices:['expand','shorten','postpone','evaluate'],
  a:1,
  exp:'curtail = 축소하다, 삭감하다 (= cut back, shorten, reduce). 예산 삭감으로 사업을 "줄이기로" 했다는 문맥이다.',
  tip:'cur-(짧게) → curtail = 짧게 자르다' },

{ id:'eng-vocab-002', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nHer explanation was so ‘ambiguous’ that no one understood it.',
  choices:['obvious','unclear','detailed','persuasive'],
  a:1,
  exp:'ambiguous = 모호한, 애매한 (= vague, obscure, unclear). 반의어는 clear, explicit, unequivocal.' },

{ id:'eng-vocab-003', subject:'eng', unit:'eng-vocab', type:'ox', src:'기출 빈출논점',
  q:'"meticulous"는 "꼼꼼한, 세심한"이라는 뜻이다.',
  a:true,
  exp:'meticulous = 꼼꼼한 (= scrupulous, thorough, painstaking). 반의어는 careless, sloppy.' },

{ id:'eng-vocab-004', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nThe new policy will ______ the existing regulations.',
  choices:['supersede','subside','subscribe','suppress'],
  a:0,
  exp:'supersede = 대체하다, 대신하다. subside = 가라앉다, subscribe = 구독하다, suppress = 억압하다.' },

{ id:'eng-vocab-005', subject:'eng', unit:'eng-vocab', type:'ox', src:'기출 빈출논점',
  q:'"put off"는 "연기하다"라는 뜻의 구동사이다.',
  a:true,
  exp:'put off = postpone, delay. 자주 나오는 구동사: call off(취소하다), carry out(수행하다), turn down(거절하다), look into(조사하다), come up with(생각해 내다), do away with(폐지하다).' },

{ id:'eng-vocab-006', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nWe should ‘do away with’ outdated rules.',
  choices:['abolish','reinforce','postpone','revise'],
  a:0,
  exp:'do away with = 없애다, 폐지하다 (= abolish, eliminate, get rid of).' },

/* ───────── 생활영어 ───────── */
{ id:'eng-conv-001', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'대화의 빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: I\'m afraid I can\'t make it to the meeting tomorrow.\nB: ______\nA: I have a doctor\'s appointment.',
  choices:[
    'Congratulations!',
    'How come?',
    'Help yourself.',
    'It\'s on me.'],
  a:1,
  exp:'"How come?"은 "어째서?, 왜?"라는 뜻의 구어 표현이다. 뒤에서 A가 이유(병원 예약)를 말하고 있으므로 이유를 묻는 표현이 적절하다.',
  tip:'How come + 주어 + 동사 (도치 없음!)' },

{ id:'eng-conv-002', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'다음 대화 중 어색한 것은?',
  choices:[
    'A: Thanks for your help. / B: Don\'t mention it.',
    'A: Would you mind opening the window? / B: Not at all.',
    'A: How do you like your coffee? / B: Yes, I like it.',
    'A: I\'m sorry to hear that. / B: Thank you for your concern.'],
  a:2,
  exp:'"How do you like ~?"는 기호나 방식을 묻는 표현이므로 Yes/No로 답할 수 없다. "With cream and sugar, please."처럼 답해야 한다.' },

{ id:'eng-conv-003', subject:'eng', unit:'eng-conv', type:'ox', src:'기출 빈출논점',
  q:'"Would you mind opening the window?"에 승낙하는 답변은 "Yes, I would."이다.',
  a:false,
  exp:'"Would you mind ~?"는 "~하는 것이 꺼려지십니까?"라는 뜻이므로 승낙은 **"No, not at all."** 또는 "Of course not."이다. "Yes"라고 하면 거절이 된다.',
  tip:'mind 질문에 승낙 = No!' },

{ id:'eng-conv-004', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: This project is due tomorrow and I haven\'t even started.\nB: ______ I\'ll help you with it.',
  choices:[
    'You can say that again.',
    'Don\'t worry about it.',
    'It serves you right.',
    'That\'s none of my business.'],
  a:1,
  exp:'뒤에서 도와주겠다고 하므로 상대를 안심시키는 표현이 자연스럽다. "It serves you right"은 "쌤통이다", "That\'s none of my business"는 "내 알 바 아니다"로 문맥에 어긋난다.' },

/* ───────── 문법 ───────── */
{ id:'eng-gram-001', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'어법상 옳지 않은 것은?',
  choices:[
    'The number of students has increased.',
    'A number of students was late.',
    'Each of the boys has his own room.',
    'Neither of them is available.'],
  a:1,
  exp:'"A number of + 복수명사"는 "많은 ~"이라는 뜻으로 **복수 취급**하므로 "were late"가 옳다. 반면 "The number of ~"는 "~의 수"로 단수 취급한다.',
  tip:'The number of = 단수 / A number of = 복수' },

{ id:'eng-gram-002', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"I suggest that he goes to the doctor."는 어법상 옳다.',
  a:false,
  exp:'suggest, insist, demand, recommend, require 등 주장·요구·명령·제안 동사 뒤 that절에는 **(should) + 동사원형**을 쓴다. 따라서 "he go to the doctor"가 옳다.',
  tip:'주·요·명·제 → should 생략 → 동사원형' },

{ id:'eng-gram-003', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nIf I ______ harder last year, I would have passed the exam.',
  choices:['studied','had studied','have studied','would study'],
  a:1,
  exp:'주절이 "would have p.p."이므로 가정법 과거완료다. if절에는 **had p.p.**를 쓴다. 과거 사실의 반대를 가정한다.',
  tip:'가정법 과거완료: If + had p.p. ~, would have p.p.' },

{ id:'eng-gram-004', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"He is used to get up early."는 어법상 옳다.',
  a:false,
  exp:'"be used to + -ing"는 "~에 익숙하다"이므로 "getting up"이 옳다. 반면 "used to + 동사원형"은 "~하곤 했다"(과거의 습관)이다.',
  tip:'used to V(과거 습관) / be used to Ving(익숙) / be used to V(수동: ~에 사용되다)' },

{ id:'eng-gram-005', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'어법상 옳은 것은?',
  choices:[
    'Despite of the rain, we went out.',
    'He is taller than me by 5 centimeters.',
    'The book which I bought it is interesting.',
    'She has been to Paris three times last year.'],
  a:1,
  exp:'① Despite는 전치사이므로 "of"를 붙이지 않는다(Despite the rain). ③ 관계대명사 which가 목적어 역할을 하므로 "it"을 또 쓸 수 없다. ④ "last year"라는 명백한 과거 표현과 현재완료는 함께 쓸 수 없다(went 사용). ②는 옳다.' },

{ id:'eng-gram-006', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"Hardly had he arrived when it began to rain."에서 hardly가 문두에 오면 주어와 동사가 도치된다.',
  a:true,
  exp:'부정어(never, hardly, scarcely, seldom, little, no sooner)가 문두에 오면 도치가 일어난다. "Hardly[Scarcely] ~ when[before]", "No sooner ~ than" 구문이 자주 출제된다.' },

/* ───────── 독해 ───────── */
{ id:'eng-read-001', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Public administration in education requires balancing two competing demands. On one hand, schools must comply with national standards to ensure consistency and equity across regions. On the other hand, each school faces unique local conditions that standardized rules cannot fully address. Effective administrators therefore treat regulations not as rigid commands but as frameworks within which professional judgment operates.',
  q:'What is the main idea of the passage?',
  choices:[
    'National standards should be abolished in education.',
    'Local conditions are more important than national standards.',
    'Administrators should apply regulations as flexible frameworks for professional judgment.',
    'Schools should be completely independent from government oversight.'],
  a:2,
  exp:'글은 국가 기준과 지역 특수성이라는 두 요구를 대비한 뒤, 마지막 문장에서 규정을 "전문적 판단이 작동하는 틀"로 다루어야 한다고 결론짓는다. ①②④는 모두 지나친 진술이다.',
  tip:'therefore / thus 뒤 문장이 주제문일 확률이 높다' },

{ id:'eng-read-002', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Researchers found that students who tested themselves on material remembered significantly more than those who simply reread it. This "testing effect" occurs because retrieval practice strengthens the memory trace far more than passive review. Notably, the benefit appears even when students answer incorrectly, provided they receive feedback afterward.',
  q:'According to the passage, which is true?',
  choices:[
    'Rereading is the most effective study method.',
    'Answering incorrectly always harms learning.',
    'Retrieval practice strengthens memory more than passive review.',
    'Feedback has no effect on the testing effect.'],
  a:2,
  exp:'두 번째 문장이 근거다. 오답을 내더라도 피드백만 있으면 효과가 나타난다고 했으므로 ②④도 틀리다. — 이 원리가 바로 이 앱의 "문제 풀고 즉시 해설 보기" 방식의 근거다.' },

{ id:'eng-read-003', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'(A) However, this assumption has been challenged by recent studies.\n(B) For a long time, people believed that intelligence was fixed at birth.\n(C) They show that the brain remains capable of forming new connections throughout life.',
  q:'글의 순서로 가장 적절한 것은?',
  choices:['(A)-(B)-(C)','(B)-(A)-(C)','(C)-(A)-(B)','(B)-(C)-(A)'],
  a:1,
  exp:'통념 제시(B) → 반박 신호 However(A) → 근거 제시(C) 순이다. 지시어와 연결어를 단서로 삼는다: (A)의 "this assumption"이 (B)를 받고, (C)의 "They"가 (A)의 "recent studies"를 받는다.',
  tip:'순서 배열 = 지시어(this/they) + 연결어(However/Therefore) 추적' },

{ id:'eng-read-004', subject:'eng', unit:'eng-read', type:'ox', src:'기출 빈출논점',
  q:'글의 요지를 묻는 문제에서는 예시(for example)로 제시된 세부 정보가 정답이 되는 경우가 많다.',
  a:false,
  exp:'예시는 주제를 뒷받침하는 세부 정보일 뿐이므로 요지가 될 수 없다. 요지는 일반적 진술, 특히 역접(However, But)이나 결론(Therefore, In short) 뒤의 문장에서 찾는 것이 효율적이다.' }
]);
