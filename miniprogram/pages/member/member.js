// pages/member/member.js
// 会员中心 — 邀请码解锁会员内容
// 支付发生在企微/ABA Pay（小程序外），小程序只做邀请码验证和内容展示
// 完全合规：代码内无任何支付、价格、下单逻辑

Page({
  data: {
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

    // 验证中
    verifying: false
  },

  onLoad() {
    this.loadMemberStatus();
  },

  onShow() {
    this.loadMemberStatus();
  },

  // 从本地缓存加载会员状态（实际场景应调用云函数验证）
  loadMemberStatus() {
    try {
      const stored = wx.getStorageSync('member_info');
      if (stored && stored.expireTime && new Date(stored.expireTime) > new Date()) {
        this.setData({
          memberStatus: 'member',
          memberInfo: stored,
          memberContent: this.getMemberContent(),
          serviceProgress: this.getServiceProgress()
        });
      } else {
        this.setData({ memberStatus: 'guest' });
      }
    } catch (e) {
      console.log('[member] 读取会员状态失败', e);
    }
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
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    if (code.length < 8) {
      wx.showToast({ title: '邀请码格式不正确', icon: 'none' });
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
        level: '专业版',
        activateTime: this.formatDate(now),
        expireTime: this.formatDate(expire),
        services: ['VAT月度申报', 'WHT代扣管理', '薪资税核算', '合规咨询']
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

      wx.showToast({ title: '会员已激活', icon: 'success' });
      wx.vibrateShort({ type: 'medium' });
    }, 1200);
  },

  // 会员专享内容
  getMemberContent() {
    return [
      {
        id: 'case_001',
        title: '金边酒店VAT优化案例',
        desc: '某星级酒店通过进项抵扣优化，年节税 $12,000',
        tag: '案例',
        type: 'article',
        icon: '📄'
      },
      {
        id: 'case_002',
        title: '外籍员工薪资税合规方案',
        desc: '5名外籍高管薪资结构优化 + PIT代扣流程',
        tag: '方案',
        type: 'article',
        icon: '📄'
      },
      {
        id: 'tpl_vat_return',
        title: 'GDT增值税申报表模板',
        desc: '2024版 · 高棉语/双语对照 · 可填写PDF',
        tag: '模板',
        type: 'download',
        icon: '📦'
      },
      {
        id: 'tpl_wht_calc',
        title: 'WHT代扣税计算表（15类）',
        desc: '覆盖服务费/利息/租金/特许权等全部类别',
        tag: '模板',
        type: 'download',
        icon: '📦'
      },
      {
        id: 'guide_labor_card',
        title: '外籍劳工证办理全流程指南',
        desc: '从材料准备到拿证 · 含劳工部联系方式',
        tag: '指南',
        type: 'article',
        icon: '📄'
      }
    ];
  },

  // 服务进度
  getServiceProgress() {
    return [
      { name: 'VAT 7月申报', status: '进行中', progress: 60, date: '2026-07-20' },
      { name: 'WHT 7月代扣', status: '待开始', progress: 0, date: '2026-07-25' },
      { name: '薪资税 7月代扣', status: '已完成', progress: 100, date: '2026-07-15' }
    ];
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
      title: '退出会员',
      content: '退出后将无法查看会员专享内容，确定退出吗？',
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
          wx.showToast({ title: '已退出', icon: 'success' });
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
          wx.showToast({ title: '已粘贴', icon: 'success' });
        }
      }
    });
  },

  // 内容点击
  onContentTap(e) {
    const { id, type } = e.currentTarget.dataset;
    if (type === 'download') {
      wx.showToast({ title: '下载功能开发中', icon: 'none' });
    } else {
      wx.showToast({ title: '文章加载中', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: '柬企海外商务服务 - 会员中心',
      path: '/pages/member/member'
    };
  }
});
