/**
 * 全局配置：云环境、本地缓存键、业务常量
 * 部署时只需要修改 ENV_ID 一项
 */
module.exports = {
  // TODO 替换为你的云开发环境 ID（微信开发者工具 → 云开发 → 环境 → 环境 ID）
  ENV_ID: 'family-order-0gxxxxxxxxxx',

  // 云存储中菜品图片存放目录（必须以 / 结尾）
  DISH_IMAGE_DIR: 'dish-images/',

  // 图片压缩阈值：宽度 <= 800px，单张 <= 200KB
  MAX_IMAGE_WIDTH: 800,
  MAX_IMAGE_SIZE: 200 * 1024,

  // 管理密码位数（纯数字）
  ADMIN_PWD_LENGTH: 4,

  // 本地缓存键
  KEYS: {
    CART: 'fo_cart',
    NICKNAME: 'fo_nickname',
    ADMIN_PWD: 'fo_admin_pwd',
    GUIDE_SHOWN: 'fo_guide_shown'
  },

  // 菜品上架状态
  DISH_STATUS: { OFF: 0, ON: 1 },

  // 订单状态
  ORDER_STATUS: { WAIT: 0, COOKING: 1, DONE: 2 },
  ORDER_STATUS_TEXT: ['待制作', '制作中', '已完成'],

  // 云开发客户端单次读取上限（默认 20，最大 100）
  PAGE_SIZE: 100
}
