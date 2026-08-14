// pages/compliance/compliance.js - 合规文档中心
const { t } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

Page({
  data: {
    activeTab: 'visa',
    tabs: [
      { key: 'visa', label: '签证', icon: '🛂' },
      { key: 'workpermit', label: '劳工证', icon: '📄' },
      { key: 'business', label: '公司注册', icon: '🏢' },
      { key: 'taxreg', label: '税务登记', icon: '📋' }
    ],

    docs: [],
    loading: false,

    // 签证类型
    visaTypes: [
      { type: 'E', name: '普通签证', duration: '30天', fee: 30, desc: '旅游/商务入境，可延期' },
      { type: 'EB', name: '商务签证', duration: '30天', fee: 35, desc: '可转为长期商务签证，多次往返' },
      { type: 'ER', name: '退休签证', duration: '1年', fee: 290, desc: '55岁以上，需证明退休金/存款' },
      { type: 'K', name: '柬埔寨裔签证', duration: '永久', fee: 0, desc: '柬埔寨裔身份证明' }
    ],

    // 劳工证
    workPermitInfo: {
      fee: 100,
      validity: '1年',
      requirements: ['有效商务签证(EB)', '护照复印件', '4x6cm照片', '雇佣合同', '体检报告', '公司注册证明'],
      steps: ['公司提交申请至劳工部', '在线填写FPCS外籍员工申报', '缴纳费用($100/年)', '领取劳工证卡片', '每年1月1日-3月31日续期']
    },

    tips: [
      { icon: '⚠️', text: '商务签证(EB)须在入境后30天内办理延期，逾期每天$10罚款' },
      { icon: '💡', text: '劳工证和商务签证(EB)延期需同步办理，缺一不可' },
      { icon: '📌', text: '2025年起实施新税法，外国承包商代扣税率调整为14%' },
      { icon: '💰', text: '公司注册后需在15个工作日内完成税务登记' }
    ]
  },

  onLoad(options) {
    const tab = options.tab || 'visa';
    this.setData({ activeTab: tab });
  },

  onShow() {
    wx.setNavigationBarTitle({ title: t('compliance.title') });
  },

  onTabChange(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ activeTab: key });
  },

  // 查看签证详情
  onVisaDetail(e) {
    const { type } = e.currentTarget.dataset;
    const visa = this.data.visaTypes.find(v => v.type === type);
    if (visa) {
      wx.showModal({
        title: `${visa.name} (${visa.type})`,
        content: `有效期: ${visa.duration}\n费用: $${visa.fee}\n说明: ${visa.desc}`,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 复制提示文本
  onCopyTip(e) {
    const { text } = e.currentTarget.dataset;
    if (text) {
      wx.setClipboardData({ data: text });
      wx.showToast({ title: '已复制', icon: 'success' });
    }
  },

  onShareAppMessage() {
    return {
      title: '柬埔寨商务合规指南 - 签证·劳工证·公司注册·税务',
      path: '/pages/compliance/compliance?tab=' + this.data.activeTab
    };
  }
});
