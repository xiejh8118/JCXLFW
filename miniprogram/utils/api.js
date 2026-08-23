/**
 * api.js - 后端调用封装
 * 统一管理所有后端接口调用
 *
 * 海外主体（本项目 appid 为境外主体）不支持微信云开发/云托管，wx.cloud 仅可连接
 * 微信云开发环境（国内 TCB），且与腾讯云国际版 CloudBase 账号/资源完全隔离。
 * 因此旧版云函数调用已全部降级为本地安全返回；KHMER 2.0 核心能力（需求单/匹配/后勤服务）
 * 走 server/ 自托管后端（境外服务器 + HTTPS + request 合法域名）。
 */

const APP = getApp();

// 请求配置
const CONFIG = {
  timeout: 15000,
  retryTimes: 2,
  retryDelay: 1000
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 请求缓存层（内存 + 本地存储双缓存）====================
const _memCache = {};
const _PREFIX = 'api_cache_';

// 读取有效缓存（未过期）
function cacheGet(key) {
  const m = _memCache[key];
  if (m && m.expire > Date.now()) return m.data;
  try {
    const s = wx.getStorageSync(_PREFIX + key);
    if (s && s.expire > Date.now()) {
      _memCache[key] = s;
      return s.data;
    }
  } catch (e) { /* ignore */ }
  return undefined;
}

// 写入缓存（带 TTL，ms）
function cacheSet(key, data, ttlMs) {
  const expire = Date.now() + (ttlMs || 5 * 60 * 1000);
  const item = { data, expire };
  _memCache[key] = item;
  try { wx.setStorageSync(_PREFIX + key, item); } catch (e) { /* ignore */ }
}

function unavailable(name) {
  console.warn(`[API] ${name} 因海外主体不支持云开发，已降级为不可用`);
  return Promise.reject(new Error('该功能在境外版暂不可用'));
}

function mockOk(name, data) {
  console.warn(`[API] ${name} 因海外主体不支持云开发，已返回本地占位数据`);
  return Promise.resolve(data);
}

// ==================== 税务相关（已降级）====================

/**
 * 云端税务计算（保护核心算法）
 * 海外主体无法使用云函数，返回占位结果。
 */
function calcTax(params) {
  const amount = Number(params && params.amount) || 0;
  return mockOk('calcTax', {
    tax: 0,
    net: amount,
    rate: 0,
    note: '境外版暂不支持云端税务计算'
  });
}

/**
 * 获取最新税率表
 */
function getTaxRates() {
  return mockOk('getTaxRates', []);
}

// ==================== 发票相关（已降级）====================

/**
 * 发送发票
 */
function sendInvoice(params) {
  return unavailable('sendInvoice');
}

/**
 * 获取发票列表
 */
function getInvoiceList(params = {}) {
  return mockOk('getInvoiceList', { list: [], total: 0 });
}

// ==================== 汇率相关（本地缓存）====================

function getExchangeRates() {
  return (APP && APP.globalData && APP.globalData.exchangeRates) || {
    USD_KHR: 4100,
    CNY_KHR: 570
  };
}

/**
 * 获取实时汇率（带本地缓存，先返回缓存再尝试更新）
 * 当前后端未提供汇率接口，使用内置默认值，并写入本地缓存供首页 cache-first 渲染。
 */
function getExchangeRate() {
  const cached = cacheGet('exchange_rate');
  if (cached !== undefined) return Promise.resolve(cached);
  const defaultRates = getExchangeRates();
  cacheSet('exchange_rate', defaultRates, 30 * 60 * 1000);
  return Promise.resolve(defaultRates);
}

/**
 * 货币换算
 */
function convertCurrency(amount, from, to) {
  const rates = getExchangeRates();
  const key = `${from}_${to}`;
  const rate = rates[key] || 1;
  return mockOk('convertCurrency', {
    amount: Number(amount) || 0,
    from,
    to,
    rate,
    result: (Number(amount) || 0) * rate
  });
}

// ==================== 用户相关（本地匿名）====================

/**
 * 微信登录
 * 海外主体无法使用云函数 wxLogin，返回本地匿名会话，避免页面登录流程报错。
 */
function wxLogin() {
  const localToken = 'local-' + Date.now();
  const localOpenid = 'local-openid';
  wx.setStorageSync('token', localToken);
  wx.setStorageSync('openid', localOpenid);
  return mockOk('wxLogin', { token: localToken, openid: localOpenid });
}

/**
 * 获取本地缓存的用户信息（非微信 getUserInfo API）
 */
function getCachedUserInfo() {
  const cached = wx.getStorageSync('userInfo');
  return mockOk('getCachedUserInfo', cached || {
    nickName: '游客',
    avatarUrl: '',
    country: '',
    language: (APP && APP.globalData && APP.globalData.language) || 'zh-CN'
  });
}

/**
 * 更新用户信息
 */
function updateUserInfo(userInfo) {
  if (userInfo) wx.setStorageSync('userInfo', userInfo);
  return mockOk('updateUserInfo', { success: true });
}

// ==================== 合规文档相关（已降级）====================

/**
 * 获取合规文档列表
 */
function getComplianceDocs(params = {}) {
  return mockOk('getComplianceDocs', []);
}

/**
 * 提交合规申请
 */
function submitComplianceDoc(docData) {
  return unavailable('submitComplianceDoc');
}

// ==================== 通用（已降级）====================

/**
 * 文件上传
 */
function uploadFile(filePath, folder = 'general') {
  return mockOk('uploadFile', {
    fileID: '',
    status: 'unavailable',
    note: '境外版暂不支持云端文件上传'
  });
}

// ==================== 自托管后端（KHMER 2.0 / 编号 KHMER-1.1.1）====================
// 后端源码见 ../server/（零依赖 Node，node src/index.js 即可启动）。
// cloudfunctions/khmerApi/ 保留为备用，若未来微信开放境外主体云开发可直接切换。
const BACKEND_BASE = 'https://www.ccbuyhub.com';
// 上线前必须：1) 替换为真实境外 HTTPS 域名；2) 小程序后台「开发设置-服务器域名」加入 request 合法域名。
const BACKEND_CONFIGURED = !/(example\.com|localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(BACKEND_BASE);

function backendRequest(method, path, data = {}, options = {}) {
  const {
    auth = true,
    token: customToken = '',
    useCache = false,
    cacheTtl = 5 * 60 * 1000,
    timeout = 15000,
    retries = 2,
    retryDelay = 800
  } = options;

  if (!BACKEND_CONFIGURED) {
    console.warn('[API] 后端域名未配置（仍为占位符），请部署 server/ 并填入真实 HTTPS 域名');
    return Promise.reject(new Error('服务连接失败，请稍后重试'));
  }

  const cacheKey = `${method}:${path}:${JSON.stringify(data)}`;

  // cache-first：命中未过期缓存直接返回，跳过网络
  if (useCache) {
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) {
      console.log('[API] cache hit:', cacheKey);
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve, reject) => {
    let attempt = 0;
    const header = { 'Content-Type': 'application/json' };

    const fire = () => {
      if (customToken) {
        header['Authorization'] = 'Bearer ' + customToken;
      } else if (auth) {
        const token = wx.getStorageSync('token');
        if (token) header['Authorization'] = 'Bearer ' + token;
      }
      wx.request({
        url: BACKEND_BASE + path,
        method,
        data,
        header,
        timeout,
        success: res => {
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            if (useCache) cacheSet(cacheKey, res.data.data, cacheTtl);
            resolve(res.data.data);
          } else if (res.statusCode === 401) {
            reject(new Error((res.data && res.data.message) || '未登录'));
          } else {
            // 业务错误不重试，直接失败
            reject(new Error((res.data && res.data.message) || '请求失败'));
          }
        },
        fail: err => {
          attempt += 1;
          if (attempt <= retries) {
            console.warn(`[API] 请求失败，第 ${attempt} 次重试:`, path);
            setTimeout(fire, retryDelay * attempt);
          } else {
            reject(new Error(err.errMsg || '网络错误'));
          }
        }
      });
    };
    fire();
  });
}

// 静默登录：wx.login -> 后端 code2Session 换 token
async function ensureLogin() {
  const cached = wx.getStorageSync('token');
  if (cached) return cached;
  const code = await new Promise((resolve, reject) => {
    wx.login({ success: r => r.code ? resolve(r.code) : reject(new Error('登录失败')), fail: reject });
  });
  const data = await backendRequest('POST', '/api/auth/login', { code }, { auth: false });
  wx.setStorageSync('token', data.token);
  wx.setStorageSync('openid', data.openid);
  return data.token;
}

// ---- 需求单闭环 ----
function createRequirement(payload) {
  return ensureLogin().then(() => backendRequest('POST', '/api/requirement', payload));
}
function listRequirements(params = {}) {
  let path = `/api/requirement?lang=${params.lang || 'zh-CN'}`;
  if (params.status) path += `&status=${params.status}`;
  if (params.type) path += `&type=${params.type}`;
  if (params.module) path += `&module=${params.module}`;
  return ensureLogin().then(() => backendRequest('GET', path));
}
function getRequirement(id, lang) {
  return ensureLogin().then(() => backendRequest('GET', `/api/requirement/${id}?lang=${lang || 'zh-CN'}`));
}
function updateRequirementStatus(id, status, note, matchedIds) {
  return ensureLogin().then(() => backendRequest('PUT', `/api/requirement/${id}/status`, { status, note, matchedIds }));
}
function rateRequirement(id, rating, comment) {
  return ensureLogin().then(() => backendRequest('POST', `/api/requirement/${id}/rate`, { rating, comment }));
}

// ---- 运营工作台（ADMIN_TOKEN 鉴权）----
function adminRequirementList(token, lang, module) {
  let path = `/api/admin/requirements?lang=${lang || 'zh-CN'}`;
  if (module) path += `&module=${module}`;
  return backendRequest('GET', path, {}, { auth: false, token });
}
function adminRequirementUpdate(id, { status, note, matchedIds, quote, assignedTo, remark }, token) {
  return backendRequest('PUT', `/api/admin/requirement/${id}`, { status, note, matchedIds, quote, assignedTo, remark }, { auth: false, token });
}

// ---- 房态管理（住宿闭环：建档/入住/退房/收款）----
function adminRoomStayList(token, { status, lang } = {}) {
  let path = `/api/admin/room-stays?lang=${lang || 'zh-CN'}`;
  if (status) path += `&status=${status}`;
  return backendRequest('GET', path, {}, { auth: false, token });
}
function adminRoomStayCreate(payload, token) {
  return backendRequest('POST', '/api/admin/room-stay', payload, { auth: false, token });
}
function adminRoomStayUpdate(id, payload, token) {
  return backendRequest('PUT', `/api/admin/room-stay/${id}`, payload, { auth: false, token });
}

// ---- 双向触达：微信订阅消息授权（需在小程序后台配置模板 ID 并填入下方常量）----
// 上线前必须：在微信公众平台申请「工单状态变更」类订阅消息模板，将模板 ID 填入此处。
const SUB_TEMPLATE_ID = ''; // ← 填写你的订阅消息模板 ID
function requestSubscribeMsg() {
  if (!SUB_TEMPLATE_ID || !wx.requestSubscribeMessage) return;
  try {
    wx.requestSubscribeMessage({
      tmplIds: [SUB_TEMPLATE_ID],
      success() {},
      fail() {}
    });
  } catch (e) { /* 用户拒绝或不支持时不阻塞主流程 */ }
}

// ---- 供应商目录（接后端，dev 免鉴权）----
function providerList(lang) {
  return backendRequest('GET', `/api/providers?lang=${lang || 'zh-CN'}`, {}, { auth: false, useCache: true, cacheTtl: 30 * 60 * 1000 });
}
function providerCreate(payload) {
  return backendRequest('POST', '/api/providers', payload, { auth: false });
}

// ---- 多语言 FAQ 客服（规则匹配，dev 免鉴权）----
function faqList(lang) {
  return backendRequest('GET', `/api/faq?lang=${lang || 'zh-CN'}`, {}, { auth: false, useCache: true, cacheTtl: 60 * 60 * 1000 });
}
function faqAsk(query, lang) {
  return backendRequest('POST', '/api/faq', { query, lang: lang || 'zh-CN' }, { auth: false });
}

// ---- 大模型对话（后端代理 OpenAI 兼容接口；未配置时 fallback 走规则 FAQ）----
function llmChat(messages, lang) {
  return backendRequest('POST', '/api/llm/chat', { messages, lang: lang || 'zh-CN' }, { auth: false });
}

// ---- 物业工作台状态（公司级共享，云端持久化）----
function propertyLoad() {
  return backendRequest('GET', '/api/property', {}, { auth: false, useCache: true, cacheTtl: 5 * 60 * 1000 });
}
function propertySave(state) {
  return backendRequest('POST', '/api/property', state, { auth: false });
}

// ---- 物业账单/提醒单 PDF（云端生成，直接可打印）----
// 前端 Canvas 出图 → Base64 → 后端封装为单页 A4 PDF → 返回 ArrayBuffer
function propertyPdf({ imageBase64, width, height, kind = 'bill' }) {
  return new Promise((resolve, reject) => {
    if (!BACKEND_CONFIGURED) {
      console.warn('[API] 后端域名未配置，无法生成 PDF');
      return reject(new Error('服务连接失败，请稍后重试'));
    }
    wx.request({
      url: BACKEND_BASE + '/api/property/pdf',
      method: 'POST',
      data: { imageBase64, width, height, kind },
      header: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      success: res => {
        if (res.statusCode === 200 && res.data) resolve(res.data);
        else reject(new Error('PDF 生成失败'));
      },
      fail: err => reject(new Error(err.errMsg || '网络错误'))
    });
  });
}

// ---- 物业账单/提醒单 PDF（矢量版：可选中文字）----
// 前端上传「布局描述 items」→ 后端 pdfkit+harfbuzz 排版 → 返回 ArrayBuffer
function propertyPdfV2({ items, width, height, kind = 'bill' }) {
  return new Promise((resolve, reject) => {
    if (!BACKEND_CONFIGURED) {
      console.warn('[API] 后端域名未配置，无法生成 PDF');
      return reject(new Error('服务连接失败，请稍后重试'));
    }
    wx.request({
      url: BACKEND_BASE + '/api/property/pdf-v2',
      method: 'POST',
      data: { items, width, height, kind },
      header: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      success: res => {
        if (res.statusCode === 200 && res.data) resolve(res.data);
        else reject(new Error('PDF 生成失败'));
      },
      fail: err => reject(new Error(err.errMsg || '网络错误'))
    });
  });
}

module.exports = {
  // 税务
  calcTax,
  getTaxRates,
  // 发票
  sendInvoice,
  getInvoiceList,
  // 汇率
  getExchangeRate,
  convertCurrency,
  // 用户
  wxLogin,
  getCachedUserInfo,
  updateUserInfo,
  // 合规
  getComplianceDocs,
  submitComplianceDoc,
  // 通用
  uploadFile,
  // ===== KHMER 2.0 后端 =====
  ensureLogin,
  createRequirement,
  listRequirements,
  getRequirement,
  updateRequirementStatus,
  rateRequirement,
  // ===== 运营工作台 =====
  adminRequirementList,
  adminRequirementUpdate,
  // ===== 房态管理（住宿闭环）=====
  adminRoomStayList,
  adminRoomStayCreate,
  adminRoomStayUpdate,
  // ===== 双向触达 =====
  requestSubscribeMsg,
  SUB_TEMPLATE_ID,
  // ===== 物业工作台 =====
  propertyLoad,
  propertySave,
  propertyPdf,
  propertyPdfV2,
  // ===== 供应商 / FAQ 客服 / 大模型 =====
  providerList,
  providerCreate,
  faqList,
  faqAsk,
  llmChat
};
