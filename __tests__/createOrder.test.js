/**
 * createOrder 云函数核心逻辑单元测试
 * 测试范围：金额计算、参数校验、订单号生成、多商品合并
 */

// 提取核心计算逻辑（独立于云函数框架）
function calculateOrderTotal(goodsList, deliveryFee) {
  let goodsTotal = 0
  let totalCount = 0
  goodsList.forEach(item => {
    const qty = item.quantity || 1
    goodsTotal += (item.price || 0) * qty
    totalCount += qty
  })
  return {
    goodsTotal,
    totalCount,
    totalAmount: goodsTotal + (deliveryFee || 0)
  }
}

function validateGoodsList(goodsList) {
  if (!Array.isArray(goodsList) || goodsList.length === 0) {
    return { valid: false, message: 'goodsList 必须是非空数组' }
  }
  for (const item of goodsList) {
    if (!item.price || item.price <= 0) {
      return { valid: false, message: `商品 "${item.name || item.goodsId}" 价格非法: ${item.price}` }
    }
    if (!item.quantity || item.quantity < 1) {
      return { valid: false, message: `商品 "${item.name || item.goodsId}" 数量非法: ${item.quantity}` }
    }
    if (item.quantity > 999) {
      return { valid: false, message: `商品 "${item.name || item.goodsId}" 数量超出上限: ${item.quantity}` }
    }
    if (!item.goodsId && !item._id) {
      return { valid: false, message: '商品缺少 goodsId' }
    }
  }
  return { valid: true }
}

function generateOrderNo() {
  return Math.floor(Math.random() * 900 + 100).toString()
}

function generateOrderNoWithDate() {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 900 + 100)
  return `${mm}${dd}-${rand}`
}

// ============ 测试用例 ============

describe('createOrder - 金额计算', () => {
  test('单商品：price × quantity 正确计算', () => {
    const result = calculateOrderTotal(
      [{ goodsId: 'g1', name: '蛋糕', price: 30, quantity: 2 }],
      0
    )
    expect(result.goodsTotal).toBe(60)
    expect(result.totalCount).toBe(2)
    expect(result.totalAmount).toBe(60)
  })

  test('多商品：总价 = 各商品 price × quantity 之和', () => {
    const result = calculateOrderTotal(
      [
        { goodsId: 'g1', name: '蛋糕', price: 30, quantity: 2 },
        { goodsId: 'g2', name: '面包', price: 10, quantity: 3 },
        { goodsId: 'g3', name: '饼干', price: 5, quantity: 1 }
      ],
      0
    )
    expect(result.goodsTotal).toBe(30 * 2 + 10 * 3 + 5 * 1) // 60+30+5=95
    expect(result.totalCount).toBe(6)
    expect(result.totalAmount).toBe(95)
  })

  test('外卖模式：总价 = 商品总价 + 配送费', () => {
    const result = calculateOrderTotal(
      [{ goodsId: 'g1', name: '蛋糕', price: 30, quantity: 1 }],
      8
    )
    expect(result.totalAmount).toBe(38)
  })

  test('配送费为 0 时不影响总价', () => {
    const result = calculateOrderTotal(
      [{ goodsId: 'g1', name: '蛋糕', price: 30, quantity: 1 }],
      0
    )
    expect(result.totalAmount).toBe(30)
  })

  test('quantity 默认为 1（未传时）', () => {
    const result = calculateOrderTotal(
      [{ goodsId: 'g1', name: '蛋糕', price: 30 }],
      0
    )
    expect(result.totalCount).toBe(1)
    expect(result.totalAmount).toBe(30)
  })

  test('price 为 0 时商品免费', () => {
    const result = calculateOrderTotal(
      [{ goodsId: 'g1', name: '赠品', price: 0, quantity: 5 }],
      0
    )
    expect(result.totalAmount).toBe(0)
  })
})

describe('createOrder - 参数校验', () => {
  test('合法 goodsList 通过校验', () => {
    const result = validateGoodsList([
      { goodsId: 'g1', name: '蛋糕', price: 30, quantity: 2 }
    ])
    expect(result.valid).toBe(true)
  })

  test('空数组不通过校验', () => {
    const result = validateGoodsList([])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('非空数组')
  })

  test('非数组不通过校验', () => {
    const result = validateGoodsList('not an array')
    expect(result.valid).toBe(false)
  })

  test('price 为负数不通过校验', () => {
    const result = validateGoodsList([
      { goodsId: 'g1', name: '蛋糕', price: -10, quantity: 1 }
    ])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('价格非法')
  })

  test('price 为 0 不通过校验', () => {
    const result = validateGoodsList([
      { goodsId: 'g1', name: '蛋糕', price: 0, quantity: 1 }
    ])
    expect(result.valid).toBe(false)
  })

  test('quantity 为 0 不通过校验', () => {
    const result = validateGoodsList([
      { goodsId: 'g1', name: '蛋糕', price: 30, quantity: 0 }
    ])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('数量非法')
  })

  test('quantity 为负数不通过校验', () => {
    const result = validateGoodsList([
      { goodsId: 'g1', name: '蛋糕', price: 30, quantity: -1 }
    ])
    expect(result.valid).toBe(false)
  })

  test('quantity 超过 999 不通过校验', () => {
    const result = validateGoodsList([
      { goodsId: 'g1', name: '蛋糕', price: 30, quantity: 1000 }
    ])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('超出上限')
  })

  test('缺少 goodsId 不通过校验', () => {
    const result = validateGoodsList([
      { name: '蛋糕', price: 30, quantity: 1 }
    ])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('缺少 goodsId')
  })

  test('有 _id 替代 goodsId 也通过校验', () => {
    const result = validateGoodsList([
      { _id: 'g1', name: '蛋糕', price: 30, quantity: 1 }
    ])
    expect(result.valid).toBe(true)
  })
})

describe('createOrder - 订单号生成', () => {
  test('生成 3 位数字字符串', () => {
    const orderNo = generateOrderNo()
    expect(orderNo).toMatch(/^\d{3}$/)
  })

  test('生成值在 100-999 范围内', () => {
    for (let i = 0; i < 100; i++) {
      const orderNo = generateOrderNo()
      const num = parseInt(orderNo)
      expect(num).toBeGreaterThanOrEqual(100)
      expect(num).toBeLessThanOrEqual(999)
    }
  })

  test('带日期前缀的订单号格式正确', () => {
    const orderNo = generateOrderNoWithDate()
    expect(orderNo).toMatch(/^\d{4}-\d{3}$/) // MMdd-xxx
  })
})

describe('createOrder - 配送模式判断', () => {
  test('自取模式初始状态为 using', () => {
    const deliveryMode = 'pickup'
    const initialStatus = deliveryMode === 'deliver' ? 'ready' : 'using'
    expect(initialStatus).toBe('using')
  })

  test('外卖模式初始状态为 ready', () => {
    const deliveryMode = 'deliver'
    const initialStatus = deliveryMode === 'deliver' ? 'ready' : 'using'
    expect(initialStatus).toBe('ready')
  })
})
