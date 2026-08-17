const { getScope } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const app = getApp();
const FLOW = ['pending', 'matching', 'accepted', 'processing', 'completed', 'rated'];

function nextOf(status) {
  const i = FLOW.indexOf(status);
  return (i >= 0 && i < FLOW.length - 1) ? FLOW[i + 1] : null;
}

Page({
  data: {
    L: {}, list: [], loading: false,
    showForm: false,
    typeKeys: ['accommodation', 'enterprise', 'supplychain', 'property'],
    form: { type: 'accommodation', title: '', detail: '', contact: '' }
  },

  onShow() { this.refreshLang(); this.load(); },
  refreshLang() {
    const L = getScope('khmerBiz');
    const typeNames = this.data.typeKeys.map(k => (L.requirement && L.requirement.types[k]) || k);
    this.setData({ L, typeNames });
  },
  onLanguageChange() { this.refreshLang(); this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const list = await api.listRequirements({ lang: (app.globalData && app.globalData.language) || 'zh-CN' });
      this.setData({ list: list.map(o => ({ ...o, nextStatus: nextOf(o.status) })), loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  toggleForm() { this.setData({ showForm: !this.data.showForm }); },
  onTypeChange(e) { this.setData({ 'form.type': this.data.typeKeys[e.detail.value] }); },
  onField(e) { this.setData({ ['form.' + e.currentTarget.dataset.f]: e.detail.value }); },

  async submit() {
    const { type, title, detail, contact } = this.data.form;
    if (!title.trim()) { wx.showToast({ title: '请填写标题', icon: 'none' }); return; }
    try {
      await api.createRequirement({ type, title: title.trim(), detail, contact });
      this.setData({ showForm: false, form: { type: 'accommodation', title: '', detail: '', contact: '' } });
      wx.showToast({ title: '已提交', icon: 'success' });
      this.load();
    } catch (e) { wx.showToast({ title: e.message || '失败', icon: 'none' }); }
  },

  async advance(e) {
    const { id, next } = e.currentTarget.dataset;
    if (!next) return;
    try { await api.updateRequirementStatus(id, next, '推进'); this.load(); }
    catch (err) { wx.showToast({ title: err.message, icon: 'none' }); }
  },

  async rate(e) {
    const { id } = e.currentTarget.dataset;
    try { await api.rateRequirement(id, 5); this.load(); }
    catch (err) { wx.showToast({ title: err.message, icon: 'none' }); }
  }
});
