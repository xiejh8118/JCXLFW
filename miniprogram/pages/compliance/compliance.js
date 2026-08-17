// pages/compliance/compliance.js - 合规文档中心（三语，数据来自语言包 compliance 命名空间）
const { t, getScope } = require('../../utils/i18n.js');

Page({
  data: {
    L: getScope('compliance'),
    activeTab: 'visa',
    tabs: [],
    visaTypes: [],
    workPermitInfo: null,
    tips: []
  },

  onLoad(options) {
    const tab = options.tab || 'visa';
    this.setData({ activeTab: tab });
    this.refreshLang();
  },

  onShow() {
    this.refreshLang();
  },

  onLanguageChange() {
    this.refreshLang();
  },

  refreshLang() {
    const L = getScope('compliance');
    // WXML 无法调用 t()，此处预计算签证有效期标签
    const visaTypes = (L.visaTypes || []).map(v => ({
      ...v,
      durationLabel: (L.visaDuration || '').replace('{val}', v.duration)
    }));
    this.setData({
      L,
      tabs: L.tabs,
      visaTypes,
      workPermitInfo: L.workPermitData,
      tips: L.tips
    });
    wx.setNavigationBarTitle({ title: L.title });
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
        title: `${visa.name} (${visa.type}${getScope('compliance').visaTypeSuffix || ''})`,
        content: t('compliance.visaContent', { duration: visa.duration, fee: visa.fee, desc: visa.desc }),
        showCancel: false,
        confirmText: t('common.know')
      });
    }
  },

  // 复制提示文本
  onCopyTip(e) {
    const { text } = e.currentTarget.dataset;
    if (text) {
      wx.setClipboardData({ data: text });
      wx.showToast({ title: t('common.copied'), icon: 'success' });
    }
  },

  onShareAppMessage() {
    return {
      title: t('compliance.shareTitle'),
      path: '/pages/compliance/compliance?tab=' + this.data.activeTab
    };
  }
});
