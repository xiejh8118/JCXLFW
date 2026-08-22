// pages/help/help.js
// AI 智能助手（后端 LLM 代理多轮对话；未配置大模型时回退规则 FAQ）

const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

const I18N = {
  'zh-CN': {
    title: 'AI 智能助手', placeholder: '输入您的问题，如：设备怎么配送？', sendBtn: '发送',
    thinking: '思考中…', faqLabel: '常见问题',
    welcome: '您好，我是柬企商旅 AI 助手，住宿 / 物流 / 物业相关问题都可以问我。',
    tip: '未找到答案？请提交需求单或联系前台。', clearBtn: '清空对话',
    netErr: 'AI 连接失败，已切换规则问答。', retry: '重试',
    dispatchTitle: '智能派单',
    dispatchDesc: 'AI 自动匹配供应商，一句话发起企业需求',
    consultTitle: '前台咨询工单',
    consultDesc: '价格 / 入住退房 / 发票 / 商旅财税，落单跟进'
  },
  'en': {
    title: 'AI Assistant', placeholder: 'Ask, e.g. how to deliver equipment?', sendBtn: 'Send',
    thinking: 'Thinking…', faqLabel: 'FAQ',
    welcome: "Hi, I'm your Cambodia biz-travel AI assistant. Ask me about stay, logistics or property.",
    tip: 'No answer? Submit a request or contact front desk.', clearBtn: 'Clear',
    netErr: 'AI connection failed, switched to rule FAQ.', retry: 'Retry',
    dispatchTitle: 'Smart Dispatch',
    dispatchDesc: 'AI matches the best supplier. Create an enterprise request in one sentence',
    consultTitle: 'Front Desk Ticket',
    consultDesc: 'Pricing / check-in-out / invoice / travel & tax, tracked as a ticket'
  },
  'km': {
    title: 'ជំនួយឆ្លាត AI', placeholder: 'សួរ ឧ. របៀបដឹកជញ្ជូនសម្ភារៈ?', sendBtn: 'ផ្ញើ',
    thinking: 'កំពុងគិត…', faqLabel: 'សំណួរធម្មតា',
    welcome: 'សួស្តី ខ្ញុំជាជំនួយឆ្លាត AI សម្រាប់ពាណិជ្ជកម្មនៅកម្ពុជា។ សួរអំពីស្នាក់នៅ / ឡូជីស្ទីក / អចលនទ្រព្យបាន។',
    tip: 'គ្មានចម្លើយ? ដាក់សំណើឬទាក់ទងផ្ទះសណ្ឋាគារ។', clearBtn: 'លុប',
    netErr: 'ការតភ្ជាប់ AI បរាជ័យ ប្តូរទៅសំណួរចម្លើយតាមច្បាប់។', retry: 'ព្យាយាមម្តងទៀត',
    dispatchTitle: 'ការបែងចែកឆ្លាតវៃ',
    dispatchDesc: 'AI ផ្គូផ្គងអ្នកផ្គត់ផ្គង់ · បង្កើតសំណើសហគ្រាសភ្លាមៗ',
    consultTitle: 'សំណើផ្ទះសណ្ឋាគារ',
    consultDesc: 'តម្លៃ / ចូល-ចេញ / វិក័យបត្រ / ទេសចរណ៍ និងពន្ធ'
  }
};

Page({
  data: { lang: 'zh-CN', L: {}, inputValue: '', messages: [], loading: false, faqs: [], scrollIntoView: '' },

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

  // 智能派单：预填企业需求类型，跳转需求单 tab
  onDispatch() {
    getApp().globalData.pendingRequirementType = 'enterprise';
    wx.switchTab({ url: '/pages/requirement/requirement' });
  },

  // 前台咨询闭环：预填咨询工单类型并展开表单，进入统一工单体系
  onConsultFrontDesk() {
    getApp().globalData.pendingRequirementType = 'frontdesk';
    wx.switchTab({ url: '/pages/requirement/requirement?showForm=true&type=frontdesk' });
  },

  async loadFaq() {
    try {
      const d = await api.faqList(this.data.lang);
      this.setData({ faqs: d.data || [] });
    } catch (e) { console.warn('loadFaq', e); }
  },

  onInput(e) { this.setData({ inputValue: e.detail.value }); },

  scrollToLast() {
    const n = this.data.messages.length;
    if (n) this.setData({ scrollIntoView: 'msg-' + (n - 1) });
  },

  async onSend() {
    const q = this.data.inputValue.trim();
    if (!q || this.data.loading) return;
    const messages = [...this.data.messages, { role: 'user', content: q }];
    this.setData({ messages, inputValue: '', loading: true });
    wx.nextTick(() => this.scrollToLast());
    try {
      const payload = messages.map(m => ({ role: m.role, content: m.content }));
      console.log('[help] llmChat request:', payload);
      const d = await api.llmChat(payload, this.data.lang);
      console.log('[help] llmChat response:', d);
      const answer = (d && d.answer) ? d.answer : this.data.L.tip;
      this.setData({ messages: [...messages, { role: 'assistant', content: answer }], loading: false });
      wx.nextTick(() => this.scrollToLast());
    } catch (e) {
      console.error('[help] llmChat failed:', e && e.message);
      // 防御：LLM 接口失败时 fallback 到规则 FAQ，避免用户完全拿不到答案
      try {
        const fallback = await api.faqAsk(q, this.data.lang);
        console.log('[help] faqAsk fallback:', fallback);
        const ans = (fallback && fallback.answer) ? fallback.answer : this.data.L.tip;
        this.setData({ messages: [...messages, { role: 'assistant', content: ans }], loading: false });
      } catch (e2) {
        console.error('[help] faqAsk also failed:', e2 && e2.message);
        this.setData({ messages: [...messages, { role: 'assistant', content: this.data.L.netErr }], loading: false });
      }
      wx.nextTick(() => this.scrollToLast());
    }
  },

  onFaqTap(e) {
    this.setData({ inputValue: e.currentTarget.dataset.q });
    this.onSend();
  },

  onClear() {
    this.setData({ messages: [], scrollIntoView: '' });
  },

  onShareAppMessage() {
    return { title: this.data.L.title, path: '/pages/help/help' };
  },

  noop() {}
});
