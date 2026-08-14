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
