// pages/index/index.js - 首页（柬企海外商旅服务 / KHMER 智能商旅助手）
const { t, getCurrentLang } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const dateHelper = require('../../utils/date-helper.js');

const APP = getApp();

const LANG_LABELS = {
  'zh-CN': '中文',
  'en': 'EN',
  'km': 'ខ្មែរ'
};

const LANG_ORDER = ['zh-CN', 'en', 'km'];

Page({
  data: {
    languageLabel: '中文',

    // 4 大场景入口（新定位：以酒店为入口的智能商旅后勤平台）
    scenarios: [
      { id: 'stay', icon: '🏨', page: '/pages/services/services', color: '#B8860B', rqType: '' },
      { id: 'logistics', icon: '📋', page: '/pages/requirement/requirement', color: '#3498DB', rqType: 'enterprise' },
      { id: 'warehouse', icon: '📦', page: '/pages/requirement/requirement', color: '#16A085', rqType: 'supplychain' },
      { id: 'property', icon: '🔧', page: '/pages/property/property', color: '#E67E22', rqType: '' }
    ],

    exchangeRateShown: true,
    rates: { USD_KHR: 4100, CNY_KHR: 570 },
    rateUpdateTime: '',

    sectionTitles: {
      appName: '柬企海外商旅服务',
      subtitle: '柬埔寨智能商旅服务助手',
      greeting: '你好',
      slogan: '从入住开始，智能帮企业在柬埔寨落地',
      scenarios: '核心服务',
      submitTitle: '提交商旅后勤需求',
      submitSubtitle: '住宿 · 仓储 · 配送 · 物业，一句话说清',
      submitBtn: '开始提交',
      helpTitle: '智能客服',
      helpSubtitle: '中 / 英 / 高棉三语问答，随时答疑',
      todayRate: '今日汇率',
      lastUpdate: '更新于',
      disclaimer: '本平台提供需求整理、供应商匹配与客服确认，不直接替代持证酒店、物流或经营主体。'
    }
  },

  onLoad() {
    this.updateLanguageLabel();
    this.updateTranslations();
    this.loadExchangeRate();
  },

  onShow() {
    this.updateLanguageLabel();
    this.updateTranslations();
  },

  onLanguageChange() {
    this.updateLanguageLabel();
    this.updateTranslations();
  },

  updateLanguageLabel() {
    const lang = getCurrentLang();
    this.setData({ languageLabel: LANG_LABELS[lang] || '中文' });
  },

  updateTranslations() {
    const scenarios = this.data.scenarios.map(s => ({
      ...s,
      name: t('home.' + s.id),
      desc: t('home.' + s.id + 'Desc')
    }));
    const sectionTitles = {
      appName: t('home.appName'),
      subtitle: t('home.subtitle'),
      greeting: t('home.greeting'),
      slogan: t('home.slogan'),
      scenarios: t('home.scenarios'),
      submitTitle: t('home.submitTitle'),
      submitSubtitle: t('home.submitSubtitle'),
      submitBtn: t('home.submitBtn'),
      helpTitle: t('home.helpTitle'),
      helpSubtitle: t('home.helpSubtitle'),
      todayRate: t('home.todayRate'),
      lastUpdate: t('home.lastUpdate'),
      settleUSD: t('home.settleUSD'),
      disclaimer: t('home.disclaimer')
    };
    this.setData({ scenarios, sectionTitles });
    wx.setNavigationBarTitle({ title: t('home.title') });
  },

  onLangSwitch() {
    const self = this;
    wx.showActionSheet({
      itemList: ['中文', 'English', 'ភាសាខ្មែរ'],
      success(res) {
        const lang = LANG_ORDER[res.tapIndex];
        if (lang && lang !== getCurrentLang()) {
          APP.switchLanguage(lang);
        }
      }
    });
  },

  async loadExchangeRate() {
    try {
      const res = await api.getExchangeRate();
      const rates = {
        USD_KHR: res?.USD_KHR || APP.globalData.exchangeRates.USD_KHR,
        CNY_KHR: res?.CNY_KHR || APP.globalData.exchangeRates.CNY_KHR
      };
      this.setData({ rates, rateUpdateTime: this.formatRateTime() });
      APP.globalData.exchangeRates = rates;
    } catch (err) {
      this.setData({ rates: APP.globalData.exchangeRates, rateUpdateTime: this.formatRateTime() });
    }
  },

  formatRateTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  // 场景/工具点击：tabBar 页用 switchTab（不带参），普通页 navigateTo
  onItemTap(e) {
    const { page, rqtype } = e.currentTarget.dataset;
    if (!page) return;
    const tabPages = ['/pages/index/index', '/pages/requirement/requirement', '/pages/profile/profile'];
    const basePath = page.split('?')[0];
    if (tabPages.indexOf(basePath) >= 0) {
      // tabBar 页 switchTab 不支持带参，需求单类型通过 globalData 透传预填
      if (rqtype) { APP.globalData.pendingRequirementType = rqtype; }
      wx.switchTab({ url: basePath });
    } else {
      wx.navigateTo({ url: page });
    }
  },

  // CTA：提交需求单（tabBar 页）
  onSubmitRequirement() {
    wx.switchTab({ url: '/pages/requirement/requirement' });
  },

  // 智能客服入口（普通页，navigateTo）
  onOpenHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  showCalendarTool() {
    const today = new Date();
    const beYear = dateHelper.gregorianToBuddhist(today);
    const khmerDate = dateHelper.formatDate(today, 'khmer');
    wx.showModal({
      title: t('home.calTitle'),
      content: t('home.calContent', { year: beYear, date: khmerDate }),
      showCancel: false,
      confirmText: t('common.know')
    });
  },

  onPullDownRefresh() {
    this.loadExchangeRate().then(() => wx.stopPullDownRefresh());
  }
});
