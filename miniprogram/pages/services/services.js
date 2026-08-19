// pages/services/services.js
// 合规版服务展示页 — 纯信息展示，所有交易通过客服会话完成

const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const { getScope, t } = i18n;

Page({
  data: {
    // 当前语言
    lang: 'zh-CN',
    languageLabel: '中文',
    L: getScope('services'),

    // 服务标签页
    activeTab: 0,

    // 服务数据（随语言刷新）
    tabs: [],
    hotels: [],
    visaTypes: [],
    taxServices: [],

    // 当前展开的服务详情
    expandedHotel: '',
    expandedVisa: '',
    expandedTax: ''
  },

  onLoad(options) {
    if (options.source) {
      // 从客服消息卡片进入，可定位到对应服务
      const tabMap = { hotel: 0, visa: 1, tax: 2 };
      this.setData({ activeTab: tabMap[options.source] || 0 });
    }
    this.updateLanguage();
  },

  onShow() {
    this.updateLanguage();
  },

  onLanguageChange() {
    this.updateLanguage();
  },

  updateLanguage() {
    const lang = i18n.getLang();
    const labels = { 'zh-CN': '中文', 'en': 'EN', 'km': 'ខ្មែរ' };
    const L = getScope('services');
    const visaTypes = (L.data.visaTypes || []).map(v => ({
      ...v,
      staySub: (L.stayPrefix || '').replace('{val}', v.stayDays)
    }));
    const taxServices = (L.data.taxServices || []).map(s => ({
      ...s,
      cycleSub: (L.cyclePrefix || '').replace('{val}', s.cycle)
    }));
    this.setData({
      lang,
      languageLabel: labels[lang] || '中文',
      L,
      tabs: L.tabs,
      hotels: L.data.hotels,
      visaTypes,
      taxServices
    });
    wx.setNavigationBarTitle({ title: L.title });
  },

  // 切换标签
  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.index });
  },

  // 展开/收起酒店详情
  toggleHotel(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedHotel: this.data.expandedHotel === id ? '' : id });
  },

  // 展开/收起签证详情
  toggleVisa(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedVisa: this.data.expandedVisa === id ? '' : id });
  },

  // 展开/收起财税服务详情
  toggleTax(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedTax: this.data.expandedTax === id ? '' : id });
  },

  // 语言切换
  onLangSwitch() {
    const langs = ['zh-CN', 'en', 'km'];
    const current = langs.indexOf(this.data.lang);
    const next = langs[(current + 1) % langs.length];
    i18n.setLang(next);
    this.updateLanguage();
  },

  // 小程序内生成需求单，替代客服咨询按钮，避免被判定为引流
  async createRequirement(e) {
    const { type, title, detail } = e.currentTarget.dataset;
    if (!title) return;
    wx.showLoading({ title: '提交中' });
    try {
      await api.createRequirement({ type, title: title.trim(), detail });
      wx.hideLoading();
      wx.showToast({ title: '已生成需求单', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/requirement/requirement' });
      }, 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  // 底部跳转需求单中心
  goRequirementCenter() {
    wx.switchTab({ url: '/pages/requirement/requirement' });
  },

  onShareAppMessage() {
    const tabs = ['hotel', 'visa', 'tax'];
    const tab = tabs[this.data.activeTab] || 'hotel';
    return {
      title: t('services.shareTitle'),
      path: '/pages/services/services?source=' + tab
    };
  }
});
