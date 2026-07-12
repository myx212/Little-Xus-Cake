/**
 * getCartList / getGoodsList 云函数核心逻辑单元测试
 * 测试范围：购物车增删改查、商品列表筛选
 */

// 提取核心逻辑
function calculateCartTotal(cartItems) {
  let total = 0
  let count = 0
  cartItems.forEach(item => {
    const qty = item.quantity || 1
    total += (item.price || 0) * qty
    count += qty
  })
  return { total, count }
}

function validateCartItem(item) {
  if (!item.goodsId && !item._id) {
    return { valid: false, message: '缺少 goodsId' }
  }
  if (!item.name) {
    return { valid: false, message: '缺少商品名称' }
  }
  if (!item.price || item.price <= 0) {
    return { valid: false, message: '价格非法' }
  }
  if (item.quantity !== undefined && (item.quantity < 1 || item.quantity > 999)) {
    return { valid: false, message: '数量超出范围' }
  }
  return { valid: true }
}

function applyQuantityUpdate(currentQty, delta) {
  const newQty = currentQty + delta
  if (newQty <= 0) return { action: 'remove' }
  if (newQty > 999) return { action: 'clamp', quantity: 999 }
  return { action: 'update', quantity: newQty }
}

function filterGoodsByCategory(goodsList, category) {
  if (!category) return goodsList
  return goodsList.filter(g => g.category === category)
}

function calculateDiscount(originalPrice, discountRate) {
  if (!discountRate || discountRate <= 0 || discountRate > 1) return originalPrice
  return Math.round(originalPrice * discountRate * 100) / 100
}

// ============ 测试用例 ============

describe('购物车 - 金额计算', () => {
  test('空购物车总价为 0', () => {
    const result = calculateCartTotal([])
    expect(result.total).toBe(0)
    expect(result.count).toBe(0)
  })

  test('单件商品正确计算', () => {
    const result = calculateCartTotal([
      { goodsId: 'g1', name: '蛋糕', price: 30, quantity: 2 }
    ])
    expect(result.total).toBe(60)
    expect(result.count).toBe(2)
  })

  test('多件商品累加正确', () => {
    const result = calculateCartTotal([
      { goodsId: 'g1', price: 30, quantity: 2 },
      { goodsId: 'g2', price: 15, quantity: 3 }
    ])
    expect(result.total).toBe(105)
    expect(result.count).toBe(5)
  })
})

describe('购物车 - 参数校验', () => {
  test('合法商品通过校验', () => {
    const result = validateCartItem({ goodsId: 'g1', name: '蛋糕', price: 30, quantity: 1 })
    expect(result.valid).toBe(true)
  })

  test('缺少 goodsId 不通过', () => {
    const result = validateCartItem({ name: '蛋糕', price: 30 })
    expect(result.valid).toBe(false)
  })

  test('缺少名称不通过', () => {
    const result = validateCartItem({ goodsId: 'g1', price: 30 })
    expect(result.valid).toBe(false)
  })

  test('价格为负数不通过', () => {
    const result = validateCartItem({ goodsId: 'g1', name: '蛋糕', price: -5 })
    expect(result.valid).toBe(false)
  })

  test('数量为 0 不通过', () => {
    const result = validateCartItem({ goodsId: 'g1', name: '蛋糕', price: 30, quantity: 0 })
    expect(result.valid).toBe(false)
  })
})

describe('购物车 - 数量更新', () => {
  test('加 1 正常更新', () => {
    const result = applyQuantityUpdate(3, 1)
    expect(result.action).toBe('update')
    expect(result.quantity).toBe(4)
  })

  test('减 1 正常更新', () => {
    const result = applyQuantityUpdate(3, -1)
    expect(result.action).toBe('update')
    expect(result.quantity).toBe(2)
  })

  test('减到 0 应删除', () => {
    const result = applyQuantityUpdate(1, -1)
    expect(result.action).toBe('remove')
  })

  test('减到负数应删除', () => {
    const result = applyQuantityUpdate(1, -5)
    expect(result.action).toBe('remove')
  })

  test('超过 999 应钳位', () => {
    const result = applyQuantityUpdate(999, 10)
    expect(result.action).toBe('clamp')
    expect(result.quantity).toBe(999)
  })
})

describe('商品列表 - 分类筛选', () => {
  const goods = [
    { id: '1', name: '蛋糕', category: 'cake' },
    { id: '2', name: '面包', category: 'bread' },
    { id: '3', name: '曲奇', category: 'cake' }
  ]

  test('不传分类返回全部', () => {
    expect(filterGoodsByCategory(goods, null)).toHaveLength(3)
    expect(filterGoodsByCategory(goods, undefined)).toHaveLength(3)
    expect(filterGoodsByCategory(goods, '')).toHaveLength(3)
  })

  test('传分类只返回匹配项', () => {
    const result = filterGoodsByCategory(goods, 'cake')
    expect(result).toHaveLength(2)
    expect(result.map(g => g.name)).toEqual(['蛋糕', '曲奇'])
  })

  test('不存在的分类返回空数组', () => {
    const result = filterGoodsByCategory(goods, 'drink')
    expect(result).toHaveLength(0)
  })
})

describe('价格 - 折扣计算', () => {
  test('无折扣返回原价', () => {
    expect(calculateDiscount(100, null)).toBe(100)
    expect(calculateDiscount(100, 0)).toBe(100)
  })

  test('8 折正确计算', () => {
    expect(calculateDiscount(100, 0.8)).toBe(80)
  })

  test('折扣超过 1 不生效', () => {
    expect(calculateDiscount(100, 1.5)).toBe(100)
  })

  test('小数价格四舍五入', () => {
    expect(calculateDiscount(33, 0.8)).toBe(26.4)
  })
})
