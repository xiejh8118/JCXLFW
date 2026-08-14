// components/service-card/service-card.js
Component({
  properties: {
    // 服务图标
    icon: {
      type: String,
      value: '🏨'
    },
    // 服务名称
    title: {
      type: String,
      value: ''
    },
    // 服务描述
    desc: {
      type: String,
      value: ''
    },
    // 标签
    tag: {
      type: String,
      value: ''
    },
    // 标签颜色
    tagColor: {
      type: String,
      value: 'primary'
    },
    // 服务价格（美元）
    priceUSD: {
      type: Number,
      value: 0
    },
    // 价格文本
    priceLabel: {
      type: String,
      value: '/晚'
    },
    // 是否显示价格
    showPrice: {
      type: Boolean,
      value: true
    },
    // 自定义样式
    customStyle: {
      type: String,
      value: ''
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', {
        title: this.properties.title,
        priceUSD: this.properties.priceUSD
      });
    }
  }
});
