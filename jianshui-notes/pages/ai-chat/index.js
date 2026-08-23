import { getChatKnowledge } from '../../utils/db'

Page({
  data: {
    knowledge: [],
    messages: [],
    inputValue: '',
    isTyping: false,
    scrollToView: '',
    quickQuestions: [
      '柬埔寨企业所得税税率是多少？',
      '增值税怎么申报？',
      '吴哥窟门票多少钱？',
      '去柬埔寨旅游最佳季节？',
      '柬埔寨有什么必买特产？',
      '如何办理柬埔寨签证？'
    ],
    showQuickQuestions: true
  },

  async onLoad() {
    // 从云端拉取问答知识库（失败则使用本地静态知识库）
    const knowledge = await getChatKnowledge()
    this.setData({ knowledge })

    // 欢迎消息
    this.addMessage({
      role: 'assistant',
      content: 'សួស្តី！您好！👋\n\n欢迎使用柬税笔记「柬埔寨问答」，这里整理了大家最常问的柬埔寨问题。\n\n您可以快速查询：\n• 📋 **柬埔寨税法**（企业所得税、增值税、个税等）\n• ✈️ **柬埔寨旅游**（吴哥窟、金边、海岛攻略）\n• 🎁 **柬埔寨特产**（胡椒、丝绸、宝石推荐）\n• 💡 **其他实用信息**（签证、货币、交通等）\n\n请直接输入您的问题，或者点击下方的常见问题～'
    })
  },

  // 添加消息
  addMessage(msg) {
    const messages = this.data.messages
    const newMsg = {
      ...msg,
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    messages.push(newMsg)
    this.setData({
      messages,
      scrollToView: `msg-${newMsg.id}`
    })
  },

  // 输入变化
  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  // 发送消息
  onSend() {
    const value = this.data.inputValue.trim()
    if (!value) return

    // 添加用户消息
    this.addMessage({ role: 'user', content: value })
    this.setData({ inputValue: '', showQuickQuestions: false })

    // 显示打字动画
    this.setData({ isTyping: true })

    // 模拟回复延迟
    const delay = 800 + Math.random() * 1200
    setTimeout(() => {
      const reply = this.getAnswer(value)
      this.setData({ isTyping: false })
      this.addMessage({ role: 'assistant', content: reply })
    }, delay)
  },

  // 快捷问题
  onQuickQuestion(e) {
    const question = e.currentTarget.dataset.question
    this.setData({ inputValue: question })
    this.onSend()
  },

  // 问答匹配逻辑
  getAnswer(input) {
    const query = input.toLowerCase()
    const knowledge = this.data.knowledge || []
    let bestMatch = null
    let bestScore = 0

    // 遍历知识库，计算匹配分数
    for (const item of knowledge) {
      let score = 0
      for (const keyword of item.keywords) {
        if (query.includes(keyword.toLowerCase())) {
          score += keyword.length // 关键词越长匹配越精准
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestMatch = item
      }
    }

    if (bestMatch && bestScore > 0) {
      return bestMatch.reply
    }

    // 没有匹配到，返回通用回复
    return this.getFallbackResponse(input)
  },

  // 通用回复
  getFallbackResponse(input) {
    const fallbacks = [
      `感谢您的提问！关于"${input.slice(0, 20)}${input.length > 20 ? '...' : ''}"，我目前的知识库可能还不够全面。\n\n您可以尝试：\n• 换一种方式描述您的问题\n• 点击下方快捷问题快速查询\n• 在"税法"板块搜索详细法规\n• 在"旅游"板块查看攻略\n• 在"特产"板块浏览推荐\n\n我会持续学习更多柬埔寨相关知识！💪`,

      `抱歉，我暂时无法完全理解您的问题 😅\n\n不过别担心！您可以：\n1. 试试更具体的提问方式\n2. 使用下方快捷问题\n3. 切换到其他板块手动浏览\n\n如果您的问题比较专业（如具体税法条款），建议咨询柬埔寨当地专业税务顾问。`,

      `好问题！关于"${input.slice(0, 15)}..."方面，建议您：\n\n📋 税法类：在"税法"板块有详细的分类和搜索功能\n✈️ 旅游类：在"旅游"板块可以查看景点详情和攻略\n🎁 特产类：在"特产"板块有价格、购买地等信息\n\n或者您可以换个关键词再问我～`
    ]

    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  },

  // 滚动到底部
  onScrollToLower() {
    // 预留
  },

  onShareAppMessage() {
    return {
      title: '柬埔寨问答 - 税法·旅游·特产常见问题',
      path: '/pages/ai-chat/index',
      imageUrl: '/assets/images/silk.jpg'
    }
  },

  onShareTimeline() {
    return {
      title: '🇰🇭 柬埔寨百事通 | 常见问题一键查询',
      query: ''
    }
  }
})
