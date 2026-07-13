// 临时云函数：批量修复 orders 集合中的图片路径
// 1. 字符串 .png → .jpg
// 2. 对象（被聚合命令搞坏的）→ 通过 goodsId 从 goods 集合恢复正确路径
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const orders = await db.collection('orders').get()
    let fixedCount = 0
    let skipCount = 0

    for (const order of orders.data) {
      let newImage = null

      if (typeof order.image === 'string') {
        // 情况1：字符串，直接替换 .png → .jpg
        if (order.image.endsWith('.png')) {
          newImage = order.image.replace('.png', '.jpg')
        }
      } else if (typeof order.image === 'object' && order.goodsId) {
        // 情况2：被聚合命令搞成了对象，通过 goodsId 从 goods 集合获取正确路径
        try {
          const goodsRes = await db.collection('goods').doc(order.goodsId).get()
          if (goodsRes.data && goodsRes.data.image) {
            newImage = goodsRes.data.image
          }
        } catch (e) {
          // goodsId 找不到对应商品，跳过
        }
      }

      if (newImage) {
        await db.collection('orders').doc(order._id).update({
          data: { image: newImage }
        })
        fixedCount++
      } else {
        skipCount++
      }
    }

    return {
      code: 0,
      message: 'success',
      data: {
        totalOrders: orders.data.length,
        fixedCount: fixedCount,
        skipCount: skipCount
      }
    }
  } catch (err) {
    return {
      code: -1,
      message: err.message
    }
  }
}
