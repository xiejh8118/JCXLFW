// components/invoice-gen/invoice-gen.js - 电子发票生成器
const dateHelper = require('../../utils/date-helper.js');

Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 服务/项目数据
    service: {
      type: Object,
      value: {}
    }
  },

  data: {
    // 发票信息
    invoice: {
      companyName: '',
      taxId: '',
      email: '',
      address: ''
    },
    // 发票格式
    formatOptions: ['PDF', '图片'],
    formatIndex: 0,
    // 发送方式
    sendMethods: ['邮件', 'Telegram'],
    sendMethodIndex: 0,
    // 柬埔寨发票特殊字段
    includeKhmer: true,
    includeStamp: true
  },

  methods: {
    // 公司名称输入
    onCompanyNameInput(e) {
      this.setData({ 'invoice.companyName': e.detail.value });
    },

    // 税号输入
    onTaxIdInput(e) {
      this.setData({ 'invoice.taxId': e.detail.value });
    },

    // 邮箱输入
    onEmailInput(e) {
      this.setData({ 'invoice.email': e.detail.value });
    },

    // 地址输入
    onAddressInput(e) {
      this.setData({ 'invoice.address': e.detail.value });
    },

    // 格式切换
    onFormatChange(e) {
      this.setData({ formatIndex: e.detail.value });
    },

    // 发送方式切换
    onSendMethodChange(e) {
      this.setData({ sendMethodIndex: e.detail.value });
    },

    // 高棉文
    onKhmerToggle(e) {
      this.setData({ includeKhmer: e.detail.value });
    },

    // 税务印章
    onStampToggle(e) {
      this.setData({ includeStamp: e.detail.value });
    },

    // 生成发票
    onGenerate() {
      const { invoice } = this.data;
      if (!invoice.companyName) {
        wx.showToast({ title: '请输入公司名称', icon: 'none' });
        return;
      }
      if (!invoice.email) {
        wx.showToast({ title: '请输入邮箱地址', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '生成中...' });

      // 模拟生成
      setTimeout(() => {
        wx.hideLoading();
        wx.showToast({ title: '发票已生成', icon: 'success' });
        this.triggerEvent('generated', {
          ...this.data.invoice,
          format: this.data.formatOptions[this.data.formatIndex],
          date: dateHelper.formatDateTime(new Date()),
          reference: this.properties.service.reference || ''
        });
      }, 1500);
    },

    // 关闭
    onClose() {
      this.triggerEvent('close');
    }
  }
});
