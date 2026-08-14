// pages/profile/profile.js - 个人中心
const { t, getCurrentLang, getSupportedLanguages } = require('../../utils/i18n.js');

const APP = getApp();

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,

    // 语言设置
    currentLanguage: 'zh-CN',
    supportedLanguages: [],
    showLangPicker: false,

    // 菜单项
    menuItems: [
      { id: 'invoices', icon: '🧾', label: '我的发票', page: '' },
      { id: 'favorites', icon: '⭐', label: '我的收藏', page: '' },
      { id: 'compliance', icon: '📝', label: '合规文档', page: '/pages/compliance/compliance' },
      { id: 'language', icon: '🌐', label: '语言设置', page: '' },
      { id: 'feedback', icon: '💬', label: '意见反馈', page: '' }
    ]
  },

  onLoad() {
    this.initLanguages();
  },

  onShow() {
    this.checkLogin();
    wx.setNavigationBarTitle({ title: t('profile.title') });
    this.updateLabels();
  },

  onLanguageChange() {
    wx.setNavigationBarTitle({ title: t('profile.title') });
    this.updateLabels();
  },

  updateLabels() {
    this.setData({ currentLanguage: getCurrentLang() });
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

  // 登录
  onLogin() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        const userInfo = res.userInfo;
        APP.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);
        this.setData({ userInfo, isLoggedIn: true });
        wx.showToast({ title: '登录成功', icon: 'success' });
      },
      fail: (err) => {
        console.log('取消登录', err);
      }
    });
  },

  // 菜单点击
  onMenuTap(e) {
    const { id, page } = e.currentTarget.dataset;
    switch (id) {
      case 'language':
        this.setData({ showLangPicker: true });
        break;
      case 'feedback':
        wx.showToast({ title: '意见反馈功能即将上线', icon: 'none' });
        break;
      case 'about':
        wx.showModal({
          title: '柬企海外商务工具',
          content: 'v1.0.0\n\n为在柬埔寨商务人士提供实用工具：\n• 柬埔寨税规计算 (VAT/WHT/薪资)\n• 实时汇率 (USD/KHR/CNY)\n• 合规文档查询 (签证/劳工证/公司注册)\n• 佛历/公历转换',
          showCancel: false,
          confirmText: '知道了'
        });
        break;
      default:
        if (page) {
          wx.navigateTo({ url: page });
        } else {
          wx.showToast({ title: '即将上线', icon: 'none' });
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
    wx.showToast({ title: '语言已切换', icon: 'success' });
  },

  onLangPickerClose() {
    this.setData({ showLangPicker: false });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          APP.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          this.setData({ userInfo: null, isLoggedIn: false });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  },

  // 复制版本号
  onVersionTap() {
    wx.setClipboardData({ data: 'v1.0.0 - Cambodia Business Toolkit' });
    wx.showToast({ title: '已复制', icon: 'success' });
  },

  onShareAppMessage() {
    return {
      title: '柬企海外商务服务 - 柬埔寨企业一站式工具',
      path: '/pages/index/index'
    };
  }
});