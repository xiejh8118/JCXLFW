// app.js - 柬企海外商旅服务
const { initI18n, t } = require('./utils/i18n.js');
const api = require('./utils/api.js');

App({
  onLaunch(options) {
    // 初始化语言
    this.initLanguage();
    // 初始化云开发
    this.initCloud();
    // 检查登录状态
    this.checkLogin();
    // 隐私合规：注册需授权回调，拦截 wx.login 等隐私接口
    this.initPrivacy();
    // 新版本强制更新提示
    this.checkUpdate();
  },

  onShow(options) {
    // 记录场景值用于数据分析
    this.globalData.scene = options.scene;
  },

  initLanguage() {
    const stored = wx.getStorageSync('language');
    const lang = stored || 'zh-CN';
    this.globalData.language = lang;
    initI18n(lang);
  },

  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    // 微信官方：云开发暂不支持境外主体；且 wx.cloud 无法连接腾讯云国际版 CloudBase（账号与资源完全隔离）。
    // 本项目后端走 server/ 自建服务（境外服务器 + HTTPS + request 合法域名），此处默认跳过云初始化。
    if (!this.globalData.cloudEnv || this.globalData.cloudEnv === 'cloud-env-id') {
      console.log('未配置云环境，跳过云开发初始化（后端走 server/ 自建服务）');
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnv,
      traceUser: true
    });
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  // 隐私合规：微信要求调用 wx.login 等隐私接口前必须取得用户授权。
  // 注册该回调后，任一隐私接口被调用且未授权时，微信会弹出官方隐私授权框。
  initPrivacy() {
    if (typeof wx.onNeedPrivacyAuthorize !== 'function') return;
    wx.onNeedPrivacyAuthorize((resolve) => {
      wx.requirePrivacyAuthorize({
        success: () => resolve({ event: 'agree' }),
        fail: () => resolve({ event: 'disagree' }),
        complete: () => {}
      });
    });
  },

  // 小程序版本更新：检测到新版本下载完成后强制弹窗重启
  checkUpdate() {
    if (typeof wx.getUpdateManager !== 'function') return;
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate((res) => {
      console.log('[app] update check:', res.hasUpdate);
    });
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已准备好，是否立即重启应用？',
        showCancel: false,
        success: () => updateManager.applyUpdate()
      });
    });
    updateManager.onUpdateFailed(() => {
      wx.showToast({
        title: '新版本下载失败，请删除小程序后重新打开',
        icon: 'none',
        duration: 4000
      });
    });
  },

  // 多语言切换
  switchLanguage(lang) {
    this.globalData.language = lang;
    wx.setStorageSync('language', lang);
    initI18n(lang);
    // 重新渲染当前页面
    const pages = getCurrentPages();
    const curPage = pages[pages.length - 1];
    if (curPage && curPage.onLanguageChange) {
      curPage.onLanguageChange(lang);
    }
  },

  globalData: {
    // TODO: 改为腾讯云国际版 CloudBase 控制台创建的环境 ID（如 khmer-xxxx）
    cloudEnv: 'cloud-env-id',
    language: 'zh-CN',
    userInfo: null,
    scene: '',
    // 汇率缓存
    exchangeRates: {
      USD_KHR: 4100,
      CNY_KHR: 570
    }
  }
});
