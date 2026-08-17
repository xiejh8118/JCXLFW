// components/currency-calc/currency-calc.js - 实时汇率换算器
const APP = getApp();
const api = require('../../utils/api.js');

Component({
  properties: {
    // 是否作为嵌入式组件显示（简化版）
    embedded: {
      type: Boolean,
      value: false
    },
    // 初始金额
    defaultAmount: {
      type: Number,
      value: 100
    }
  },

  data: {
    // 汇率数据
    rates: {
      USD_KHR: 4100,
      CNY_KHR: 570,
      USD_CNY: 7.2
    },
    // 选中货币
    fromCurrency: 'USD',
    toCurrency: 'KHR',
    // 金额
    amount: 100,
    // 结果
    result: null,
    // 格式化后的汇率展示文本（如 "1 USD ≈ 4100.0000 KHR"）
    rateText: '',
    // 是否正在加载汇率
    loadingRate: false,
    // 货币列表
    currencies: [
      { code: 'USD', symbol: '$', name: '美元', flag: '🇺🇸' },
      { code: 'KHR', symbol: '៛', name: '瑞尔', flag: '🇰🇭' },
      { code: 'CNY', symbol: '¥', name: '人民币', flag: '🇨🇳' }
    ],
    // 上次更新时间
    lastUpdate: ''
  },

  lifetimes: {
    attached() {
      this.setData({
        amount: this.properties.defaultAmount,
        rates: APP.globalData.exchangeRates || this.data.rates
      });
      this.loadRates();
      this.calculate();
    }
  },

  methods: {
    // 加载实时汇率
    async loadRates() {
      this.setData({ loadingRate: true });
      try {
        const res = await api.getExchangeRate();
        if (res && res.rates) {
          const newRates = { ...this.data.rates, ...res.rates };
          APP.globalData.exchangeRates = newRates;
          this.setData({
            rates: newRates,
            lastUpdate: res.updateTime || this.formatTime(),
            loadingRate: false
          });
        }
      } catch (e) {
        console.log('使用缓存汇率');
        this.setData({ loadingRate: false });
      }
    },

    // 切换源货币
    onFromCurrencyTap(e) {
      const { code } = e.currentTarget.dataset;
      if (code === this.data.toCurrency) {
        // 自动交换
        this.setData({
          fromCurrency: code,
          toCurrency: this.data.fromCurrency
        });
      } else {
        this.setData({ fromCurrency: code });
      }
      this.calculate();
    },

    // 切换目标货币
    onToCurrencyTap(e) {
      const { code } = e.currentTarget.dataset;
      if (code === this.data.fromCurrency) {
        this.setData({
          toCurrency: code,
          fromCurrency: this.data.toCurrency
        });
      } else {
        this.setData({ toCurrency: code });
      }
      this.calculate();
    },

    // 交换货币
    onSwap() {
      const { fromCurrency, toCurrency } = this.data;
      this.setData({
        fromCurrency: toCurrency,
        toCurrency: fromCurrency
      });
      this.calculate();
    },

    // 金额输入
    onAmountInput(e) {
      const val = parseFloat(e.detail.value) || 0;
      this.setData({ amount: val });
      this.calculate();
    },

    // 快速金额
    onQuickAmount(e) {
      const { amt } = e.currentTarget.dataset;
      this.setData({ amount: amt });
      this.calculate();
    },

    // 计算汇率
    calculate() {
      const { amount, fromCurrency, toCurrency, rates } = this.data;
      if (!amount) {
        this.setData({ result: null, rateText: '' });
        return;
      }

      let result;
      const rate = this.getExchangeRate(fromCurrency, toCurrency, rates);

      if (fromCurrency === toCurrency) {
        result = amount;
      } else {
        result = parseFloat((amount * rate).toFixed(2));
      }

      // 预格式化汇率展示文本（WXML 不支持算术运算和方法调用）
      const rateText = `1 ${fromCurrency} ≈ ${rate.toFixed(4)} ${toCurrency}`;

      this.setData({ result, rateText });
    },

    // 获取汇率
    getExchangeRate(from, to, rates) {
      if (from === to) return 1;

      // 直接汇率
      const key = `${from}_${to}`;
      if (rates[key]) return rates[key];

      // 反向汇率
      const reverseKey = `${to}_${from}`;
      if (rates[reverseKey]) return 1 / rates[reverseKey];

      // 通过KHR作为中介
      if (rates[`${from}_KHR`] && rates[`${to}_KHR`]) {
        return rates[`${from}_KHR`] / rates[`${to}_KHR`];
      }

      return 1;
    },

    // 格式化时间
    formatTime() {
      const now = new Date();
      return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    },

    // 复制结果
    onCopyResult() {
      if (!this.data.result) return;
      const toCur = this.data.currencies.find(c => c.code === this.data.toCurrency);
      const text = `${this.data.amount} ${this.data.fromCurrency} = ${this.data.result} ${this.data.toCurrency}`;
      wx.setClipboardData({ data: text });
      wx.showToast({ title: '已复制', icon: 'success' });
    },

    // 刷新汇率
    onRefreshRate() {
      this.loadRates().then(() => this.calculate());
    }
  }
});
