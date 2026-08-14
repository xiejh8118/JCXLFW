// pages/property/property.js - 中鼎物业工作台
// 复刻 GitHub jianshui-notes/中鼎物业工作台 核心功能
// 收费台账 + 水电抄表 + 收缴管理 + 用户登录

// ===== 存储键 =====
const LS_RECORDS = 'zd_prop_records';
const LS_ROOMS = 'zd_prop_rooms';
const LS_RATES = 'zd_prop_rates';
const LS_USERS = 'zd_prop_users';
const LS_SESSION = 'zd_prop_session';

// ===== 默认配置 =====
const DEFAULT_WATER_RATE = 0.7;   // $/吨
const DEFAULT_ELEC_RATE = 0.205;  // $/度

function pad2(n) { return String(n).padStart(2, '0'); }

function getCurrentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
}

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function fmtMoney(v) {
  const n = Number(v) || 0;
  return '$' + n.toFixed(2);
}

function genId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// ===== 权限定义 =====
const PERMISSION_DEFS = [
  { key: 'meter', label: '抄表录入', desc: '录入/编辑水电读数' },
  { key: 'ledger_edit', label: '台账编辑', desc: '修改已保存的台账记录' },
  { key: 'ledger_delete', label: '台账删除', desc: '删除台账记录' },
  { key: 'receipt_pdf', label: '账单打印', desc: '生成 PDF 账单' },
  { key: 'rate_setting', label: '费率设置', desc: '修改水电费率' },
  { key: 'user_manage', label: '人员管理', desc: '增删改操作人员' }
];
const ALL_PERMS = PERMISSION_DEFS.map(p => p.key);
const DEFAULT_ADMIN_PERMS = [...ALL_PERMS];
const DEFAULT_OPERATOR_PERMS = ['meter', 'receipt_pdf'];

function normalizePerms(perms, role) {
  if (Array.isArray(perms) && perms.length) return perms;
  return role === 'admin' ? DEFAULT_ADMIN_PERMS : DEFAULT_OPERATOR_PERMS;
}

Page({
  data: {
    // 登录态
    isLoggedIn: false,
    currentUser: null,
    currentPerms: [],   // 当前登录用户的权限列表
    permState: {},      // 权限布尔状态，供模板 wx:if 直接判断
    loginForm: { username: '', password: '' },
    loginError: '',

    // Tab
    currentTab: 'today', // today / ledger / meter / users

    // 数据
    records: [],        // 原始记录
    displayRecords: [], // 预计算后的展示记录
    todayTasks: [],     // 今日待办
    rooms: [],
    users: [],
    isAdmin: false,

    // 权限定义（用于模板渲染）
    permissionDefs: PERMISSION_DEFS,

    // 筛选
    filterMonth: '',
    filterMonths: [],

    // 费率
    rates: { water: DEFAULT_WATER_RATE, elec: DEFAULT_ELEC_RATE },

    // 抄表表单
    meterForm: {
      room: '',
      month: '',
      prevWater: '',
      currWater: '',
      prevElec: '',
      currElec: '',
      rent: '',
      remark: ''
    },
    meterCalc: { waterUsage: 0, elecUsage: 0, waterFee: 0, elecFee: 0, total: 0 },

    // 用户表单
    userForm: { id: '', username: '', password: '', role: 'operator', permissions: [...DEFAULT_OPERATOR_PERMS] },
    userPermMap: {},   // 用户表单权限的键值映射，供模板直接使用
    userModalShown: false,
    userModalTitle: '',

    // 编辑
    editingId: '',

    // 统计
    stats: { totalRooms: 0, unpaidCount: 0, unpaidAmount: 0, monthCollected: 0 }
  },

  onLoad() {
    this.initData();
    this.restoreSession();
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.refreshAll();
    }
  },

  onPullDownRefresh() {
    this.refreshAll();
    wx.stopPullDownRefresh();
  },

  // ===== 初始化 =====
  initData() {
    // 费率
    const rates = wx.getStorageSync(LS_RATES) || { water: DEFAULT_WATER_RATE, elec: DEFAULT_ELEC_RATE };
    // 房号
    const rooms = wx.getStorageSync(LS_ROOMS) || [];
    // 用户（确保 admin 存在，并补全权限 + 头像首字符）
    let users = wx.getStorageSync(LS_USERS) || [];
    let dirty = false;
    users = users.map(u => {
      const base = { ...u, avatarChar: (u.username || '?').charAt(0).toUpperCase() };
      if (!Array.isArray(u.permissions) || !u.permissions.length) {
        dirty = true;
        return { ...base, permissions: normalizePerms(u.permissions, u.role) };
      }
      return base;
    });
    const hasAdmin = users.some(u => u.username === 'admin');
    if (!hasAdmin) {
      users.push({ id: 'admin', username: 'admin', password: 'admin123', role: 'admin', permissions: DEFAULT_ADMIN_PERMS, createdAt: '系统默认', avatarChar: 'A' });
      dirty = true;
    }
    if (dirty) wx.setStorageSync(LS_USERS, users);
    this.setData({ rates, rooms, users });
  },

  restoreSession() {
    const session = wx.getStorageSync(LS_SESSION);
    if (session && session.username) {
      const users = wx.getStorageSync(LS_USERS) || [];
      const u = users.find(x => x.id === session.id);
      const perms = u ? normalizePerms(u.permissions, u.role) : (session.role === 'admin' ? DEFAULT_ADMIN_PERMS : DEFAULT_OPERATOR_PERMS);
      this.setData({
        isLoggedIn: true,
        currentUser: { ...session, avatarChar: (session.username || '?').charAt(0).toUpperCase() },
        currentPerms: perms,
        isAdmin: session.role === 'admin',
        permState: this.buildPermState()
      });
      this.refreshAll();
    }
  },

  // ===== 登录 =====
  onLoginInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['loginForm.' + field]: e.detail.value });
  },

  doLogin() {
    const { username, password } = this.data.loginForm;
    if (!username || !password) {
      this.setData({ loginError: '请输入用户名和密码' });
      return;
    }
    const users = wx.getStorageSync(LS_USERS) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      this.setData({ loginError: '用户名或密码错误' });
      return;
    }
    const session = { id: user.id, username: user.username, role: user.role };
    const perms = normalizePerms(user.permissions, user.role);
    wx.setStorageSync(LS_SESSION, session);
    this.setData({
      isLoggedIn: true,
      currentUser: { ...session, avatarChar: (session.username || '?').charAt(0).toUpperCase() },
      currentPerms: perms,
      isAdmin: session.role === 'admin',
      permState: this.buildPermState(),
      loginError: '',
      loginForm: { username: '', password: '' }
    });
    this.refreshAll();
  },

  // 权限检查（管理员始终放行）
  hasPermission(key) {
    return this.data.isAdmin || (this.data.currentPerms || []).includes(key);
  },

  // 把权限展开成模板可直接使用的布尔对象
  buildPermState() {
    const state = {};
    ALL_PERMS.forEach(k => { state[k] = this.hasPermission(k); });
    return state;
  },

  buildPermMap(perms) {
    const map = {};
    ALL_PERMS.forEach(k => { map[k] = (perms || []).includes(k); });
    return map;
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确认退出登录？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(LS_SESSION);
          this.setData({ isLoggedIn: false, currentUser: null, isAdmin: false, currentPerms: [], permState: {}, currentTab: 'today' });
        }
      }
    });
  },

  // ===== 数据刷新 =====
  refreshAll() {
    const records = wx.getStorageSync(LS_RECORDS) || [];
    this.setData({ records });
    this.renderFilterMonths();
    this.renderDisplayRecords();
    this.renderTodayTasks();
    this.renderStats();
  },

  // ===== 计算单条记录 =====
  calcRecord(r) {
    const waterUsage = Math.max(0, (Number(r.currWater) || 0) - (Number(r.prevWater) || 0));
    const elecUsage = Math.max(0, (Number(r.currElec) || 0) - (Number(r.prevElec) || 0));
    const waterFee = waterUsage * (Number(this.data.rates.water) || DEFAULT_WATER_RATE);
    const elecFee = elecUsage * (Number(this.data.rates.elec) || DEFAULT_ELEC_RATE);
    const rent = Number(r.rent) || 0;
    const total = waterFee + elecFee + rent;
    return { waterUsage, elecUsage, waterFee, elecFee, rent, total };
  },

  // ===== 渲染展示记录 =====
  renderDisplayRecords() {
    const { records, filterMonth } = this.data;
    let list = records;
    if (filterMonth) {
      list = records.filter(r => r.month === filterMonth);
    }
    // 按月份降序、房号升序
    list = list.slice().sort((a, b) => {
      if (a.month !== b.month) return a.month < b.month ? 1 : -1;
      return (a.room || '').localeCompare(b.room || '');
    });
    const displayRecords = list.map(r => {
      const c = this.calcRecord(r);
      return {
        ...r,
        waterUsageText: c.waterUsage + ' 吨',
        elecUsageText: c.elecUsage + ' 度',
        waterFeeText: fmtMoney(c.waterFee),
        elecFeeText: fmtMoney(c.elecFee),
        rentText: fmtMoney(c.rent),
        totalText: fmtMoney(c.total),
        payStatusClass: r.payStatus === '已缴' ? 'paid' : (r.payStatus === '部分' ? 'partial' : 'unpaid'),
        collectStatusClass: r.collectStatus === '已结清' ? 'settled' : (r.collectStatus === '已催收' ? 'collected' : (r.collectStatus === '已承诺' ? 'promised' : 'uncollected'))
      };
    });
    this.setData({ displayRecords });
  },

  // ===== 今日待办 =====
  renderTodayTasks() {
    const cm = getCurrentMonth();
    const records = this.data.records;
    const tasks = [];
    records.forEach(r => {
      if (r.payStatus === '已缴') return;
      const c = this.calcRecord(r);
      let cls = 'info', label = '本月待缴';
      if (r.month < cm) { cls = 'overdue'; label = '逾期未缴'; }
      else if (r.payStatus === '部分') { cls = 'warning'; label = '部分缴费'; }
      tasks.push({
        ...r,
        totalText: fmtMoney(c.total),
        taskClass: cls,
        taskLabel: label
      });
    });
    // 逾期优先
    tasks.sort((a, b) => {
      const order = { overdue: 0, warning: 1, info: 2 };
      return (order[a.taskClass] || 9) - (order[b.taskClass] || 9);
    });
    this.setData({ todayTasks: tasks });
  },

  // ===== 筛选月份 =====
  renderFilterMonths() {
    const months = {};
    this.data.records.forEach(r => { if (r.month) months[r.month] = 1; });
    const filterMonths = Object.keys(months).sort().reverse();
    this.setData({ filterMonths });
  },

  onFilterMonth(e) {
    const idx = e.detail.value;
    const month = this.data.filterMonths[idx] || '';
    this.setData({ filterMonth: month });
    this.renderDisplayRecords();
  },

  // ===== 统计 =====
  renderStats() {
    const records = this.data.records;
    const cm = getCurrentMonth();
    const rooms = new Set(records.map(r => r.room).filter(Boolean));
    let unpaidCount = 0, unpaidAmount = 0, monthCollected = 0;
    records.forEach(r => {
      const c = this.calcRecord(r);
      if (r.payStatus !== '已缴') {
        unpaidCount++;
        unpaidAmount += c.total;
      }
      if (r.month === cm && r.payStatus === '已缴') {
        monthCollected += c.total;
      }
    });
    this.setData({
      stats: {
        totalRooms: rooms.size,
        unpaidCount,
        unpaidAmountText: fmtMoney(unpaidAmount),
        monthCollectedText: fmtMoney(monthCollected)
      }
    });
  },

  // ===== Tab 切换 =====
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    if (tab === 'meter') {
      // 默认填入当前月份
      if (!this.data.meterForm.month) {
        this.setData({ 'meterForm.month': getCurrentMonth() });
      }
    }
  },

  // ===== 抄表表单 =====
  onMeterInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['meterForm.' + field]: e.detail.value });
    this.calcMeterForm();
  },

  calcMeterForm() {
    const f = this.data.meterForm;
    const waterUsage = Math.max(0, (Number(f.currWater) || 0) - (Number(f.prevWater) || 0));
    const elecUsage = Math.max(0, (Number(f.currElec) || 0) - (Number(f.prevElec) || 0));
    const waterFee = waterUsage * (Number(this.data.rates.water) || DEFAULT_WATER_RATE);
    const elecFee = elecUsage * (Number(this.data.rates.elec) || DEFAULT_ELEC_RATE);
    const rent = Number(f.rent) || 0;
    const total = waterFee + elecFee + rent;
    const calc = { waterUsage, elecUsage, waterFee, elecFee, rent, total };
    this.setData({
      meterCalc: {
        waterUsage: waterUsage,
        elecUsage: elecUsage,
        waterFee: waterFee.toFixed(2),
        elecFee: elecFee.toFixed(2),
        total: total.toFixed(2)
      }
    });
    return calc;
  },

  saveMeterRecord() {
    const f = this.data.meterForm;
    if (!f.room) { wx.showToast({ title: '请输入房号', icon: 'none' }); return; }
    if (!f.month) { wx.showToast({ title: '请选择月份', icon: 'none' }); return; }

    const records = wx.getStorageSync(LS_RECORDS) || [];

    // 检查同房号+月份是否已存在（编辑模式跳过自身）
    const existIdx = records.findIndex(r => r.room === f.room && r.month === f.month && r.id !== this.data.editingId);
    if (existIdx >= 0 && !this.data.editingId) {
      wx.showModal({
        title: '记录已存在',
        content: `房号 ${f.room} 在 ${f.month} 已有记录，是否覆盖？`,
        success: (res) => {
          if (res.confirm) {
            records.splice(existIdx, 1);
            this._doSaveRecord(records, f);
          }
        }
      });
      return;
    }
    this._doSaveRecord(records, f);
  },

  _doSaveRecord(records, f) {
    const c = this.calcMeterForm();
    const record = {
      id: this.data.editingId || genId(),
      room: f.room,
      month: f.month,
      prevWater: f.prevWater,
      currWater: f.currWater,
      prevElec: f.prevElec,
      currElec: f.currElec,
      rent: f.rent,
      remark: f.remark,
      waterFee: c.waterFee,
      elecFee: c.elecFee,
      payStatus: '未缴',
      collectStatus: '未催收',
      createdAt: getToday()
    };

    if (this.data.editingId) {
      // 编辑：保留原状态
      const idx = records.findIndex(r => r.id === this.data.editingId);
      if (idx >= 0) {
        record.payStatus = records[idx].payStatus || '未缴';
        record.collectStatus = records[idx].collectStatus || '未催收';
        records[idx] = record;
      }
    } else {
      records.push(record);
    }

    // 保存房号
    const rooms = wx.getStorageSync(LS_ROOMS) || [];
    if (rooms.indexOf(f.room) < 0) {
      rooms.push(f.room);
      rooms.sort();
      wx.setStorageSync(LS_ROOMS, rooms);
      this.setData({ rooms });
    }

    wx.setStorageSync(LS_RECORDS, records);
    this.setData({ editingId: '' });
    this.resetMeterForm();
    this.refreshAll();
    wx.showToast({ title: '记录已保存', icon: 'success' });
  },

  resetMeterForm() {
    this.setData({
      meterForm: { room: '', month: getCurrentMonth(), prevWater: '', currWater: '', prevElec: '', currElec: '', rent: '', remark: '' },
      meterCalc: { waterUsage: 0, elecUsage: 0, waterFee: 0, elecFee: 0, total: 0 },
      editingId: ''
    });
  },

  // ===== 编辑记录 =====
  editRecord(e) {
    const id = e.currentTarget.dataset.id;
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const r = records.find(x => x.id === id);
    if (!r) return;
    this.setData({
      editingId: id,
      meterForm: {
        room: r.room,
        month: r.month,
        prevWater: r.prevWater || '',
        currWater: r.currWater || '',
        prevElec: r.prevElec || '',
        currElec: r.currElec || '',
        rent: r.rent || '',
        remark: r.remark || ''
      },
      currentTab: 'meter'
    });
    this.calcMeterForm();
  },

  // ===== 删除记录 =====
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除这条记录？',
      success: (res) => {
        if (res.confirm) {
          let records = wx.getStorageSync(LS_RECORDS) || [];
          records = records.filter(r => r.id !== id);
          wx.setStorageSync(LS_RECORDS, records);
          this.refreshAll();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // ===== 状态切换 =====
  markPaid(e) {
    const id = e.currentTarget.dataset.id;
    this._updateRecord(id, { payStatus: '已缴' });
    wx.showToast({ title: '已标记已缴', icon: 'success' });
  },

  cyclePayStatus(e) {
    const id = e.currentTarget.dataset.id;
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const r = records.find(x => x.id === id);
    if (!r) return;
    const cycle = ['未缴', '部分', '已缴'];
    const idx = cycle.indexOf(r.payStatus || '未缴');
    const next = cycle[(idx + 1) % cycle.length];
    this._updateRecord(id, { payStatus: next });
  },

  cycleCollectStatus(e) {
    const id = e.currentTarget.dataset.id;
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const r = records.find(x => x.id === id);
    if (!r) return;
    const cycle = ['未催收', '已催收', '已承诺', '已结清'];
    const idx = cycle.indexOf(r.collectStatus || '未催收');
    const next = cycle[(idx + 1) % cycle.length];
    this._updateRecord(id, { collectStatus: next });
  },

  _updateRecord(id, patch) {
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx < 0) return;
    records[idx] = { ...records[idx], ...patch };
    wx.setStorageSync(LS_RECORDS, records);
    this.refreshAll();
  },

  // ===== 费率设置 =====
  onRateInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['rates.' + field]: e.detail.value });
  },

  saveRates() {
    wx.setStorageSync(LS_RATES, this.data.rates);
    this.refreshAll();
    wx.showToast({ title: '费率已保存', icon: 'success' });
  },

  // ===== 用户管理（管理员）=====
  openUserModal(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      const users = wx.getStorageSync(LS_USERS) || [];
      const u = users.find(x => x.id === id);
      if (u) {
        const perms = normalizePerms(u.permissions, u.role);
        this.setData({
          userModalShown: true,
          userModalTitle: '编辑用户',
          userForm: { id: u.id, username: u.username, password: u.password, role: u.role, permissions: perms },
          userPermMap: this.buildPermMap(perms)
        });
      }
    } else {
      const perms = [...DEFAULT_OPERATOR_PERMS];
      this.setData({
        userModalShown: true,
        userModalTitle: '新增操作员',
        userForm: { id: '', username: '', password: '', role: 'operator', permissions: perms },
        userPermMap: this.buildPermMap(perms)
      });
    }
  },

  closeUserModal() {
    this.setData({ userModalShown: false });
  },

  onUserInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['userForm.' + field]: e.detail.value });
  },

  onUserRoleChange(e) {
    const idx = e.detail.value;
    const role = idx === 0 ? 'admin' : 'operator';
    const perms = role === 'admin' ? [...DEFAULT_ADMIN_PERMS] : [...DEFAULT_OPERATOR_PERMS];
    this.setData({
      'userForm.role': role,
      'userForm.permissions': perms,
      userPermMap: this.buildPermMap(perms)
    });
  },

  // 勾选/取消权限
  toggleUserPermission(e) {
    const key = e.currentTarget.dataset.key;
    const perms = new Set(this.data.userForm.permissions || []);
    if (perms.has(key)) perms.delete(key);
    else perms.add(key);
    const arr = Array.from(perms);
    this.setData({
      'userForm.permissions': arr,
      userPermMap: this.buildPermMap(arr)
    });
  },

  saveUser() {
    const { id, username, password, role, permissions } = this.data.userForm;
    if (!username || !password) {
      wx.showToast({ title: '用户名和密码不能为空', icon: 'none' });
      return;
    }
    let users = wx.getStorageSync(LS_USERS) || [];
    const dup = users.find(u => u.username === username && u.id !== id);
    if (dup) {
      wx.showToast({ title: '用户名已存在', icon: 'none' });
      return;
    }
    const perms = role === 'admin' ? DEFAULT_ADMIN_PERMS : (permissions || DEFAULT_OPERATOR_PERMS);
    const avatarChar = (username || '?').charAt(0).toUpperCase();
    if (id) {
      const u = users.find(x => x.id === id);
      if (u) { u.username = username; u.password = password; u.role = role; u.permissions = perms; u.avatarChar = avatarChar; }
    } else {
      users.push({ id: 'u' + Date.now().toString(36), username, password, role, permissions: perms, createdAt: getToday(), avatarChar });
    }
    wx.setStorageSync(LS_USERS, users);
    this.setData({ users, userModalShown: false });
    wx.showToast({ title: '用户已保存', icon: 'success' });
  },

  deleteUser(e) {
    const id = e.currentTarget.dataset.id;
    const users = wx.getStorageSync(LS_USERS) || [];
    const u = users.find(x => x.id === id);
    if (!u) return;
    if (u.username === 'admin') {
      wx.showToast({ title: '默认管理员不可删除', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认删除',
      content: '确认删除用户「' + u.username + '」？',
      success: (res) => {
        if (res.confirm) {
          const newUsers = users.filter(x => x.id !== id);
          wx.setStorageSync(LS_USERS, newUsers);
          this.setData({ users: newUsers });
          wx.showToast({ title: '用户已删除', icon: 'success' });
        }
      }
    });
  },

  // ===== 选择房号 =====
  onRoomPick(e) {
    this.setData({ 'meterForm.room': e.detail.value });
  },

  // ===== 生成 PDF 账单 =====
  onGenPdf(e) {
    const id = e.currentTarget.dataset.id;
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const r = records.find(x => x.id === id);
    if (!r) return;

    wx.showLoading({ title: '生成PDF中...', mask: true });
    // PDF 里要显示操作人，这里复制一份记录并附加
    const recordForPdf = { ...r, _operator: (this.data.currentUser && this.data.currentUser.username) || '管理员' };
    wx.cloud.callFunction({
      name: 'genReceiptPdf',
      data: {
        record: recordForPdf,
        rates: this.data.rates,
        company: {
          name: '中鼎物业管理有限公司',
          addr: '柬埔寨 · 金边',
          tel: ''
        }
      },
      success: (res) => {
        wx.hideLoading();
        const result = res.result || {};
        if (result.ok) {
          this.openReceiptPdf(result.fileID);
        } else {
          wx.showModal({ title: '生成失败', content: result.error || '未知错误', showCancel: false });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showModal({
          title: '生成失败',
          content: '云函数未部署或未配置云环境。\n请在开发者工具中右键 cloudfunctions/genReceiptPdf → 上传并部署：云端安装依赖',
          showCancel: false
        });
      }
    });
  },

  openReceiptPdf(fileID) {
    wx.showLoading({ title: '打开PDF...', mask: true });
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        wx.hideLoading();
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          showMenu: true, // 支持右上角菜单：转发/发送/打印
          success: () => {},
          fail: () => {
            wx.showToast({ title: '打开PDF失败', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载PDF失败', icon: 'none' });
      }
    });
  },

  // ===== 分享 =====
  onShareAppMessage() {
    return {
      title: '中鼎物业工作台 - 收费台账 · 水电抄表',
      path: '/pages/property/property'
    };
  },

  onShareTimeline() {
    return {
      title: '中鼎物业工作台',
      query: ''
    };
  }
});
