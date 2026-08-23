// ===== 矢量 PDF 生成器（pdfkit + harfbuzzjs）=====
// 根据前端上传的「布局描述 items」绘制 A4 账单/提醒单：
//   - 文本：按 Unicode 区间分派字体（高棉 U+1780-17FF → Noto Sans Khmer，其余 → Noto Sans CJK SC），
//     用 HarfBuzz 做复杂文字 shaping（柬文辅音+元音叠加、coeng 连写），保证字形正确、可选中/搜索
//   - 线条 / 填充矩形 / 描边矩形 / LOGO 图片：直接绘制
// 坐标体系与前端 Canvas 一致：A4 595×842（72dpi 逻辑像素 = PDF pt）
const PDFDocument = require('pdfkit');
const fontkit = require('fontkit');
const fs = require('fs');
const path = require('path');

// ---- 字体（优先随代码上传的 fonts/，回退系统路径）----
const FONT_DIR = path.join(__dirname, '..', 'fonts');
const FONT_SC = fs.existsSync(path.join(FONT_DIR, 'NotoSansCJK-Regular.ttc'))
  ? path.join(FONT_DIR, 'NotoSansCJK-Regular.ttc')
  : '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
const FONT_KHMER = fs.existsSync(path.join(FONT_DIR, 'NotoSansKhmer-Regular.ttf'))
  ? path.join(FONT_DIR, 'NotoSansKhmer-Regular.ttf')
  : '/usr/share/fonts/truetype/noto/NotoSansKhmer-Regular.ttf';

// ---- HarfBuzz WASM 单例 ----
// harfbuzzjs@0.3.2 的入口 index.js 本身返回 Promise<HBInstance>：
//   它会自动读取同目录 hb.wasm → WebAssembly.instantiate → hbjs(instance)
// 因此这里直接 require 包根，拿到已就绪的实例，无需手动 locateFile
let hbPromise = null;
function getHb() {
  if (!hbPromise) {
    hbPromise = Promise.resolve(require('harfbuzzjs'));
  }
  return hbPromise;
}

// 缓存 harfbuzz font（file+faceIndex -> {blob, face, font}）
const hbCache = {};
async function getHbFont(file, faceIndex) {
  const key = file + '#' + (faceIndex || 0);
  if (hbCache[key]) return hbCache[key];
  const hb = await getHb();
  const blob = hb.createBlob(fs.readFileSync(file));
  const face = hb.createFace(blob, faceIndex || 0);
  const font = hb.createFont(face);
  hbCache[key] = { blob, face, font };
  return hbCache[key];
}

// 解析 Noto CJK ttc，找到 SC 子字体索引（fontkit 按 familyName 匹配）
function resolveScIndex() {
  try {
    const coll = fontkit.openSync(FONT_SC);
    const idx = coll.fonts.findIndex((f) => /SC/i.test(f.familyName || ''));
    return idx >= 0 ? idx : 0;
  } catch (e) {
    return 2; // NotoSansCJK-Regular.ttc 常见顺序 JP=0 KR=1 SC=2 TC=3
  }
}

// ---- 文本按脚本分段：Khmer 区间 → khmer 字体，其余 → sc 字体 ----
function splitSegments(text) {
  const segs = [];
  let cur = '';
  let curKh = false;
  for (const ch of String(text)) {
    const kh = /[\u1780-\u17FF]/.test(ch);
    if (cur && kh !== curKh) {
      segs.push({ text: cur, khmer: curKh });
      cur = '';
    }
    curKh = kh;
    cur += ch;
  }
  if (cur) segs.push({ text: cur, khmer: curKh });
  return segs;
}

// ---- 用 HarfBuzz 对一段文本做 shaping，返回 glyph 序列（字体单位）----
// harfbuzzjs@0.3.2 的 buffer.json() 返回 [{g,cl,ax,ay,dx,dy,flags}]：
//   g=glyph ID, ax=x_advance, dx=x_offset, dy=y_offset
function shapeText(hb, hbFont, text) {
  const buf = hb.createBuffer();
  try {
    buf.addText(text);
    buf.guessSegmentProperties();
    hb.shape(hbFont, buf, null);
    const result = buf.json();
    return result.map((g) => ({
      id: g.g,
      adv: g.ax,
      dx: g.dx,
      dy: g.dy
    }));
  } finally {
    buf.destroy();
  }
}

// ---- 绘制一个文本项（对齐 / 基线 / 字体切换 / shaping 测宽 / 文本算符）----
// 关键：用 pdfkit 的 doc.font(fontkitFont).text() 写入 PDF 文本算符（Tj），
// pdfkit 会自动嵌入字体子集 + ToUnicode CMap → 文字可选中/可搜索/可复制。
// 坐标系转换：前端 Canvas 原点左上、Y 向下；pdfkit 原点左下、Y 向上。
//   统一公式：pdfY = pageHeight - canvasY
function drawTextItem(doc, hb, item, fonts, H) {
  const size = item.size || 10;
  const segs = splitSegments(item.text);
  if (!segs.length) return;

  // 预 shaping，计算总宽（用于 center/right 对齐；HarfBuzz 测宽最准）
  const prepared = [];
  let totalW = 0;
  for (const seg of segs) {
    const fk = seg.khmer ? fonts.khmer : fonts.sc;
    const gs = shapeText(hb, fk.hbFont, seg.text);
    const w = gs.reduce((s, g) => s + g.adv * (size / fk.unitsPerEm), 0);
    totalW += w;
    prepared.push({ seg, gs, fk, w });
  }

  let penX = item.x;
  const align = item.align || 'left';
  if (align === 'center') penX -= totalW / 2;
  else if (align === 'right') penX -= totalW;

  // 基线换算（Canvas baseline y → PDF y = H - baselineCanvasY）
  // fontkit ascent/descent 为字体单位；descent 为负
  const fk0 = prepared[0].fk;
  const scale0 = size / fk0.unitsPerEm;
  const ascent = fk0.ascent * scale0;
  const descent = fk0.descent * scale0;
  let baselineCanvasY = item.y;
  const bl = item.baseline || 'top';
  if (bl === 'middle') baselineCanvasY += (ascent - descent) / 2;
  else if (bl === 'alphabetic') baselineCanvasY += 0;
  else baselineCanvasY += ascent; // top / 默认
  const pdfY = H - baselineCanvasY;

  doc.fontSize(size).fillColor(item.color || '#333333');

  // 逐段切换字体并用文本算符绘制（pdfkit + fontkit 负责字形布局与嵌入）
  for (const { seg, fk, w } of prepared) {
    doc.font(fk.src, fk.family);
    // lineBreak:false 防止自动换行；width 足够大避免 pdfkit 折行；
    // x,y 为基线起点（pdfkit Y 向上体系）
    doc.text(seg.text, penX, pdfY, { lineBreak: false, width: 9999 });
    penX += w;
  }
}

function drawLineItem(doc, item, H) {
  doc.moveTo(item.x1, H - item.y1)
    .lineTo(item.x2, H - item.y2)
    .lineWidth(item.width || 0.5)
    .strokeColor(item.color || '#333333')
    .stroke();
}

function drawRectItem(doc, item, H) {
  // 矩形左下角 PDF y = H - (canvasY + h)
  const y = H - item.y - item.h;
  if (item.fill) {
    doc.rect(item.x, y, item.w, item.h).fill(item.fill);
  }
  if (item.stroke) {
    doc.rect(item.x, y, item.w, item.h)
      .lineWidth(item.width || 0.5)
      .strokeColor(item.stroke)
      .stroke();
  }
}

function drawImageItem(doc, item, H) {
  if (!item.base64) return;
  try {
    doc.image(Buffer.from(item.base64, 'base64'), item.x, H - item.y - item.h, {
      width: item.w || 123,
      height: item.h || 50
    });
  } catch (e) {
    // LOGO 解码失败忽略
  }
}

// ---- 主入口：根据 items 生成矢量 PDF，返回 Buffer ----
async function buildVectorPdf(items, width, height) {
  const W = width || 595;
  const H = height || 842;
  const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true });

  const hb = await getHb();
  const scIndex = resolveScIndex();
  const scHb = await getHbFont(FONT_SC, scIndex);
  const khmHb = await getHbFont(FONT_KHMER, 0);

  // metrics 探测自 NotoSansCJK-Regular.ttc(SC:upm1000/asc1160/desc-288)
  // 与 NotoSansKhmer-Regular.ttf(upm1000/asc1069/desc-293)
  // 字体载入：pdfkit font(src, family) → PDFFontFactory.open → fontkit.create(buf, family)
  //   注意 fontkit@2 的第二参数是 postscriptName（非 familyName）：
  //   - TTC 选 SC 子字体须传 'NotoSansCJKsc-Regular'（传 familyName 会返回 null）
  //   - 单 TTF（Khmer）传 null 即可（传非 null 会触发 variation 报错）
  const fonts = {
    sc: { src: FONT_SC, family: 'NotoSansCJKsc-Regular', hbFont: scHb.font, unitsPerEm: 1000, ascent: 1160, descent: -288 },
    khmer: { src: FONT_KHMER, family: null, hbFont: khmHb.font, unitsPerEm: 1000, ascent: 1069, descent: -293 }
  };

  // 白底
  doc.rect(0, 0, W, H).fill('#ffffff');

  // 按前端 Canvas 的绘制顺序逐项绘制（保证图层一致）
  const list = Array.isArray(items) ? items : [];
  for (const item of list) {
    try {
      if (item.type === 'text') drawTextItem(doc, hb, item, fonts, H);
      else if (item.type === 'line') drawLineItem(doc, item, H);
      else if (item.type === 'rect') drawRectItem(doc, item, H);
      else if (item.type === 'image') drawImageItem(doc, item, H);
    } catch (e) {
      // 单项失败不中断整页
    }
  }

  // 收集输出
  return await new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

module.exports = { buildVectorPdf, FONT_SC, FONT_KHMER };
