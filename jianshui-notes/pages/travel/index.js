import { travelCategories, travelSpots } from '../../utils/data'
import { getTravelSpots } from '../../utils/db'

Page({
  data: {
    categories: travelCategories,
    allSpots: travelSpots,
    filteredSpots: travelSpots,
    activeCategory: 'all',
    detailSpot: null,
    showDetail: false
  },

  async onLoad(options) {
    const spots = await getTravelSpots()
    this.setData({ allSpots: spots, filteredSpots: spots })

    // 如果有传入id，直接展示对应景点详情
    if (options && options.id) {
      const spot = spots.find(s => s.id === parseInt(options.id))
      if (spot) {
        this.setData({ detailSpot: spot, showDetail: true })
      }
    }
  },

  // 分类切换
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category })
    this.filterSpots()
  },

  // 筛选
  filterSpots() {
    const { activeCategory, allSpots } = this.data
    const filtered = activeCategory === 'all'
      ? allSpots
      : allSpots.filter(item => item.category === activeCategory)
    this.setData({ filteredSpots: filtered })
  },

  // 查看详情
  onViewDetail(e) {
    const { id } = e.currentTarget.dataset
    const spot = this.data.allSpots.find(s => s.id === id)
    this.setData({ detailSpot: spot, showDetail: true })
  },

  // 关闭详情
  onCloseDetail() {
    this.setData({ showDetail: false, detailSpot: null })
  },

  onShareAppMessage() {
    return {
      title: '探索吴哥之美 - 柬埔寨最全旅游攻略',
      path: '/pages/travel/index',
      imageUrl: '/assets/images/beach.jpg'
    }
  },

  onShareTimeline() {
    return {
      title: '🏛️ 吴哥窟·巴戎寺·海岛 | 柬埔寨旅游攻略',
      query: ''
    }
  }
})
