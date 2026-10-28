// 사진 속 얼굴 위치 찾기 — 사진이 네모 칸에 잘려 들어갈 때 얼굴이 가운데 오게 한다
// 결과(focus)는 사진 안의 비율 {x, y} (0~1). 얼굴을 못 찾으면 위쪽 가운데로 둔다.

export const DEFAULT_FOCUS = { x: 0.5, y: 0.35 };

let apiPromise = null;
function loadApi() {
  if (!apiPromise) {
    apiPromise = import('@vladmandic/face-api').then(async (faceapi) => {
      await faceapi.tf.ready();
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/face-models');
      return faceapi;
    }).catch((e) => { apiPromise = null; throw e; });
  }
  return apiPromise;
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function detectFocus(src) {
  try {
    const faceapi = await loadApi();
    const img = await loadImg(src);
    const W = img.naturalWidth, H = img.naturalHeight;
    const found = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }));
    if (!found.length) return { ...DEFAULT_FOCUS, auto: 'none' };
    // 가장 큰 얼굴의 절반 이상 크기인 얼굴만 (멀리 지나가는 사람 제외)
    const maxA = Math.max(...found.map((f) => f.box.width * f.box.height));
    const faces = found.filter((f) => f.box.width * f.box.height >= maxA * 0.25);
    const x1 = Math.min(...faces.map((f) => f.box.x));
    const x2 = Math.max(...faces.map((f) => f.box.x + f.box.width));
    const y1 = Math.min(...faces.map((f) => f.box.y));
    const y2 = Math.max(...faces.map((f) => f.box.y + f.box.height));
    return { x: (x1 + x2) / 2 / W, y: (y1 + y2) / 2 / H, auto: 'face' };
  } catch (e) {
    return { ...DEFAULT_FOCUS, auto: 'error' };
  }
}

// 칸 크기와 사진 크기를 보고, focus 지점이 칸 한가운데 오도록 object-position(%)을 계산
export function focusPosition(focus, nw, nh, w, h) {
  const f = focus || DEFAULT_FOCUS;
  if (!nw || !nh || !w || !h) return `${f.x * 100}% ${f.y * 100}%`;
  const s = Math.max(w / nw, h / nh);
  const axis = (fv, natural, box) => {
    const extra = natural * s - box;
    if (extra < 1) return 50;
    return Math.min(100, Math.max(0, ((fv * natural * s - box / 2) / extra) * 100));
  };
  return `${axis(f.x, nw, w)}% ${axis(f.y, nh, h)}%`;
}

// 칸 안에서 누른 자리를 사진 안의 비율로 바꾼다 (손으로 얼굴 위치 고치기)
export function clickToFocus(e, imgEl) {
  const r = imgEl.getBoundingClientRect();
  const nw = imgEl.naturalWidth, nh = imgEl.naturalHeight;
  const s = Math.max(r.width / nw, r.height / nh);
  const [px, py] = getComputedStyle(imgEl).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
  const ox = (r.width - nw * s) * px;
  const oy = (r.height - nh * s) * py;
  const x = (e.clientX - r.left - ox) / (nw * s);
  const y = (e.clientY - r.top - oy) / (nh * s);
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)), auto: 'hand' };
}
