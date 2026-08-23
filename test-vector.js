// 矢量 PDF 引擎本地测试：中/英/柬三语文本 + 线条 + 矩形 + LOGO
const fs = require('fs');
const path = require('path');
const { buildVectorPdf, FONT_SC, FONT_KHMER } = require('./server/src/pdf-vector');

function check(cond, name) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) process.exitCode = 1;
}

(async () => {
  console.log('fonts:', path.basename(FONT_SC), fs.existsSync(FONT_SC) ? 'OK' : 'MISSING', '|', path.basename(FONT_KHMER), fs.existsSync(FONT_KHMER) ? 'OK' : 'MISSING');

  const items = [
    // 页眉
    { type: 'text', text: '2026-08-20 11:30:00', x: 40, y: 35, size: 9, color: '#999999' },
    { type: 'text', text: '中鼎物业工作台', x: 297.5, y: 35, size: 9, color: '#999999', align: 'center' },
    // 标题
    { type: 'text', text: '中鼎物业管理费账单', x: 181, y: 84, size: 22, color: '#1a1a1a' },
    { type: 'text', text: 'ZHONGDING PROPERTY MANAGEMENT FEE NOTICE', x: 181, y: 114, size: 10, color: '#999999' },
    // 分隔线
    { type: 'line', x1: 40, y1: 150, x2: 555, y2: 150, color: '#333333', width: 0.8 },
    // 信息栏
    { type: 'text', text: '单号: ZD20260820-001', x: 40, y: 172, size: 10 },
    { type: 'text', text: '房号: A101', x: 40, y: 194, size: 10 },
    { type: 'text', text: '日期: 2026-08-20', x: 365, y: 172, size: 10 },
    { type: 'text', text: '月份: 2026-08', x: 365, y: 194, size: 10 },
    // 表头
    { type: 'rect', x: 40, y: 230, w: 515, h: 28, fill: '#f5f5f5' },
    { type: 'rect', x: 40, y: 230, w: 515, h: 28, stroke: '#333333', width: 0.5 },
    { type: 'text', text: '项目', x: 67.5, y: 244, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '上期', x: 117.5, y: 244, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '本期', x: 217.5, y: 244, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '用量', x: 317.5, y: 244, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '单价', x: 412.5, y: 244, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '金额', x: 537, y: 244, size: 10, align: 'right', baseline: 'middle' },
    // 数据行（含柬文测试：水费/电费柬文标签）
    { type: 'text', text: 'ប្រាក់ថ្លៃទឹក (水费)', x: 67.5, y: 272, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '12.5 t', x: 117.5, y: 272, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '18.0 t', x: 217.5, y: 272, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '5.5 t', x: 317.5, y: 272, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '$0.70/t', x: 412.5, y: 272, size: 10, align: 'center', baseline: 'middle' },
    { type: 'text', text: '$3.85', x: 537, y: 272, size: 10, align: 'right', baseline: 'middle' },
    // 合计
    { type: 'rect', x: 40, y: 300, w: 515, h: 28, fill: '#fff8f0' },
    { type: 'rect', x: 40, y: 300, w: 515, h: 28, stroke: '#333333', width: 0.5 },
    { type: 'text', text: '应付合计', x: 50, y: 314, size: 10.5, baseline: 'middle' },
    { type: 'text', text: '$105.60', x: 537, y: 314, size: 12, color: '#d4380d', align: 'right', baseline: 'middle' },
    // 底部
    { type: 'text', text: '中鼎国际酒店管理有限公司', x: 297.5, y: 380, size: 11, align: 'center' },
    { type: 'text', text: '请妥善保管此单据，感谢您的配合', x: 297.5, y: 402, size: 9, color: '#999999', align: 'center' },
    // LOGO 占位（无 base64 应忽略）
    { type: 'image', x: 40, y: 75, w: 123, h: 50 }
  ];

  const t0 = Date.now();
  const pdf = await buildVectorPdf(items, 595, 842);
  const ms = Date.now() - t0;
  console.log('build time:', ms + 'ms, size:', pdf.length, 'bytes');

  check(pdf.slice(0, 7).toString('latin1') === '%PDF-1.', 'PDF 头 %PDF-1.x');
  check(pdf.slice(-32).toString('latin1').includes('%%EOF'), 'PDF 尾 %%EOF');
  check(pdf.toString('latin1').includes('/MediaBox [0 0 595 842]'), 'A4 MediaBox');
  // 字体嵌入（Type0/ToUnicode 存在 → 文字可选中）
  const latin = pdf.toString('latin1');
  check(/\/ToUnicode \d+ 0 R/.test(latin), 'ToUnicode CMap（文字可选中）');
  check(/\/Type0/.test(latin), 'Type0 复合字体（CJK/Khmer）');
  check(/Khmer/.test(latin) || /NotoSansKhmer/.test(latin), 'Khmer 字体嵌入');
  check(/CJK/.test(latin) || /NotoSansCJK/.test(latin), 'CJK 字体嵌入');
  // 文本内容抽查（PDF 文本流含字形，检查字体子集前缀）
  const fontCount = (latin.match(/\/BaseFont/g) || []).length;
  check(fontCount >= 2, '至少 2 个 BaseFont（' + fontCount + '）');

  fs.writeFileSync(path.join(require('os').tmpdir(), 'test-vector.pdf'), pdf);
  console.log('written: test-vector.pdf (tmpdir)');
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
