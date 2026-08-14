// pages/tax-tool/tax-tool.js - 税务工具箱
const { t } = require('../../utils/i18n.js');
const taxEngine = require('../../utils/tax-engine.js');
const api = require('../../utils/api.js');

Page({
  data: {
    activeType: 'vat',  // vat | wht | salary
    types: [
      { key: 'vat', label: '增值税', icon: '🧮' },
      { key: 'wht', label: '代扣税', icon: '📊' },
      { key: 'salary', label: '薪资税', icon: '💰' }
    ],

    // VAT 增值税
    vat: {
      amount: '',
      amountIncl: '',
      rate: 10,
      mode: 'exclusive', // exclusive(不含税) | inclusive(含税)
      result: null
    },

    // WHT 代扣税
    wht: {
      amount: '',
      category: 'SERVICE',
      categories: [],
      result: null
    },
    // WHT 类别名称（预计算，避免 WXML 调用 .find）
    whtCategoryName: '选择类别',

    // Salary Tax 薪资税
    salary: {
      amountKHR: '',
      exchangeRates: { USD_KHR: 4100, CNY_KHR: 570 },
      result: null
    },

    currency: 'USD'
  },

  onLoad(options) {
    const type = options.type || 'vat';
    this.setData({ activeType: type });
    this.initWHT();
  },

  onShow() {
    wx.setNavigationBarTitle({ title: t('tax.title') });
  },

  // 初始化代扣税类别
  initWHT() {
    const categories = taxEngine.getWHTCategories();
    // 找到当前 category 对应的索引作为 picker 的 value
    const initialIdx = categories.findIndex(c => c.key === this.data.wht.category);
    this.setData({
      'wht.categories': categories,
      'wht.category': initialIdx >= 0 ? initialIdx : 0,
      whtCategoryName: (categories[initialIdx] || {}).name || '选择类别'
    });
  },

  // Tab 切换
  onTypeChange(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ activeType: key });
  },

  // ======== VAT 增值税 ========
  onVatAmountInput(e) {
    this.setData({ 'vat.amount': e.detail.value, 'vat.result': null });
  },

  onVatAmountInclInput(e) {
    this.setData({ 'vat.amountIncl': e.detail.value, 'vat.result': null });
  },

  onVatModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ 'vat.mode': mode, 'vat.result': null });
  },

  calcVAT() {
    const { amount, amountIncl, mode } = this.data.vat;
    let result;

    try {
      if (mode === 'exclusive') {
        if (!amount || isNaN(amount)) {
          wx.showToast({ title: '请输入有效金额', icon: 'none' });
          return;
        }
        result = taxEngine.calcVAT(Number(amount));
      } else {
        if (!amountIncl || isNaN(amountIncl)) {
          wx.showToast({ title: '请输入有效金额', icon: 'none' });
          return;
        }
        result = taxEngine.calcVATReverse(Number(amountIncl));
      }

      this.setData({ 'vat.result': result });
      wx.vibrateShort({ type: 'medium' });
    } catch (err) {
      wx.showToast({ title: '计算出错', icon: 'none' });
    }
  },

  // ======== WHT 代扣税 ========
  onWhtAmountInput(e) {
    this.setData({ 'wht.amount': e.detail.value, 'wht.result': null });
  },

  onWhtCategoryChange(e) {
    const idx = e.detail.value;
    const { categories } = this.data.wht;
    this.setData({
      'wht.category': idx,
      whtCategoryName: (categories[idx] || {}).name || '选择类别'
    });
  },

  calcWHT() {
    const { amount, category } = this.data.wht;
    if (!amount || isNaN(amount)) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    try {
      const result = taxEngine.calcWHT(Number(amount), category);
      this.setData({ 'wht.result': result });
      wx.vibrateShort({ type: 'medium' });
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  // ======== Salary Tax ========
  onSalaryAmountInput(e) {
    this.setData({ 'salary.amountKHR': e.detail.value, 'salary.result': null });
  },

  calcSalaryTax() {
    const { amountKHR } = this.data.salary;
    if (!amountKHR || isNaN(amountKHR)) {
      wx.showToast({ title: '请输入有效月薪', icon: 'none' });
      return;
    }
    const result = taxEngine.calcSalaryTax(Number(amountKHR));
    this.setData({ 'salary.result': result });
    wx.vibrateShort({ type: 'medium' });
  },

  // 快速填入（示例金额）
  onQuickAmount(e) {
    const { amount } = e.currentTarget.dataset;
    const type = this.data.activeType;
    if (type === 'vat') {
      this.setData({ 'vat.amount': amount, 'vat.result': null });
    } else if (type === 'wht') {
      this.setData({ 'wht.amount': amount, 'wht.result': null });
    }
  },

  // 重置
  onReset() {
    const type = this.data.activeType;
    if (type === 'vat') {
      this.setData({ 'vat.amount': '', 'vat.amountIncl': '', 'vat.result': null });
    } else if (type === 'wht') {
      this.setData({ 'wht.amount': '', 'wht.result': null });
    } else {
      this.setData({ 'salary.amountKHR': '', 'salary.result': null });
    }
  },

  // 复制结果
  onCopyResult() {
    const type = this.data.activeType;
    let text = '';
    if (type === 'vat' && this.data.vat.result) {
      const r = this.data.vat.result;
      text = `不含税: $${r.beforeTax}\n税率: ${r.taxRate}%\n税额: $${r.taxAmount}\n含税: $${r.afterTax}`;
    } else if (type === 'wht' && this.data.wht.result) {
      const r = this.data.wht.result;
      text = `支付金额: $${r.amount}\n类别: ${r.category}\n税率: ${r.taxRate}%\n代扣税额: $${r.taxAmount}\n实付: $${r.netAmount}`;
    } else if (type === 'salary' && this.data.salary.result) {
      const r = this.data.salary.result;
      text = `月薪: ${r.monthlySalary.toLocaleString()}៛\n月税: ${r.monthlyTax.toLocaleString()}៛\n年税: ${r.annualTax.toLocaleString()}៛\n有效税率: ${r.effectiveRate}%`;
    }
    if (text) {
      wx.setClipboardData({ data: text });
      wx.showToast({ title: '已复制', icon: 'success' });
    }
  }
});
