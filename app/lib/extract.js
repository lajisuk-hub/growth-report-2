// 올린 관찰일지 파일에서 글자만 뽑아낸다. (PDF · txt)
// yeollin-docs의 검증된 방식: 줄 끝(hasEOL)은 줄바꿈으로 남겨 날짜별 기록이 한 덩어리가 되지 않게 한다.

export async function extractTextFromFile(file) {
  const name = (file.name || '').toLowerCase();

  if (name.endsWith('.txt') || file.type === 'text/plain') return (await file.text()).trim();

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let txt = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const c = await (await pdf.getPage(p)).getTextContent();
      txt += c.items.map((i) => (i.str || '') + (i.hasEOL ? '\n' : ' ')).join('')
        .replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n') + '\n';
    }
    txt = txt.trim();
    if (!txt) throw new Error('이 PDF는 글자가 아니라 그림(스캔)으로 되어 있어 내용을 읽을 수 없어요. 우리아이들에서 내려받은 PDF를 올려 주세요.');
    return txt;
  }

  throw new Error('PDF 파일만 올릴 수 있어요. (또는 아래 칸에 내용을 직접 붙여 넣어 주세요)');
}
