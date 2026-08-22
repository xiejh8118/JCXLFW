// pages/operator/operator.js - 运营工作台（处理客户需求单）
const { getScope, getCurrentLang } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

const APP = getApp();
const TOKEN_KEY = 'operator_token';

Page({
  data: {
    L: getScope('operator'),
    token: '',
    isLogin: false,
    requirements: [],
    loading: false,
    moduleFilter: '',
    moduleOptions: ['', 'hotel', 'repair', 'frontdesk'],
    stats: { total: 0, overdue: 0 },
    panel: { show: false, id: 0, assignedTo: '', quote: '', remark: '' },
    // 房态管理（住宿闭环）
    activeTab: 'req',
    rooms: [],
    roomLoading: false,
    roomFilter: '',
    roomFilters: ['', 'reserved', 'checked_in', 'checked_out'],
    roomStats: { stay: 0, out: 0, income: '0' },
    createRoom: { show: false, room_no: '', guest_name: '', requirement_id: '', payment: '' },
    payRoom: { show: false, id: 0, amount: '', paid: '', method: '', received_by: '' }
  },

  onLoad() {
    this.refreshLang();
    const token = wx.getStorageSync(TOKEN_KEY) || '';
    if (token) {
      this.setData({ token, isLogin: true });
      this.loadRequirements();
    }
  },

  onShow() {
    this.refreshLang();
    if (this.data.isLogin) this.loadRequirements();
  },

  onPullDownRefresh() {
    if (this.data.isLogin) {
      this.loadRequirements().finally(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  refreshLang() {
    wx.setNavigationBarTitle({ title: getScope('operator').title });
    this.setData({ L: getScope('operator') });
  },

  onLanguageChange() {
    this.refreshLang();
  },

  onTokenInput(e) {
    this.setData({ token: e.detail.value });
  },

  onLogin() {
    const token = this.data.token.trim();
    if (!token) {
      wx.showToast({ title: this.data.L.needToken, icon: 'none' });
      return;
    }
    wx.setStorageSync(TOKEN_KEY, token);
    this.setData({ isLogin: true });
    this.loadRequirements();
  },

  onLogout() {
    wx.removeStorageSync(TOKEN_KEY);
    this.setData({ token: '', isLogin: false, requirements: [] });
  },

  onModuleFilter(e) {
    const module = e.currentTarget.dataset.module || '';
    this.setData({ moduleFilter: module });
    this.loadRequirements();
  },

  async loadRequirements() {
    this.setData({ loading: true });
    try {
      const lang = getCurrentLang();
      const list = await api.adminRequirementList(this.data.token, lang, this.data.moduleFilter);
      const requirements = (list || []).map(r => ({
        ...r,
        createdAtText: this.formatDate(r.created_at),
        overdue: !!r.overdue
      }));
      const overdue = requirements.filter(r => r.overdue).length;
      this.setData({ requirements, loading: false, stats: { total: requirements.length, overdue } });
    } catch (e) {
      console.error('[operator] load fail:', e);
      wx.showToast({ title: this.data.L.loadFail, icon: 'none' });
      this.setData({ loading: false });
      // 401 说明口令失效，自动退出
      if (e.message && e.message.includes('权限')) {
        this.onLogout();
      }
    }
  },

  onAction(e) {
    const { id, next, label } = e.currentTarget.dataset;
    const L = this.data.L;
    let confirmText = '';
    if (next === 'accepted') confirmText = L.confirmAccept;
    if (next === 'processing') confirmText = L.confirmProcess;
    if (next === 'completed') confirmText = L.confirmComplete;

    wx.showModal({
      title: label,
      content: confirmText,
      editable: true,
      placeholderText: L.notePlaceholder,
      success: (res) => {
        if (res.confirm) {
          this.doUpdate(id, next, res.content || '');
        }
      }
    });
  },

  async doUpdate(id, status, note) {
    wx.showLoading({ title: '处理中' });
    try {
      await api.adminRequirementUpdate(id, { status, note }, this.data.token);
      wx.showToast({ title: this.data.L.actionSuccess, icon: 'success' });
      this.loadRequirements();
    } catch (e) {
      console.error('[operator] update fail:', e);
      wx.showToast({ title: this.data.L.actionFail, icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ---- 录入面板（接单人 / 报价 / 备注）----
  onOpenEntry(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.requirements.find(r => r.id === id);
    if (!item) return;
    this.setData({
      panel: {
        show: true,
        id,
        assignedTo: item.assigned_to || '',
        quote: item.quote || '',
        remark: item.remark || ''
      }
    });
  },

  onCloseEntry() {
    this.setData({ 'panel.show': false });
  },

  onPanelInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['panel.' + field]: e.detail.value });
  },

  async onSaveEntry() {
    const { id, assignedTo, quote, remark } = this.data.panel;
    if (!id) return;
    wx.showLoading({ title: '保存中' });
    try {
      await api.adminRequirementUpdate(
        id,
        { assignedTo, quote, remark },
        this.data.token
      );
      wx.showToast({ title: this.data.L.entrySaved, icon: 'success' });
      this.setData({ 'panel.show': false });
      this.loadRequirements();
    } catch (e) {
      console.error('[operator] entry save fail:', e);
      wx.showToast({ title: this.data.L.entryFail, icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ---- 房态管理（住宿闭环：建档/入住/退房/收款）----
  onTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'room') this.loadRooms();
    else this.loadRequirements();
  },
  onRoomFilter(e) {
    const f = e.currentTarget.dataset.filter || '';
    this.setData({ roomFilter: f });
    this.loadRooms();
  },
  async loadRooms() {
    this.setData({ roomLoading: true });
    try {
      const lang = getCurrentLang();
      const all = await api.adminRoomStayList(this.data.token, { lang });
      const filtered = this.data.roomFilter ? (all || []).filter(r => r.status === this.data.roomFilter) : (all || []);
      const rooms = filtered.map(r => ({
        ...r,
        checkInText: r.check_in_at ? this.formatDate(r.check_in_at) : '',
        checkOutText: r.check_out_at ? this.formatDate(r.check_out_at) : ''
      }));
      let stay = 0, out = 0, income = 0;
      (all || []).forEach(r => {
        if (r.status === 'checked_in') stay++;
        if (r.status === 'checked_out') out++;
        const raw = (r.payment && r.payment.paid) || '';
        const m = String(raw).match(/[\d.]+/);
        if (m) income += parseFloat(m[0]);
      });
      const incomeText = income > 0 ? income.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0';
      this.setData({ rooms, roomLoading: false, roomStats: { stay, out, income: incomeText } });
    } catch (e) {
      console.error('[operator] room load fail:', e);
      this.setData({ roomLoading: false });
    }
  },
  onOpenCreate() {
    this.setData({ createRoom: { show: true, room_no: '', guest_name: '', requirement_id: '', payment: '' } });
  },
  onCloseCreate() { this.setData({ 'createRoom.show': false }); },
  onCreateInput(e) { this.setData({ ['createRoom.' + e.currentTarget.dataset.field]: e.detail.value }); },
  async onCreateRoom() {
    const { room_no, guest_name, requirement_id, payment } = this.data.createRoom;
    if (!room_no.trim()) { wx.showToast({ title: this.data.L.roomNoRequired, icon: 'none' }); return; }
    wx.showLoading({ title: '创建中' });
    try {
      await api.adminRoomStayCreate({
        room_no: room_no.trim(),
        guest_name: guest_name.trim(),
        requirement_id: requirement_id ? Number(requirement_id) : undefined,
        payment: payment ? { amount: payment.trim() } : undefined
      }, this.data.token);
      wx.showToast({ title: '已建档', icon: 'success' });
      this.setData({ 'createRoom.show': false });
      this.loadRooms();
    } catch (e) {
      wx.showToast({ title: e.message || '失败', icon: 'none' });
    } finally { wx.hideLoading(); }
  },
  async onRoomCheckIn(e) {
    const { id } = e.currentTarget.dataset;
    wx.showLoading({ title: '办理中' });
    try {
      await api.adminRoomStayUpdate(id, { status: 'checked_in' }, this.data.token);
      wx.showToast({ title: this.data.L.roomCheckIn + ' ✓', icon: 'success' });
      this.loadRooms();
    } catch (e) { wx.showToast({ title: e.message || '失败', icon: 'none' }); }
    finally { wx.hideLoading(); }
  },
  onRoomCheckOut(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: this.data.L.roomCheckOut,
      content: this.data.L.roomCheckOut + '？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '办理中' });
          api.adminRoomStayUpdate(id, { status: 'checked_out' }, this.data.token)
            .then(() => { wx.showToast({ title: '已退房', icon: 'success' }); this.loadRooms(); })
            .catch(err => wx.showToast({ title: err.message || '失败', icon: 'none' }))
            .finally(() => wx.hideLoading());
        }
      }
    });
  },
  onOpenPay(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.rooms.find(r => r.id === id);
    if (!item) return;
    const pay = (item.payment && item.payment) || {};
    this.setData({ payRoom: { show: true, id, amount: pay.amount || '', paid: pay.paid || '', method: pay.method || '', received_by: pay.received_by || '' } });
  },
  onClosePay() { this.setData({ 'payRoom.show': false }); },
  onPayInput(e) { this.setData({ ['payRoom.' + e.currentTarget.dataset.field]: e.detail.value }); },
  async onSavePay() {
    const { id, amount, paid, method, received_by } = this.data.payRoom;
    if (!id) return;
    wx.showLoading({ title: '保存中' });
    try {
      await api.adminRoomStayUpdate(id, { payment: { amount, paid, method, received_by } }, this.data.token);
      wx.showToast({ title: '已保存', icon: 'success' });
      this.setData({ 'payRoom.show': false });
      this.loadRooms();
    } catch (e) {
      wx.showToast({ title: e.message || '失败', icon: 'none' });
    } finally { wx.hideLoading(); }
  },

  formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
});
