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

const STATUS_FLOW = ['pending', 'matching', 'accepted', 'processing', 'completed', 'rated'];
const STATUS_LABEL = {
  pending: { zh: '待处理', en: 'Pending', km: 'រង់ចាំ' },
  matching: { zh: '匹配中', en: 'Matching', km: 'កំពុងផ្គូរ' },
  accepted: { zh: '已接单', en: 'Accepted', km: 'បានទទួល' },
  processing: { zh: '处理中', en: 'Processing', km: 'កំពុងដំណើរការ' },
  completed: { zh: '已完成', en: 'Completed', km: 'រួចរាល់' },
  rated: { zh: '已评价', en: 'Rated', km: 'បានវាយតម្លៃ' }
};

function resolveMatched(ids, lang) {
  if (!Array.isArray(ids) || !ids.length) return [];
  return db.PROVIDERS.filter(p => ids.includes(p.id)).map(p => ({
    id: p.id, name: db.localizeName(p, lang), kind: p.kind, contact: p.contact, rating: p.rating
  }));
}

function decorate(row, lang) {
  if (!row) return row;
  return {
    ...row,
    statusLabel: (STATUS_LABEL[row.status] || {})[lang] || row.status,
    matched: resolveMatched(row.matched_ids, lang),
    statusHistory: row.status_history || []
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
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
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

// ---- 路由处理 ----
async function handle(req, res, url, body) {
  const p = url.pathname;

  // 健康检查
  if (p === '/api/health' && req.method === 'GET') {
    return send(res, 200, { code: 0, data: { service: 'KHMER AI 2.0', version: '1.1.1', status: 'ok', time: Date.now() } });
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

  // 需求单（需登录）
  if (p.startsWith('/api/requirement')) {
    const openid = verifyToken(getToken(req));
    if (!openid) return send(res, 401, { code: 401, message: '未登录' });
    const lang = (url.searchParams.get('lang') || 'zh-CN');

    // 列表
    if (p === '/api/requirement' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const rows = db.listRequirements({ openid, status, type });
      return send(res, 200, { code: 0, data: rows.map(r => decorate(r, lang)) });
    }
    // 创建
    if (p === '/api/requirement' && req.method === 'POST') {
      const { type, title, detail, contact } = body || {};
      if (!type || !title) return send(res, 400, { code: 400, message: '缺少 type 或 title' });
      const row = db.insertRequirement({ type, title, detail, contact, openid });
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
      const updated = db.updateRequirement(m[1], openid, patch);
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
