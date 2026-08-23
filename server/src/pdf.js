/**
 * pdf.js - 零依赖单页图片 PDF 生成器（仅用 Node 内置 Buffer）
 *
 * 用途：把小程序端 Canvas 导出的 JPEG 图片封装为 A4 单页 PDF，供 wx.openDocument 直接预览/打印。
 * 为什么是"图片封装"而非服务端矢量排版：
 *  - 保持零依赖（无需 pdfkit/puppeteer/字体文件），海外轻量部署不变
 *  - 中/英/柬三语文字由微信端 Canvas 按系统字体渲染，服务端无需处理高棉文 shaping/嵌入字体
 *  - JPEG 以 DCTDecode 直接嵌入，无需编解码转换
 */
const JPEG_SOI = Buffer.from([0xff, 0xd8]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);

function isJpeg(buf) {
  return buf && buf.length > 4 &&
    buf[0] === JPEG_SOI[0] && buf[1] === JPEG_SOI[1] &&
    buf[buf.length - 2] === JPEG_EOI[0] && buf[buf.length - 1] === JPEG_EOI[1];
}

/**
 * 生成单页图片 PDF
 * @param {Buffer} jpeg JPEG 图片字节
 * @param {Object} opts
 *   pageWidth/pageHeight: PDF 页面尺寸（pt，默认 A4 595x842）
 *   width/height: 图片逻辑尺寸（用于映射铺满整页，默认取页面尺寸）
 * @returns {Buffer} PDF 字节
 */
function buildImagePdf(jpeg, opts = {}) {
  if (!isJpeg(jpeg)) throw new Error('仅支持 JPEG 图片');
  const pageW = opts.pageWidth || 595;
  const pageH = opts.pageHeight || 842;
  const imgW = opts.width || pageW;
  const imgH = opts.height || pageH;

  // 内容流：把图片坐标系缩放到整页
  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBuf = Buffer.from(content, 'utf8');

  const chunks = [];
  // PDF 文件头（%PDF-x.y + 二进制注释行，需在对象偏移计算之前）
  chunks.push(Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1'));
  const offsets = []; // offsets[n] = 对象 n 的字节偏移
  const obj = (n, payload) => {
    offsets[n] = Buffer.byteLength(Buffer.concat(chunks));
    chunks.push(Buffer.from(`${n} 0 obj\n`, 'utf8'));
    chunks.push(Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8'));
    chunks.push(Buffer.from('\nendobj\n', 'utf8'));
  };

  // 1: Catalog
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  // 2: Pages
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  // 3: Page
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  // 4: 图片 XObject（JPEG 直接嵌入）
  obj(4, Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, 'utf8'),
    jpeg,
    Buffer.from('\nendstream', 'utf8')
  ]));
  // 5: 内容流
  obj(5, Buffer.concat([
    Buffer.from(`<< /Length ${contentBuf.length} >>\nstream\n`, 'utf8'),
    contentBuf,
    Buffer.from('endstream', 'utf8')
  ]));

  const body = Buffer.concat(chunks);
  const xrefOffset = body.length;

  // xref 表（对象编号从 1 开始）
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.concat([body, Buffer.from(xref, 'utf8'), Buffer.from(trailer, 'utf8')]);
}

module.exports = { buildImagePdf, isJpeg };
