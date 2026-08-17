App({
  globalData: {
    userInfo: null,
    appName: '柬税笔记',
    version: '1.0.0',
    // 云开发环境 ID：在微信开发者工具开通「云开发」后获取，替换下方占位符。
    // 留空或保持占位符时，会自动尝试使用默认（唯一）云环境；若仍失败则使用本地静态数据。
    cloudEnv: 'your-cloud-env-id'
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请升级到 2.2.3 或以上版本')
      return
    }
    const env = this.globalData.cloudEnv
    try {
      if (env && env !== 'your-cloud-env-id') {
        // 已配置环境 ID：显式指定
        wx.cloud.init({ env, traceUser: true })
      } else {
        // 未配置：若存在唯一云环境则使用默认环境（降低配置门槛）
        wx.cloud.init({ traceUser: true })
      }
      globalThis.__cloudInited = true
    } catch (e) {
      console.error('云开发初始化失败，将使用本地静态数据：', e)
      globalThis.__cloudInited = false
    }
  }
})
