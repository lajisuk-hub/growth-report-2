'use client';

import { useState, useEffect, useRef } from 'react';
import { calcAge, fmtDate } from './lib/age';
import { extractTextFromFile } from './lib/extract';

const STORAGE_KEY = 'growth-report-2-v1';

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const EMPTY_INFO = {
  centerName: '',
  className: '',
  childName: '',
  birth: '',
  baseDate: '',
  teacherName: '',
  period: '2026학년도 1·2학기',
  character: 'girl',
  coverPhoto: '',
};

const EMPTY_DATA = {
  julyLog: '',
  worry: '',
  childChange: '',
  parentChange: '',
  octLog: '',
  octMonth: '10월',
  strengths: '',
  teacherMsg: '',
  prep: '',
};

const EMPTY_RESULT = {
  dev_summary: '',
  dev_items: [],
  good_items: '',
  worry_before: '',
  worry_child: '',
  worry_parent: '',
  prep_intro: '',
  prep_items: '',
  age_intro: '',
  age_items: '',
  letter: '',
};

const CHARACTERS = [
  { key: 'girl', label: '여자아이' },
  { key: 'boy', label: '남자아이' },
  { key: 'baby', label: '아기' },
];

const RESULT_FIELDS = [
  { key: 'dev_summary', label: '① 발달 변화 총평', sub: '7월과 2학기를 비교한 가장 큰 변화' },
  { key: 'dev_items', label: '① 영역별 변화표', sub: '영역 / 7월 모습 / 2학기 모습', table: true },
  { key: 'good_items', label: '요즘 잘하는 것', sub: '한 줄에 한 가지씩' },
  { key: 'worry_before', label: '② 1학기 부모님이 염려·부탁하신 부분' },
  { key: 'worry_child', label: '② 아이의 변화' },
  { key: 'worry_parent', label: '② 부모님의 변화' },
  { key: 'prep_intro', label: '③ 선생님의 2학기 준비 (도입)' },
  { key: 'prep_items', label: '③ 준비·지원 항목', sub: '한 줄에 한 가지씩' },
  { key: 'age_intro', label: '④ 이 연령의 발달 특징' },
  { key: 'age_items', label: '④ 영역별 발달 정리', sub: '「영역: 설명」 한 줄씩' },
  { key: 'letter', label: '⑤ 부모님께 드리는 편지' },
];

// 사진을 작게 줄여서 저장 (용량 문제 방지)
function compressImage(file, maxDim, cb) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const r = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      cb(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 관찰일지 PDF 올리기 상자 — 글자를 뽑아 아래 칸에 채운다
function LogUpload({ month, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const pick = async (f) => {
    if (!f) return;
    setErr(''); setBusy(true);
    try {
      const txt = await extractTextFromFile(f);
      onChange(txt);
      setFileName(f.name);
    } catch (e) {
      setErr(e.message || '파일을 읽지 못했어요');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="log-upload">
      <label
        className={`drop${busy ? ' busy' : ''}${over ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
      >
        <input type="file" accept="application/pdf,.pdf,.txt" style={{ display: 'none' }} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <span className="ico">📄</span>
        <span className="t">
          {busy ? '파일에서 글자를 읽는 중...' : fileName ? `${fileName} — 읽었어요 (${value.length.toLocaleString()}자)` : `우리아이들 ${month} 관찰일지 PDF를 여기에 올려 주세요`}
        </span>
        <span className="s">{busy ? '' : '누르거나 파일을 끌어다 놓으세요 · 다른 파일을 올리면 바뀌어요'}</span>
      </label>
      {err && <div className="error-box">⚠️ {err}</div>}
      <button type="button" className="link-btn" onClick={() => setOpen(!open)}>
        {open ? '▲ 내용 접기' : (value ? `▼ 읽어 온 내용 보기 · 고치기 (${value.length.toLocaleString()}자)` : '▼ PDF가 없으면 내용을 직접 붙여 넣기')}
      </button>
      {open && (
        <textarea className="log" value={value} onChange={(e) => onChange(e.target.value)} placeholder={`${month} 관찰일지 내용을 여기에 붙여 넣어 주세요`} />
      )}
    </div>
  );
}

// 이름 뒤 조사: 받침이 있으면 '이가', 없으면 '가'
function nameGa(name) {
  const ch = (name || '').trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return `${name}가`;
  return (code - 0xac00) % 28 === 0 ? `${name}가` : `${name}이가`;
}

const lines = (s) => (s || '').split('\n').map((x) => x.replace(/^[-•·\s]+/, '').trim()).filter(Boolean);

export default function Home() {
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState(EMPTY_INFO);
  const [data, setData] = useState(EMPTY_DATA);
  const [photos, setPhotos] = useState([]); // {src, caption} 최대 4장
  const [result, setResult] = useState(EMPTY_RESULT);
  const [hasResult, setHasResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loaded = useRef(false);

  // 저장된 내용 불러오기
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.info) setInfo({ ...EMPTY_INFO, ...d.info });
        if (d.data) setData({ ...EMPTY_DATA, ...d.data });
        if (d.photos) setPhotos(d.photos);
        if (d.result) setResult({ ...EMPTY_RESULT, ...d.result, dev_items: Array.isArray(d.result.dev_items) ? d.result.dev_items : [] });
        if (d.hasResult) setHasResult(true);
      }
    } catch (e) { /* 무시 */ }
    setInfo((p) => (p.baseDate ? p : { ...p, baseDate: todayStr() }));
    loaded.current = true;
  }, []);

  // 입력할 때마다 자동 저장
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      const save = { info, data, photos, result, hasResult };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
      } catch (e) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...save, photos: [], info: { ...info, coverPhoto: '' } }));
        } catch (e2) { /* 무시 */ }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [info, data, photos, result, hasResult]);

  const setI = (k, v) => setInfo((p) => ({ ...p, [k]: v }));
  const setD = (k, v) => setData((p) => ({ ...p, [k]: v }));
  const setR = (k, v) => setResult((p) => ({ ...p, [k]: v }));

  const age = calcAge(info.birth, info.baseDate);

  const addPhoto = (file) => {
    if (!file || photos.length >= 4) return;
    compressImage(file, 1200, (src) => setPhotos((p) => (p.length >= 4 ? p : [...p, { src, caption: '' }])));
  };

  const runAi = async () => {
    setError('');
    setNotice('');
    if (!info.childName.trim()) { setError('1단계에서 아이 이름을 먼저 입력해 주세요.'); setStep(1); return; }
    if (!data.julyLog.trim() && !data.octLog.trim()) { setError('7월 또는 9·10월 관찰일지 PDF를 올려 주세요.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          info: { ...info, ageText: age.text, birthText: fmtDate(info.birth) },
          data,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'AI 요청에 실패했습니다');
      setResult({ ...EMPTY_RESULT, ...out.result, dev_items: Array.isArray(out.result.dev_items) ? out.result.dev_items : [] });
      setHasResult(true);
      if (out.truncated) setNotice('관찰일지가 아주 길어서 앞부분(4만 자)만 분석에 썼어요.');
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const stepBtn = (n, label) => (
    <button key={n} className={step === n ? 'active' : step > n ? 'done' : ''} onClick={() => setStep(n)}>
      {label}
    </button>
  );

  const updItem = (i, k, v) => setResult((p) => ({ ...p, dev_items: p.dev_items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));

  return (
    <>
      <div className="app-ui">
        <div className="app-header">
          <img className="app-mascot" src="/characters/family.png" alt="우리아이들 캐릭터" />
          <h1>우리아이들 1·2학기 성장보고서</h1>
          <p>7월과 2학기(9·10월) 관찰일지 PDF를 올리면, AI가 아이의 발달 변화를 정리해 학부모님께 드릴 4쪽 보고서를 만들어 드려요</p>
        </div>

        <div className="steps no-print">
          {stepBtn(1, '1. 기본 정보')}
          {stepBtn(2, '2. 1학기(7월) 자료')}
          {stepBtn(3, '3. 2학기(9·10월) 자료')}
          {stepBtn(4, '4. 글 확인')}
          {stepBtn(5, '5. 미리보기 · 저장')}
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}
        {notice && <div className="notice">ℹ️ {notice}</div>}

        {step === 1 && (
          <div className="card">
            <h2>기본 정보</h2>
            <p className="hint">보고서 표지와 본문에 들어갈 내용이에요. 생년월일을 넣으면 개월수는 자동으로 계산돼요.</p>
            <div className="grid2">
              <div className="field">
                <label>어린이집 이름</label>
                <input type="text" value={info.centerName} onChange={(e) => setI('centerName', e.target.value)} placeholder="예: 멘토어린이집" />
              </div>
              <div className="field">
                <label>반 이름</label>
                <input type="text" value={info.className} onChange={(e) => setI('className', e.target.value)} placeholder="예: 햇살반" />
              </div>
              <div className="field">
                <label>아이 이름</label>
                <input type="text" value={info.childName} onChange={(e) => setI('childName', e.target.value)} placeholder="예: 김하늘" />
              </div>
              <div className="field">
                <label>담임 선생님 이름</label>
                <input type="text" value={info.teacherName} onChange={(e) => setI('teacherName', e.target.value)} placeholder="예: 이보라" />
              </div>
              <div className="field">
                <label>생년월일</label>
                <input type="date" value={info.birth} onChange={(e) => setI('birth', e.target.value)} />
              </div>
              <div className="field">
                <label>연령 계산 기준일 <span className="sub">(보고서 작성일)</span></label>
                <input type="date" value={info.baseDate} onChange={(e) => setI('baseDate', e.target.value)} />
              </div>
            </div>
            {age.text ? (
              <div className="age-badge">🎂 현재 연령: <b>{age.text}</b></div>
            ) : (
              <div className="age-badge muted">생년월일을 넣으면 여기에 「만 N세 N개월」이 표시돼요</div>
            )}
            <div className="grid2">
              <div className="field">
                <label>기간 표시</label>
                <input type="text" value={info.period} onChange={(e) => setI('period', e.target.value)} placeholder="예: 2026학년도 1·2학기" />
              </div>
              <div className="field">
                <label>보고서에 넣을 캐릭터</label>
                <div className="char-pick">
                  {CHARACTERS.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      className={info.character === c.key ? 'on' : ''}
                      onClick={() => setI('character', c.key)}
                    >
                      <img src={`/characters/${c.key}.png`} alt={c.label} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="field">
              <label>표지 사진 <span className="sub">(선택 — 아이 독사진 추천)</span></label>
              {info.coverPhoto ? (
                <div className="photo-grid">
                  <div className="photo-slot">
                    <img src={info.coverPhoto} alt="표지 사진" />
                    <button className="remove" onClick={() => setI('coverPhoto', '')}>✕</button>
                  </div>
                </div>
              ) : (
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) compressImage(f, 1200, (src) => setI('coverPhoto', src));
                  e.target.value = '';
                }} />
              )}
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => setStep(2)}>다음 → 1학기 자료</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>1학기(7월) 자료</h2>
            <p className="hint">
              우리아이들에서 내려받은 7월 관찰일지 PDF를 올려 주세요. 글자를 자동으로 읽어 와요.
              아래 메모는 문장이 아니어도 돼요 — 떠오르는 대로 짧게 적어 주세요.
            </p>
            <div className="field">
              <label>① 우리아이들 7월 관찰일지를 PDF로 업로드해 주세요</label>
              <LogUpload month="7월" value={data.julyLog} onChange={(v) => setD('julyLog', v)} />
            </div>
            <div className="field">
              <label>② 1학기에 학부모님이 염려하신 부분 · 부탁하신 부분</label>
              <textarea value={data.worry} onChange={(e) => setD('worry', e.target.value)} placeholder="예: 친구를 밀거나 때릴까 걱정하셨어요. 낮잠을 꼭 재워 달라고 부탁하셨어요" />
            </div>
            <div className="field">
              <label>③ 아이는 지금 어떻게 바뀌었나요?</label>
              <textarea value={data.childChange} onChange={(e) => setD('childChange', e.target.value)} placeholder="예: 화가 나면 말로 표현해요. 친구에게 먼저 사과할 줄 알게 됐어요" />
            </div>
            <div className="field">
              <label>④ 부모님의 변화는?</label>
              <textarea value={data.parentChange} onChange={(e) => setD('parentChange', e.target.value)} placeholder="예: 매일 알림장에 답을 남겨 주세요. 집에서도 감정 이름 말하기를 함께해 주셨어요" />
            </div>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← 기본 정보</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>다음 → 2학기 자료</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="card">
              <h2>2학기(9·10월) 자료</h2>
              <p className="hint">우리아이들에서 내려받은 9월 또는 10월 관찰일지 PDF를 올리고, 지금 아이의 모습과 선생님의 마음을 짧게 적어 주세요.</p>
              <div className="field">
                <label>⑤ 우리아이들 9월 또는 10월 관찰일지를 PDF로 업로드해 주세요</label>
                <div className="month-pick">
                  <span>이 관찰일지는</span>
                  {['9월', '10월'].map((m) => (
                    <button type="button" key={m} className={data.octMonth === m ? 'on' : ''} onClick={() => setD('octMonth', m)}>{m}</button>
                  ))}
                  <span>것이에요</span>
                </div>
                <LogUpload month={data.octMonth || '10월'} value={data.octLog} onChange={(v) => setD('octLog', v)} />
              </div>
              <div className="field">
                <label>⑥ 지금 아이가 잘하는 것</label>
                <textarea value={data.strengths} onChange={(e) => setD('strengths', e.target.value)} placeholder="예: 혼자 옷을 입어요. 친구 이름을 부르며 놀이에 초대해요. 노래를 끝까지 불러요" />
              </div>
              <div className="field">
                <label>⑦ 선생님이 부모님께 전하고 싶은 말</label>
                <textarea value={data.teacherMsg} onChange={(e) => setD('teacherMsg', e.target.value)} placeholder="예: 두 학기 동안 믿고 맡겨 주셔서 감사해요. 요즘 아이가 부쩍 의젓해져서 저도 놀라요" />
              </div>
              <div className="field">
                <label>⑧ 선생님의 2학기 준비·계획 <span className="sub">(선택 — 비워두면 관찰일지에서 정리해요)</span></label>
                <textarea value={data.prep} onChange={(e) => setD('prep', e.target.value)} placeholder="예: 소근육 놀이 자료 추가, 역할놀이에서 순서 지키기 연습, 가정과 배변훈련 연계" />
              </div>
            </div>

            <div className="card">
              <h2>활동 사진 (최대 4장)</h2>
              <p className="hint">2쪽과 3쪽에 두 장씩 실려요. 사진 아래 한 줄 설명도 적을 수 있어요.</p>
              <div className="photo-grid">
                {photos.map((p, i) => (
                  <div className="photo-slot" key={i}>
                    <img src={p.src} alt={`사진 ${i + 1}`} />
                    <button className="remove" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>✕</button>
                    <input
                      type="text"
                      value={p.caption}
                      placeholder="사진 설명 (예: 가을 소풍에서)"
                      onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                    />
                  </div>
                ))}
                {photos.length < 4 && (
                  <label className="photo-slot photo-add">
                    <span className="plus">＋</span>
                    사진 추가
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) addPhoto(f);
                      e.target.value = '';
                    }} />
                  </label>
                )}
              </div>
            </div>

            <div className="card">
              <h2>AI로 보고서 글 만들기</h2>
              <p className="hint">버튼을 누르면 AI가 두 관찰일지를 비교해 발달 변화·걱정의 변화·2학기 준비·연령 발달·편지를 써요. (30초~1분)</p>
              <div className="btn-row">
                <button className="btn btn-primary btn-big" onClick={runAi} disabled={loading}>
                  {loading ? (<><span className="spinner" />관찰일지를 읽고 정리하는 중...</>) : '✨ AI로 보고서 글 만들기'}
                </button>
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={loading}>← 1학기 자료</button>
                {hasResult && <button className="btn btn-secondary" onClick={() => setStep(4)} disabled={loading}>이미 만든 글 보기 →</button>}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="card">
            <h2>만들어진 글 확인 · 수정</h2>
            <p className="hint">
              마음에 안 드는 부분은 직접 고칠 수 있어요.
              {hasResult ? '' : ' (아직 만들어진 글이 없어요 — 3단계에서 AI 버튼을 눌러 주세요)'}
            </p>
            {RESULT_FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label} {f.sub ? <span className="sub">{f.sub}</span> : null}</label>
                {f.table ? (
                  <div className="items-edit">
                    {result.dev_items.map((it, i) => (
                      <div className="items-row" key={i}>
                        <input type="text" value={it.area || ''} placeholder="영역" onChange={(e) => updItem(i, 'area', e.target.value)} />
                        <textarea value={it.before || ''} placeholder="7월 모습" onChange={(e) => updItem(i, 'before', e.target.value)} />
                        <textarea value={it.after || ''} placeholder={`${data.octMonth || '10월'} 모습`} onChange={(e) => updItem(i, 'after', e.target.value)} />
                        <button className="mini" onClick={() => setResult((p) => ({ ...p, dev_items: p.dev_items.filter((_, j) => j !== i) }))}>✕</button>
                      </div>
                    ))}
                    {result.dev_items.length < 5 && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setResult((p) => ({ ...p, dev_items: [...p.dev_items, { area: '', before: '', after: '' }] }))}>＋ 줄 추가</button>
                    )}
                  </div>
                ) : (
                  <textarea value={result[f.key]} onChange={(e) => setR(f.key, e.target.value)} placeholder="(비워두면 보고서에서 빠져요)" />
                )}
              </div>
            ))}
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setStep(3)}>← 자료 다시 쓰기</button>
              <button className="btn btn-primary" onClick={() => setStep(5)}>미리보기 → </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="card no-print">
            <h2>미리보기 · PDF 저장</h2>
            <p className="hint">
              아래에 실제 인쇄될 4쪽이 보여요. 버튼을 누른 뒤 인쇄 화면에서
              <b> 대상(프린터)을 &lsquo;PDF로 저장&rsquo;</b>으로 고르면 PDF 파일로 저장돼요.
              종이로 인쇄하면 A4 앞뒤 2장이에요. 글이 쪽을 넘치면 4단계에서 조금 줄여 주세요.
            </p>
            <div className="btn-row">
              <button className="btn btn-primary btn-big" onClick={() => window.print()}>🖨️ 인쇄 / PDF로 저장</button>
            </div>
          </div>
        )}
      </div>

      {step === 5 && (
        <div className="preview-scroll">
          <div className="preview-wrap print-area">
            <ReportSheets info={info} result={result} photos={photos} age={age} data={data} />
          </div>
        </div>
      )}
    </>
  );
}

// ───────── 보고서 4쪽 ─────────

function PhotoBand({ items, small }) {
  const list = items.filter(Boolean);
  if (!list.length) return null;
  return (
    <div className={`photo-band${small ? ' small' : ''}`}>
      {list.map((p, i) => (
        <div className="report-photo" key={i}>
          <div className="ph-frame"><img src={p.src} alt="" /></div>
          {p.caption ? <div className="cap">✿ {p.caption}</div> : null}
        </div>
      ))}
    </div>
  );
}

function PageFoot({ info, name, page }) {
  return (
    <div className="page-foot">
      <span>{info.centerName || ''}</span>
      <span>{name}의 성장 기록 · 우리아이들</span>
      <span>{page} / 04</span>
    </div>
  );
}

function SecHead({ num, title, chip, chipClass, char }) {
  return (
    <div className="sec-head">
      <span className="sec-num">{num}</span>
      <span className="sec-title">{title}</span>
      {chip ? <span className={`sec-chip ${chipClass || 'chip-gold'}`}>{chip}</span> : null}
      {char ? <img className="sec-char" src={`/characters/${char}.png`} alt="" /> : null}
    </div>
  );
}

function ReportSheets({ info, result, photos, age, data }) {
  const name = info.childName || '○○';
  const ch = info.character || 'girl';
  const band = (
    <div className="rep-band">
      <span>GROWTH &amp; DEVELOPMENT REPORT · 우리아이들</span>
      <span>{info.period || '1·2학기'}</span>
    </div>
  );
  const m2 = data?.octMonth || '10월';
  const good = lines(result.good_items);
  const prep = lines(result.prep_items);
  const ageItems = lines(result.age_items).map((l) => {
    const m = l.match(/^([^:：]{1,12})[:：]\s*(.+)$/);
    return m ? { k: m[1].trim(), v: m[2].trim() } : { k: '', v: l };
  });
  const items = (result.dev_items || []).filter((it) => (it.area || it.before || it.after));

  return (
    <>
      {/* 1쪽 — 표지 */}
      <div className="sheet">
        <div className="sheet-inner cover">
          <div className="cover-top">{info.centerName || '어린이집'}</div>
          <img className="cover-logo" src="/characters/logo-group.png" alt="우리아이들" />
          <h1>1·2학기 성장 보고서</h1>
          <div className="cover-period">{info.period || '1·2학기'}</div>
          <div className="cover-photo-row">
            <div className="cover-photo-mat">
              <div className="inner">
                {info.coverPhoto ? <img src={info.coverPhoto} alt="" /> : <img className="ph-char" src={`/characters/${ch}.png`} alt="" />}
              </div>
              {info.coverPhoto ? <img className="cover-char" src={`/characters/${ch}.png`} alt="" /> : null}
            </div>
          </div>
          <div className="child-name">{name}</div>
          <div className="cover-info-table">
            <div className="row"><span className="k">소속 반</span><span className="v">{info.className || ''}</span></div>
            {info.birth ? (
              <div className="row"><span className="k">생년월일</span><span className="v">{fmtDate(info.birth)}</span></div>
            ) : null}
            {age.text ? (
              <div className="row"><span className="k">현재 연령</span><span className="v">{age.text}</span></div>
            ) : null}
            <div className="row"><span className="k">담임 교사</span><span className="v">{info.teacherName ? `${info.teacherName} 선생님` : ''}</span></div>
            <div className="row"><span className="k">기록 기간</span><span className="v">{info.period || ''}</span></div>
          </div>
          <div className="cover-quote">7월의 {name}, {m2}의 {name} — 두 계절을 지나며 자라난 이야기</div>
        </div>
      </div>

      {/* 2쪽 — 발달 변화 */}
      <div className="sheet">
        <div className="sheet-inner">
          {band}
          <div className="page-head">
            <div>
              <h3>{name}의 발달 변화 이야기</h3>
              <div className="head-sub">7월 관찰일지와 {m2} 관찰일지를 비교해 정리했습니다.</div>
            </div>
            <img className="head-char" src={`/characters/${ch}.png`} alt="" />
          </div>
          <div className="area-list">
            {result.dev_summary?.trim() ? (
              <div className="section">
                <SecHead num="01" title="한눈에 보는 성장 변화" chip="발달 변화" chipClass="chip-sun" />
                <p>{result.dev_summary}</p>
              </div>
            ) : null}
            {items.length ? (
              <div className="section">
                <table className="dev-table">
                  <thead>
                    <tr><th className="c-area">영역</th><th>🌱 7월의 모습</th><th>🌳 {m2}의 모습</th></tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i}>
                        <td className="c-area">{it.area}</td>
                        <td>{it.before}</td>
                        <td>{it.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {good.length ? (
              <div className="section good-box">
                <div className="g-title">⭐ 요즘 {nameGa(name)} 잘하는 것</div>
                <ul>{good.map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
            ) : null}
          </div>
          <PhotoBand items={[photos[0], photos[1]]} />
          <PageFoot info={info} name={name} page="02" />
        </div>
      </div>

      {/* 3쪽 — 부모님의 걱정 변화 · 2학기 준비 */}
      <div className="sheet">
        <div className="sheet-inner">
          {band}
          <div className="page-head">
            <div>
              <h3>부모님과 함께 자란 시간</h3>
              <div className="head-sub">1학기의 염려가 어떻게 달라졌는지, 그리고 2학기 선생님의 준비를 담았습니다.</div>
            </div>
            <img className="head-char" src="/characters/baby.png" alt="" />
          </div>
          <div className="area-list">
            {(result.worry_before || result.worry_child || result.worry_parent) ? (
              <div className="section">
                <SecHead num="02" title="부모님의 걱정, 이렇게 달라졌어요" chip="가정 연계" chipClass="chip-clay" />
                <div className="worry-grid">
                  {result.worry_before?.trim() ? (
                    <div className="w-box w-before"><div className="w-t">1학기에 염려·부탁하신 부분</div><p>{result.worry_before}</p></div>
                  ) : null}
                  {result.worry_child?.trim() ? (
                    <div className="w-box w-child"><div className="w-t">지금 {name}의 변화</div><p>{result.worry_child}</p></div>
                  ) : null}
                  {result.worry_parent?.trim() ? (
                    <div className="w-box w-parent"><div className="w-t">부모님의 변화</div><p>{result.worry_parent}</p></div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {(result.prep_intro || prep.length) ? (
              <div className="section prep-box">
                <SecHead num="03" title="선생님의 2학기 준비" chip="교사 지원 계획" chipClass="chip-sage" />
                {result.prep_intro?.trim() ? <p className="intro">{result.prep_intro}</p> : null}
                {prep.length ? <ul className="check">{prep.map((p, i) => <li key={i}>{p}</li>)}</ul> : null}
              </div>
            ) : null}
          </div>
          <PhotoBand items={[photos[2], photos[3]]} small />
          <PageFoot info={info} name={name} page="03" />
        </div>
      </div>

      {/* 4쪽 — 이 연령의 발달 · 편지 */}
      <div className="sheet">
        <div className="sheet-inner">
          {band}
          <div className="page-head">
            <div>
              <h3>선생님의 마음</h3>
              <div className="head-sub">이 시기에 필요한 발달과, 부모님께 드리는 편지입니다.</div>
            </div>
            <img className="head-char" src="/characters/book.png" alt="" />
          </div>
          <div className="page4-body">
            {(result.age_intro || ageItems.length) ? (
              <div className="age-box">
                <div className="a-title">
                  <span className="sec-num">04</span> {age.text ? `${age.text} 시기에 필요한 발달` : '이 연령에 필요한 발달'}
                </div>
                {result.age_intro?.trim() ? <p className="intro">{result.age_intro}</p> : null}
                {ageItems.length ? (
                  <div className="age-items">
                    {ageItems.map((a, i) => (
                      <div className="age-item" key={i}>
                        {a.k ? <span className="ak">{a.k}</span> : null}
                        <span className="av">{a.v}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {result.letter?.trim() ? (
              <div className="letter-box">
                <img className="letter-char" src={`/characters/${ch}.png`} alt="" />
                <div className="letter-title">{name} 부모님께 드리는 편지</div>
                <p>{result.letter}</p>
                <div className="sign">{name}의 담임 {info.teacherName || ''} 드림</div>
              </div>
            ) : null}
          </div>
          <div className="page4-deco"><img src="/characters/family.png" alt="" /><span>우리아이들과 함께한 두 계절, 고맙습니다</span></div>
          <PageFoot info={info} name={name} page="04" />
        </div>
      </div>
    </>
  );
}
