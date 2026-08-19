// pages/property/property.js - 中鼎物业工作台
// 复刻 GitHub jianshui-notes/中鼎物业工作台 核心功能
// 收费台账 + 水电抄表 + 收缴管理 + 用户登录
// 支持中/英/柬三语（跟随全局语言设置，含 Canvas 账单）

const { t, getScope } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

// ===== 存储键 =====
const LS_RECORDS = 'zd_prop_records';
const LS_ROOMS = 'zd_prop_rooms';
const LS_RATES = 'zd_prop_rates';
const LS_USERS = 'zd_prop_users';
const LS_SESSION = 'zd_prop_session';

// ===== 默认配置 =====
const DEFAULT_WATER_RATE = 0.7;   // $/吨
const DEFAULT_ELEC_RATE = 0.205;  // $/度
const DEFAULT_LOW_ELEC_THRESHOLD = 100; // 电表剩余电量提醒阈值（度）

// 预设房号清单（来自 美田/酒店初始化信息.xls 房间信息表，327 个，已去重）
const DEFAULT_ROOMS = [
  'G01 商铺', 'G02 商铺', 'G03 商铺', 'G05 商铺', 'G06 商铺', 'G07 商铺', 'G08 商铺', 'G09 商铺',
  'G10 商铺', 'G11 商铺', 'G12 商铺', 'G13 商铺', 'G15 商铺', 'G16 商铺', 'A201', 'B201',
  'B202', 'B203', 'B205', 'B206', 'B207', 'B208', 'B209', 'B210',
  'A301', 'A302', 'A303', 'A305', 'A306', 'A307', 'A308', 'A309',
  'A310', 'A311', 'A312', 'A313', 'A315', 'A316', 'A317', 'A318',
  'B301', 'B302', 'B303', 'B305', 'B306', 'B307', 'B308', 'B309',
  'B310', 'A501', 'A502', 'A503', 'A505', 'A506', 'A507', 'A508',
  'A509', 'A510', 'A511', 'A512', 'A513', 'A515', 'A516', 'A517',
  'A518', 'B501', 'B502', 'B503', 'B505', 'B506', 'B507', 'B508',
  'B509', 'B510', 'A601', 'A602', 'A603', 'A605', 'A606', 'A607',
  'A608', 'A609', 'A610', 'A611', 'A612', 'A613', 'A615', 'A616',
  'A617', 'A618', 'B601', 'B602', 'B603', 'B605', 'B606', 'B607',
  'B608', 'B609', 'B610', 'A701', 'A702', 'A703', 'A705', 'A706',
  'A707', 'A708', 'A709', 'A710', 'A711', 'A712', 'A713', 'A715',
  'A716', 'A717', 'A718', 'B701', 'B702', 'B703', 'B705', 'B706',
  'B707', 'B708', 'B709', 'B710', 'A801', 'A802', 'A803', 'A805',
  'A806', 'A807', 'A808', 'A809', 'A810', 'A811', 'A812', 'A813',
  'A815', 'A816', 'A817', 'A818', 'B801', 'B802', 'B803', 'B805',
  'B806', 'B807', 'B808', 'B809', 'B810', 'A901', 'A902', 'A903',
  'A905', 'A906', 'A907', 'A908', 'A909', 'A910', 'A911', 'A912',
  'A913', 'A915', 'A916', 'A917', 'A918', 'B901', 'B902', 'B903',
  'B905', 'B906', 'B907', 'B908', 'B909', 'B910', 'A1001', 'A1002',
  'A1003', 'A1005', 'A1006', 'A1007', 'A1008', 'A1009', 'A1010', 'A1011',
  'A1012', 'A1013', 'A1015', 'A1016', 'A1017', 'A1018', 'B1001', 'B1002',
  'B1003', 'B1005', 'B1006', 'B1007', 'B1008', 'B1009', 'B1010', 'A1101',
  'A1102', 'A1103', 'A1105', 'A1106', 'A1107', 'A1108', 'A1109', 'A1110',
  'A1111', 'A1112', 'A1113', 'A1115', 'A1116', 'A1117', 'A1118', 'B1101',
  'B1102', 'B1103', 'B1105', 'B1106', 'B1107', 'B1108', 'B1109', 'B1110',
  'A1201', 'A1202', 'A1203', 'A1205', 'A1206', 'A1207', 'A1208', 'A1209',
  'A1210', 'A1211', 'A1212', 'A1213', 'A1215', 'A1216', 'A1217', 'A1218',
  'B1201', 'B1202', 'B1203', 'B1205', 'B1206', 'B1207', 'B1208', 'B1209',
  'B1210', 'A1301', 'A1302', 'A1303', 'A1305', 'A1306', 'A1307', 'A1308',
  'A1309', 'A1310', 'A1311', 'A1312', 'A1313', 'A1315', 'A1316', 'A1317',
  'A1318', 'B1301', 'B1302', 'B1303', 'B1305', 'B1306', 'B1307', 'B1308',
  'B1309', 'B1310', 'B1311', 'A1501', 'A1502', 'A1503', 'A1505', 'A1506',
  'A1507', 'A1508', 'A1509', 'A1510', 'A1511', 'A1512', 'A1513', 'A1515',
  'A1516', 'A1517', 'A1518', 'B1501', 'B1502', 'B1503', 'B1505', 'B1506',
  'B1507', 'B1508', 'B1509', 'B1510', 'A1601', 'A1602', 'A1603', 'A1605',
  'A1606', 'A1607', 'A1608', 'A1609', 'A1610', 'A1611', 'A1612', 'A1613',
  'A1615', 'A1616', 'A1617', 'A1618', 'B1601', 'B1602', 'B1603', 'B1605',
  'B1606', 'B1607', 'B1608', 'B1609', 'B1610', '会议室', '健身房',
];

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

// 纯数字格式化（不带货币符号，用于读数）
function fmtNum(v) {
  const n = Number(v) || 0;
  return n.toFixed(2);
}

// 账单编号：ZD + YYYYMMDD + 6位随机码
function genBillNo() {
  const d = new Date();
  const datePart = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return 'ZD' + datePart + '-' + rand;
}

// 当前时间：YYYY-MM-DD HH:mm:ss
function nowZh() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
         pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

// 日期：YYYY-MM-DD
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

// Canvas 辅助：画线
function drawLine(ctx, x1, y1, x2, y2, color, width) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color || '#333';
  ctx.lineWidth = width || 0.5;
  ctx.stroke();
}

// Canvas 辅助：画文字（默认 left/top 对齐）
function drawText(ctx, text, x, y, opts) {
  const o = opts || {};
  ctx.font = (o.bold ? 'bold ' : '') + (o.size || 10) + 'px sans-serif';
  ctx.fillStyle = o.color || '#333';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'top';
  ctx.fillText(String(text), x, y);
}

function genId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// ===== 权限定义（label/desc 展示时从语言包 L.permNames/L.permDescs 取） =====
const PERMISSION_DEFS = [
  { key: 'meter' },
  { key: 'ledger_edit' },
  { key: 'ledger_delete' },
  { key: 'receipt_pdf' },
  { key: 'rate_setting' },
  { key: 'user_manage' }
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
    // 三语文案树（WXML 用 {{L.xxx}}）
    L: getScope('property'),

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
    rates: { water: DEFAULT_WATER_RATE, elec: DEFAULT_ELEC_RATE, lowElecThreshold: DEFAULT_LOW_ELEC_THRESHOLD },

    // 抄表表单
    meterForm: {
      room: '',
      month: '',
      prevWater: '',
      currWater: '',
      prevElec: '',
      currElec: '',
      remainElec: '',
      rent: '',
      remark: ''
    },
    roomIndex: -1,  // 房号选择索引（保留用于编辑回填定位）
    showRoomList: false,   // 房号联想下拉是否显示
    filteredRooms: [],     // 房号联想匹配结果
    meterCalc: { waterUsage: 0, elecUsage: 0, waterFee: 0, elecFee: 0, total: 0, remainElec: '-', lowElec: false },

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
    // 语言可能已切换，刷新文案树
    this.setData({ L: getScope('property') });
    // 进入页面先从云端同步物业数据（换设备/更新版本不丢）
    this.pullCloud();
    if (this.data.isLoggedIn) {
      this.refreshAll();
    }
  },

  onHide() {
    // 离开页面时把当前物业数据推到云端
    this.pushCloudNow();
  },

  onUnload() {
    this.pushCloudNow();
  },

  onLanguageChange() {
    this.setData({ L: getScope('property') });
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
    // 费率（补全低电提醒阈值默认值）
    let rates = wx.getStorageSync(LS_RATES) || { water: DEFAULT_WATER_RATE, elec: DEFAULT_ELEC_RATE };
    if (!rates || typeof rates.lowElecThreshold === 'undefined') {
      rates = { water: DEFAULT_WATER_RATE, elec: DEFAULT_ELEC_RATE, lowElecThreshold: DEFAULT_LOW_ELEC_THRESHOLD, ...(rates || {}) };
    }
    // 房号：严格限定为预设 327 个房号（清除历史"手动输入自动新增"写入的房外房号）
    let rooms = wx.getStorageSync(LS_ROOMS) || [];
    if (!Array.isArray(rooms)) rooms = [];
    const presetSet = new Set(DEFAULT_ROOMS);
    const cleaned = rooms.filter(r => presetSet.has(r));
    const missing = DEFAULT_ROOMS.filter(r => cleaned.indexOf(r) < 0);
    rooms = cleaned.concat(missing);
    rooms.sort((a, b) => a.localeCompare(b, 'zh'));
    wx.setStorageSync(LS_ROOMS, rooms);
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
      users.push({ id: 'admin', username: 'admin', password: 'admin123', role: 'admin', permissions: DEFAULT_ADMIN_PERMS, createdAt: t('property.defaultCreatedAt'), avatarChar: 'A' });
      dirty = true;
    }
    if (dirty) wx.setStorageSync(LS_USERS, users);
    // 抄表记录：从本地缓存恢复，确保更新版本后旧数据不丢
    let records = wx.getStorageSync(LS_RECORDS) || [];
    if (!Array.isArray(records)) records = [];
    this.setData({ rates, rooms, users, records });
    // 调试：确认房号联想数据已就绪（开发者工具 Console 可见）
    console.log('[中鼎物业] 房号数据加载完成，共', rooms.length, '个；抄表记录', records.length, '条');
  },

  // ===== 云端同步（公司级共享，持久化到香港服务器）=====
  async pullCloud() {
    try {
      const state = await api.propertyLoad();
      if (state && state.rooms && state.rooms.length) {
        // 云端有数据 → 采用云端（覆盖本地）
        const { rooms, users, records, rates } = state;
        if (rooms) wx.setStorageSync(LS_ROOMS, rooms);
        if (users) wx.setStorageSync(LS_USERS, users);
        if (records) wx.setStorageSync(LS_RECORDS, records);
        if (rates) wx.setStorageSync(LS_RATES, rates);
        this.setData({
          rooms: rooms || this.data.rooms,
          users: users || this.data.users,
          records: records || this.data.records,
          rates: rates || this.data.rates
        });
        console.log('[中鼎物业] 已从云端同步数据：', (rooms || []).length, '房 /', (records || []).length, '记录');
      } else {
        // 云端为空 → 用本地初始化结果回填云端
        this.pushCloudNow();
      }
    } catch (e) {
      console.warn('[中鼎物业] 云端拉取失败，使用本地数据', e);
    }
  },

  pushCloudNow() {
    const { rooms, users, records, rates } = this.data;
    if (!rooms && !users && !records && !rates) return;
    api.propertySave({ rooms, users, records, rates })
      .then(() => console.log('[中鼎物业] 数据已保存到云端'))
      .catch(e => console.warn('[中鼎物业] 云端保存失败', e));
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
      this.setData({ loginError: t('property.needUsernamePwd') });
      return;
    }
    const users = wx.getStorageSync(LS_USERS) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      this.setData({ loginError: t('property.loginFail') });
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
    wx.showToast({ title: t('property.loginSuccess'), icon: 'success' });
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
      title: t('property.confirmLogoutTitle'),
      content: t('property.confirmLogoutContent'),
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
    this.refreshHintTexts();
  },

  // 含占位符的动态提示文案（跟随语言 + 阈值变化）
  refreshHintTexts() {
    const threshold = Number(this.data.rates.lowElecThreshold) || DEFAULT_LOW_ELEC_THRESHOLD;
    this.setData({
      remainElecHintText: t('property.remainElecHint').replace('{threshold}', threshold),
      lowElecHintText: t('property.lowElecHint').replace('{threshold}', threshold)
    });
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
    const threshold = Number(this.data.rates.lowElecThreshold) || DEFAULT_LOW_ELEC_THRESHOLD;
    const unitTon = t('property.unitTon');
    const unitKwh = t('property.unitKwh');
    const remainPrefix = t('property.remain');
    const lowElecTpl = t('property.lowElecText');
    const displayRecords = list.map(r => {
      const c = this.calcRecord(r);
      const remainNum = Number(r.remainElec);
      const hasRemain = r.remainElec !== undefined && r.remainElec !== '';
      const lowElec = hasRemain && !isNaN(remainNum) && remainNum >= 0 && remainNum < threshold;
      const payText = t('property.payStatus.' + (r.payStatus || '未缴'));
      const collectText = t('property.collectStatus.' + (r.collectStatus || '未催收'));
      return {
        ...r,
        waterUsageText: c.waterUsage + unitTon,
        elecUsageText: c.elecUsage + unitKwh,
        waterFeeText: fmtMoney(c.waterFee),
        elecFeeText: fmtMoney(c.elecFee),
        rentText: fmtMoney(c.rent),
        totalText: fmtMoney(c.total),
        remainElecText: hasRemain ? remainNum.toFixed(0) + unitKwh : '',
        lowElec: lowElec,
        lowElecText: lowElec ? lowElecTpl.replace('{val}', remainNum.toFixed(0)) : '',
        payStatusText: payText,
        collectStatusText: collectText,
        payStatusClass: r.payStatus === '已缴' ? 'paid' : (r.payStatus === '部分' ? 'partial' : 'unpaid'),
        collectStatusClass: r.collectStatus === '已结清' ? 'settled' : (r.collectStatus === '已催收' ? 'collected' : (r.collectStatus === '已承诺' ? 'promised' : 'uncollected'))
      };
    });
    this.setData({
      displayRecords,
      recordCountText: t('property.totalCount').replace('{count}', displayRecords.length)
    });
  },

  // ===== 今日待办 =====
  renderTodayTasks() {
    const cm = getCurrentMonth();
    const records = this.data.records;
    const threshold = Number(this.data.rates.lowElecThreshold) || DEFAULT_LOW_ELEC_THRESHOLD;
    const unitKwh = t('property.unitKwh');
    const tasks = [];

    // 低电量提醒：每个房号取最新一条有剩余电量的记录
    const latestByRoom = {};
    records.forEach(r => {
      if (r.remainElec === undefined || r.remainElec === '') return;
      const cur = latestByRoom[r.room];
      if (!cur || r.month > cur.month) latestByRoom[r.room] = r;
    });
    Object.keys(latestByRoom).forEach(room => {
      const r = latestByRoom[room];
      const remainNum = Number(r.remainElec);
      if (isNaN(remainNum) || remainNum < 0 || remainNum >= threshold) return;
      tasks.push({
        id: 'elec_' + r.id,     // 与缴费任务区分，避免 wx:key 冲突
        room: r.room,
        month: r.month,
        remainElecText: remainNum.toFixed(0) + unitKwh,
        recordId: r.id,
        taskClass: 'lowElec',
        taskLabel: t('property.statusTexts.lowElec'),
        taskType: 'lowElec'
      });
    });

    records.forEach(r => {
      if (r.payStatus === '已缴') return;
      const c = this.calcRecord(r);
      let cls = 'info', label = t('property.taskThisMonth');
      if (r.month < cm) { cls = 'overdue'; label = t('property.taskOverdue'); }
      else if (r.payStatus === '部分') { cls = 'warning'; label = t('property.taskPartial'); }
      tasks.push({
        ...r,
        totalText: fmtMoney(c.total),
        taskClass: cls,
        taskLabel: label,
        taskType: 'pay'
      });
    });
    // 逾期 > 电量不足 > 部分 > 本月
    tasks.sort((a, b) => {
      const order = { overdue: 0, lowElec: 1, warning: 2, info: 3 };
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
    const value = e.detail.value;
    this.setData({ ['meterForm.' + field]: value });
    if (field === 'room') {
      this.filterRooms(value);
    }
    this.calcMeterForm();
  },

  // 房号联想：输入即过滤（精确匹配 > 前缀匹配 > 包含匹配），最多显示 10 条
  filterRooms(val) {
    const kw = (val || '').trim().toUpperCase();
    const all = this.data.rooms;
    if (!kw || !Array.isArray(all) || all.length === 0) {
      this.setData({ filteredRooms: [], showRoomList: false });
      return;
    }
    const exact = [];
    const prefix = [];
    const contains = [];
    for (let i = 0; i < all.length; i++) {
      const r = String(all[i]).trim();
      const ru = r.toUpperCase();
      if (ru === kw) {
        exact.push(r);
      } else if (ru.indexOf(kw) === 0) {
        prefix.push(r);
      } else if (ru.indexOf(kw) > 0) {
        contains.push(r);
      }
    }
    // 精确优先，其次前缀，最后包含；均按原顺序（已按中文排序）
    const list = exact.concat(prefix, contains).slice(0, 10);
    // 只要有输入就展示下拉（无匹配时提示"无匹配房号"，保存时也会校验拦截）
    this.setData({ filteredRooms: list, showRoomList: true });
    console.log('[中鼎物业] 联想输入[' + kw + '] 命中', list.length, '条:', list.join(', '));
  },

  // 点击/触摸联想项：填入房号并收起列表（touchstart 在 input blur 之前触发，点击不会被吞）
  onRoomPick(e) {
    const room = e.currentTarget.dataset.room;
    if (!room) return;
    const rooms = this.data.rooms || [];
    const idx = rooms.indexOf(room);
    this.setData({
      'meterForm.room': room,
      roomIndex: idx >= 0 ? idx : -1,
      filteredRooms: [],
      showRoomList: false
    });
    this.calcMeterForm();
  },

  // 输入框聚焦：有内容时重新展示联想
  onRoomFocus() {
    if (this.data.meterForm.room) {
      this.filterRooms(this.data.meterForm.room);
    }
  },

  // 输入框失焦：延迟收起，保证触摸联想项先触发（touchstart 不受影响）
  onRoomBlur() {
    setTimeout(() => {
      this.setData({ showRoomList: false });
    }, 200);
  },

  calcMeterForm() {
    const f = this.data.meterForm;
    const waterUsage = Math.max(0, (Number(f.currWater) || 0) - (Number(f.prevWater) || 0));
    const elecUsage = Math.max(0, (Number(f.currElec) || 0) - (Number(f.prevElec) || 0));
    const waterFee = waterUsage * (Number(this.data.rates.water) || DEFAULT_WATER_RATE);
    const elecFee = elecUsage * (Number(this.data.rates.elec) || DEFAULT_ELEC_RATE);
    const rent = Number(f.rent) || 0;
    const total = waterFee + elecFee + rent;
    // 剩余电量低电判断
    const threshold = Number(this.data.rates.lowElecThreshold) || DEFAULT_LOW_ELEC_THRESHOLD;
    const remainNum = Number(f.remainElec);
    const lowElec = f.remainElec !== '' && !isNaN(remainNum) && remainNum >= 0 && remainNum < threshold;
    const calc = { waterUsage, elecUsage, waterFee, elecFee, rent, total };
    this.setData({
      meterCalc: {
        waterUsage: waterUsage,
        elecUsage: elecUsage,
        waterFee: waterFee.toFixed(2),
        elecFee: elecFee.toFixed(2),
        total: total.toFixed(2),
        remainElec: f.remainElec === '' ? '-' : remainNum.toFixed(0) + t('property.unitKwh'),
        lowElec: lowElec
      }
    });
    return calc;
  },

  // 房号校验：必须存在于房号库（327 间预设房号），忽略大小写并归一化为库中写法
  matchRoom(input) {
    const kw = String(input || '').trim().toUpperCase();
    if (!kw) return null;
    const rooms = this.data.rooms || [];
    for (let i = 0; i < rooms.length; i++) {
      if (String(rooms[i]).trim().toUpperCase() === kw) return String(rooms[i]).trim();
    }
    return null;
  },

  saveMeterRecord() {
    const f = this.data.meterForm;
    if (!f.room) { wx.showToast({ title: t('property.needRoom'), icon: 'none' }); return; }
    // 限制：房号必须在已有房号库内（如美田酒店 327 间房），不存在则拦截
    const validRoom = this.matchRoom(f.room);
    if (!validRoom) {
      wx.showToast({ title: t('property.roomInvalid'), icon: 'none' });
      this.filterRooms(f.room); // 重新弹下拉提示可选房号
      return;
    }
    if (validRoom !== f.room) this.setData({ 'meterForm.room': validRoom }); // 归一化大小写
    if (!f.month) { wx.showToast({ title: t('property.needMonthSelect'), icon: 'none' }); return; }

    const records = wx.getStorageSync(LS_RECORDS) || [];

    // 检查同房号+月份是否已存在（编辑模式跳过自身）
    const existIdx = records.findIndex(r => r.room === f.room && r.month === f.month && r.id !== this.data.editingId);
    if (existIdx >= 0 && !this.data.editingId) {
      wx.showModal({
        title: t('property.recordExistsTitle'),
        content: t('property.recordOverwrite').replace('{room}', f.room).replace('{month}', f.month),
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
      remainElec: f.remainElec,
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

    // 房号库固定为预设清单（327 间房），不再自动新增房号

    wx.setStorageSync(LS_RECORDS, records);
    this.setData({ editingId: '' });
    this.resetMeterForm();
    this.refreshAll();
    wx.showToast({ title: t('property.recordSaved'), icon: 'success' });
  },

  resetMeterForm() {
    this.setData({
      meterForm: { room: '', month: getCurrentMonth(), prevWater: '', currWater: '', prevElec: '', currElec: '', remainElec: '', rent: '', remark: '' },
      roomIndex: -1,
      showRoomList: false,
      filteredRooms: [],
      meterCalc: { waterUsage: 0, elecUsage: 0, waterFee: 0, elecFee: 0, total: 0, remainElec: '-', lowElec: false },
      editingId: ''
    });
  },

  // ===== 编辑记录 =====
  editRecord(e) {
    const id = e.currentTarget.dataset.id;
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const r = records.find(x => x.id === id);
    if (!r) return;
    const roomIdx = this.data.rooms.indexOf(r.room);
    this.setData({
      editingId: id,
      meterForm: {
        room: r.room,
        month: r.month,
        prevWater: r.prevWater || '',
        currWater: r.currWater || '',
        prevElec: r.prevElec || '',
        currElec: r.currElec || '',
        remainElec: r.remainElec || '',
        rent: r.rent || '',
        remark: r.remark || ''
      },
      roomIndex: roomIdx >= 0 ? roomIdx : -1,
      showRoomList: false,
      filteredRooms: [],
      currentTab: 'meter'
    });
    this.calcMeterForm();
  },

  // ===== 删除记录 =====
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: t('property.confirmDeleteTitle'),
      content: t('property.confirmDeleteContent'),
      success: (res) => {
        if (res.confirm) {
          let records = wx.getStorageSync(LS_RECORDS) || [];
          records = records.filter(r => r.id !== id);
          wx.setStorageSync(LS_RECORDS, records);
          this.refreshAll();
          wx.showToast({ title: t('property.deletedToast'), icon: 'success' });
        }
      }
    });
  },

  // ===== 状态切换 =====
  markPaid(e) {
    const id = e.currentTarget.dataset.id;
    this._updateRecord(id, { payStatus: '已缴' });
    wx.showToast({ title: t('property.markedPaid'), icon: 'success' });
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
    this.refreshHintTexts();
  },

  saveRates() {
    wx.setStorageSync(LS_RATES, this.data.rates);
    this.refreshAll();
    wx.showToast({ title: t('property.rateSaved'), icon: 'success' });
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
          userModalTitle: t('property.editUser'),
          userForm: { id: u.id, username: u.username, password: u.password, role: u.role, permissions: perms },
          userPermMap: this.buildPermMap(perms)
        });
      }
    } else {
      const perms = [...DEFAULT_OPERATOR_PERMS];
      this.setData({
        userModalShown: true,
        userModalTitle: t('property.addUser'),
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
      wx.showToast({ title: t('property.needUserPwd'), icon: 'none' });
      return;
    }
    let users = wx.getStorageSync(LS_USERS) || [];
    const dup = users.find(u => u.username === username && u.id !== id);
    if (dup) {
      wx.showToast({ title: t('property.userExists'), icon: 'none' });
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
    wx.showToast({ title: t('property.userSaved'), icon: 'success' });
  },

  deleteUser(e) {
    const id = e.currentTarget.dataset.id;
    const users = wx.getStorageSync(LS_USERS) || [];
    const u = users.find(x => x.id === id);
    if (!u) return;
    if (u.username === 'admin') {
      wx.showToast({ title: t('property.cannotDeleteDefaultAdmin'), icon: 'none' });
      return;
    }
    wx.showModal({
      title: t('property.confirmDeleteTitle'),
      content: t('property.confirmDeleteUserContent').replace('{name}', u.username),
      success: (res) => {
        if (res.confirm) {
          const newUsers = users.filter(x => x.id !== id);
          wx.setStorageSync(LS_USERS, newUsers);
          this.setData({ users: newUsers });
          wx.showToast({ title: t('property.userDeleted'), icon: 'success' });
        }
      }
    });
  },

  // ===== 生成账单图片（本地 Canvas 绘制，替代云函数 PDF）=====
  onGenPdf(e) {
    const id = e.currentTarget.dataset.id;
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const r = records.find(x => x.id === id);
    if (!r) return;

    const calc = this.calcRecord(r);
    const operator = (this.data.currentUser && this.data.currentUser.username) || t('property.defaultOperator');

    wx.showLoading({ title: t('property.generatingBill'), mask: true });
    this.drawReceipt(r, calc, operator, (tempFilePath) => {
      wx.hideLoading();
      if (!tempFilePath) {
        wx.showToast({ title: t('property.genFail'), icon: 'none' });
        return;
      }
      // 预览图片：长按可保存到相册 / 转发，用于打印
      wx.previewImage({
        urls: [tempFilePath],
        current: tempFilePath,
        success: () => {
          wx.showToast({ title: t('property.longPressTip'), icon: 'none', duration: 2500 });
        }
      });
    });
  },

  // 低电量提醒单：生成「电费充值提醒单」图片打印给客户
  onPrintLowElec(e) {
    const id = e.currentTarget.dataset.id;
    const records = wx.getStorageSync(LS_RECORDS) || [];
    const r = records.find(x => x.id === id);
    if (!r) return;

    const operator = (this.data.currentUser && this.data.currentUser.username) || t('property.defaultOperator');

    wx.showLoading({ title: t('property.generatingNotice'), mask: true });
    this.drawLowElecNotice(r, operator, (tempFilePath) => {
      wx.hideLoading();
      if (!tempFilePath) {
        wx.showToast({ title: t('property.genFail'), icon: 'none' });
        return;
      }
      // 预览图片：长按可保存到相册 / 转发，用于打印
      wx.previewImage({
        urls: [tempFilePath],
        current: tempFilePath,
        success: () => {
          wx.showToast({ title: t('property.longPressTip'), icon: 'none', duration: 2500 });
        }
      });
    });
  },

  // 在隐藏 canvas 上绘制 A4 版式账单（与参考 PDF 一致）
  drawReceipt(record, calc, operator, cb) {
    this.createSelectorQuery()
      .select('#receiptCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) { cb(null); return; }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // A4 逻辑尺寸（72dpi），按设备像素比放大保证打印清晰
        const W = 595;
        const H = 842;
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const MARGIN_L = 40;
        const MARGIN_R = 555;
        const CONTENT_W = MARGIN_R - MARGIN_L;

        // 白底
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ===== 页眉：时间（左）+ 工作台名（中） =====
        drawText(ctx, nowZh(), MARGIN_L, 35, { size: 9, color: '#999' });
        drawText(ctx, t('property.billBrand'), MARGIN_L + CONTENT_W / 2, 35, { size: 9, color: '#999', align: 'center' });

        // ===== LOGO + 标题区 =====
        // LOGO 原图 323x131（横向长条），按等比缩放，避免变形
        const logoX = MARGIN_L;
        const logoY = 75;
        const logoH = 50;          // 固定高度
        const logoW = 123;         // 等比宽度 = 50 * 323/131
        const titleX = logoX + logoW + 18;
        drawText(ctx, t('property.billMainTitle'), titleX, 84, { size: 22, color: '#1a1a1a', bold: true });
        drawText(ctx, 'ZHONGDING PROPERTY MANAGEMENT FEE NOTICE', titleX, 114, { size: 10, color: '#999' });

        // ===== 分隔线 =====
        drawLine(ctx, MARGIN_L, 150, MARGIN_R, 150, '#333', 0.8);

        // ===== 账单信息（左右两栏） =====
        const infoY = 172;
        const colRightX = MARGIN_R - 190;
        drawText(ctx, t('property.lblNo') + ': ' + (record.billNo || genBillNo()), MARGIN_L, infoY, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblRoom') + ': ' + record.room, MARGIN_L, infoY + 22, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblDate') + ': ' + todayStr(), colRightX, infoY, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblMonth') + ': ' + (record.month || ''), colRightX, infoY + 22, { size: 10, color: '#333' });

        // ===== 用量明细表（6列） =====
        const tableTop = infoY + 58;
        const rowH = 28;
        const headerH = 28;
        const cols = [
          { x: MARGIN_L, w: 55 },
          { x: MARGIN_L + 55, w: 100 },
          { x: MARGIN_L + 155, w: 100 },
          { x: MARGIN_L + 255, w: 95 },
          { x: MARGIN_L + 350, w: 95 },
          { x: MARGIN_L + 445, w: 70 }
        ];
        const headers = [t('property.colItem'), t('property.colPrev'), t('property.colCurr'), t('property.colUsage'), t('property.colRate'), t('property.colAmount')];
        const waterRate = Number(this.data.rates.water) || 0.7;
        const elecRate = Number(this.data.rates.elec) || 0.205;
        const unitTon = t('property.unitTon');
        const unitKwh = t('property.unitKwh');
        const rows = [
          { name: t('property.rowWater'), prev: fmtNum(record.prevWater) + unitTon, curr: fmtNum(record.currWater) + unitTon, usage: (calc.waterUsage || 0).toFixed(1) + unitTon, rate: '$' + fmtNum(waterRate) + t('property.perTon'), amount: calc.waterFee },
          { name: t('property.rowElec'), prev: fmtNum(record.prevElec) + unitKwh, curr: fmtNum(record.currElec) + unitKwh, usage: (calc.elecUsage || 0).toFixed(1) + unitKwh, rate: '$' + fmtNum(elecRate) + t('property.perKwh'), amount: calc.elecFee },
          { name: t('property.rowRent'), prev: '-', curr: '-', usage: '-', rate: '-', amount: calc.rent }
        ];

        // 表头背景 + 边框
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(MARGIN_L, tableTop, CONTENT_W, headerH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(MARGIN_L, tableTop, CONTENT_W, headerH);
        cols.forEach(c => drawLine(ctx, c.x, tableTop, c.x, tableTop + headerH, '#333', 0.5));
        drawLine(ctx, MARGIN_R, tableTop, MARGIN_R, tableTop + headerH, '#333', 0.5);
        headers.forEach((h, i) => {
          drawText(ctx, h, cols[i].x + cols[i].w / 2, tableTop + headerH / 2, { size: 10, color: '#333', align: 'center', baseline: 'middle' });
        });

        // 数据行
        let y = tableTop + headerH;
        rows.forEach((r) => {
          drawLine(ctx, MARGIN_L, y, MARGIN_R, y, '#333', 0.5);
          cols.forEach(c => drawLine(ctx, c.x, y, c.x, y + rowH, '#333', 0.5));
          drawLine(ctx, MARGIN_R, y, MARGIN_R, y + rowH, '#333', 0.5);
          drawText(ctx, r.name, cols[0].x + cols[0].w / 2, y + rowH / 2, { size: 10, color: '#1a1a1a', align: 'center', baseline: 'middle' });
          drawText(ctx, r.prev, cols[1].x + cols[1].w / 2, y + rowH / 2, { size: 10, color: '#1a1a1a', align: 'center', baseline: 'middle' });
          drawText(ctx, r.curr, cols[2].x + cols[2].w / 2, y + rowH / 2, { size: 10, color: '#1a1a1a', align: 'center', baseline: 'middle' });
          drawText(ctx, r.usage, cols[3].x + cols[3].w / 2, y + rowH / 2, { size: 10, color: '#1a1a1a', align: 'center', baseline: 'middle' });
          drawText(ctx, r.rate, cols[4].x + cols[4].w / 2, y + rowH / 2, { size: 10, color: '#1a1a1a', align: 'center', baseline: 'middle' });
          drawText(ctx, fmtMoney(r.amount), cols[5].x + cols[5].w - 8, y + rowH / 2, { size: 10, color: '#1a1a1a', align: 'right', baseline: 'middle' });
          y += rowH;
        });
        drawLine(ctx, MARGIN_L, y, MARGIN_R, y, '#333', 0.5);

        // 合计行
        ctx.fillStyle = '#fff8f0';
        ctx.fillRect(MARGIN_L, y, CONTENT_W, rowH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(MARGIN_L, y, CONTENT_W, rowH);
        drawText(ctx, t('property.billTotalUpper'), MARGIN_L + 10, y + rowH / 2, { size: 10.5, color: '#1a1a1a', baseline: 'middle' });
        drawText(ctx, fmtMoney(calc.total), cols[5].x + cols[5].w - 8, y + rowH / 2, { size: 12, color: '#d4380d', align: 'right', baseline: 'middle' });

        y += rowH + 20;

        // ===== 缴费状态 =====
        drawText(ctx, t('property.lblPayStatus') + ': ' + t('property.payStatus.' + (record.payStatus || '未缴')), MARGIN_L, y, { size: 10, color: '#333' });
        y += 28;

        // ===== 签收区 =====
        drawText(ctx, t('property.lblSigner') + ': ____________________', MARGIN_L, y, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblSignDate') + ': ____________________', MARGIN_R - 190, y, { size: 10, color: '#333' });
        y += 50;

        // ===== 备注 =====
        if (record.remark) {
          drawText(ctx, t('property.lblRemark') + ': ' + record.remark, MARGIN_L, y, { size: 10, color: '#666' });
          y += 28;
        }

        // ===== 底部公司信息 =====
        drawText(ctx, t('property.billTitle'), MARGIN_L + CONTENT_W / 2, y, { size: 11, color: '#1a1a1a', align: 'center' });
        y += 22;
        drawText(ctx, t('property.billFooterKeep'), MARGIN_L + CONTENT_W / 2, y, { size: 9, color: '#999', align: 'center' });
        y += 32;

        // ===== 页脚 =====
        drawText(ctx, t('property.lblOperator') + ': ' + operator + '  |  ' + t('property.lblPrintTime') + ': ' + nowZh(), MARGIN_L + CONTENT_W / 2, y, { size: 8, color: '#aaa', align: 'center' });

        // ===== 导出图片（LOGO 异步加载后补画） =====
        const finish = () => {
          wx.canvasToTempFilePath({
            canvas,
            success: (r2) => cb(r2.tempFilePath),
            fail: () => cb(null)
          });
        };
        try {
          const logo = canvas.createImage();
          logo.onload = () => {
            try {
              // 用图片真实宽高等比缩放绘制，任何比例的 LOGO 都不变形
              const iw = logo.width || 323;
              const ih = logo.height || 131;
              const dh = logoH;
              const dw = iw * (dh / ih);
              ctx.drawImage(logo, logoX, logoY, dw, dh);
            } catch (e) {}
            finish();
          };
          logo.onerror = () => { finish(); };
          logo.src = '/images/logo.png';
        } catch (e) {
          finish();
        }
      });
  },

  // ===== 低电提醒单（电费充值提醒，Canvas 绘制） =====
  drawLowElecNotice(record, operator, cb) {
    this.createSelectorQuery()
      .select('#receiptCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) { cb(null); return; }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // A4 逻辑尺寸（72dpi），按设备像素比放大保证打印清晰
        const W = 595;
        const H = 842;
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const MARGIN_L = 40;
        const MARGIN_R = 555;
        const CONTENT_W = MARGIN_R - MARGIN_L;

        const threshold = Number(this.data.rates.lowElecThreshold) || DEFAULT_LOW_ELEC_THRESHOLD;
        const remainNum = Number(record.remainElec) || 0;

        // 白底
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ===== 页眉：时间（左）+ 工作台名（中） =====
        drawText(ctx, nowZh(), MARGIN_L, 35, { size: 9, color: '#999' });
        drawText(ctx, t('property.billBrand'), MARGIN_L + CONTENT_W / 2, 35, { size: 9, color: '#999', align: 'center' });

        // ===== LOGO + 标题区 =====
        const logoX = MARGIN_L;
        const logoY = 75;
        const logoH = 50;
        const logoW = 123;
        const titleX = logoX + logoW + 18;
        drawText(ctx, t('property.noticeTitle'), titleX, 84, { size: 22, color: '#fa541c', bold: true });
        drawText(ctx, 'ELECTRICITY RECHARGE REMINDER', titleX, 114, { size: 10, color: '#999' });

        // ===== 分隔线 =====
        drawLine(ctx, MARGIN_L, 150, MARGIN_R, 150, '#333', 0.8);

        // ===== 信息栏 =====
        const infoY = 172;
        const colRightX = MARGIN_R - 190;
        drawText(ctx, t('property.lblNo') + ': ' + (record.billNo || genBillNo()), MARGIN_L, infoY, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblRoom') + ': ' + record.room, MARGIN_L, infoY + 22, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblNoticeDate') + ': ' + todayStr(), colRightX, infoY, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblMeterMonth') + ': ' + (record.month || ''), colRightX, infoY + 22, { size: 10, color: '#333' });

        // ===== 警示卡 =====
        const warnTop = infoY + 56;
        const warnH = 118;
        ctx.fillStyle = '#fff2e8';
        ctx.fillRect(MARGIN_L, warnTop, CONTENT_W, warnH);
        ctx.strokeStyle = '#fa541c';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(MARGIN_L, warnTop, CONTENT_W, warnH);

        drawText(ctx, t('property.noticeSub'), MARGIN_L + CONTENT_W / 2, warnTop + 16, { size: 14, color: '#fa541c', bold: true, align: 'center' });
        drawText(ctx, t('property.noticeCur'), MARGIN_L + CONTENT_W / 2, warnTop + 40, { size: 11, color: '#8c8c8c', align: 'center' });
        drawText(ctx, remainNum.toFixed(0) + t('property.unitKwh'), MARGIN_L + CONTENT_W / 2, warnTop + 76, { size: 26, color: '#fa541c', bold: true, align: 'center' });
        drawText(ctx, t('property.noticeBelow').replace('{threshold}', threshold), MARGIN_L + CONTENT_W / 2, warnTop + 104, { size: 10, color: '#595959', align: 'center' });

        // ===== 明细表（2列） =====
        let y = warnTop + warnH + 30;
        const rowH = 30;
        const headerH = 30;
        const cols = [
          { x: MARGIN_L, w: 130 },
          { x: MARGIN_L + 130, w: CONTENT_W - 130 }
        ];
        const headers = [t('property.colItem'), t('property.colDetail')];

        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(MARGIN_L, y, CONTENT_W, headerH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(MARGIN_L, y, CONTENT_W, headerH);
        cols.forEach(c => drawLine(ctx, c.x, y, c.x, y + headerH, '#333', 0.5));
        drawLine(ctx, MARGIN_R, y, MARGIN_R, y + headerH, '#333', 0.5);
        headers.forEach((h, i) => {
          drawText(ctx, h, cols[i].x + cols[i].w / 2, y + headerH / 2, { size: 10, color: '#333', align: 'center', baseline: 'middle' });
        });
        y += headerH;

        const rows = [
          { name: t('property.lblRoom'), val: record.room },
          { name: t('property.lblMeterMonth'), val: record.month || '-' },
          { name: t('property.noticeCur'), val: remainNum.toFixed(0) + t('property.unitKwh') },
          { name: t('property.noticeThreshold'), val: threshold + t('property.unitKwh') },
          { name: t('property.noticeRowContent'), val: t('property.noticeRowContentVal') }
        ];
        rows.forEach((r) => {
          drawLine(ctx, MARGIN_L, y, MARGIN_R, y, '#333', 0.5);
          cols.forEach(c => drawLine(ctx, c.x, y, c.x, y + rowH, '#333', 0.5));
          drawLine(ctx, MARGIN_R, y, MARGIN_R, y + rowH, '#333', 0.5);
          drawText(ctx, r.name, cols[0].x + cols[0].w / 2, y + rowH / 2, { size: 10, color: '#1a1a1a', align: 'center', baseline: 'middle' });
          drawText(ctx, r.val, cols[1].x + 12, y + rowH / 2, { size: 10, color: '#1a1a1a', baseline: 'middle' });
          y += rowH;
        });
        drawLine(ctx, MARGIN_L, y, MARGIN_R, y, '#333', 0.5);

        y += 40;

        // ===== 温馨提示 =====
        drawText(ctx, t('property.noticeTipsTitle'), MARGIN_L, y, { size: 10, color: '#333', bold: true });
        y += 24;
        drawText(ctx, t('property.noticeTip1'), MARGIN_L, y, { size: 10, color: '#595959' });
        y += 22;
        drawText(ctx, t('property.noticeTip2'), MARGIN_L, y, { size: 10, color: '#595959' });
        y += 22;
        drawText(ctx, t('property.noticeTip3'), MARGIN_L, y, { size: 10, color: '#595959' });
        y += 40;

        // ===== 签收区 =====
        drawText(ctx, t('property.lblCustomerSign') + ': ____________________', MARGIN_L, y, { size: 10, color: '#333' });
        drawText(ctx, t('property.lblSignDate') + ': ____________________', MARGIN_R - 190, y, { size: 10, color: '#333' });
        y += 60;

        // ===== 底部公司信息 =====
        drawText(ctx, t('property.noticeCompany'), MARGIN_L + CONTENT_W / 2, y, { size: 11, color: '#1a1a1a', align: 'center' });
        y += 22;
        drawText(ctx, t('property.billService'), MARGIN_L + CONTENT_W / 2, y, { size: 10, color: '#595959', align: 'center' });
        y += 22;
        drawText(ctx, t('property.noticeFooter'), MARGIN_L + CONTENT_W / 2, y, { size: 9, color: '#999', align: 'center' });
        y += 32;

        // ===== 页脚 =====
        drawText(ctx, t('property.lblOperator') + ': ' + operator + '  |  ' + t('property.lblPrintTime') + ': ' + nowZh(), MARGIN_L + CONTENT_W / 2, y, { size: 8, color: '#aaa', align: 'center' });

        // ===== 导出图片（LOGO 异步加载后补画） =====
        const finish = () => {
          wx.canvasToTempFilePath({
            canvas,
            success: (r2) => cb(r2.tempFilePath),
            fail: () => cb(null)
          });
        };
        try {
          const logo = canvas.createImage();
          logo.onload = () => {
            try {
              const iw = logo.width || 323;
              const ih = logo.height || 131;
              const dh = logoH;
              const dw = iw * (dh / ih);
              ctx.drawImage(logo, logoX, logoY, dw, dh);
            } catch (e) {}
            finish();
          };
          logo.onerror = () => { finish(); };
          logo.src = '/images/logo.png';
        } catch (e) {
          finish();
        }
      });
  },

  // ===== 分享 =====
  onShareAppMessage() {
    return {
      title: t('property.shareTitle'),
      path: '/pages/property/property'
    };
  },

  onShareTimeline() {
    return {
      title: t('property.shareTitleShort'),
      query: ''
    };
  },

  // 小程序内生成需求单，替代客服咨询按钮，避免被判定为引流
  async consultRequirement() {
    wx.showLoading({ title: '提交中' });
    try {
      await api.createRequirement({
        type: 'property',
        title: t('property.consultTitle') || '物业管理咨询',
        detail: t('property.consultDetail') || '中鼎物业工作台相关咨询'
      });
      wx.hideLoading();
      wx.showToast({ title: '已生成需求单', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/requirement/requirement' });
      }, 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  }
});
