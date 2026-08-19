// pages/profile/profile.js - 个人中心（三语，文案取 L）
const { t, getScope, getCurrentLang, getSupportedLanguages } = require('../../utils/i18n.js');

const APP = getApp();

Page({
  data: {
    L: getScope('profile'),
    userInfo: null,
    isLoggedIn: false,

    // 语言设置
    currentLanguage: 'zh-CN',
    supportedLanguages: [],
    showLangPicker: false,

    // 菜单项（只放当前真实可用/可体验的入口，避免审核因"即将上线"被拒）
    menuItems: []
  },

  onLoad() {
    this.initLanguages();
    this.refreshLang();
  },

  onShow() {
    this.checkLogin();
    this.refreshLang();
  },

  onLanguageChange() {
    this.refreshLang();
  },

  refreshLang() {
    const L = getScope('profile');
    this.setData({
      L,
      currentLanguage: getCurrentLang(),
      menuItems: [
        { id: 'privacy', icon: '🔒', label: L.privacy, page: '/pages/privacy/privacy' },
        { id: 'language', icon: '🌐', label: L.language, page: '' },
        { id: 'feedback', icon: '💬', label: L.feedback, page: '', type: 'contact' }
      ]
    });
    wx.setNavigationBarTitle({ title: L.title });
  },

  initLanguages() {
    this.setData({ supportedLanguages: getSupportedLanguages() });
  },

  checkLogin() {
    const userInfo = APP.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo, isLoggedIn: true });
    }
  },

  // 登录（本地游客态，不采集头像昵称，避免隐私合规风险）
  onLogin() {
    const userInfo = { nickName: t('profile.guest'), avatarUrl: '' };
    APP.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
    this.setData({ userInfo, isLoggedIn: true });
    wx.showToast({ title: t('profile.loginSuccess'), icon: 'success' });
  },

  // 菜单点击
  onMenuTap(e) {
    const { id, page } = e.currentTarget.dataset;
    switch (id) {
      case 'language':
        this.setData({ showLangPicker: true });
        break;
      case 'feedback':
        // 真 button open-type="contact" 已在 WXML 中处理，这里兜底
        wx.showToast({ title: t('profile.feedbackTip'), icon: 'none' });
        break;
      case 'about':
        wx.showModal({
          title: t('profile.aboutTitle'),
          content: t('profile.aboutContent'),
          showCancel: false,
          confirmText: t('common.know')
        });
        break;
      default:
        if (page) {
          wx.navigateTo({ url: page });
        } else {
          wx.showToast({ title: t('profile.comingSoon'), icon: 'none' });
        }
    }
  },

  // 语言切换
  onLanguageSelect(e) {
    const { code } = e.currentTarget.dataset;
    APP.switchLanguage(code);
    this.setData({
      currentLanguage: code,
      showLangPicker: false
    });
    wx.showToast({ title: t('profile.langSwitched'), icon: 'success' });
  },

  onLangPickerClose() {
    this.setData({ showLangPicker: false });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: t('profile.logoutTitle'),
      content: t('profile.logoutContent'),
      success: (res) => {
        if (res.confirm) {
          APP.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          this.setData({ userInfo: null, isLoggedIn: false });
          wx.showToast({ title: t('profile.loggedOut'), icon: 'success' });
        }
      }
    });
  },

  // 显示版本号（不调用剪切板，避免微信误识别为读取剪切板）
  onVersionTap() {
    wx.showToast({ title: '柬企海外商旅服务 v1.0.0', icon: 'none' });
  },

  onShareAppMessage() {
    return {
      title: t('profile.shareTitle'),
      path: '/pages/index/index'
    };
  }
});
