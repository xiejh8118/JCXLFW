// pages/help/help.js
// 多语言智能客服（FAQ 规则匹配，非 AI，合规安全）

const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

const I18N = {
  'zh-CN': { title: '智能客服', placeholder: '输入您的问题，如：设备怎么配送？', askBtn: '提问', answerLabel: '回复', faqLabel: '常见问题', tip: '未找到答案？请提交需求单或联系前台。' },
  'en': { title: 'Smart Assistant', placeholder: 'Ask, e.g. how to deliver equipment?', askBtn: 'Ask', answerLabel: 'Reply', faqLabel: 'FAQ', tip: 'No answer? Submit a request or contact front desk.' },
  'km': { title: 'ជំនួយឆ្លាត', placeholder: 'សួរ ឧ. របៀបដឹកជញ្ជូនសម្ភារៈ?', askBtn: 'សួរ', answerLabel: 'ចម្លើយ', faqLabel: 'សំណួរធម្មតា', tip: 'គ្មានចម្លើយ? ដាក់សំណើឬទាក់ទងផ្ទះសណ្ឋាគារ។' }
};

Page({
  data: { lang: 'zh-CN', L: {}, query: '', answer: '', faqs: [], loading: false },

  onShow() {
    this.updateLanguage();
    this.loadFaq();
  },

  updateLanguage() {
    const lang = i18n.getLang();
    const L = I18N[lang] || I18N['zh-CN'];
    this.setData({ lang, L });
    wx.setNavigationBarTitle({ title: L.title });
  },

  onLangSwitch() {
    const langs = ['zh-CN', 'en', 'km'];
    i18n.setLang(langs[(langs.indexOf(this.data.lang) + 1) % langs.length]);
    this.updateLanguage();
    this.loadFaq();
  },

  async loadFaq() {
    try {
      const d = await api.faqList(this.data.lang);
      this.setData({ faqs: d.data || [] });
    } catch (e) { console.warn('loadFaq', e); }
  },

  onInput(e) {
    this.setData({ query: e.detail.value });
  },

  async onAsk() {
    const q = this.data.query.trim();
    if (!q) return;
    this.setData({ loading: true });
    try {
      const d = await api.faqAsk(q, this.data.lang);
      this.setData({ answer: d.data ? d.data.answer : this.data.L.tip, loading: false });
    } catch (e) {
      this.setData({ answer: this.data.L.tip, loading: false });
    }
  },

  onFaqTap(e) {
    this.setData({ query: e.currentTarget.dataset.q, answer: e.currentTarget.dataset.a });
  },

  noop() {}
});
