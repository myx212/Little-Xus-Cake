// 云函数：getCartList
// 功能：购物车相关操作（查询、更新数量、删除、清空）
// 参数：
//   action: 'list' | 'updateQty' | 'remove' | 'clear' | 'add'
//   openid: 用户openid
//   id: 购物车记录ID
//   delta: 数量变化值（action为updateQty时使用）
//   item: 新增商品数据（action为add时使用）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const logger = {
  info(funcName, action, message, data) {
    const log = { timestamp: new Date().toISOString(), level: 'INFO', funcName, action: action || 'unknown', message }
    if (data !== undefined) log.data = data
    console.log(JSON.stringify(log))
  },
  warn(funcName, action, message, data) {
    const log = { timestamp: new Date().toISOString(), level: 'WARN', funcName, action: action || 'unknown', message }
    if (data !== undefined) log.data = data
    console.warn(JSON.stringify(log))
  },
  error(funcName, action, message, err) {
    const log = { timestamp: new Date().toISOString(), level: 'ERROR', funcName, action: action || 'unknown', message }
    if (err) { log.errorMessage = err.message; log.errorStack = err.stack }
    console.error(JSON.stringify(log))
  },
  async wrap(funcName, action, handler) {
    try {
      this.info(funcName, action, 'request start')
      const result = await handler()
      this.info(funcName, action, 'request success', { code: result && result.code })
      return result
    } catch (err) {
      this.error(funcName, action, 'request failed', err)
      return { code: -1, message: '服务器内部错误', error: err.message }
    }
  }
}
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, openid, id, delta, item } = event

  return logger.wrap('getCartList', action, async () => {
    // 查询购物车列表
    if (action === 'list') {
      if (!openid) return { code: -1, message: '缺少openid' }
      const res = await db.collection('cart')
        .where({ openid: openid })
        .orderBy('createTime', 'desc')
        .get()
      return { code: 0, message: 'success', data: res.data }
    }

    // 更新购物车商品数量
    if (action === 'updateQty') {
      if (!id || delta === undefined) return { code: -1, message: '缺少参数' }
      await db.collection('cart').doc(id).update({
        data: {
          quantity: _.inc(delta),
          updateTime: db.serverDate()
        }
      })
      return { code: 0, message: 'success' }
    }

    // 删除购物车单条记录
    if (action === 'remove') {
      if (!id) return { code: -1, message: '缺少ID' }
      await db.collection('cart').doc(id).remove()
      return { code: 0, message: 'success' }
    }

    // 清空购物车（根据openid）
    if (action === 'clear') {
      if (!openid) return { code: -1, message: '缺少openid' }
      const res = await db.collection('cart').where({ openid: openid }).get()
      const deleteTasks = res.data.map(item =>
        db.collection('cart').doc(item._id).remove()
      )
      await Promise.all(deleteTasks)
      return { code: 0, message: 'success' }
    }

    // 添加商品到购物车
    if (action === 'add') {
      if (!openid || !item) return { code: -1, message: '缺少参数' }
      // 检查是否已存在
      const existRes = await db.collection('cart')
        .where({ openid: openid, goodsId: item.goodsId })
        .get()
      if (existRes.data.length > 0) {
        // 已有商品，累加数量，更新备注
        await db.collection('cart').doc(existRes.data[0]._id).update({
          data: {
            quantity: _.inc(item.quantity || 1),
            remark: item.remark || '',
            updateTime: db.serverDate()
          }
        })
        return { code: 0, message: 'success', action: 'updated' }
      } else {
        // 新增
        await db.collection('cart').add({
          data: {
            openid: openid,
            goodsId: item.goodsId,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity || 1,
            remark: item.remark || '',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
        return { code: 0, message: 'success', action: 'added' }
      }
    }

    return { code: -1, message: '未知action' }
  })
}
