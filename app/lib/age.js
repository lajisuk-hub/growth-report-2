// 생년월일과 기준일로 "만 N세 M개월(총 K개월)"을 계산한다.
// 날짜 형식은 YYYY-MM-DD (달력 입력칸 값). 잘못된 값이면 빈 문자열.
export function calcAge(birth, base) {
  if (!birth) return { text: '', months: 0, years: 0, rem: 0 };
  const b = new Date(birth);
  const d = base ? new Date(base) : new Date();
  if (isNaN(b) || isNaN(d) || d < b) return { text: '', months: 0, years: 0, rem: 0 };
  let months = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
  if (d.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const text = years > 0 ? `만 ${years}세 ${rem}개월 (${months}개월)` : `${months}개월`;
  return { text, months, years, rem };
}

// 2026-09-28 → "2026. 9. 28."
export function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
