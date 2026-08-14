// components/contact-bar/contact-bar.js
// 合规客服咨询组件 — 使用微信原生 open-type="contact"
// 所有交易意图通过客服会话完成，不触发小程序交易系统

Component({
  properties: {
    // 按钮文案
    text: {
      type: String,
      value: '咨询客服'
    },
    // 传递给客服的会话来源信息
    // 格式: 'hotel_detail' / 'visa_service' / 'tax_service' 等
    source: {
      type: String,
      value: ''
    },
    // 传递给客服的具体参数（JSON 字符串）
    params: {
      type: String,
      value: ''
    },
    // 按钮样式: 'primary' | 'outline' | 'mini'
    type: {
      type: String,
      value: 'primary'
    }
  },

  data: {},

  methods: {
    // contact 按钮的事件，可以在此记录用户点击行为
    onContact(e) {
      // e.detail.path  — 进入客服会话的来源路径
      // e.detail.query — 传递给客服的参数
      console.log('[contact-bar] 用户发起客服咨询', this.data.source, e.detail);

      // 可选：上报到云函数做埋点统计
      // api.trackEvent({ source: this.data.source, ... })
    }
  }
});
