const config = require('../../utils/config.js')
const db = require('../../utils/db.js')
const cart = require('../../utils/cart.js')
const { formatPrice, toast, confirm } = require('../../utils/util.js')

Page({
  data: {
    list: [],
    totalNum: 0,
    totalPrice: 0,
    totalPriceText: '0',
    nickname: '',
    remark: '',
    emptyCart: false,
    submitting: false
  },

  onShow() {
    const sum = cart.summary()
    if (sum.totalNum === 0) {
      this.setData({ emptyCart: true, list: [] })
      return
    }
    // 昵称默认填充上次输入的内容
    const nickname = getApp().globalData.nickname || wx.getStorageSync(config.KEYS.NICKNAME) || ''
    this.setData({
      emptyCart: false,
      list: sum.list.map(item => Object.assign({}, item, { priceText: formatPrice(item.price) })),
      totalNum: sum.totalNum,
      totalPrice: sum.totalPrice,
      totalPriceText: formatPrice(sum.totalPrice),
      nickname
    })
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  /** 提交订单：写库 → 清空购物车 → 回首页 */
  async onSubmit() {
    if (this.data.submitting) return
    const nickname = (this.data.nickname || '').trim()
    if (!nickname) {
      toast('请填写下单人昵称')
      return
    }

    const ok = await confirm(`确认以「${nickname}」的名义提交订单？`, '提交订单', '提交')
    if (!ok) return

    this.setData({ submitting: true })
    try {
      const sum = cart.summary()
      await db.addOrder({
        nickname,
        goods: sum.list.map(item => ({
          id: item._id,
          name: item.name,
          image: item.image,
          price: item.price,
          num: item.num
        })),
        remark: (this.data.remark || '').trim(),
        totalNum: sum.totalNum,
        totalPrice: sum.totalPrice,
        status: config.ORDER_STATUS.WAIT
      })

      // 记住昵称，下次自动填充
      wx.setStorageSync(config.KEYS.NICKNAME, nickname)
      getApp().globalData.nickname = nickname

      cart.clear()
      toast('下单成功')
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 800)
    } catch (e) {
      console.error('[confirm] 提交订单失败', e)
      toast('提交失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  }
})
