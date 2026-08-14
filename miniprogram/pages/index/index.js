// pages/index/index.js - 首页
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
    // 语言
    languageLabel: '中文',

    // 业务板块（不含酒店/机票/接机等需资质类目）
    quickServices: [
      { id: 'visa', icon: '🛂', page: '/pages/compliance/compliance?tab=visa', color: '#9B59B6', name: '签证' },
      { id: 'workpermit', icon: '📄', page: '/pages/compliance/compliance?tab=workpermit', color: '#3498DB', name: '劳工证' },
      { id: 'company', icon: '🏢', page: '/pages/compliance/compliance?tab=business', color: '#E67E22', name: '公司注册' },
      { id: 'invoice', icon: '🧾', page: '/pages/compliance/compliance?tab=taxreg', color: '#16A085', name: '税务登记' }
    ],

    // 实用工具
    tools: [
      { id: 'vat', icon: '🧮', page: '/pages/tax-tool/tax-tool?type=vat', color: '#E74C3C', name: 'VAT' },
      { id: 'wht', icon: '📊', page: '/pages/tax-tool/tax-tool?type=wht', color: '#F39C12', name: 'WHT' },
      { id: 'exchange', icon: '💱', page: '', color: '#8E44AD', name: '汇率' },
      { id: 'calendar', icon: '📅', page: '', color: '#2ECC71', name: '佛历' }
    ],

    exchangeRateShown: false,

    // 今日汇率
    rates: {
      USD_KHR: 4100,
      CNY_KHR: 570
    },
    rateUpdateTime: '',

    // 商务服务入口（跳转到服务展示页）
    serviceBanner: {
      title: '酒店 · 签证 · 财税',
      subtitle: '一站式柬埔寨商务服务',
      page: '/pages/services/services'
    },

    // 合规体检入口（核心获客工具 → 生成报告 → 唤起客服）
    checkupBanner: {
      title: '企业合规体检',
      subtitle: '6项风险扫描 · 60秒出报告',
      tag: '免费',
      page: '/pages/checkup/checkup'
    },

    // 会员中心入口
    memberEntry: {
      title: '会员中心',
      subtitle: '专享内容 · 服务进度',
      page: '/pages/member/member'
    },

    // 中鼎物业入口
    propertyEntry: {
      title: '中鼎物业工作台',
      subtitle: '收费台账 · 水电抄表 · 收缴管理',
      page: '/pages/property/property'
    },

    // 节标题（预计算避免 WXML 函数调用）
    sectionTitles: {
      appName: '柬企海外商务服务',
      quickServices: '合规资讯',
      tools: '实用工具',
      todayRate: '今日汇率',
      lastUpdate: '更新于'
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

  // 更新右上角语言标签
  updateLanguageLabel() {
    const lang = getCurrentLang();
    this.setData({ languageLabel: LANG_LABELS[lang] || '中文' });
  },

  updateTranslations() {
    const services = this.data.quickServices.map(s => ({ ...s, name: t(`home.${s.id}`) }));
    const tools = this.data.tools.map(item => ({ ...item, name: t(`home.${item.id}`) }));
    const sectionTitles = {
      appName: t('home.appName'),
      quickServices: t('home.quickServices'),
      tools: t('home.tools'),
      todayRate: t('home.todayRate'),
      lastUpdate: t('home.lastUpdate')
    };
    this.setData({ quickServices: services, tools, sectionTitles });
    wx.setNavigationBarTitle({ title: t('home.title') });
  },

  // 右上角语言切换（循环切换）
  onLangSwitch() {
    const current = getCurrentLang();
    const idx = LANG_ORDER.indexOf(current);
    const next = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
    APP.switchLanguage(next);
  },

  // 加载今日汇率
  async loadExchangeRate() {
    try {
      const res = await api.getExchangeRate();
      const rates = {
        USD_KHR: res?.USD_KHR || APP.globalData.exchangeRates.USD_KHR,
        CNY_KHR: res?.CNY_KHR || APP.globalData.exchangeRates.CNY_KHR
      };
      this.setData({
        rates,
        rateUpdateTime: this.formatRateTime()
      });
      APP.globalData.exchangeRates = rates;
    } catch (err) {
      this.setData({
        rates: APP.globalData.exchangeRates,
        rateUpdateTime: this.formatRateTime()
      });
    }
  },

  formatRateTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  // 工具/服务点击
  onItemTap(e) {
    const { page, id } = e.currentTarget.dataset;
    if (id === 'exchange') {
      this.setData({ exchangeRateShown: !this.data.exchangeRateShown });
      return;
    }
    if (id === 'calendar') {
      this.showCalendarTool();
      return;
    }
    if (page) {
      // 判断是 tabBar 页面还是普通页面
      const tabPages = ['/pages/index/index', '/pages/tax-tool/tax-tool', '/pages/compliance/compliance', '/pages/profile/profile'];
      const basePath = page.split('?')[0];
      if (tabPages.indexOf(basePath) >= 0) {
        wx.switchTab({ url: basePath });
      } else {
        wx.navigateTo({ url: page });
      }
    }
  },

  // 商务服务入口
  onServiceTap() {
    wx.navigateTo({ url: this.data.serviceBanner.page });
  },

  // 合规体检入口
  onCheckupTap() {
    wx.navigateTo({ url: this.data.checkupBanner.page });
  },

  // 会员中心入口
  onMemberTap() {
    wx.navigateTo({ url: this.data.memberEntry.page });
  },

  // 中鼎物业入口
  onPropertyTap() {
    wx.navigateTo({ url: this.data.propertyEntry.page });
  },

  // 佛历转换弹窗
  showCalendarTool() {
    const today = new Date();
    const beYear = dateHelper.gregorianToBuddhist(today);
    const khmerDate = dateHelper.formatDate(today, 'khmer');
    wx.showModal({
      title: '柬埔寨日期',
      content: `佛历 ${beYear} 年\n${khmerDate}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.updateTranslations();
    this.loadExchangeRate();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '柬企海外商务服务 - 柬埔寨税率计算、合规体检、签证财税',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: '柬企海外商务服务 - 在柬中资企业一站式工具',
      query: ''
    };
  }
});