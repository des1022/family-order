const config = require('./config.js')
const { db, COLLECTIONS, fetchAll } = require('./cloud.js')

/**
 * 数据访问层：dishes / orders / categories / settings 四个集合
 * 说明：规格中的 2 个集合为 dishes、orders；
 *      categories（分类）与 settings（管理密码）为实现「分类管理 / 密码同步」新增的两个辅助集合。
 */

const colDishes = () => db().collection(COLLECTIONS.DISHES)
const colOrders = () => db().collection(COLLECTIONS.ORDERS)
const colCategories = () => db().collection(COLLECTIONS.CATEGORIES)
const colSettings = () => db().collection(COLLECTIONS.SETTINGS)

/* ==================== 菜品 ==================== */

/** 只取上架菜品（用户端） */
async function getOnDishes() {
  return fetchAll(colDishes, q => q.orderBy('createTime', 'desc'))
    .then(list => list.filter(item => item.status === config.DISH_STATUS.ON))
}

/** 取全部菜品（管理端） */
async function getAllDishes() {
  return fetchAll(colDishes, q => q.orderBy('createTime', 'desc'))
}

function addDish(data) {
  return colDishes().add({
    data: Object.assign({}, data, { createTime: db().serverDate() })
  })
}

function updateDish(id, data) {
  return colDishes().doc(id).update({ data })
}

function removeDish(id) {
  return colDishes().doc(id).remove()
}

/* ==================== 订单 ==================== */

async function getOrders() {
  return fetchAll(colOrders, q => q.orderBy('createTime', 'desc'))
}

function addOrder(data) {
  return colOrders().add({
    data: Object.assign({}, data, { createTime: db().serverDate() })
  })
}

function updateOrderStatus(id, status) {
  return colOrders().doc(id).update({ data: { status } })
}

function removeOrder(id) {
  return colOrders().doc(id).remove()
}

/** 订单实时监听（基础库 2.9.2+），失败时返回 null 由调用方降级为轮询 */
function watchOrders(onChange) {
  try {
    return colOrders()
      .orderBy('createTime', 'desc')
      .limit(config.PAGE_SIZE)
      .watch({
        onChange: snapshot => onChange(snapshot.docs || []),
        onError: err => console.error('[db] 订单监听异常', err)
      })
  } catch (e) {
    console.warn('[db] 当前环境不支持 watch，降级为手动刷新', e)
    return null
  }
}

/* ==================== 分类 ==================== */

async function getCategories() {
  try {
    const list = await fetchAll(colCategories, q => q.orderBy('sort', 'asc'))
    return list.map(item => ({ _id: item._id, name: item.name }))
  } catch (e) {
    console.warn('[db] categories 集合不可用，回退为从菜品中提取分类', e)
    return []
  }
}

function addCategory(name, sort = 0) {
  return colCategories().add({
    data: { name, sort, createTime: db().serverDate() }
  })
}

function removeCategory(id) {
  return colCategories().doc(id).remove()
}

/** 把某个分类下的菜品转移到目标分类 */
async function moveDishesCategory(fromName, toName) {
  const list = await fetchAll(colDishes)
  const targets = list.filter(item => item.category === fromName)
  await Promise.all(targets.map(item => updateDish(item._id, { category: toName })))
  return targets.length
}

/* ==================== 设置（管理密码） ==================== */

const ADMIN_DOC_ID = 'admin'

async function getAdminPassword() {
  try {
    const res = await colSettings().doc(ADMIN_DOC_ID).get()
    return (res.data && res.data.password) || ''
  } catch (e) {
    return ''
  }
}

/** 写入管理密码（新增或更新） */
async function setAdminPassword(password) {
  const cur = await getAdminPassword()
  if (cur) {
    return colSettings().doc(ADMIN_DOC_ID).update({ data: { password } })
  }
  try {
    return await colSettings().add({ data: { _id: ADMIN_DOC_ID, password } })
  } catch (e) {
    // 部分环境不支持在 add 中指定 _id，退回 set
    return colSettings().doc(ADMIN_DOC_ID).set({ data: { password } })
  }
}

module.exports = {
  getOnDishes,
  getAllDishes,
  addDish,
  updateDish,
  removeDish,
  getOrders,
  addOrder,
  updateOrderStatus,
  removeOrder,
  watchOrders,
  getCategories,
  addCategory,
  removeCategory,
  moveDishesCategory,
  getAdminPassword,
  setAdminPassword
}
