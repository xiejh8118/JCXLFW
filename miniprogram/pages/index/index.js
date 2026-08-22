// pages/index/index.js - 首页（柬企海外商旅服务 / KHMER 智能商旅助手）
const { t } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const dateHelper = require('../../utils/date-helper.js');

const APP = getApp();

Page({
  data: {
    // 4 大核心服务入口（智能派单收纳进 AI 中枢，多语言助手在「我的」设置）
    scenarios: [
      { id: 'hotel', icon: '🏨', page: '/pages/services/services' },
      { id: 'repair', icon: '🔧', page: '/pages/property/property' },
      { id: 'reception', icon: '📞', page: '/pages/help/help' },
      { id: 'order', icon: '📋', page: '/pages/requirement/requirement' }
    ],

    exchangeRateShown: true,
    rates: { USD_KHR: 4100, CNY_KHR: 570 },
    rateUpdateTime: '',

    sectionTitles: {
      appName: '柬企海外商旅服务',
      subtitle: '柬埔寨智能商旅服务助手',
      greeting: '你好',
      scenarios: '核心服务',
      aiHubTitle: 'AI 智能服务中枢',
      aiHubTags: '自动派单 · 一键报修 · 三语响应',
      aiHubBtn: '立即咨询',
      todayRate: '今日汇率',
      lastUpdate: '更新于',
      disclaimer: '本平台提供需求整理、供应商匹配与客服确认，不直接替代持证酒店、物流或经营主体。'
    },
    calendar: { greg: '', beYear: '', khmerDate: '' }
  },

  onLoad() {
    this.updateTranslations();
    this.loadExchangeRate();
  },

  onShow() {
    this.updateTranslations();
    this.computeCalendar();
  },

  onLanguageChange() {
    this.updateTranslations();
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
      scenarios: t('home.scenarios'),
      aiHubTitle: t('home.aiHubTitle'),
      aiHubTags: t('home.aiHubTags'),
      aiHubBtn: t('home.aiHubBtn'),
      todayRate: t('home.todayRate'),
      lastUpdate: t('home.lastUpdate'),
      settleUSD: t('home.settleUSD'),
      disclaimer: t('home.disclaimer')
    };
    this.setData({ scenarios, sectionTitles });
    wx.setNavigationBarTitle({ title: t('home.title') });
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

  async loadExchangeRate() {
    // 1. 先读本地缓存立即渲染（首屏 0 网络等待）
    const cached = wx.getStorageSync('api_cache_exchange_rate');
    if (cached && cached.data) {
      this.setData({ rates: cached.data });
    }
    // 2. 再请求后端（cache-first：命中缓存直接返回，否则用内置默认值并写回缓存）
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

  // CTA：提交需求单（tabBar 页）
  onSubmitRequirement() {
    wx.switchTab({ url: '/pages/requirement/requirement' });
  },

  // 智能客服入口（普通页，navigateTo）
  onOpenHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  computeCalendar() {
    const today = new Date();
    const beYear = dateHelper.gregorianToBuddhist(today);
    const khmerDate = dateHelper.formatDate(today, 'khmer');
    const greg = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.setData({ calendar: { greg, beYear, khmerDate } });
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
  },

  // 分享：转发给好友/群 + 朋友圈（内容型入口页）
  onShareAppMessage() {
    return {
      title: t('home.shareTitle'),
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return { title: t('home.shareTitleShort'), query: '' };
  }
});
