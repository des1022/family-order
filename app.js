const config = require('./utils/config.js')
const { initCloud } = require('./utils/cloud.js')

App({
  globalData: {
    cart: [],          // 购物车：[{ _id, name, image, price, num }]
    nickname: '',      // 本机下单人昵称
    adminPwd: ''       // 本机缓存的管理密码
  },

  onLaunch() {
    // 初始化云开发环境（未配置 ENV_ID 时仍可启动，仅云能力不可用）
    initCloud()

    // 恢复本地购物车与昵称。
    // 注意：onLaunch 阶段不调用 getApp()，直接用 this 读写 globalData
    try {
      const cached = wx.getStorageSync(config.KEYS.CART)
      this.globalData.cart = Array.isArray(cached) ? cached : []
      this.globalData.nickname = wx.getStorageSync(config.KEYS.NICKNAME) || ''
      this.globalData.adminPwd = wx.getStorageSync(config.KEYS.ADMIN_PWD) || ''
    } catch (e) {
      this.globalData.cart = []
    }
  }
})
