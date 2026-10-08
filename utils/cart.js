const config = require('./config.js')
const store = require('./store.js')

/**
 * 购物车：内存(globalData) + 本地缓存双写，保证杀掉小程序后菜品还在
 * 数据结构：[{ _id, name, image, price, num }]
 */
const EVENT = 'cart:change'

function app() {
  return getApp()
}

function list() {
  return app().globalData.cart || []
}

function persist() {
  wx.setStorageSync(config.KEYS.CART, list())
}

function sync() {
  persist()
  store.emit(EVENT, summary())
}

/** 加入购物车（已存在则数量 +1） */
function add(dish, step = 1) {
  const arr = list()
  const idx = arr.findIndex(item => item._id === dish._id)
  if (idx > -1) {
    arr[idx].num += step
  } else {
    arr.push({
      _id: dish._id,
      name: dish.name,
      image: dish.image,
      price: Number(dish.price) || 0,
      num: step
    })
  }
  app().globalData.cart = arr
  sync()
}

function setNum(id, num) {
  const arr = list()
  const idx = arr.findIndex(item => item._id === id)
  if (idx === -1) return
  if (num <= 0) {
    arr.splice(idx, 1)
  } else {
    arr[idx].num = num
  }
  app().globalData.cart = arr
  sync()
}

function inc(id) {
  const item = list().find(i => i._id === id)
  if (item) setNum(id, item.num + 1)
}

function dec(id) {
  const item = list().find(i => i._id === id)
  if (item) setNum(id, item.num - 1)
}

function remove(id) {
  const arr = list().filter(item => item._id !== id)
  app().globalData.cart = arr
  sync()
}

function clear() {
  app().globalData.cart = []
  sync()
}

/** 汇总：总数量 / 总金额 */
function summary() {
  const arr = list()
  let totalNum = 0
  let totalPrice = 0
  arr.forEach(item => {
    totalNum += item.num
    totalPrice += (Number(item.price) || 0) * item.num
  })
  return {
    list: arr,
    totalNum,
    totalPrice: Number(totalPrice.toFixed(2))
  }
}

/** 启动时从本地缓存恢复 */
function restore() {
  try {
    const cached = wx.getStorageSync(config.KEYS.CART)
    app().globalData.cart = Array.isArray(cached) ? cached : []
  } catch (e) {
    app().globalData.cart = []
  }
}

function onChange(fn) {
  store.on(EVENT, fn)
}

function offChange(fn) {
  store.off(EVENT, fn)
}

module.exports = {
  EVENT,
  list,
  add,
  inc,
  dec,
  setNum,
  remove,
  clear,
  summary,
  restore,
  onChange,
  offChange
}
