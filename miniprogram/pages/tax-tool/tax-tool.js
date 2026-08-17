// pages/tax-tool/tax-tool.js - 税务工具箱（三语，文案取 L）
const { t, getScope } = require('../../utils/i18n.js');
const taxEngine = require('../../utils/tax-engine.js');

Page({
  data: {
    L: getScope('taxTool'),
    activeType: 'vat',  // vat | wht | salary
    types: [],

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
      categoryKey: 'SERVICE', // 传给 taxEngine 的类别 key
      categoryIdx: 0,         // picker 索引
      categories: [],
      result: null
    },
    // WHT 类别名称（预计算，避免 WXML 调用 .find）
    whtCategoryName: '',

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
    this.refreshLang();
  },

  onShow() {
    this.refreshLang();
  },

  onLanguageChange() {
    this.refreshLang();
  },

  // 刷新语言相关数据（类别名、Tab、导航栏标题）
  refreshLang() {
    const L = getScope('taxTool');
    const raw = taxEngine.getWHTCategories();
    // 类别名三语映射（语言包缺失时回退 tax-engine 中文名）
    const categories = raw.map(c => ({
      ...c,
      name: (L.whtCategories && L.whtCategories[c.key]) || c.name
    }));
    const idx = categories.findIndex(c => c.key === this.data.wht.categoryKey);
    const categoryIdx = idx >= 0 ? idx : 0;
    const categoryName = (categories[categoryIdx] || {}).name || L.selectCategory;

    const patch = {
      L,
      types: L.types,
      'wht.categories': categories,
      'wht.categoryIdx': categoryIdx,
      whtCategoryName: categoryName
    };

    // 已有计算结果时，同步刷新结果中的类别名
    if (this.data.wht.result && this.data.wht.result.categoryKey) {
      patch['wht.result.category'] = (L.whtCategories && L.whtCategories[this.data.wht.result.categoryKey]) || this.data.wht.result.category;
    }

    this.setData(patch);
    wx.setNavigationBarTitle({ title: L.title });
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
          wx.showToast({ title: t('taxTool.invalidAmount'), icon: 'none' });
          return;
        }
        result = taxEngine.calcVAT(Number(amount));
      } else {
        if (!amountIncl || isNaN(amountIncl)) {
          wx.showToast({ title: t('taxTool.invalidAmount'), icon: 'none' });
          return;
        }
        result = taxEngine.calcVATReverse(Number(amountIncl));
      }

      this.setData({ 'vat.result': result });
      wx.vibrateShort({ type: 'medium' });
    } catch (err) {
      wx.showToast({ title: t('taxTool.calcError'), icon: 'none' });
    }
  },

  // ======== WHT 代扣税 ========
  onWhtAmountInput(e) {
    this.setData({ 'wht.amount': e.detail.value, 'wht.result': null });
  },

  onWhtCategoryChange(e) {
    const idx = Number(e.detail.value);
    const { categories } = this.data.wht;
    const cat = categories[idx] || {};
    this.setData({
      'wht.categoryIdx': idx,
      'wht.categoryKey': cat.key || this.data.wht.categoryKey,
      whtCategoryName: cat.name || this.data.whtCategoryName
    });
  },

  calcWHT() {
    const { amount, categoryKey } = this.data.wht;
    if (!amount || isNaN(amount)) {
      wx.showToast({ title: t('taxTool.invalidAmount'), icon: 'none' });
      return;
    }
    try {
      // 修复原 bug：必须传类别 key（字符串），而非 picker 索引
      const result = taxEngine.calcWHT(Number(amount), categoryKey);
      const L = getScope('taxTool');
      result.categoryKey = categoryKey;
      result.category = (L.whtCategories && L.whtCategories[categoryKey]) || result.category;
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
      wx.showToast({ title: t('taxTool.invalidSalary'), icon: 'none' });
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
      text = `${t('taxTool.beforeTax')}: $${r.beforeTax}\n${t('taxTool.taxRate')}: ${r.taxRate}%\n${t('taxTool.taxAmount')}: $${r.taxAmount}\n${t('taxTool.afterTax')}: $${r.afterTax}`;
    } else if (type === 'wht' && this.data.wht.result) {
      const r = this.data.wht.result;
      text = `${t('taxTool.payAmount')}: $${r.amount}\n${t('taxTool.category')}: ${r.category}\n${t('taxTool.whtRate')}: ${r.taxRate}%\n${t('taxTool.whtAmount')}: $${r.taxAmount}\n${t('taxTool.netAmount')}: $${r.netAmount}`;
    } else if (type === 'salary' && this.data.salary.result) {
      const r = this.data.salary.result;
      text = `${t('taxTool.monthlySalary')}: ${r.monthlySalary.toLocaleString()}៛\n${t('taxTool.monthlyTax')}: ${r.monthlyTax.toLocaleString()}៛\n${t('taxTool.annualTax')}: ${r.annualTax.toLocaleString()}៛\n${t('taxTool.effectiveRate')}: ${r.effectiveRate}%`;
    }
    if (text) {
      wx.setClipboardData({ data: text });
      wx.showToast({ title: t('taxTool.copied'), icon: 'success' });
    }
  }
});
