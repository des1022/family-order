const cart = require('../../utils/cart.js')
const { formatPrice, confirm, toast } = require('../../utils/util.js')

Component({
  data: {
    list: [],
    totalNum: 0,
    totalPrice: 0,
    totalPriceText: '0',
    showDetail: false
  },

  lifetimes: {
    attached() {
      this.refresh()
      this._onChange = () => this.refresh()
      cart.onChange(this._onChange)
    },
    detached() {
      if (this._onChange) cart.offChange(this._onChange)
    }
  },

  methods: {
    /** 从购物车模块同步最新数据 */
    refresh() {
      const sum = cart.summary()
      const list = sum.list.map(item => Object.assign({}, item, {
        priceText: formatPrice(item.price)
      }))
      this.setData({
        list,
        totalNum: sum.totalNum,
        totalPrice: sum.totalPrice,
        totalPriceText: formatPrice(sum.totalPrice)
      })
      // 购物车被清空时自动收起弹窗
      if (sum.totalNum === 0 && this.data.showDetail) {
        this.setData({ showDetail: false })
      }
    },

    toggleDetail() {
      this.setData({ showDetail: !this.data.showDetail })
    },

    closeDetail() {
      this.setData({ showDetail: false })
    },

    noop() {},

    onPlus(e) {
      cart.inc(e.currentTarget.dataset.id)
    },

    onMinus(e) {
      cart.dec(e.currentTarget.dataset.id)
    },

    async onClear() {
      const ok = await confirm('确定清空购物车中的全部菜品吗？', '清空购物车', '清空')
      if (!ok) return
      cart.clear()
      this.setData({ showDetail: false })
      toast('购物车已清空')
    },

    goConfirm() {
      if (cart.summary().totalNum === 0) {
        toast('还没有选菜哦')
        return
      }
      this.setData({ showDetail: false })
      wx.navigateTo({ url: '/pages/confirm/confirm' })
    }
  }
})
