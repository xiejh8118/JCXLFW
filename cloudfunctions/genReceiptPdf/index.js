// 云函数：genReceiptPdf - 生成中鼎物业水电房租账单 PDF
// 入参：{ record: {...}, rates: {water, elec}, company: {...} }
// 出参：{ ok: true, fileID, downloadUrl } 或 { ok: false, error }
const cloud = require('wx-server-sdk');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 中文字体 + LOGO（随云函数打包）
const FONT_PATH = path.join(__dirname, 'fonts', 'NotoSansSC-Regular.ttf');
const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png');

function pad2(n) { return String(n).padStart(2, '0'); }
function nowZh() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
         pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

// 金额格式化
function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toFixed(2);
}

// 编号：ZD + YYYYMMDD + 6位随机码
function genBillNo() {
  const d = new Date();
  const datePart = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return 'ZD' + datePart + '-' + rand;
}

// 日期：YYYY-MM-DD
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

exports.main = async (event) => {
  const { record = {}, rates = {}, company = {} } = event;

  if (!record.room) {
    return { ok: false, error: '缺少房号' };
  }

  // 计算费用
  const prevWater = Number(record.prevWater) || 0;
  const currWater = Number(record.currWater) || 0;
  const prevElec = Number(record.prevElec) || 0;
  const currElec = Number(record.currElec) || 0;
  const waterUsage = Math.max(0, currWater - prevWater);
  const elecUsage = Math.max(0, currElec - prevElec);
  const waterRate = Number(rates.water) || 0.7;
  const elecRate = Number(rates.elec) || 0.205;
  const waterFee = waterUsage * waterRate;
  const elecFee = elecUsage * elecRate;
  const rent = Number(record.rent) || 0;
  const total = waterFee + elecFee + rent;

  // 公司信息（可配置，默认中鼎）
  const companyName = company.name || '中鼎物业管理有限公司';
  const companyAddr = company.addr || '柬埔寨 · 金边';
  const companyTel = company.tel || '';
  const operator = record._operator || company.operator || '管理员';
  const billNo = record.billNo || genBillNo();

  // ===== 生成 PDF =====
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: companyName + '收费通知单',
      Author: '中鼎物业工作台',
      Subject: '水电房租收费通知单'
    }
  });

  // 注册中文字体
  if (fs.existsSync(FONT_PATH)) {
    doc.registerFont('CN', FONT_PATH);
  } else {
    return { ok: false, error: '云函数缺少中文字体文件 fonts/NotoSansSC-Regular.ttf' };
  }

  const F = 'CN'; // 字体别名

  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const PAGE_W = 595;
  const MARGIN_L = 40;
  const MARGIN_R = 555;
  const CONTENT_W = MARGIN_R - MARGIN_L;

  // ---- 页眉：时间（左） + 工作台名（中） ----
  doc.font(F).fontSize(9).fillColor('#999');
  doc.text(nowZh(), MARGIN_L, 35, { align: 'left' });
  doc.text('中鼎物业工作台', MARGIN_L, 35, { width: CONTENT_W, align: 'center' });

  // ---- LOGO + 标题区 ----
  let titleY = 80;
  const hasLogo = fs.existsSync(LOGO_PATH);
  if (hasLogo) {
    try {
      doc.image(LOGO_PATH, MARGIN_L, titleY, { width: 60 });
    } catch (e) {
      // 图片损坏时跳过
    }
  }
  const titleX = hasLogo ? MARGIN_L + 78 : MARGIN_L;

  doc.font(F).fontSize(22).fillColor('#1a1a1a').text('中鼎物业收费通知单', titleX, titleY + 4);
  doc.fontSize(10).fillColor('#999').text('ZHONGDING PROPERTY MANAGEMENT FEE NOTICE', titleX, titleY + 34);

  // ---- 分隔线 ----
  doc.moveTo(MARGIN_L, 150).lineTo(MARGIN_R, 150).stroke('#333333');

  // ---- 账单信息（左右两栏） ----
  let infoY = 170;
  const colLeftX = MARGIN_L;
  const colRightX = MARGIN_R - 180;
  doc.font(F).fontSize(10).fillColor('#333');

  // 左栏
  doc.text('编号: ' + billNo, colLeftX, infoY);
  doc.text('房号: ' + record.room, colLeftX, infoY + 20);

  // 右栏
  doc.text('开具日期: ' + todayStr(), colRightX, infoY);
  doc.text('月份: ' + (record.month || ''), colRightX, infoY + 20);

  infoY += 56;

  // ---- 用量明细表（6列） ----
  const tableTop = infoY;
  const rowH = 28;
  const headerH = 28;
  const cols = [
    { key: 'item', x: MARGIN_L, w: 55 },
    { key: 'prev', x: MARGIN_L + 55, w: 100 },
    { key: 'curr', x: MARGIN_L + 155, w: 100 },
    { key: 'usage', x: MARGIN_L + 255, w: 95 },
    { key: 'rate', x: MARGIN_L + 350, w: 95 },
    { key: 'amount', x: MARGIN_L + 445, w: 70 }
  ];

  // 表头背景
  doc.rect(MARGIN_L, tableTop, CONTENT_W, headerH).fill('#f5f5f5');
  doc.strokeColor('#333').lineWidth(0.5);
  doc.rect(MARGIN_L, tableTop, CONTENT_W, headerH).stroke();
  // 竖线
  cols.forEach(c => {
    doc.moveTo(c.x, tableTop).lineTo(c.x, tableTop + headerH).stroke();
  });
  doc.moveTo(MARGIN_R, tableTop).lineTo(MARGIN_R, tableTop + headerH).stroke();

  doc.font(F).fontSize(10).fillColor('#333');
  const headers = ['项目', '上次表数', '本次表数', '用量', '单价', '金额'];
  cols.forEach((c, i) => {
    doc.text(headers[i], c.x + 4, tableTop + 9, { width: c.w - 8, align: 'center' });
  });

  // 数据行
  const rows = [
    {
      name: '水费',
      prev: fmtMoney(prevWater) + ' 吨',
      curr: fmtMoney(currWater) + ' 吨',
      usage: waterUsage.toFixed(1) + ' 吨',
      rate: '$' + fmtMoney(waterRate) + '/吨',
      amount: waterFee
    },
    {
      name: '电费',
      prev: fmtMoney(prevElec) + ' 度',
      curr: fmtMoney(currElec) + ' 度',
      usage: elecUsage.toFixed(1) + ' 度',
      rate: '$' + fmtMoney(elecRate) + '/度',
      amount: elecFee
    },
    {
      name: '房租',
      prev: '-',
      curr: '-',
      usage: '-',
      rate: '-',
      amount: rent
    }
  ];

  let y = tableTop + headerH;
  rows.forEach((r, i) => {
    // 横线
    doc.moveTo(MARGIN_L, y).lineTo(MARGIN_R, y).stroke();
    // 竖线
    cols.forEach(c => {
      doc.moveTo(c.x, y).lineTo(c.x, y + rowH).stroke();
    });
    doc.moveTo(MARGIN_R, y).lineTo(MARGIN_R, y + rowH).stroke();

    doc.font(F).fontSize(10).fillColor('#1a1a1a');
    doc.text(r.name, cols[0].x + 4, y + 8, { width: cols[0].w - 8, align: 'center' });
    doc.text(r.prev, cols[1].x + 4, y + 8, { width: cols[1].w - 8, align: 'center' });
    doc.text(r.curr, cols[2].x + 4, y + 8, { width: cols[2].w - 8, align: 'center' });
    doc.text(r.usage, cols[3].x + 4, y + 8, { width: cols[3].w - 8, align: 'center' });
    doc.text(r.rate, cols[4].x + 4, y + 8, { width: cols[4].w - 8, align: 'center' });
    doc.text('$' + fmtMoney(r.amount), cols[5].x + 4, y + 8, { width: cols[5].w - 8, align: 'right' });

    y += rowH;
  });

  // 最后一行横线
  doc.moveTo(MARGIN_L, y).lineTo(MARGIN_R, y).stroke();

  // 合计行
  doc.rect(MARGIN_L, y, CONTENT_W, rowH).fill('#fff8f0');
  doc.strokeColor('#333').lineWidth(0.5);
  doc.rect(MARGIN_L, y, CONTENT_W, rowH).stroke();
  doc.font(F).fontSize(10.5).fillColor('#1a1a1a');
  doc.text('合计金额（大写）', MARGIN_L + 10, y + 8);
  doc.font(F).fontSize(12).fillColor('#d4380d').text('$' + fmtMoney(total), cols[5].x + 4, y + 7, { width: cols[5].w - 8, align: 'right' });

  y += rowH + 20;

  // ---- 缴费状态 ----
  doc.font(F).fontSize(10).fillColor('#333');
  doc.text('缴费状态: ' + (record.payStatus || '未缴'), MARGIN_L, y);
  y += 28;

  // ---- 签收区 ----
  doc.text('签收人: ____________________', MARGIN_L, y);
  doc.text('签收日期: ____________________', MARGIN_R - 180, y);
  y += 50;

  // ---- 备注 ----
  if (record.remark) {
    doc.fontSize(10).fillColor('#666');
    doc.text('备注：' + record.remark, MARGIN_L, y);
    y += 28;
  }

  // ---- 底部公司信息 ----
  doc.font(F).fontSize(11).fillColor('#1a1a1a');
  doc.text(companyName, MARGIN_L, y, { width: CONTENT_W, align: 'center' });
  y += 20;
  doc.fontSize(9).fillColor('#999');
  const footerLine = '（此通知单仅作收费凭证，请妥善保管）' +
    (companyAddr ? '  ' + companyAddr : '') +
    (companyTel ? '  电话：' + companyTel : '');
  doc.text(footerLine, MARGIN_L, y, { width: CONTENT_W, align: 'center' });
  y += 30;

  // ---- 页脚 ----
  doc.fontSize(8).fillColor('#aaa');
  doc.text('操作人: ' + operator + '  |  打印时间: ' + nowZh(), MARGIN_L, y, { width: CONTENT_W, align: 'center' });

  doc.end();
  const pdfBuffer = await done;

  // ===== 上传云存储 =====
  const cloudPath = 'receipts/' + (record.room || 'room') + '_' + (record.month || '') + '_' + Date.now() + '.pdf';
  try {
    const upRes = await cloud.uploadFile({
      cloudPath,
      fileContent: pdfBuffer
    });
    const fileID = upRes.fileID;
    const dlRes = await cloud.getTempFileURL({ fileList: [fileID] });
    const url = dlRes.fileList[0] && dlRes.fileList[0].tempFileURL;

    return {
      ok: true,
      fileID,
      downloadUrl: url,
      fileName: cloudPath.split('/').pop(),
      summary: {
        room: record.room,
        month: record.month,
        waterFee: fmtMoney(waterFee),
        elecFee: fmtMoney(elecFee),
        rent: fmtMoney(rent),
        total: fmtMoney(total)
      }
    };
  } catch (e) {
    return { ok: false, error: '上传云存储失败：' + (e.message || e) };
  }
};
