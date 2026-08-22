const { getScope } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const app = getApp();
const FLOW = ['pending', 'matching', 'accepted', 'processing', 'completed', 'returned', 'rated'];

// B2：用户侧真实动作（避免自评全链路推进的假闭环）
// pending+有匹配→确认需求(accepted)；accepted/processing→确认完成(completed)；completed→评价(rated)
function actionFor(status, hasMatched) {
  if (status === 'pending') return hasMatched ? { label: 'confirm', target: 'accepted' } : null;
  if (status === 'accepted' || status === 'processing') return { label: 'complete', target: 'completed' };
  if (status === 'completed') return { label: 'rate', target: 'rated' };
  return null;
}
// 已完成但用户不满意 → 可退回重处理
function canReturn(status) { return status === 'completed'; }

// 闭环进度步骤（rated 视作已完成阶段的末态；returned 退回后回到处理中）
const STEPS = ['pending', 'matching', 'accepted', 'processing', 'completed'];
function progressOf(status) {
  if (status === 'rated') return STEPS.length - 1;
  if (status === 'returned') return STEPS.indexOf('processing');
  const i = STEPS.indexOf(status);
  return i >= 0 ? i : 0;
}
// SLA 倒计时 / 超时文案
function slaText(item) {
  if (item.status === 'completed' || item.status === 'rated') return '';
  if (item.overdue) return '⚠ 已超时，请催促前台';
  const ms = item.slaRemaining || 0;
  const m = Math.floor(ms / 60000);
  if (m >= 60) return `SLA 剩余 ${Math.floor(m / 60)} 小时 ${m % 60} 分`;
  return `SLA 剩余 ${m} 分钟`;
}

Page({
  data: {
    L: {}, list: [], loading: false,
    showForm: false,
    typeKeys: ['accommodation', 'enterprise', 'supplychain', 'property', 'frontdesk'],
    form: { type: 'accommodation', title: '', detail: '', contact: '', room_no: '' }
  },

  onLoad(options) {
    // 支持外部/AI 调起时预填需求单：?type=enterprise&title=...&detail=...&contact=...
    const { type, title, detail, contact, showForm } = options || {};
    const update = {};
    if (type && this.data.typeKeys.includes(type)) update['form.type'] = type;
    if (title !== undefined) update['form.title'] = decodeURIComponent(title);
    if (detail !== undefined) update['form.detail'] = decodeURIComponent(detail);
    if (contact !== undefined) update['form.contact'] = decodeURIComponent(contact);
    if (Object.keys(update).length || showForm === 'true' || showForm === '1') {
      update.showForm = true;
    }
    if (Object.keys(update).length) this.setData(update);
  },
  onShow() {
    this.refreshLang();
    this.load();
    // 首页点击场景入口（企业后勤/物流仓储）通过 globalData 透传需求类型，在此预填并展开表单
    const pending = app.globalData && app.globalData.pendingRequirementType;
    if (pending && this.data.typeKeys.includes(pending)) {
      this.setData({ 'form.type': pending, showForm: true });
      app.globalData.pendingRequirementType = '';
    }
  },
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
      this.setData({ list: list.map(o => ({
        ...o,
        action: actionFor(o.status, (o.matched || []).length > 0),
        canReturn: canReturn(o.status),
        progress: progressOf(o.status),
        slaText: slaText(o),
        roomStay: o.roomStay ? {
          ...o.roomStay,
          checkInText: o.roomStay.check_in_at ? this.formatDate(o.roomStay.check_in_at) : '',
          checkOutText: o.roomStay.check_out_at ? this.formatDate(o.roomStay.check_out_at) : ''
        } : null
      })), loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  toggleForm() { this.setData({ showForm: !this.data.showForm }); },
  onTypeChange(e) { this.setData({ 'form.type': this.data.typeKeys[e.detail.value] }); },
  onField(e) { this.setData({ ['form.' + e.currentTarget.dataset.f]: e.detail.value }); },

  async submit() {
    const { type, title, detail, contact, room_no } = this.data.form;
    if (!title.trim()) { wx.showToast({ title: '请填写标题', icon: 'none' }); return; }
    try {
      await api.createRequirement({ type, title: title.trim(), detail, contact, room_no });
      api.requestSubscribeMsg(); // 授权接收状态变更通知
      this.setData({ showForm: false, form: { type: 'accommodation', title: '', detail: '', contact: '', room_no: '' } });
      wx.showToast({ title: '已提交', icon: 'success' });
      this.load();
    } catch (e) { wx.showToast({ title: e.message || '失败', icon: 'none' }); }
  },

  async action(e) {
    const { id, target } = e.currentTarget.dataset;
    if (!target) return;
    try {
      await api.updateRequirementStatus(id, target, '用户操作');
      api.requestSubscribeMsg();
      this.load();
    }
    catch (err) { wx.showToast({ title: err.message, icon: 'none' }); }
  },

  formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  // 分享：需求单页涉及登录/表单交互，仅开启转发（朋友圈单页模式无登录态，体验差）
  onShareAppMessage() {
    return {
      title: getScope('khmerBiz').requirement.shareTitle,
      path: '/pages/requirement/requirement'
    };
  }
});
