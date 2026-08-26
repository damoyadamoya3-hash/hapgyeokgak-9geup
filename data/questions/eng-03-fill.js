/* 영어 · 보강팩 3 — 문법 / 생활영어 / 독해 */
QB.add([
/* ───────── 문법 보강 ───────── */
{ id:'eng-gram-021', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'어법상 옳지 않은 것은?',
  choices:[
    'The committee has decided to postpone the meeting.',
    'Neither of the proposals were accepted by the board.',
    'Each student is required to submit a report.',
    'A number of applicants have withdrawn their forms.'],
  a:1,
  exp:'Neither of ~ 는 단수 취급하므로 "**was** accepted"가 옳다. 함께 외울 것: Each / Every / Either / Neither + 단수동사.' },

{ id:'eng-gram-022', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"If I were you, I would accept the offer."는 현재 사실의 반대를 가정하는 가정법 과거이다.',
  a:true,
  exp:'가정법 과거는 if절에 과거동사(be동사는 인칭에 관계없이 **were**), 주절에 would/could/might + 동사원형을 쓴다.' },

{ id:'eng-gram-023', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nThe official ______ the documents were forged was dismissed.',
  choices:['which','whom','whose','who claimed'],
  a:3,
  exp:'빈칸 뒤에 동사 없이 절이 이어지려면 주격 관계대명사와 동사가 필요하다. "who claimed that the documents were forged"로 읽힌다.' },

{ id:'eng-gram-024', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"He insisted that the report be revised immediately."는 어법상 옳다.',
  a:true,
  exp:'insist 가 "주장·요구"의 뜻일 때 that절에 **(should) + 동사원형**을 쓴다. 다만 "그는 결백하다고 주장했다"처럼 사실을 주장할 때는 일반 시제를 쓴다.' },

{ id:'eng-gram-025', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'어법상 옳은 것은?',
  choices:[
    'Being tired, the work was postponed by him.',
    'Tired of waiting, he decided to leave the office.',
    'Having finished, the report was submitted by her.',
    'Walking down the street, the building looked old.'],
  a:1,
  exp:'분사구문의 의미상 주어는 주절의 주어와 같아야 한다. ②만 "그가 기다리다 지쳤다"로 일치한다. ①③④는 모두 주어가 어긋난 **비문법적 현수분사**다.',
  tip:'분사구문 = 주절 주어와 일치해야 한다' },

{ id:'eng-gram-026', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"The number of complaints have risen sharply."는 어법상 옳다.',
  a:false,
  exp:'"The number of ~"는 "~의 수"로 **단수** 취급하므로 "**has** risen"이 옳다.' },

{ id:'eng-gram-027', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nNot until the deadline passed ______ that the form was incomplete.',
  choices:['he realized','did he realize','he did realize','realized he'],
  a:1,
  exp:'"Not until ~"이 문두에 오면 주절이 **도치**되어 "did + 주어 + 동사원형" 형태가 된다.' },

{ id:'eng-gram-028', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"She is accustomed to work under pressure."는 어법상 옳다.',
  a:false,
  exp:'"be accustomed to"의 to 는 **전치사**이므로 "**working**"이 옳다. 같은 부류: be used to, look forward to, object to, be committed to, devote oneself to + -ing.' },

{ id:'eng-gram-029', subject:'eng', unit:'eng-gram', type:'mcq', src:'기출 빈출논점',
  q:'어법상 옳지 않은 것은?',
  choices:[
    'The data were collected over three years.',
    'Despite the heavy rain, the event went ahead.',
    'He explained me the new procedure in detail.',
    'The proposal is worth considering carefully.'],
  a:2,
  exp:'explain 은 4형식을 취하지 않으므로 "explained **to me** the new procedure"로 써야 한다. 같은 동사: suggest, announce, introduce, describe, propose.',
  tip:'explain/suggest/describe + to 사람' },

{ id:'eng-gram-030', subject:'eng', unit:'eng-gram', type:'ox', src:'기출 빈출논점',
  q:'"I regret to inform you that your application was rejected."에서 "to inform"은 앞으로 할 일을 뜻한다.',
  a:true,
  exp:'regret + to부정사 = 앞으로 할 일을 유감스럽게 여김("알리게 되어 유감입니다"). regret + -ing = 이미 한 일을 후회함. remember·forget 도 같은 구조다.' },

/* ───────── 생활영어 보강 ───────── */
{ id:'eng-conv-031', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: I heard the new system goes live next month.\nB: ______\nA: Right, we should start training the staff now.',
  choices:[
    'That gives us very little time.',
    'It makes no difference to me.',
    'I have nothing to do with it.',
    'That is water under the bridge.'],
  a:0,
  exp:'뒤에서 "지금 교육을 시작해야 한다"고 하므로 **시간이 촉박하다**는 반응이 자연스럽다. "water under the bridge"는 "이미 지난 일"이라는 뜻이다.' },

{ id:'eng-conv-032', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'다음 대화 중 어색한 것은?',
  choices:[
    'A: Can I get back to you on that? / B: Sure, take your time.',
    'A: Sorry to keep you waiting. / B: No worries at all.',
    'A: Would you care for some tea? / B: Yes, I would rather not.',
    'A: How did the interview go? / B: Better than I expected.'],
  a:2,
  exp:'차를 권하는 물음에 "네, 사양하겠습니다"는 앞뒤가 맞지 않는다. "Yes, please." 또는 "No, thank you."가 되어야 한다.' },

{ id:'eng-conv-033', subject:'eng', unit:'eng-conv', type:'ox', src:'기출 빈출논점',
  q:'"Let me sleep on it."은 "결정을 하루 미루고 생각해 보겠다"는 뜻이다.',
  a:true,
  exp:'즉답을 피하고 시간을 두고 생각하겠다는 표현이다. 유사 표현: "Let me think it over.", "I will get back to you."' },

{ id:'eng-conv-034', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: The printer is jammed again.\nB: ______ It has broken down three times this week.',
  choices:[
    'Not again!',
    'Good for you!',
    'Be my guest.',
    'You bet.'],
  a:0,
  exp:'이번 주에만 세 번 고장 났다는 말이 뒤따르므로 **또 그러냐**는 짜증 섞인 반응이 자연스럽다.' },

{ id:'eng-conv-035', subject:'eng', unit:'eng-conv', type:'ox', src:'기출 빈출논점',
  q:'"It slipped my mind."는 "그 일을 깜빡 잊었다"는 뜻이다.',
  a:true,
  exp:'함께 알아둘 표현: It rings a bell(어디서 들어본 것 같다), It is on the tip of my tongue(입 안에서 맴돈다), I lost my train of thought(하려던 말을 잊었다).' },

{ id:'eng-conv-036', subject:'eng', unit:'eng-conv', type:'mcq', src:'기출 빈출논점',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?\n\nA: Do you think we can finish by Friday?\nB: ______ We are still waiting for the data.\nA: Then let us ask for an extension.',
  choices:[
    'It is a long shot.',
    'It is in the bag.',
    'Consider it done.',
    'No sweat at all.'],
  a:0,
  exp:'"It is a long shot"은 **가능성이 희박하다**는 뜻이다. 뒤에서 기한 연장을 요청하자고 하므로 부정적 전망이 맞다. 나머지는 모두 "문제없다"는 뜻이다.' },

{ id:'eng-conv-037', subject:'eng', unit:'eng-conv', type:'ox', src:'기출 빈출논점',
  q:'"Could you fill me in?"은 "서류를 대신 작성해 달라"는 요청이다.',
  a:false,
  exp:'"fill someone in"은 **빠진 정보를 알려 달라**는 뜻이다. 서류 작성은 "fill out[in] a form"으로 목적어가 서류일 때다.' },

/* ───────── 독해 보강 ───────── */
{ id:'eng-read-031', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'When a public office publishes its performance indicators, two things can happen. Staff may work harder on what is measured, which is the intended effect. But they may also shift effort away from work that matters yet is not counted. Economists call this the multitask problem, and it explains why an office can score well on every indicator while the service itself gets worse.',
  q:'What does the multitask problem describe?',
  choices:[
    'Employees who cannot handle more than one task at a time.',
    'Effort moving toward measured work and away from unmeasured work.',
    'Offices that publish too many performance indicators each year.',
    'Managers who refuse to measure the performance of their staff.'],
  a:1,
  exp:'세 번째 문장이 정의다. 측정되는 일에 노력이 몰리고 측정되지 않는 중요한 일이 밀려나는 현상이다. 교육평가의 "결과타당도" 논의와도 통한다.' },

{ id:'eng-read-032', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Handwriting notes is slower than typing, and that is precisely why it helps. Because students cannot write down every word, they must decide what matters and put it in their own phrasing. Typing allows near-verbatim capture, which feels productive but bypasses that decision. ______, studies find that handwritten notes lead to better performance on conceptual questions.',
  q:'빈칸에 들어갈 말로 가장 적절한 것은?',
  choices:['However','Consequently','For example','By contrast'],
  a:1,
  exp:'"결정을 우회한다"는 원인에서 "개념 문제 성적이 더 좋다"는 결과가 이어지므로 인과의 Consequently 가 적절하다.' },

{ id:'eng-read-033', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'(A) The result is that the same regulation is enforced strictly in one district and loosely in another.\n(B) Central agencies write rules in general terms so that they can cover many situations.\n(C) Local officials must therefore interpret those terms before they can act.',
  q:'글의 순서로 가장 적절한 것은?',
  choices:['(B)-(C)-(A)','(A)-(B)-(C)','(C)-(A)-(B)','(B)-(A)-(C)'],
  a:0,
  exp:'일반 진술(B: 중앙은 일반적 표현으로 규칙을 쓴다) → therefore 로 이어지는 귀결(C: 지방 공무원이 해석해야 한다) → The result is(A: 집행 강도가 지역마다 달라진다). 연결어가 순서를 정한다.' },

{ id:'eng-read-034', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Teachers often assume that a quiet classroom is a learning classroom. ① Silence, however, tells us little about what is happening inside a student head. ② A student may be following closely, or may have stopped listening ten minutes ago. ③ School buildings constructed before 1980 tend to have poorer sound insulation. ④ What distinguishes the two is not noise level but whether the student can explain the idea afterward.',
  q:'글의 흐름상 어색한 문장은?',
  choices:['①','②','③','④'],
  a:2,
  exp:'③ 건물의 방음 성능은 "조용함이 학습을 뜻하는가"라는 논지와 무관하다. ①②는 근거, ④는 결론이다.' },

{ id:'eng-read-035', subject:'eng', unit:'eng-read', type:'mcq', src:'기출 빈출논점',
  passage:'Feedback that arrives too late is not feedback at all. By the time a graded paper comes back three weeks later, the student has forgotten the reasoning that produced the answer, so there is nothing to correct. This is why short, frequent checks tend to outperform a single large examination, even when the total time spent on assessment is the same.',
  q:'윗글의 제목으로 가장 적절한 것은?',
  choices:[
    'Why Large Examinations Should Be Abolished Everywhere',
    'Timing Matters More Than Volume in Assessment',
    'How Students Forget What They Have Studied',
    'The History of Grading Practices in Schools'],
  a:1,
  exp:'평가에 쓴 총 시간이 같아도 **짧고 잦은 확인**이 낫다는 것이 요지이므로, 시점이 분량보다 중요하다는 ②가 제목으로 적절하다. ①은 지나친 진술, ③④는 부분·무관이다.',
  tip:'제목은 지문 어휘 반복보다 패러프레이즈된 쪽이 정답인 경우가 많다' },

{ id:'eng-read-036', subject:'eng', unit:'eng-read', type:'ox', src:'기출 빈출논점',
  q:'빈칸 추론 문제에서는 빈칸이 포함된 문장과 바로 앞뒤 문장의 논리 관계를 먼저 확인하는 것이 효율적이다.',
  a:true,
  exp:'빈칸은 대개 앞뒤와 **대조·인과·예시** 중 하나의 관계를 맺는다. 그 관계를 먼저 잡으면 선택지를 빠르게 걸러낼 수 있다.' }
]);
