/**
 * index.js - KHMER AI 2.0 自托管后端（零依赖：仅用 Node 内置模块）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---- 轻量 .env 加载（避免外部依赖）----
(function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  });
})();

const db = require('./db');
const { codeToOpenid, hmacToken, verifyToken } = require('./auth');
const { buildImagePdf } = require('./pdf');
const { buildVectorPdf } = require('./pdf-vector');

const STATUS_FLOW = ['pending', 'matching', 'accepted', 'processing', 'completed', 'returned', 'rated'];
const STATUS_LABEL = {
  pending: { 'zh-CN': '待处理', en: 'Pending', km: 'រង់ចាំ' },
  matching: { 'zh-CN': '匹配中', en: 'Matching', km: 'កំពុងផ្គូរ' },
  accepted: { 'zh-CN': '已接单', en: 'Accepted', km: 'បានទទួល' },
  processing: { 'zh-CN': '处理中', en: 'Processing', km: 'កំពុងដំណើរការ' },
  completed: { 'zh-CN': '已完成', en: 'Completed', km: 'រួចរាល់' },
  returned: { 'zh-CN': '退回重处理', en: 'Returned', km: 'បង្វិលឡើងវិញ' },
  rated: { 'zh-CN': '已评价', en: 'Rated', km: 'បានវាយតម្លៃ' }
};

// 闭环模块标签（四模块：酒店服务 / 维修报修 / 前台咨询）
const MODULE_LABEL = {
  hotel: { 'zh-CN': '酒店服务', en: 'Hotel', km: 'សណ្ឋាគារ' },
  repair: { 'zh-CN': '维修报修', en: 'Repair', km: 'ជួសជុល' },
  frontdesk: { 'zh-CN': '前台咨询', en: 'Front Desk', km: 'ផ្ទះសណ្ឋាគារ' }
};

// 房态标签（住宿闭环：已订 / 已入住 / 已退房）
const ROOM_STATUS_LABEL = {
  reserved: { 'zh-CN': '已订', en: 'Reserved', km: 'បានកក់' },
  checked_in: { 'zh-CN': '已入住', en: 'Checked-in', km: 'បានចូលស្នាក់នៅ' },
  checked_out: { 'zh-CN': '已退房', en: 'Checked-out', km: 'បានចេញ' }
};

function resolveMatched(ids, lang) {
  if (!Array.isArray(ids) || !ids.length) return [];
  return db.listProviders().filter(p => ids.includes(p.id)).map(p => ({
    id: p.id, name: db.localizeName(p, lang), kind: p.kind, contact: p.contact, rating: p.rating
  }));
}

function decorateRoomStay(row, lang) {
  if (!row) return row;
  return {
    ...row,
    statusLabel: (ROOM_STATUS_LABEL[row.status] || {})[lang] || row.status,
    payment: row.payment || { amount: '', paid: '', method: '', paid_at: 0, received_by: '' }
  };
}

function decorate(row, lang) {
  if (!row) return row;
  const now = Date.now();
  const open = db.OPEN_STATUSES.includes(row.status);
  const deadline = row.sla_deadline || 0;
  const overdue = !!(deadline && open && now > deadline);
  const slaRemaining = deadline ? Math.max(0, deadline - now) : 0;
  // 住宿类（酒店模块）需求单自动附带关联房态，客人端可直接看到自己住宿进度
  const roomStay = db.TYPE_TO_MODULE[row.type] === 'hotel'
    ? db.getRoomStayByRequirement(row.id)
    : null;
  return {
    ...row,
    statusLabel: (STATUS_LABEL[row.status] || {})[lang] || row.status,
    moduleLabel: (MODULE_LABEL[row.module] || {})[lang] || row.module || '',
    overdue,
    slaRemaining,
    matched: resolveMatched(row.matched_ids, lang),
    statusHistory: row.status_history || [],
    roomStay: roomStay ? decorateRoomStay(roomStay, lang) : null
  };
}

// ---- HTTP 工具 ----
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 8e6) req.destroy(); }); // 8MB，容纳账单图片 Base64
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

// 将 LLM 返回的 Markdown 简单清洗为纯文本，避免小程序聊天框里出现 **、` 等符号
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1（$2）')
    .trim();
}

// ---- 双向触达：微信订阅消息（需配置 WX_APPID/WX_APPSECRET/WX_SUBSCRIBE_TEMPLATE；未配置自动跳过）----
let _wxTokenCache = { token: '', expire: 0 };
async function getWxAccessToken() {
  const appid = process.env.WX_APPID, secret = process.env.WX_APPSECRET;
  if (!appid || !secret) return null;
  if (_wxTokenCache.token && _wxTokenCache.expire > Date.now()) return _wxTokenCache.token;
  try {
    const r = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`);
    const j = await r.json();
    if (j.access_token) _wxTokenCache = { token: j.access_token, expire: Date.now() + (j.expires_in - 300) * 1000 };
    return j.access_token || null;
  } catch (e) { return null; }
}
async function sendSubscribeMessage(openid, templateId, data) {
  const token = await getWxAccessToken();
  if (!token || !openid || !templateId) return false;
  try {
    await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ touser: openid, template_id: templateId, data })
    });
    return true;
  } catch (e) { return false; }
}
const SUB_TEMPLATE_ID = process.env.WX_SUBSCRIBE_TEMPLATE || '';
// 状态变更时双向触达：系统消息 + （配置后）微信订阅消息，防止用户漏看
async function notifyStatusChange(row, lang) {
  if (!SUB_TEMPLATE_ID || !row.openid) return;
  const label = (STATUS_LABEL[row.status] || {})[lang] || row.status;
  await sendSubscribeMessage(row.openid, SUB_TEMPLATE_ID, {
    character_string1: { value: row.order_no },
    phrase2: { value: (MODULE_LABEL[row.module] || {})[lang] || row.module || '' },
    thing3: { value: label }
  }).catch(() => {});
}

// ---- 路由处理 ----
async function handle(req, res, url, body) {
  const p = url.pathname;

  // 健康检查
  if (p === '/api/health' && req.method === 'GET') {
    return send(res, 200, { code: 0, data: { service: 'KHMER AI 2.0', version: '2.1.0', status: 'ok', time: Date.now() } });
  }

  // 登录：wx.login code -> openid + token
  if (p === '/api/auth/login' && req.method === 'POST') {
    const { code } = body || {};
    if (!code) return send(res, 400, { code: 400, message: '缺少 code' });
    try {
      const openid = await codeToOpenid(code);
      const token = process.env.APPSECRET ? `${openid}.${hmacToken(openid)}` : openid;
      return send(res, 200, { code: 0, data: { openid, token } });
    } catch (e) { return send(res, 500, { code: 500, message: e.message }); }
  }

  // 物业工作台状态（公司级共享，dev 模式免鉴权；生产可加 PROPERTY_TOKEN）
  if (p === '/api/property' && req.method === 'GET') {
    return send(res, 200, { code: 0, data: db.getPropertyState() || {} });
  }
  if (p === '/api/property' && req.method === 'POST') {
    try {
      const state = db.savePropertyState(body || {});
      return send(res, 200, { code: 0, data: state });
    } catch (e) { return send(res, 500, { code: 500, message: e.message }); }
  }

  // 物业账单/提醒单 PDF：接收 Canvas 图片 Base64，零依赖封装为单页 A4 PDF，返回二进制
  if (p === '/api/property/pdf' && req.method === 'POST') {
    const { imageBase64, width, height, kind } = body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.length) {
      return send(res, 400, { code: 400, message: '缺少 imageBase64' });
    }
    try {
      const jpeg = Buffer.from(imageBase64, 'base64');
      const pdf = buildImagePdf(jpeg, {
        pageWidth: 595,
        pageHeight: 842,
        width: Number(width) || 595,
        height: Number(height) || 842
      });
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="property_${kind || 'bill'}.pdf"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Length': pdf.length
      });
      return res.end(pdf);
    } catch (e) { return send(res, 500, { code: 500, message: e.message }); }
  }

  // 物业账单/提醒单 PDF（矢量版）：接收前端布局描述 items，服务端排版生成可选中文字的 PDF
  if (p === '/api/property/pdf-v2' && req.method === 'POST') {
    const { items, width, height, kind } = body || {};
    if (!Array.isArray(items) || !items.length) {
      return send(res, 400, { code: 400, message: '缺少 items 布局描述' });
    }
    try {
      const pdf = await buildVectorPdf(items, Number(width) || 595, Number(height) || 842);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="property_${kind || 'bill'}.pdf"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Length': pdf.length
      });
      return res.end(pdf);
    } catch (e) { return send(res, 500, { code: 500, message: e.message }); }
  }

  // 供应商目录（GET 列表；POST 入驻，dev 免鉴权）
  if (p === '/api/providers' && req.method === 'GET') {
    const lang = url.searchParams.get('lang') || 'zh-CN';
    return send(res, 200, { code: 0, data: db.listProviders().map(x => db.serializeProvider(x, lang)) });
  }
  if (p === '/api/providers' && req.method === 'POST') {
    try {
      const row = db.insertProvider(body || {});
      return send(res, 200, { code: 0, data: row });
    } catch (e) { return send(res, 500, { code: 500, message: e.message }); }
  }
  // 供应商匹配（按需求 type）
  if (p === '/api/providers/match' && req.method === 'GET') {
    const type = url.searchParams.get('type') || '';
    const lang = url.searchParams.get('lang') || 'zh-CN';
    return send(res, 200, { code: 0, data: db.matchProviders(type, lang) });
  }
  // 多语言 FAQ（智能客服，规则匹配）
  if (p === '/api/faq' && req.method === 'GET') {
    const lang = url.searchParams.get('lang') || 'zh-CN';
    const suffix = lang === 'en' ? 'en' : lang === 'km' ? 'km' : 'zh';
    return send(res, 200, { code: 0, data: db.FAQS.map(f => ({ id: f.id, question: f['q_' + suffix], answer: f['a_' + suffix] })) });
  }
  if (p === '/api/faq' && req.method === 'POST') {
    const { query, lang } = body || {};
    const ans = db.matchFaq(query, lang || 'zh-CN');
    const fallback = { answer: '暂未匹配到答案，请拨打前台或提交需求单，我们会尽快联系您。' };
    return send(res, 200, { code: 0, data: ans || fallback });
  }

  // 大模型对话（后端代理 OpenAI 兼容接口；未配置 LLM_BASE_URL/LLM_KEY 时回退规则 FAQ）
  if (p === '/api/llm/chat' && req.method === 'POST') {
    const { messages, lang } = body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return send(res, 400, { code: 400, message: '缺少 messages' });
    }
    const base = process.env.LLM_BASE_URL;
    const key = process.env.LLM_KEY;
    const model = process.env.LLM_MODEL || 'gpt-3.5-turbo';
    // 未配置大模型：规则 FAQ 兜底（取最后一条用户消息匹配）
    if (!base || !key) {
      const last = (messages[messages.length - 1].content || '').toString();
      const ans = db.matchFaq(last, lang || 'zh-CN');
      return send(res, 200, { code: 0, data: { fallback: true, answer: ans ? ans.answer : 'AI 助手暂未接入，请稍后重试或提交需求单。' } });
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const resp = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: '你是"柬企海外商旅服务"智能助手，服务对象是在柬埔寨投资经营的中资企业，用中文/英文/高棉文回答住宿、物流仓储、物业、商旅后勤相关问题，简明专业。' },
            ...messages
          ],
          temperature: 0.6,
          max_tokens: 800
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!resp.ok) {
        return send(res, 200, { code: 0, data: { fallback: true, answer: 'AI 服务暂时不可用，请稍后重试。' } });
      }
      const j = await resp.json();
      const raw = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      const answer = stripMarkdown((raw || '').trim());
      return send(res, 200, { code: 0, data: { answer } });
    } catch (e) {
      return send(res, 200, { code: 0, data: { fallback: true, answer: 'AI 服务暂时不可用，请稍后重试。' } });
    }
  }

  // 需求单（需登录）
  if (p.startsWith('/api/requirement')) {
    const openid = verifyToken(getToken(req));
    if (!openid) return send(res, 401, { code: 401, message: '未登录' });
    const lang = (url.searchParams.get('lang') || 'zh-CN');

    // 列表
    if (p === '/api/requirement' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const module = url.searchParams.get('module');
      const rows = db.listRequirements({ openid, status, type, module });
      return send(res, 200, { code: 0, data: rows.map(r => decorate(r, lang)) });
    }
    // 创建
    if (p === '/api/requirement' && req.method === 'POST') {
      const { type, title, detail, contact, module, room_no, expected_time, priority } = body || {};
      if (!type || !title) return send(res, 400, { code: 400, message: '缺少 type 或 title' });
      const row = db.insertRequirement({ type, title, detail, contact, openid, module, room_no, expected_time, priority });
      notifyStatusChange(row, lang).catch(() => {});
      return send(res, 200, { code: 0, data: decorate(row, lang) });
    }
    // /api/requirement/:id/status
    let m = p.match(/^\/api\/requirement\/(\d+)\/status$/);
    if (m && req.method === 'PUT') {
      const row = db.getRequirement(m[1], openid);
      if (!row) return send(res, 404, { code: 404, message: '未找到' });
      const { status, note, matchedIds } = body || {};
      if (!STATUS_FLOW.includes(status)) return send(res, 400, { code: 400, message: '非法状态' });
      const history = [...(row.status_history || []), { status, note: note || '', at: Date.now() }];
      const patch = { status, status_history: history };
      if (matchedIds) patch.matched_ids = matchedIds;
      if (status === 'returned') patch.return_count = (row.return_count || 0) + 1;
      const updated = db.updateRequirement(m[1], openid, patch);
      notifyStatusChange(updated, lang).catch(() => {});
      return send(res, 200, { code: 0, data: decorate(updated, lang) });
    }
    // /api/requirement/:id/rate
    m = p.match(/^\/api\/requirement\/(\d+)\/rate$/);
    if (m && req.method === 'POST') {
      const row = db.getRequirement(m[1], openid);
      if (!row) return send(res, 404, { code: 404, message: '未找到' });
      const { rating, comment } = body || {};
      const history = [...(row.status_history || []), { status: 'rated', note: `评价 ${rating}星`, at: Date.now() }];
      const updated = db.updateRequirement(m[1], openid, { status: 'rated', status_history: history });
      return send(res, 200, { code: 0, data: decorate(updated, lang) });
    }
    // 详情
    m = p.match(/^\/api\/requirement\/(\d+)$/);
    if (m && req.method === 'GET') {
      const row = db.getRequirement(m[1], openid);
      if (!row) return send(res, 404, { code: 404, message: '未找到' });
      return send(res, 200, { code: 0, data: decorate(row, lang) });
    }
    return send(res, 404, { code: 404, message: '路由不存在' });
  }

  // ===== 后台管理（ADMIN_TOKEN 鉴权）=====
  if (p.startsWith('/api/admin')) {
    const at = getToken(req) || url.searchParams.get('token') || '';
    const adminOk = process.env.ADMIN_TOKEN ? at === process.env.ADMIN_TOKEN : at === 'admin-dev';
    if (!adminOk) return send(res, 401, { code: 401, message: '无权限' });
    const lang = url.searchParams.get('lang') || 'zh-CN';
    if (p === '/api/admin/requirements' && req.method === 'GET') {
      const module = url.searchParams.get('module');
      let rows = db.listAllRequirements();
      if (module) rows = rows.filter(r => r.module === module);
      return send(res, 200, { code: 0, data: rows.map(r => decorate(r, lang)) });
    }
    let m = p.match(/^\/api\/admin\/requirement\/(\d+)$/);
    if (m && req.method === 'PUT') {
      const { status, note, matchedIds, quote, assignedTo, remark } = body || {};
      const patch = {};
      if (status) {
        if (!STATUS_FLOW.includes(status)) return send(res, 400, { code: 400, message: '非法状态' });
        const prev = db.getRequirementAdmin(m[1]);
        patch.status = status;
        patch.status_history = [...(prev ? prev.status_history || [] : []), { status, note: note || '', at: Date.now() }];
        if (status === 'returned') patch.return_count = ((prev && prev.return_count) || 0) + 1;
      }
      if (matchedIds) patch.matched_ids = matchedIds;
      if (quote !== undefined) patch.quote = quote;
      if (assignedTo !== undefined) patch.assigned_to = assignedTo;
      if (remark !== undefined) patch.remark = remark;
      const updated = db.updateRequirementAdmin(m[1], patch);
      if (!updated) return send(res, 404, { code: 404, message: '未找到' });
      notifyStatusChange(updated, lang).catch(() => {});
      return send(res, 200, { code: 0, data: decorate(updated, lang) });
    }

    // ===== 房态管理（住宿闭环：建档/入住/退房/收款）=====
    // 列表（按状态过滤）
    if (p === '/api/admin/room-stays' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const rows = db.listRoomStays({ status: status || undefined });
      return send(res, 200, { code: 0, data: rows.map(r => decorateRoomStay(r, lang)) });
    }
    // 创建房态（绑定订房需求单 / 录入房号与初始收款）
    if (p === '/api/admin/room-stay' && req.method === 'POST') {
      const { requirement_id, room_no, openid, guest_name, guest_contact, payment } = body || {};
      if (!room_no) return send(res, 400, { code: 400, message: '缺少房号' });
      let reqOpenid = openid || '';
      if (requirement_id) {
        const reqRow = db.getRequirementAdmin(requirement_id);
        if (reqRow) reqOpenid = reqOpenid || reqRow.openid;
      }
      const row = db.insertRoomStay({ requirement_id, room_no, openid: reqOpenid, guest_name, guest_contact, payment });
      return send(res, 200, { code: 0, data: decorateRoomStay(row, lang) });
    }
    // 更新房态（办理入住 / 退房 / 录入收款）
    let rm = p.match(/^\/api\/admin\/room-stay\/(\d+)$/);
    if (rm && req.method === 'PUT') {
      const { status, check_in_at, check_out_at, payment } = body || {};
      if (status && !['reserved', 'checked_in', 'checked_out'].includes(status)) {
        return send(res, 400, { code: 400, message: '非法房态' });
      }
      const patch = {};
      if (status) patch.status = status;
      if (check_in_at) patch.check_in_at = check_in_at;
      if (check_out_at) patch.check_out_at = check_out_at;
      if (payment) patch.payment = payment;
      const updated = db.updateRoomStay(rm[1], patch);
      if (!updated) return send(res, 404, { code: 404, message: '未找到' });
      return send(res, 200, { code: 0, data: decorateRoomStay(updated, lang) });
    }

    return send(res, 404, { code: 404, message: '路由不存在' });
  }

  // 管理后台静态页
  if (p === '/admin' && req.method === 'GET') {
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch (e) { return send(res, 500, { code: 500, message: 'admin.html 缺失' }); }
  }

  // 隐私政策静态页
  if (p === '/privacy.html' && req.method === 'GET') {
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'privacy.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch (e) { return send(res, 500, { code: 500, message: 'privacy.html 缺失' }); }
  }

  return send(res, 404, { code: 404, message: 'Not Found' });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    const body = (req.method === 'POST' || req.method === 'PUT') ? await readBody(req) : {};
    await handle(req, res, url, body);
  } catch (e) {
    send(res, 500, { code: 500, message: e.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[KHMER AI 2.0] server listening on :${PORT}`);
  console.log(`[KHMER AI 2.0] LLM=${process.env.LLM_BASE_URL ? 'enabled' : 'fallback'}  APPSECRET=${process.env.APPSECRET ? 'set' : 'dev-mode'}`);
});

// 超时预警定时扫描（兜底规则之一：超时未处理自动告警管理员）
setInterval(() => {
  try {
    const n = db.scanOverdue();
    if (n > 0) console.log(`[KHMER AI 2.0] 超时预警：${n} 张工单超期，已触发提醒`);
  } catch (e) { /* ignore */ }
}, 60 * 1000);
