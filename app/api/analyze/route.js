// 7월·2학기 관찰일지 + 교사 메모 → 1·2학기 성장 보고서 글 생성 (Claude API)
// 필요한 환경변수: ANTHROPIC_API_KEY

export const maxDuration = 180;

const LOG_LIMIT = 40000; // 관찰일지 한 편당 최대 글자 수 (넘으면 앞부분만 사용하고 알려 줌)

// AI가 준 JSON에서 따옴표·줄바꿈 문제를 보정해서 파싱 (wmentor-journal 검증된 패턴)
function parseAiJson(raw) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 응답에서 결과를 찾지 못했습니다');
  const text = jsonMatch[0];
  try { return JSON.parse(text); } catch (e) { /* 보정 후 재시도 */ }
  return JSON.parse(repairAiJson(text));
}

function repairAiJson(s) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!inStr) {
      if (c === '"') inStr = true;
      out += c;
      continue;
    }
    if (c === '\\') { out += c + (s[i + 1] || ''); i++; continue; }
    if (c === '\n') { out += '\\n'; continue; }
    if (c === '\r') { out += '\\r'; continue; }
    if (c === '\t') { out += '\\t'; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      const n = s[j];
      if (n === ',' || n === '}' || n === ']' || n === ':' || j >= s.length) { inStr = false; out += c; }
      else out += '\\"';
      continue;
    }
    out += c;
  }
  return out;
}

const SYSTEM = `당신은 영유아 발달 전문가이자 어린이집 교사의 글쓰기를 돕는 전문가입니다.
교사가 준 1학기(7월) 관찰일지와 2학기(9월 또는 10월) 관찰일지, 그리고 교사 메모를 바탕으로
학부모께 드리는 「1·2학기 성장 보고서」의 글을 씁니다.

문체 규칙:
- 따뜻하고 품위 있는 존댓말로 씁니다. 학부모가 읽고 안심하고 미소 짓게 되는 글이어야 합니다.
- 아이 이름을 자연스럽게 넣되, 조사(이는/는, 이가/가, 이를/를)를 이름 받침에 맞게 정확히 씁니다.
- 관찰일지와 메모에 있는 사실만 사용합니다. 없는 일을 지어내지 않습니다. 사실을 매끄럽게 풀어 쓰는 것은 좋습니다.
- 큰따옴표(")는 절대 사용하지 않습니다. 아이의 말을 옮길 때도 따옴표 없이 풀어 씁니다.
- 부정적인 내용은 성장 중인 모습으로 부드럽게 표현합니다.
- 각 항목의 문장 수를 지킵니다. 너무 길면 보고서 한 쪽에 들어가지 않습니다.
- 시기를 말할 때는 자료에 있는 시기(7월, 9월, 10월, 1학기, 2학기)만 씁니다. 2학기 관찰일지가 9월 것이면 10월이라 부르지 말고 9월이라고 씁니다. 자료에 없는 3월이나 다른 달의 모습을 지어내지 않습니다.

내용 규칙:
1. dev_summary(발달 변화 총평): 7월 관찰일지와 2학기 관찰일지를 비교해 가장 두드러진 변화를 4~5문장으로 씁니다. 두 시기의 구체적인 장면을 대비시켜 변화가 눈에 보이게 씁니다.
2. dev_items(영역별 변화표): 관찰일지에 근거가 있는 영역만 골라 4개(최대 5개)를 씁니다. 영역 이름 예: 신체·운동, 언어·의사소통, 사회관계, 정서·자기조절, 놀이·탐구, 기본생활. before는 7월 모습, after는 2학기 관찰일지의 모습을 각각 1~2문장(60자 안팎)으로 씁니다.
3. good_items(요즘 잘하는 것): 2학기 관찰일지와 교사 메모에서 아이가 지금 잘하는 것을 3~4줄로, 한 줄에 한 가지씩(각 30자 안팎) 씁니다. 줄과 줄은 줄바꿈으로 나눕니다.
4. worry_before(1학기 부모님의 염려·부탁): 부모님이 걱정하시거나 부탁하신 내용을 부모님의 마음을 존중하며 2~3문장으로 정리합니다.
5. worry_child(아이의 변화): 그 염려가 지금 어떻게 달라졌는지 관찰일지의 장면을 들어 3~4문장으로 씁니다.
6. worry_parent(부모님의 변화): 부모님께서 달라지신 점, 가정에서 함께해 주신 노력을 2~3문장으로 감사의 마음을 담아 씁니다. 메모가 없으면 부모님의 관심과 협력에 대한 감사로 2문장을 씁니다.
7. prep_intro(2학기 준비 도입): 남은 2학기 동안 교사가 이 아이를 위해 준비하고 지원할 방향을 1~2문장으로 씁니다.
8. prep_items(2학기 준비·지원 항목): 관찰된 발달 과제와 교사 메모를 바탕으로 4~5줄, 한 줄에 한 가지씩(각 45자 안팎) 구체적으로 씁니다. 줄과 줄은 줄바꿈으로 나눕니다.
9. age_intro(이 연령의 발달): 아이의 현재 개월수·연령을 바탕으로 이 시기의 일반적인 발달 특징을 2문장으로 씁니다.
10. age_items(영역별 발달 정리): 이 연령에서 중요한 발달을 4~5줄로 씁니다. 각 줄은 「영역: 설명」 꼴(예: 언어: 두세 단어를 이어 말하며…)로, 각 40~55자 안팎. 줄과 줄은 줄바꿈으로 나눕니다. 일반 발달 지식을 쓰되 가정에서 도울 수 있는 방향을 살짝 곁들입니다.
11. letter(편지): 7~8문장. 앞의 항목에서 쓴 문장과 표현을 그대로 반복하지 않고, 두 학기를 함께한 감사와 애정, 아이를 향한 기대를 새로운 말로 씁니다. 교사 메모의 「전하고 싶은 말」이 있으면 그 마음을 꼭 담습니다.

출력 규칙:
- 반드시 아래 키를 가진 JSON 하나만 출력합니다. 다른 말은 쓰지 않습니다.
- 문자열 안에서 줄을 나눌 때는 백슬래시 n(역슬래시 뒤에 n) 두 글자로 씁니다.
{
  "dev_summary": "발달 변화 총평",
  "dev_items": [ { "area": "영역", "before": "7월 모습", "after": "2학기 관찰일지 달의 모습" } ],
  "good_items": "잘하는 것 한 줄씩",
  "worry_before": "1학기 염려·부탁",
  "worry_child": "아이의 변화",
  "worry_parent": "부모님의 변화",
  "prep_intro": "2학기 준비 도입",
  "prep_items": "준비 항목 한 줄씩",
  "age_intro": "이 연령의 발달 특징",
  "age_items": "영역: 설명 한 줄씩",
  "letter": "편지"
}`;

function clip(s, n) {
  const t = (s || '').trim();
  return t.length > n ? { text: t.slice(0, n), cut: true } : { text: t, cut: false };
}

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API 키가 설정되지 않았습니다 (ANTHROPIC_API_KEY)' }, { status: 500 });
    }

    const { info, data } = await request.json();
    if (!info?.childName) {
      return Response.json({ error: '아이 이름을 먼저 입력해 주세요' }, { status: 400 });
    }
    const july = clip(data?.julyLog, LOG_LIMIT);
    const oct = clip(data?.octLog, LOG_LIMIT);
    if (!july.text && !oct.text) {
      return Response.json({ error: '7월 또는 2학기 관찰일지를 넣어 주세요' }, { status: 400 });
    }

    const lines = [
      `아이 이름: ${info.childName}`,
      `생년월일: ${info.birthText || '(입력 안 함)'}`,
      `현재 연령: ${info.ageText || '(계산 안 됨)'}`,
      `반 이름: ${info.className || ''}`,
      `담임: ${info.teacherName || ''}`,
      `보고서 기간: ${info.period || '2학기'}`,
      `2학기 관찰일지의 달: ${data?.octMonth || '10월'} (before는 7월, after는 이 달의 모습)`,
      '',
      '=== 1학기(7월) 관찰일지 ===',
      july.text || '(없음)',
      '',
      '=== 1학기 부모님이 염려하신 부분 · 부탁하신 부분 (교사 메모) ===',
      data?.worry || '(없음)',
      '',
      '=== 아이는 지금 어떻게 바뀌었나요? (교사 메모) ===',
      data?.childChange || '(없음)',
      '',
      '=== 부모님의 변화 (교사 메모) ===',
      data?.parentChange || '(없음)',
      '',
      `=== 2학기(${data?.octMonth || '10월'}) 관찰일지 ===`,
      oct.text || '(없음)',
      '',
      '=== 지금 아이가 잘하는 것 (교사 메모) ===',
      data?.strengths || '(없음)',
      '',
      '=== 선생님이 부모님께 전하고 싶은 말 (교사 메모) ===',
      data?.teacherMsg || '(없음)',
      '',
      '=== 선생님의 2학기 준비·계획 (교사 메모, 없으면 관찰일지에서 도출) ===',
      data?.prep || '(없음)',
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: 'user', content: lines.join('\n') }],
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      return Response.json({ error: resData.error?.message || 'AI 서버 오류' }, { status: res.status });
    }

    // 생각(thinking) 블록이 섞여 올 수 있으니 text 블록만 이어 붙인다
    const text = (resData.content || []).map((b) => b.text || '').join('\n');
    const parsed = parseAiJson(text);
    if (!Array.isArray(parsed.dev_items)) parsed.dev_items = [];
    return Response.json({ result: parsed, truncated: july.cut || oct.cut });
  } catch (err) {
    return Response.json({ error: err.message || '알 수 없는 오류' }, { status: 500 });
  }
}
