// 云函数：createOrder
// 功能：订单相关操作（创建订单、查询订单列表、查询订单详情、更新订单状态、删除订单）
// 参数：
//   action: 'create' | 'list' | 'detail' | 'updateStatus' | 'remove' | 'addToCart'
//   openid: 用户openid
//   orderData: 订单数据（action为create时使用）
//   id: 订单ID
//   status: 新状态（action为updateStatus时使用）
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
  const { action, openid, orderData, id, status } = event

  return logger.wrap('createOrder', action, async () => {
    // 创建订单
    if (action === 'create') {
      if (!openid || !orderData) return { code: -1, message: '缺少参数' }

      const res = await db.collection('orders').add({
        data: {
          openid: openid,
          goodsId: orderData.goodsId,
          cartId: orderData.cartId || '',
          name: orderData.name,
          price: orderData.price,
          image: orderData.image,
          quantity: orderData.quantity || 1,
          remark: orderData.remark || '',
          phone: orderData.phone || '',
          pickTime: orderData.pickTime || '',
          deliveryMode: orderData.deliveryMode || 'pickup',
          totalAmount: orderData.totalAmount || 0,
          status: 'pending',
          createTime: db.serverDate()
        }
      })
      return { code: 0, message: 'success', data: { orderId: res._id } }
    }

    // 创建单订单（多商品）—— 用于多个商品合并在一张订单里
    if (action === 'createMulti') {
      if (!openid || !orderData || !Array.isArray(orderData.goodsList)) {
        return { code: -1, message: '缺少参数' }
      }

      const goodsList = orderData.goodsList
      const firstGoods = goodsList[0] || {}

      // 计算商品总价、总件数
      let goodsTotal = 0
      let totalCount = 0
      goodsList.forEach(function (item) {
        const qty = item.quantity || 1
        goodsTotal += (item.price || 0) * qty
        totalCount += qty
      })

      // 配送费（外卖模式）
      const deliveryFee = orderData.deliveryFee || 0
      const totalAmount = goodsTotal + deliveryFee

      // 生成取餐号（3位随机数）
      const orderNo = Math.floor(Math.random() * 900 + 100).toString()
      // 已付款，自取为'using'，外卖为'ready'
      const initialStatus = orderData.deliveryMode === 'deliver' ? 'ready' : 'using'

      const res = await db.collection('orders').add({
        data: {
          openid: openid,
          goodsId: firstGoods.goodsId || firstGoods._id || '',
          cartId: firstGoods.cartId || '',
          name: firstGoods.name || '',
          price: firstGoods.price || 0,
          image: firstGoods.image || '',
          quantity: totalCount,
          goodsList: goodsList, // 多商品数组
          totalCount: totalCount,
          remark: orderData.remark || '',
          phone: orderData.phone || '',
          pickTime: orderData.pickTime || '',
          deliveryMode: orderData.deliveryMode || 'pickup',
          deliveryAddress: orderData.deliveryAddress || null,
          deliveryFee: deliveryFee,
          totalAmount: totalAmount,
          status: initialStatus,
          orderNo: orderNo,
          payTime: new Date(),
          createTime: db.serverDate()
        }
      })
      return { code: 0, message: 'success', data: { orderId: res._id, orderNo: orderNo } }
    }

    // 批量创建订单
    if (action === 'batchCreate') {
      if (!openid || !orderData || !Array.isArray(orderData)) {
        return { code: -1, message: '缺少参数' }
      }

      const orderIds = []
      const orderNos = []
      for (const item of orderData) {
        // 生成取餐号（3位随机数）
        const orderNo = Math.floor(Math.random() * 900 + 100).toString()
        // 已付款，自取为'using'，外卖为'ready'
        const initialStatus = item.deliveryMode === 'deliver' ? 'ready' : 'using'

        const res = await db.collection('orders').add({
          data: {
            openid: openid,
            goodsId: item.goodsId || item._id,
            cartId: item.cartId || item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity || 1,
            remark: item.remark || '',
            phone: item.phone || '',
            pickTime: item.pickTime || '',
            deliveryMode: item.deliveryMode || 'pickup',
            totalAmount: item.price * (item.quantity || 1),
            status: initialStatus,
            orderNo: orderNo,
            payTime: new Date(),
            createTime: db.serverDate()
          }
        })
        orderIds.push(res._id)
        orderNos.push(orderNo)
      }
      return { code: 0, message: 'success', data: { orderIds: orderIds, orderNos: orderNos } }
    }

    // 查询订单列表
    if (action === 'list') {
      if (!openid) return { code: -1, message: '缺少openid' }
      let query = db.collection('orders').where({ openid: openid })

      // 支持按状态筛选
      if (status) {
        query = db.collection('orders').where({ openid: openid, status: status })
      }

      const res = await query.orderBy('createTime', 'desc').get()
      return { code: 0, message: 'success', data: res.data }
    }

    // 查询订单详情
    if (action === 'detail') {
      if (!id) return { code: -1, message: '缺少订单ID' }
      const res = await db.collection('orders').doc(id).get()
      return { code: 0, message: 'success', data: res.data }
    }

    // 更新订单状态
    if (action === 'updateStatus') {
      if (!id || !status) return { code: -1, message: '缺少参数' }
      await db.collection('orders').doc(id).update({
        data: { status: status, updateTime: db.serverDate() }
      })
      return { code: 0, message: 'success' }
    }

    // 删除订单
    if (action === 'remove') {
      if (!id) return { code: -1, message: '缺少订单ID' }
      await db.collection('orders').doc(id).remove()
      return { code: 0, message: 'success' }
    }

    // 订单加入购物车（再来一单）
    if (action === 'addToCart') {
      if (!openid || !id) return { code: -1, message: '缺少参数' }
      const orderRes = await db.collection('orders').doc(id).get()
      const order = orderRes.data

      // 提取待添加的商品列表（优先 goodsList，兼容老字段单商品）
      let addItems = []
      if (order.goodsList && Array.isArray(order.goodsList) && order.goodsList.length > 0) {
        addItems = order.goodsList.map(g => ({
          goodsId: g.goodsId,
          name: g.name,
          price: g.price,
          image: g.image,
          quantity: g.quantity || 1
        }))
      } else {
        addItems = [{
          goodsId: order.goodsId,
          name: order.name,
          price: order.price,
          image: order.image,
          quantity: order.quantity || 1
        }]
      }

      // 批量加入购物车
      const tasks = addItems.map(async (item) => {
        if (!item.goodsId) return
        // 检查购物车是否已有该商品
        const existRes = await db.collection('cart')
          .where({ openid: openid, goodsId: item.goodsId })
          .get()

        if (existRes.data.length > 0) {
          await db.collection('cart').doc(existRes.data[0]._id).update({
            data: {
              quantity: _.inc(item.quantity),
              updateTime: db.serverDate()
            }
          })
        } else {
          await db.collection('cart').add({
            data: {
              openid: openid,
              goodsId: item.goodsId,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: item.quantity,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        }
      })

      await Promise.all(tasks)
      return { code: 0, message: 'success', data: { addedCount: addItems.length } }
    }

    return { code: -1, message: '未知action' }
  })
}
