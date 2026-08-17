// pages/member/member.js
// 会员中心 — 邀请码解锁会员内容
// 支付发生在企微/ABA Pay（小程序外），小程序只做邀请码验证和内容展示
// 完全合规：代码内无任何支付、价格、下单逻辑
// 三语：内容/进度文案来自语言包 member 命名空间

const { t, getScope } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

Page({
  data: {
    L: getScope('member'),

    // 会员状态: 'guest' | 'member'
    memberStatus: 'guest',

    // 邀请码输入
    inviteCode: '',

    // 会员信息（解锁后展示）
    memberInfo: null,

    // 会员专享内容列表
    memberContent: [],

    // 服务进度（如有托管服务）
    serviceProgress: [],

    // 访客预览项
    previewItems: [],

    // 验证中
    verifying: false
  },

  onLoad() {
    this.loadMemberStatus();
  },

  onShow() {
    this.loadMemberStatus();
  },

  onLanguageChange() {
    this.loadMemberStatus();
  },

  // 从本地缓存加载会员状态（实际场景应调用云函数验证）
  loadMemberStatus() {
    const L = getScope('member');
    const base = { L, previewItems: L.previewItems };
    try {
      const stored = wx.getStorageSync('member_info');
      if (stored && stored.expireTime && new Date(stored.expireTime) > new Date()) {
        this.setData({
          ...base,
          memberStatus: 'member',
          memberInfo: stored,
          memberContent: this.getMemberContent(),
          serviceProgress: this.getServiceProgress()
        });
      } else {
        this.setData({ ...base, memberStatus: 'guest' });
      }
    } catch (e) {
      console.log('[member] 读取会员状态失败', e);
      this.setData(base);
    }
    wx.setNavigationBarTitle({ title: L.title });
  },

  // 邀请码输入
  onCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() });
  },

  // 验证邀请码
  // 实际部署时改为调用云函数 verifyInviteCode
  verifyCode() {
    const code = this.data.inviteCode.trim();
    if (!code) {
      wx.showToast({ title: t('member.needCode'), icon: 'none' });
      return;
    }
    if (code.length < 8) {
      wx.showToast({ title: t('member.codeInvalid'), icon: 'none' });
      return;
    }

    this.setData({ verifying: true });

    // 模拟验证（实际应调用云函数）
    // 云函数会检查：1.邀请码是否存在 2.是否已使用 3.有效期 4.关联的会员等级
    setTimeout(() => {
      // 模拟成功
      const now = new Date();
      const expire = new Date(now);
      expire.setMonth(expire.getMonth() + 1);

      const memberInfo = {
        code: code,
        codeMasked: '***' + code.slice(-4),
        activateTime: this.formatDate(now),
        expireTime: this.formatDate(expire)
      };

      try {
        wx.setStorageSync('member_info', {
          ...memberInfo,
          expireTime: expire.toISOString()
        });
      } catch (e) {
        console.log('[member] 存储会员信息失败', e);
      }

      this.setData({
        verifying: false,
        memberStatus: 'member',
        memberInfo: memberInfo,
        memberContent: this.getMemberContent(),
        serviceProgress: this.getServiceProgress()
      });

      wx.showToast({ title: t('member.activated'), icon: 'success' });
      wx.vibrateShort({ type: 'medium' });
    }, 1200);
  },

  // 会员专享内容（随语言刷新）
  getMemberContent() {
    return getScope('member').memberContent || [];
  },

  // 服务进度（状态文本随语言映射）
  getServiceProgress() {
    const L = getScope('member');
    const statusMap = { done: L.statusDone, active: L.statusActive, pending: L.statusPending };
    return (L.serviceProgress || []).map(s => ({
      ...s,
      statusText: statusMap[s.statusKey] || s.statusKey
    }));
  },

  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 退出会员
  onLogout() {
    wx.showModal({
      title: t('member.logoutTitle'),
      content: t('member.logoutContent'),
      confirmColor: '#B8860B',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('member_info');
          this.setData({
            memberStatus: 'guest',
            memberInfo: null,
            inviteCode: '',
            memberContent: [],
            serviceProgress: []
          });
          wx.showToast({ title: t('member.loggedOut'), icon: 'success' });
        }
      }
    });
  },

  // 粘贴邀请码
  onPasteCode() {
    wx.getClipboardData({
      success: (res) => {
        if (res.data) {
          this.setData({ inviteCode: res.data.trim().toUpperCase() });
          wx.showToast({ title: t('member.pasted'), icon: 'success' });
        }
      }
    });
  },

  // 内容点击
  onContentTap(e) {
    const { id, type } = e.currentTarget.dataset;
    if (type === 'download') {
      wx.showToast({ title: t('member.downloading'), icon: 'none' });
    } else {
      wx.showToast({ title: t('member.loadingArticle'), icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: t('member.shareTitle'),
      path: '/pages/member/member'
    };
  },

  // 小程序内生成需求单，替代客服咨询按钮，避免被判定为引流
  async consultRequirement() {
    wx.showLoading({ title: '提交中' });
    try {
      await api.createRequirement({
        type: 'enterprise',
        title: t('member.requirementTitle') || '会员服务咨询',
        detail: t('member.requirementDetail') || '会员/邀请码相关咨询'
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
