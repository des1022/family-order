const config = require('../../utils/config.js')
const db = require('../../utils/db.js')
const { deleteDishImage } = require('../../utils/image.js')
const { toast, confirm, formatPrice } = require('../../utils/util.js')

const ALL_CAT = '全部'

Page({
  data: {
    /* 密码锁 */
    locked: true,
    pwdMode: 'verify',     // set = 首次设置 / verify = 验证
    pwd: '',
    pwdError: '',
    hasLocalPwd: false,
    keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],

    /* 菜品管理 */
    allDishes: [],
    groups: [],
    catOptions: [ALL_CAT],
    filterCat: ALL_CAT,
    loading: false
  },

  onLoad() {
    this.initLock()
  },

  onShow() {
    // 从编辑/分类页返回时刷新列表
    if (!this.data.locked) this.loadDishes(true)
  },

  onPullDownRefresh() {
    if (this.data.locked) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadDishes(true).then(() => wx.stopPullDownRefresh())
  },

  /* ==================== 管理密码 ==================== */

  async initLock() {
    const localPwd = getApp().globalData.adminPwd || ''
    let cloudPwd = ''
    try {
      cloudPwd = await db.getAdminPassword()
    } catch (e) {
      console.warn('[admin] 读取云端密码失败', e)
    }
    this._cloudPwd = cloudPwd
    this.setData({
      locked: true,
      hasLocalPwd: !!localPwd,
      pwdMode: (!localPwd && !cloudPwd) ? 'set' : 'verify'
    })
  },

  onKey(e) {
    const key = e.currentTarget.dataset.key
    if (this.data.pwd.length >= config.ADMIN_PWD_LENGTH) return
    const pwd = this.data.pwd + key
    this.setData({ pwd, pwdError: '' })
    if (pwd.length === config.ADMIN_PWD_LENGTH) {
      setTimeout(() => this.checkPwd(pwd), 120)
    }
  },

  onKeyDelete() {
    this.setData({
      pwd: this.data.pwd.slice(0, -1),
      pwdError: ''
    })
  },

  async checkPwd(pwd) {
    if (this.data.pwdMode === 'set') {
      // 首次设置：写入本地缓存 + 云数据库，方便换设备继续用
      wx.setStorageSync(config.KEYS.ADMIN_PWD, pwd)
      getApp().globalData.adminPwd = pwd
      try {
        await db.setAdminPassword(pwd)
      } catch (e) {
        console.warn('[admin] 云端密码保存失败，仅本机可用', e)
      }
      toast('密码已设置')
      this.unlock()
      return
    }

    const localPwd = getApp().globalData.adminPwd || ''
    const right = localPwd || this._cloudPwd || ''
    if (pwd === right) {
      if (!localPwd) {
        wx.setStorageSync(config.KEYS.ADMIN_PWD, pwd)
        getApp().globalData.adminPwd = pwd
      }
      this.unlock()
    } else {
      this.setData({ pwdError: '密码不对，请重新输入' })
      setTimeout(() => this.setData({ pwd: '' }), 500)
    }
  },

  unlock() {
    this.setData({ locked: false, pwd: '', pwdError: '' })
    this.loadDishes()
  },

  /* ==================== 菜品列表 ==================== */

  async loadDishes(silent = false) {
    if (!silent) this.setData({ loading: true })
    try {
      const [dishes, cats] = await Promise.all([
        db.getAllDishes(),
        db.getCategories()
      ])
      const fromDishes = Array.from(new Set(dishes.map(d => d.category).filter(Boolean)))
      const catOptions = [ALL_CAT].concat(
        Array.from(new Set(cats.map(c => c.name).concat(fromDishes)))
      )
      const decorated = dishes.map(d => Object.assign({}, d, { priceText: formatPrice(d.price) }))
      this.setData({ allDishes: decorated, catOptions }, () => this.buildGroups())
    } catch (e) {
      console.error('[admin] 加载菜品失败', e)
      toast('加载失败，请检查云环境配置')
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 按分类分组展示 */
  buildGroups() {
    const { allDishes, filterCat } = this.data
    let list = allDishes
    if (filterCat !== ALL_CAT) {
      list = list.filter(d => d.category === filterCat)
    }
    const map = {}
    list.forEach(d => {
      const key = d.category || '未分类'
      if (!map[key]) map[key] = { name: key, dishes: [] }
      map[key].dishes.push(d)
    })
    const groups = Object.keys(map).map(k => map[k])
    this.setData({ groups })
  },

  onFilter(e) {
    this.setData({ filterCat: e.currentTarget.dataset.cat }, () => this.buildGroups())
  },

  /** 上/下架切换 */
  async onToggleStatus(e) {
    const { id, status } = e.currentTarget.dataset
    const next = Number(status) === config.DISH_STATUS.ON ? config.DISH_STATUS.OFF : config.DISH_STATUS.ON
    try {
      await db.updateDish(id, { status: next })
      toast(next === config.DISH_STATUS.ON ? '已上架' : '已下架')
      this.loadDishes(true)
    } catch (err) {
      console.error('[admin] 状态更新失败', err)
      toast('操作失败')
    }
  },

  onEdit(e) {
    wx.navigateTo({ url: `/pages/dish-edit/dish-edit?id=${e.currentTarget.dataset.id}` })
  },

  /** 删除菜品：二次确认 + 同步删除云存储图片 */
  async onDelete(e) {
    const { id, image, name } = e.currentTarget.dataset
    const ok = await confirm(`确定删除「${name}」吗？删除后不可恢复。`, '删除菜品', '删除')
    if (!ok) return
    wx.showLoading({ title: '删除中', mask: true })
    try {
      await db.removeDish(id)
      await deleteDishImage(image)
      toast('已删除')
      this.loadDishes(true)
    } catch (err) {
      console.error('[admin] 删除失败', err)
      toast('删除失败')
    } finally {
      wx.hideLoading()
    }
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/dish-edit/dish-edit' })
  },

  goCategory() {
    wx.navigateTo({ url: '/pages/category/category' })
  },

  goOrderAdmin() {
    wx.navigateTo({ url: '/pages/order-admin/order-admin' })
  }
})
