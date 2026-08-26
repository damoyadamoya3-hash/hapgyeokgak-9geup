/* 영어 · 확장팩 — 어휘 / 생활영어 / 문법 / 독해 */
QB.add([
/* ───────── 어휘 ───────── */
{ id:'eng-vocab-011', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nThe committee decided to ‘scrutinize’ the budget proposal.',
  choices:['approve','examine closely','ignore','summarize'],
  a:1,
  exp:'scrutinize = 면밀히 조사하다 (= examine closely, inspect, pore over). 명사형 scrutiny도 함께 외운다.' },

{ id:'eng-vocab-012', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nHis remarks were ‘pertinent’ to the discussion.',
  choices:['irrelevant','relevant','offensive','lengthy'],
  a:1,
  exp:'pertinent = 적절한, 관련 있는 (= relevant, apposite, germane). 반의어는 irrelevant, extraneous.' },

{ id:'eng-vocab-013', subject:'eng', unit:'eng-vocab', type:'ox', src:'기출 빈출논점',
  q:'"tentative"는 "확정적인, 최종적인"이라는 뜻이다.',
  a:false,
  exp:'tentative = **잠정적인, 시험적인** (= provisional, preliminary). 확정적이라는 뜻은 definitive, conclusive다.',
  tip:'tentative schedule = 잠정 일정' },

{ id:'eng-vocab-014', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nThe drought has ______ the food shortage in the region.',
  choices:['alleviated','exacerbated','postponed','concealed'],
  a:1,
  exp:'exacerbate = 악화시키다 (= aggravate, worsen). alleviate는 반대로 "완화하다"(= mitigate, ease). 가뭄이 식량 부족을 "악화시켰다"가 자연스럽다.',
  tip:'악화: exacerbate·aggravate / 완화: alleviate·mitigate·relieve' },

{ id:'eng-vocab-015', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nShe was ‘reluctant’ to accept the offer.',
  choices:['eager','unwilling','ready','grateful'],
  a:1,
  exp:'reluctant = 꺼리는, 마지못한 (= unwilling, hesitant, disinclined). 반의어는 eager, willing.' },

{ id:'eng-vocab-016', subject:'eng', unit:'eng-vocab', type:'ox', src:'기출 빈출논점',
  q:'"comply with"는 "~을 준수하다"라는 뜻이다.',
  a:true,
  exp:'comply with = 따르다, 준수하다 (= abide by, conform to, adhere to). 행정 영어에서 자주 나온다: comply with regulations.' },

{ id:'eng-vocab-017', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nThe policy was implemented to ‘bolster’ the local economy.',
  choices:['weaken','strengthen','replace','analyze'],
  a:1,
  exp:'bolster = 강화하다, 북돋우다 (= strengthen, reinforce, buttress).' },

{ id:'eng-vocab-018', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 구동사의 의미로 가장 적절한 것은?\n\nThe meeting was ‘called off’ at the last minute.',
  choices:['postponed','cancelled','extended','arranged'],
  a:1,
  exp:'call off = 취소하다 (= cancel). 연기는 put off, postpone이므로 구별해야 한다.',
  tip:'call off(취소) ≠ put off(연기)' },

{ id:'eng-vocab-019', subject:'eng', unit:'eng-vocab', type:'ox', src:'기출 빈출논점',
  q:'"account for"는 "설명하다" 또는 "차지하다"라는 뜻으로 쓰인다.',
  a:true,
  exp:'account for = ① 설명하다(explain) ② (비율을) 차지하다. 예: Exports account for 40% of revenue.' },

{ id:'eng-vocab-020', subject:'eng', unit:'eng-vocab', type:'mcq', src:'기출 빈출논점',
  q:'밑줄 친 부분과 의미가 가장 가까운 것은?\n\nHe gave a ‘concise’ summary of the report.',
  choices:['brief and clear','vague','lengthy','inaccurate'],
  a:0,
  exp:'concise = 간결한 (= succinct, terse, brief). 반의어는 verbose, wordy, redundant.' },

/* ───────── 생활영어 ───────── */
{ id:'eng-conv-011', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: I heard you got promoted. Congratulations!\nB: Thank you. ______\nA: You definitely deserve it.',
  choices:[
    'I couldn\'t agree more.',
    'It hasn\'t sunk in yet.',
    'Better late than never.',
    'That\'s a piece of cake.'],
  a:1,
  exp:'"It hasn\'t sunk in yet."는 "아직 실감이 안 난다"는 뜻으로 승진 소식에 대한 자연스러운 반응이다.' },

{ id:'eng-conv-012', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'다음 대화 중 어색한 것은?',
  choices:[
    'A: How long does it take to get there? / B: About 20 minutes.',
    'A: Do you mind if I sit here? / B: Go ahead.',
    'A: I\'m afraid I have to leave now. / B: Congratulations!',
    'A: Could you give me a hand? / B: Sure, what do you need?'],
  a:2,
  exp:'떠나야 한다는 말에 "축하합니다"는 어울리지 않는다. "That\'s too bad." 또는 "See you later." 정도가 자연스럽다.' },

{ id:'eng-conv-013', subject:'eng', unit:'eng-conv', type:'ox', src:'기출 빈출논점',
  q:'"You can say that again."은 상대방에게 다시 말해 달라고 요청하는 표현이다.',
  a:false,
  exp:'"전적으로 동의한다, 내 말이 그 말이다"라는 **강한 동의** 표현이다. 다시 말해 달라는 요청은 "Could you say that again?" 또는 "I beg your pardon?"이다.',
  tip:'You can say that again = 완전 공감!' },

{ id:'eng-conv-014', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: The report is due Friday, but I\'m swamped with other work.\nB: ______ Let me take some of it off your hands.',
  choices:[
    'You\'re on your own.',
    'I know the feeling.',
    'It\'s out of the question.',
    'Suit yourself.'],
  a:1,
  exp:'"I know the feeling."은 "그 심정 안다"는 공감 표현으로, 뒤에서 일을 나눠 맡겠다는 제안과 자연스럽게 이어진다. be swamped with = ~로 눈코 뜰 새 없다.' },

/* ───────── 문법 ───────── */
{ id:'eng-gram-011', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'어법상 옳지 않은 것은?',
  choices:[
    'It is important that he be present at the meeting.',
    'Having finished the work, she went home.',
    'The data suggests that the policy is effective.',
    'Hardly I had arrived when the phone rang.'],
  a:3,
  exp:'부정어 Hardly가 문두에 오면 **도치**되어야 하므로 "Hardly had I arrived ~"가 옳다.' },

{ id:'eng-gram-012', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"The number of applicants have increased."는 어법상 옳다.',
  a:false,
  exp:'"The number of ~"는 "~의 수"로 **단수** 취급하므로 "has increased"가 옳다. 반대로 "A number of applicants **have** increased"처럼 A number of는 복수 취급한다.' },

{ id:'eng-gram-013', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nThe report, ______ was submitted yesterday, contains several errors.',
  choices:['that','which','what','who'],
  a:1,
  exp:'콤마가 있는 **계속적 용법**의 관계대명사절이므로 that은 쓸 수 없고, 선행사가 사물이므로 which가 옳다.',
  tip:'계속적 용법(, ~)에는 that 불가!' },

{ id:'eng-gram-014', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"I look forward to hear from you."는 어법상 옳다.',
  a:false,
  exp:'"look forward to"의 to는 **전치사**이므로 뒤에 동명사가 와야 한다. "look forward to hearing from you"가 옳다.',
  tip:'to가 전치사인 표현: look forward to / be used to / object to / contribute to + -ing' },

{ id:'eng-gram-015', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'우리말을 영어로 옮긴 것으로 가장 적절한 것은?\n\n"그는 마치 모든 것을 아는 것처럼 말한다."',
  choices:[
    'He talks as if he knows everything.',
    'He talks as if he knew everything.',
    'He talks as if he had known everything.',
    'He talks like he will know everything.'],
  a:1,
  exp:'현재 사실의 반대를 가정하는 **가정법 과거**이므로 "as if + 주어 + 과거동사"를 쓴다. 주절과 같은 시점의 반대 사실이다.',
  tip:'as if 가정법 과거(같은 시점) / 과거완료(더 이전 시점)' },

{ id:'eng-gram-016', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"Most of the information were useful."은 어법상 옳다.',
  a:false,
  exp:'information은 **불가산명사**이므로 "was useful"이 옳다. 함께 외울 불가산명사: advice, equipment, furniture, luggage, news, evidence, homework.' },

{ id:'eng-gram-017', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'어법상 옳은 것은?',
  choices:[
    'She is superior than her colleagues.',
    'He prefers coffee than tea.',
    'This method is inferior to that one.',
    'The result was different with what we expected.'],
  a:2,
  exp:'라틴어 비교급(superior, inferior, senior, junior, prior)은 than이 아니라 **to**를 쓴다. ② prefer A to B, ④ different **from**이 옳다.' },

{ id:'eng-gram-018', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"It is no use to cry over spilt milk."는 어법상 옳다.',
  a:false,
  exp:'"It is no use + -ing"가 옳은 형태이므로 "It is no use **crying**"이다. 유사 관용구: There is no -ing(~할 수 없다), be worth -ing, cannot help -ing.' },

/* ───────── 독해 ───────── */
{ id:'eng-read-011', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Bureaucracy is often criticized as rigid and impersonal. Yet these very features serve a purpose. Fixed rules limit the discretion of individual officials, which protects citizens from arbitrary treatment. Impersonality ensures that cases are decided on their merits rather than on personal connections. The challenge, then, is not to eliminate bureaucratic features but to prevent them from becoming ends in themselves.',
  q:'What is the author\'s attitude toward bureaucracy?',
  choices:[
    'Entirely negative — it should be abolished.',
    'Balanced — its criticized features also have protective functions.',
    'Indifferent — it makes no real difference.',
    'Uncritically positive — it has no drawbacks.'],
  a:1,
  exp:'"Yet these very features serve a purpose"에서 태도가 드러난다. 관료제의 경직성과 몰인정성이 자의적 처분과 정실을 막는 기능을 한다고 보되, 수단이 목적이 되는 것은 경계한다. 균형 잡힌 태도다.',
  tip:'태도 문제 — Yet / However 뒤에 필자의 입장이 있다' },

{ id:'eng-read-012', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Many teachers assume that praising students builds confidence. Research, however, suggests that the type of praise matters more than the amount. Students praised for their intelligence ("You\'re so smart") tend to avoid difficult tasks, fearing that failure would expose a lack of ability. In contrast, students praised for their effort ("You worked hard on this") are more willing to take on challenges.',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nThe passage suggests that praise should focus on ______.',
  choices:['innate ability','process and effort','test scores','peer comparison'],
  a:1,
  exp:'능력 칭찬은 회피 성향을, 노력 칭찬은 도전 성향을 낳는다는 대비가 핵심이다. 드웩(Dweck)의 성장 마인드셋 연구로, 교육학의 귀인이론과도 연결된다.' },

{ id:'eng-read-013', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Sleep is not merely a period of rest. During sleep, the brain consolidates memories formed during the day, transferring them from temporary storage to more durable networks. Studies show that people who sleep after learning retain far more than those who stay awake for the same interval. ______, cutting sleep to gain study time is often counterproductive.',
  q:'빈칸에 들어갈 연결어로 가장 적절한 것은?',
  choices:['Nevertheless','Therefore','In contrast','For example'],
  a:1,
  exp:'앞 문장(수면이 기억을 공고화한다)에서 결론(수면을 줄여 공부 시간을 얻는 것은 역효과)이 도출되므로 인과의 Therefore가 적절하다.' },

{ id:'eng-read-014', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'(A) As a result, the same policy can succeed in one district and fail in another.\n(B) Educational reforms are usually designed at the national level.\n(C) However, they are carried out by teachers whose working conditions vary widely.',
  q:'글의 순서로 가장 적절한 것은?',
  choices:['(B)-(C)-(A)','(A)-(B)-(C)','(C)-(B)-(A)','(B)-(A)-(C)'],
  a:0,
  exp:'일반 진술(B: 개혁은 국가 수준에서 설계된다) → 역접(C: 그러나 실행하는 교사의 여건은 제각각) → 결과(A: 그래서 같은 정책이 지역마다 다른 결과를 낸다). 교육과정 실행 관점과도 이어진다.' },

{ id:'eng-read-015', subject:'eng', unit:'eng-read', type:'ox', src:'기출 빈출논점',
  q:'글의 제목을 고르는 문제에서는 지문에 나온 단어가 그대로 많이 포함된 선택지가 정답일 가능성이 높다.',
  a:false,
  exp:'지문의 어휘를 그대로 반복한 선택지는 오히려 **부분 정보에 국한된 오답**인 경우가 많다. 제목은 글 전체를 포괄해야 하므로 보통 **패러프레이즈된 표현**으로 제시된다.' }
]);
