// 云函数：getGoodsList
// 功能：获取商品列表或商品详情
// 参数：
//   action: 'list' | 'detail' | 'cartList'
//   id: 商品ID（action为detail时必填）
//   category: 分类筛选（action为list时可选）
//   openid: 用户openid（action为cartList时必填）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, id, category, openid } = event

  try {
    // 获取商品列表
    if (action === 'list') {
      let query = db.collection('goods')
      if (category) {
        query = query.where({ category: category })
      }
      const res = await query.orderBy('createTime', 'desc').get()
      return {
        code: 0,
        message: 'success',
        data: res.data
      }
    }

    // 获取商品详情
    if (action === 'detail') {
      if (!id) {
        return { code: -1, message: '缺少商品ID' }
      }
      const res = await db.collection('goods').doc(id).get()
      return {
        code: 0,
        message: 'success',
        data: res.data
      }
    }

    // 获取购物车列表
    if (action === 'cartList') {
      if (!openid) {
        return { code: -1, message: '缺少openid' }
      }
      const res = await db.collection('cart')
        .where({ openid: openid })
        .orderBy('createTime', 'desc')
        .get()
      return {
        code: 0,
        message: 'success',
        data: res.data
      }
    }

    // 获取购物车数量
    if (action === 'cartCount') {
      if (!openid) {
        return { code: -1, message: '缺少openid' }
      }
      const res = await db.collection('cart')
        .where({ openid: openid })
        .count()
      return {
        code: 0,
        message: 'success',
        data: { total: res.total }
      }
    }

    return { code: -1, message: '未知action' }
  } catch (err) {
    console.error(err)
    return { code: -1, message: '服务器错误', error: err.message }
  }
}
