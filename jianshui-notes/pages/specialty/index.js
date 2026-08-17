import { specialtyCategories, specialties } from '../../utils/data'
import { getSpecialties } from '../../utils/db'

Page({
  data: {
    categories: specialtyCategories,
    allSpecialties: specialties,
    filteredSpecialties: specialties,
    activeCategory: 'all',
    detailItem: null,
    showDetail: false
  },

  async onLoad(options) {
    const items = await getSpecialties()
    this.setData({ allSpecialties: items, filteredSpecialties: items })

    if (options && options.id) {
      const item = items.find(s => s.id === parseInt(options.id))
      if (item) {
        this.setData({ detailItem: item, showDetail: true })
      }
    }
  },

  // 分类切换
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category })
    this.filterSpecialties()
  },

  // 筛选
  filterSpecialties() {
    const { activeCategory, allSpecialties } = this.data
    const filtered = activeCategory === 'all'
      ? allSpecialties
      : allSpecialties.filter(item => item.category === activeCategory)
    this.setData({ filteredSpecialties: filtered })
  },

  // 查看详情
  onViewDetail(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.allSpecialties.find(s => s.id === id)
    this.setData({ detailItem: item, showDetail: true })
  },

  // 关闭详情
  onCloseDetail() {
    this.setData({ showDetail: false, detailItem: null })
  },

  onShareAppMessage() {
    return {
      title: '柬埔寨特产选购指南 - 胡椒·丝绸·宝石·香米',
      path: '/pages/specialty/index',
      imageUrl: '/assets/images/pepper.jpg'
    }
  },

  onShareTimeline() {
    return {
      title: '🎁 柬埔寨必买特产清单 | 伴手礼不踩坑',
      query: ''
    }
  }
})
