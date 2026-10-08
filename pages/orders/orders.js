const config = require('../../utils/config.js')
const db = require('../../utils/db.js')
const { formatTime, formatPrice, toast } = require('../../utils/util.js')

Page({
  data: {
    tab: 0,               // 0 我的订单 / 1 待做清单
    allOrders: [],
    myOrders: [],
    summary: [],          // 按菜品合并后的待做清单
    summaryTotalNum: 0,
    pendingCount: 0,
    myNickname: '',
    loading: true
  },

  onLoad() {
    this.load()
  },

  onShow() {
    // 每次进页面刷新一次，保证状态最新；watch 负责实时增量同步
    this.setData({ myNickname: getApp().globalData.nickname || '' })
    this.load(true)
    this.initWatch()
  },

  onHide() {
    this.closeWatch()
  },

  onUnload() {
    this.closeWatch()
  },

  onPullDownRefresh() {
    this.load(true).then(() => wx.stopPullDownRefresh())
  },

  /** 建立订单实时监听，状态变更自动同步 */
  initWatch() {
    if (this.watcher) return
    this.watcher = db.watchOrders(docs => {
      this.setData({ allOrders: this.decorate(docs) }, () => this.buildView())
    })
  },

  closeWatch() {
    if (this.watcher && typeof this.watcher.close === 'function') {
      try { this.watcher.close() } catch (e) {}
    }
    this.watcher = null
  },

  async load(silent = false) {
    if (!silent) this.setData({ loading: true })
    this.setData({ myNickname: getApp().globalData.nickname || '' })
    try {
      const orders = await db.getOrders()
      this.setData({ allOrders: this.decorate(orders) }, () => this.buildView())
    } catch (e) {
      console.error('[orders] 加载订单失败', e)
      toast('订单加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 补充展示字段：时间文本、状态文本、金额文本 */
  decorate(list) {
    return (list || []).map(order => Object.assign({}, order, {
      timeText: formatTime(order.createTime),
      statusText: config.ORDER_STATUS_TEXT[order.status] || '待制作',
      totalPriceText: formatPrice(order.totalPrice)
    }))
  },

  /** 根据当前 tab 构建视图数据 */
  buildView() {
    const { allOrders, myNickname, tab } = this.data

    // 我的订单：按本机昵称过滤；未设置昵称时展示全部
    const myOrders = myNickname
      ? allOrders.filter(o => o.nickname === myNickname)
      : allOrders

    // 待做清单：待制作(0) + 制作中(1)，按菜品维度合并数量
    const pending = allOrders.filter(o => o.status === 0 || o.status === 1)
    const map = {}
    let summaryTotalNum = 0
    pending.forEach(order => {
      (order.goods || []).forEach(g => {
        const key = g.id || g.name
        if (!map[key]) {
          map[key] = { id: key, name: g.name, image: g.image, num: 0, from: [] }
        }
        map[key].num += g.num
        summaryTotalNum += g.num
        map[key].from.push(`${order.nickname}×${g.num}`)
      })
    })
    const summary = Object.keys(map)
      .map(k => map[k])
      .sort((a, b) => b.num - a.num)

    this.setData({
      myOrders,
      summary,
      summaryTotalNum,
      pendingCount: pending.length,
      tab
    })
  },

  onSwitchTab(e) {
    const tab = Number(e.currentTarget.dataset.tab)
    this.setData({ tab })
  }
})
