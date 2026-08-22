// pages/services/services.js
// 供应商 / 服务网络 — 接后端 /api/providers（住宿 / 物流仓储 / 物业）

const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const { getScope, t } = i18n;

const KINDS = ['accommodation', 'supplychain', 'property'];

Page({
  data: {
    lang: 'zh-CN',
    languageLabel: '中文',
    L: getScope('services'),
    groups: [],
    showApply: false,
    applyForm: { name_zh: '', kind: 'accommodation', city: '', tags: '', price_info: '', contact: '', desc_zh: '' },
    kindIndex: 0
  },

  onShow() {
    this.updateLanguage();
    this.loadProviders();
  },

  onLanguageChange() {
    this.updateLanguage();
    this.loadProviders();
  },

  updateLanguage() {
    const lang = i18n.getLang();
    const labels = { 'zh-CN': '中文', 'en': 'EN', 'km': 'ខ្មែរ' };
    this.setData({ lang, languageLabel: labels[lang] || '中文', L: getScope('services') });
    wx.setNavigationBarTitle({ title: getScope('services').title });
  },

  async loadProviders() {
    try {
      const d = await api.providerList(this.data.lang);
      const list = d.data || [];
      const groups = KINDS.map(k => ({
        kind: k,
        label: this.data.L.kindLabels[k] || k,
        list: list.filter(p => p.kind === k)
      })).filter(g => g.list.length);
      this.setData({ groups });
    } catch (e) {
      console.warn('loadProviders', e);
    }
  },

  onLangSwitch() {
    const langs = ['zh-CN', 'en', 'km'];
    const next = langs[(langs.indexOf(this.data.lang) + 1) % langs.length];
    i18n.setLang(next);
    this.updateLanguage();
    this.loadProviders();
  },

  toggleApply() {
    this.setData({ showApply: !this.data.showApply });
  },

  noop() {},

  onApplyInput(e) {
    const f = e.currentTarget.dataset.f;
    this.setData({ ['applyForm.' + f]: e.detail.value });
  },

  onKindChange(e) {
    const idx = e.detail.value;
    this.setData({ kindIndex: idx, 'applyForm.kind': KINDS[idx] });
  },

  async submitApply() {
    const f = this.data.applyForm;
    if (!f.name_zh) {
      wx.showToast({ title: this.data.L.needName, icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中' });
    try {
      const payload = {
        name_zh: f.name_zh, name_en: f.name_zh, name_km: f.name_zh,
        kind: f.kind, city: f.city,
        tags: f.tags, price_info: f.price_info, contact: f.contact,
        desc_zh: f.desc_zh, desc_en: f.desc_zh, desc_km: f.desc_zh
      };
      await api.providerCreate(payload);
      wx.hideLoading();
      wx.showToast({ title: this.data.L.applySuccess, icon: 'success' });
      this.setData({
        showApply: false,
        applyForm: { name_zh: '', kind: 'accommodation', city: '', tags: '', price_info: '', contact: '', desc_zh: '' },
        kindIndex: 0
      });
      this.loadProviders();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: (e.message) || '提交失败', icon: 'none' });
    }
  },

  // 小程序内生成需求单（接后端闭环）
  async createRequirement(e) {
    const { type, title, detail } = e.currentTarget.dataset;
    if (!title) return;
    wx.showLoading({ title: '提交中' });
    try {
      await api.createRequirement({ type, title: String(title).trim(), detail: detail || '' });
      wx.hideLoading();
      wx.showToast({ title: this.data.L.consultOk, icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/requirement/requirement' });
      }, 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  goRequirementCenter() {
    wx.switchTab({ url: '/pages/requirement/requirement' });
  },

  onShareAppMessage() {
    return {
      title: t('services.shareTitle'),
      path: '/pages/services/services'
    };
  },

  onShareTimeline() {
    return { title: t('services.shareTitleShort'), query: '' };
  }
});
