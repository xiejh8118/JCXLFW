/**
 * api.js - 后端调用封装
 * 统一管理所有后端接口调用
 *
 * 海外主体（本项目 appid 为境外主体）不支持微信云开发/云托管，wx.cloud 仅可连接
 * 微信云开发环境（国内 TCB），且与腾讯云国际版 CloudBase 账号/资源完全隔离。
 * 因此旧版云函数调用已全部降级为本地安全返回；KHMER AI 2.0 核心能力（AI/匹配/需求单）
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
 * 获取实时汇率
 */
function getExchangeRate() {
  return mockOk('getExchangeRate', getExchangeRates());
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
 * 获取用户信息
 */
function getUserInfo() {
  const cached = wx.getStorageSync('userInfo');
  return mockOk('getUserInfo', cached || {
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

// ==================== 自托管后端（KHMER AI 2.0 / 编号 KHMER-1.1.1）====================
// 后端源码见 ../server/（零依赖 Node，node src/index.js 即可启动）。
// cloudfunctions/khmerApi/ 保留为备用，若未来微信开放境外主体云开发可直接切换。
const BACKEND_BASE = 'https://www.ccbuyhub.com';
// 上线前必须：1) 替换为真实境外 HTTPS 域名；2) 小程序后台「开发设置-服务器域名」加入 request 合法域名。
const BACKEND_CONFIGURED = !/(example\.com|localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(BACKEND_BASE);

function backendRequest(method, path, data = {}, options = {}) {
  const { auth = true } = options;
  if (!BACKEND_CONFIGURED) {
    console.warn('[API] 后端域名未配置（仍为占位符），请部署 server/ 并填入真实 HTTPS 域名');
    return Promise.reject(new Error('服务连接失败，请稍后重试'));
  }
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = wx.getStorageSync('token');
      if (token) header['Authorization'] = 'Bearer ' + token;
    }
    wx.request({
      url: BACKEND_BASE + path,
      method,
      data,
      header,
      success: res => {
        if (res.statusCode === 200 && res.data && res.data.code === 0) resolve(res.data.data);
        else if (res.statusCode === 401) reject(new Error((res.data && res.data.message) || '未登录'));
        else reject(new Error((res.data && res.data.message) || '请求失败'));
      },
      fail: err => reject(new Error(err.errMsg || '网络错误'))
    });
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

// ---- AI 助手 ----
function aiChat(messages, lang) {
  return backendRequest('POST', '/api/ai/chat', { messages, lang }, { auth: false });
}
// ---- 匹配推荐 ----
function matchProviders(type, query, lang) {
  return backendRequest('POST', '/api/match', { type, query, lang }, { auth: false });
}
// ---- 需求单闭环 ----
function createRequirement(payload) {
  return ensureLogin().then(() => backendRequest('POST', '/api/requirement', payload));
}
function listRequirements(params = {}) {
  let path = `/api/requirement?lang=${params.lang || 'zh-CN'}`;
  if (params.status) path += `&status=${params.status}`;
  if (params.type) path += `&type=${params.type}`;
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

// ---- 物业工作台状态（公司级共享，云端持久化）----
function propertyLoad() {
  return backendRequest('GET', '/api/property', {}, { auth: false });
}
function propertySave(state) {
  return backendRequest('POST', '/api/property', state, { auth: false });
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
  getUserInfo,
  updateUserInfo,
  // 合规
  getComplianceDocs,
  submitComplianceDoc,
  // 通用
  uploadFile,
  // ===== KHMER AI 2.0 后端 =====
  ensureLogin,
  aiChat,
  matchProviders,
  createRequirement,
  listRequirements,
  getRequirement,
  updateRequirementStatus,
  rateRequirement,
  // ===== 物业工作台 =====
  propertyLoad,
  propertySave
};
