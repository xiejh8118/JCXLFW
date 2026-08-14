/**
 * api.js - 云函数调用封装
 * 统一管理所有后端接口调用
 */

const APP = getApp();

// 请求配置
const CONFIG = {
  timeout: 15000,
  retryTimes: 2,
  retryDelay: 1000
};

/**
 * 通用云函数调用
 * @param {string} name - 云函数名称
 * @param {object} data - 请求参数
 * @param {object} options - 额外配置
 */
function callCloudFunction(name, data = {}, options = {}) {
  const { showLoading = false, loadingText = '加载中...' } = options;

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return wx.cloud.callFunction({
    name,
    data: {
      ...data,
      language: APP.globalData.language,
      timestamp: Date.now()
    }
  }).then(res => {
    if (showLoading) wx.hideLoading();
    if (res.result && res.result.code === 0) {
      return res.result.data;
    } else {
      throw new Error(res.result?.message || '请求失败');
    }
  }).catch(err => {
    if (showLoading) wx.hideLoading();
    console.error(`[API] ${name} 调用失败:`, err);
    throw err;
  });
}

/**
 * 带重试的云函数调用
 */
function callWithRetry(name, data, options = {}) {
  const maxRetries = options.retryTimes || CONFIG.retryTimes;
  let lastError;

  return (async function retry(attempt) {
    try {
      return await callCloudFunction(name, data, options);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(CONFIG.retryDelay);
        return retry(attempt + 1);
      }
      throw lastError;
    }
  })(0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 税务相关 ====================

/**
 * 云端税务计算（保护核心算法）
 * @param {object} params - { type, amount, category, currency }
 */
function calcTax(params) {
  return callCloudFunction('calcTax', params, { showLoading: true });
}

/**
 * 获取最新税率表
 */
function getTaxRates() {
  return callCloudFunction('getTaxRates');
}

// ==================== 发票相关 ====================

/**
 * 发送发票
 * @param {object} params - { orderId, email, telegramId }
 */
function sendInvoice(params) {
  return callCloudFunction('sendInvoice', params, {
    showLoading: true,
    loadingText: '发送中...'
  });
}

/**
 * 获取发票列表
 */
function getInvoiceList(params = {}) {
  return callCloudFunction('getInvoiceList', params);
}

// ==================== 汇率相关 ====================

/**
 * 获取实时汇率
 */
function getExchangeRate() {
  return callWithRetry('getExchangeRate', {}, { retryTimes: 1 });
}

/**
 * 货币换算
 */
function convertCurrency(amount, from, to) {
  return callCloudFunction('convertCurrency', { amount, from, to });
}

// ==================== 用户相关 ====================

/**
 * 微信登录
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: res => {
        if (res.code) {
          callCloudFunction('wxLogin', { code: res.code })
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('登录失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  return callCloudFunction('getUserInfo');
}

/**
 * 更新用户信息
 */
function updateUserInfo(userInfo) {
  return callCloudFunction('updateUserInfo', { userInfo });
}

// ==================== 合规文档相关 ====================

/**
 * 获取合规文档列表
 */
function getComplianceDocs(params = {}) {
  return callCloudFunction('getComplianceDocs', params);
}

/**
 * 提交合规申请
 */
function submitComplianceDoc(docData) {
  return callCloudFunction('submitComplianceDoc', { docData }, {
    showLoading: true
  });
}

// ==================== 通用 ====================

/**
 * 文件上传
 */
function uploadFile(filePath, folder = 'general') {
  return wx.cloud.uploadFile({
    cloudPath: `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${filePath.split('.').pop()}`,
    filePath
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
  getUserInfo,
  updateUserInfo,
  // 合规
  getComplianceDocs,
  submitComplianceDoc,
  // 通用
  uploadFile
};
