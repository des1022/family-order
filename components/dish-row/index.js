const { formatPrice } = require('../../utils/util.js')

Component({
  properties: {
    dish: {
      type: Object,
      value: {}
    }
  },

  observers: {
    'dish': function (dish) {
      if (!dish) return
      this.setData({
        priceText: formatPrice(dish.price)
      })
    }
  },

  data: {
    priceText: '0'
  },

  methods: {
    /** 点击「+」：向外抛出 add 事件，由页面统一处理加购与 toast */
    onAdd() {
      this.triggerEvent('add', { dish: this.data.dish })
    },

    /** 点击图片预览大图 */
    onPreview() {
      const url = this.data.dish.image
      if (!url) return
      wx.previewImage({ urls: [url], current: url })
    }
  }
})
