const config = require('../../utils/config.js')
const db = require('../../utils/db.js')
const cart = require('../../utils/cart.js')
const { toast } = require('../../utils/util.js')

const ALL_CAT = '全部'

Page({
  data: {
    allDishes: [],     // 全部上架菜品
    showList: [],      // 当前分类 + 搜索后的展示列表
    categories: [ALL_CAT],
    activeCat: ALL_CAT,
    keyword: '',
    loading: true,
    showGuide: false
  },

  onLoad() {
    // 首次打开弹出一页操作引导
    const guideShown = wx.getStorageSync(config.KEYS.GUIDE_SHOWN)
    if (!guideShown) this.setData({ showGuide: true })
  },

  onShow() {
    this.loadDishes()
  },

  onPullDownRefresh() {
    this.loadDishes(true)
  },

  /** 拉取上架菜品 + 分类（静默刷新，不打断操作） */
  async loadDishes(silent = false) {
    if (!silent) this.setData({ loading: true })
    try {
      const [dishes, cats] = await Promise.all([
        db.getOnDishes(),
        db.getCategories()
      ])
      // 分类：配置表的分类 + 菜品中已存在的分类（保证没配分类也能正常筛选）
      const fromDishes = Array.from(new Set(dishes.map(d => d.category).filter(Boolean)))
      const merged = [ALL_CAT].concat(
        Array.from(new Set(cats.map(c => c.name).concat(fromDishes)))
      )
      this.setData({ allDishes: dishes, categories: merged }, () => {
        this.filterList()
      })
    } catch (e) {
      console.error('[index] 加载菜品失败', e)
      toast('菜品加载失败，下拉重试')
    } finally {
      this.setData({ loading: false })
      if (silent) wx.stopPullDownRefresh()
    }
  },

  /** 按分类 + 关键词过滤 */
  filterList() {
    const { allDishes, activeCat, keyword } = this.data
    const kw = (keyword || '').trim()
    let list = allDishes
    if (activeCat !== ALL_CAT) {
      list = list.filter(item => item.category === activeCat)
    }
    if (kw) {
      list = list.filter(item => (item.name || '').indexOf(kw) > -1)
    }
    this.setData({ showList: list })
  },

  onSwitchCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.cat }, () => this.filterList())
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, () => this.filterList())
  },

  onSearch() {
    this.filterList()
  },

  onClearSearch() {
    this.setData({ keyword: '' }, () => this.filterList())
  },

  /** 点击「+」加购，重复点击数量累加 */
  onAddDish(e) {
    const dish = e.detail.dish
    cart.add(dish, 1)
    wx.vibrateShort({ type: 'light', fail: () => {} })
    const num = (cart.list().find(i => i._id === dish._id) || {}).num || 1
    toast(`${dish.name} 已加入 ×${num}`)
  },

  onCloseGuide() {
    wx.setStorageSync(config.KEYS.GUIDE_SHOWN, true)
    this.setData({ showGuide: false })
  },

  noop() {}
})
