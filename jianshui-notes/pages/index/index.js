import { banners, quickEntries, travelSpots, specialties } from '../../utils/data'
import { getTravelSpots, getSpecialties } from '../../utils/db'

Page({
  data: {
    banners,
    quickEntries,
    featuredSpots: travelSpots.slice(0, 3),
    featuredSpecialties: specialties.slice(0, 4),
    currentBanner: 0
  },

  onLoad() {
    this.loadData()
  },

  // 从云端拉取首页精选内容（失败则保持静态数据）
  async loadData() {
    const [spots, items] = await Promise.all([getTravelSpots(), getSpecialties()])
    this.setData({
      featuredSpots: (spots || []).slice(0, 3),
      featuredSpecialties: (items || []).slice(0, 4)
    })
  },

  onShow() {
    // 页面显示
  },

  // 轮播图切换
  onBannerChange(e) {
    this.setData({
      currentBanner: e.detail.current
    })
  },

  // 快捷入口点击
  onEntryTap(e) {
    const { page } = e.currentTarget.dataset
    wx.switchTab({ url: page })
  },

  // 轮播图点击
  onBannerTap(e) {
    const { page } = e.currentTarget.dataset
    if (page) {
      wx.switchTab({ url: page })
    }
  },

  // 景点点击
  onSpotTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/travel/index?id=${id}`
    })
  },

  // 特产点击
  onSpecialtyTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/specialty/index?id=${id}`
    })
  },

  // 查看更多旅游
  onMoreTravel() {
    wx.switchTab({ url: '/pages/travel/index' })
  },

  // 查看更多特产
  onMoreSpecialty() {
    wx.switchTab({ url: '/pages/specialty/index' })
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '柬税笔记 - 柬埔寨税法、旅游、特产全能助手',
      path: '/pages/index/index',
      imageUrl: '/assets/images/angkor.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '柬税笔记 🇰🇭 柬埔寨税法·旅游·特产·问答',
      query: ''
    }
  }
})
