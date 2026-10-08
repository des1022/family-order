const config = require('../../utils/config.js')
const cart = require('../../utils/cart.js')
const { toast, confirm } = require('../../utils/util.js')

Page({
  data: {
    nickname: ''
  },

  onShow() {
    this.setData({ nickname: getApp().globalData.nickname || '' })
  },

  /** 失焦即保存昵称 */
  onNicknameBlur(e) {
    const nickname = (e.detail.value || '').trim()
    wx.setStorageSync(config.KEYS.NICKNAME, nickname)
    getApp().globalData.nickname = nickname
    this.setData({ nickname })
    if (nickname) toast('昵称已保存')
  },

  /** 清空本地缓存：昵称、购物车、引导记录、本机管理密码 */
  async onClearCache() {
    const ok = await confirm('将清除本机昵称、购物车和引导记录，不会影响云端菜品与订单。确定继续？', '清空本地缓存', '清空')
    if (!ok) return
    wx.removeStorageSync(config.KEYS.NICKNAME)
    wx.removeStorageSync(config.KEYS.CART)
    wx.removeStorageSync(config.KEYS.GUIDE_SHOWN)
    wx.removeStorageSync(config.KEYS.ADMIN_PWD)
    getApp().globalData.nickname = ''
    getApp().globalData.adminPwd = ''
    cart.clear()
    this.setData({ nickname: '' })
    toast('已清空本地缓存')
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  }
})
