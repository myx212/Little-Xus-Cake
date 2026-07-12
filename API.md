# Little Xu's Cake · API 接口文档

> 本文档描述所有后端 API 接口的调用方式、参数和返回值。
> 
> **调用方式：** 所有接口均通过微信云函数调用。
> 
> **统一响应格式：** `{ code: 0, message: 'success', data: {} }`

---

## 目录

- [1. getUserOpenid — 用户身份](#1-getuseropenid--用户身份)
- [2. getGoodsList — 商品与购物车查询](#2-getgoodslist--商品与购物车查询)
- [3. getCartList — 购物车 CRUD](#3-getcartlist--购物车-crud)
- [4. createOrder — 订单全生命周期](#4-createorder--订单全生命周期)

---

## 1. getUserOpenid — 用户身份

> 云函数：`getUserOpenid`
> 
> 说明：获取当前登录用户的微信 openid，所有需要用户身份的操作都依赖此接口。

### 1.1 获取 openid

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getUserOpenid',
  success: res => {
    const openid = res.result.data.openid
  }
})
```

**入参：** 无

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "openid": "oXXXX...",
    "appid": "wx...",
    "unionid": "oXXXX..."
  }
}
```

---

## 2. getGoodsList — 商品与购物车查询

> 云函数：`getGoodsList`
> 
> 说明：商品列表查询、商品详情、购物车列表、购物车数量统计。

### 2.1 商品列表

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getGoodsList',
  data: { action: 'list', category: '蛋糕' },
  success: res => {
    const goodsList = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'list'` |
| `category` | String | 否 | 分类筛选，如 `'蛋糕'`、`'面包'`。不传返回全部 |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "_id": "abc123",
      "name": "抹茶巴斯克",
      "category": "蛋糕",
      "price": 30,
      "image": "cloud://xxx/cake1.png",
      "description": "宇治抹茶 + 北海道红豆",
      "stock": 50,
      "createTime": "2026-07-11T08:00:00Z"
    }
  ]
}
```

### 2.2 商品详情

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getGoodsList',
  data: { action: 'detail', id: 'abc123' },
  success: res => {
    const goods = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'detail'` |
| `id` | String | 是 | 商品 `_id` |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "_id": "abc123",
    "name": "抹茶巴斯克",
    "category": "蛋糕",
    "price": 30,
    "image": "cloud://xxx/cake1.png",
    "description": "宇治抹茶 + 北海道红豆",
    "stock": 50
  }
}
```

### 2.3 购物车列表

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getGoodsList',
  data: { action: 'cartList', openid: 'oXXXX...' },
  success: res => {
    const cartItems = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'cartList'` |
| `openid` | String | 是 | 用户 openid |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "_id": "cart001",
      "goodsId": "abc123",
      "name": "抹茶巴斯克",
      "price": 30,
      "image": "cloud://xxx.png",
      "quantity": 2,
      "remark": "少糖"
    }
  ]
}
```

### 2.4 购物车数量

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getGoodsList',
  data: { action: 'cartCount', openid: 'oXXXX...' },
  success: res => {
    const count = res.result.data.total
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'cartCount'` |
| `openid` | String | 是 | 用户 openid |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": { "total": 5 }
}
```

---

## 3. getCartList — 购物车 CRUD

> 云函数：`getCartList`
> 
> 说明：购物车的增删改查操作。

### 3.1 查询购物车

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getCartList',
  data: { action: 'list', openid: 'oXXXX...' },
  success: res => {
    const cartItems = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'list'` |
| `openid` | String | 是 | 用户 openid |

**返回：** 同 2.3 购物车列表

### 3.2 加入购物车

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getCartList',
  data: {
    action: 'add',
    openid: 'oXXXX...',
    item: {
      goodsId: 'abc123',
      name: '抹茶巴斯克',
      price: 30,
      image: 'cloud://xxx.png',
      quantity: 1,
      remark: '少糖'
    }
  },
  success: res => {
    // res.result.data.action = 'added' | 'updated'
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'add'` |
| `openid` | String | 是 | 用户 openid |
| `item` | Object | 是 | 商品信息 |
| `item.goodsId` | String | 是 | 商品 ID |
| `item.name` | String | 是 | 商品名称 |
| `item.price` | Number | 是 | 单价 |
| `item.image` | String | 是 | 商品图片 URL |
| `item.quantity` | Number | 是 | 数量 |
| `item.remark` | String | 否 | 备注 |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": { "action": "added" }
}
```

> `action` 值说明：`'added'` = 新增商品，`'updated'` = 已有商品数量叠加

### 3.3 修改数量

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getCartList',
  data: { action: 'updateQty', id: 'cart001', delta: 1 },
  success: res => {}
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'updateQty'` |
| `id` | String | 是 | 购物车记录 `_id` |
| `delta` | Number | 是 | 数量变化，`1` 为加 1，`-1` 为减 1 |

**返回：**

```json
{ "code": 0, "message": "success", "data": {} }
```

### 3.4 删除单条

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getCartList',
  data: { action: 'remove', id: 'cart001' },
  success: res => {}
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'remove'` |
| `id` | String | 是 | 购物车记录 `_id` |

**返回：**

```json
{ "code": 0, "message": "success", "data": {} }
```

### 3.5 清空购物车

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'getCartList',
  data: { action: 'clear', openid: 'oXXXX...' },
  success: res => {}
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'clear'` |
| `openid` | String | 是 | 用户 openid |

**返回：**

```json
{ "code": 0, "message": "success", "data": {} }
```

---

## 4. createOrder — 订单全生命周期

> 云函数：`createOrder`
> 
> 说明：订单的创建、查询、状态更新、删除、再来一单等全部操作。

### 4.1 创建单商品订单（兼容老数据）

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: {
    action: 'create',
    openid: 'oXXXX...',
    orderData: {
      goodsId: 'abc123',
      name: '抹茶巴斯克',
      price: 30,
      image: 'cloud://xxx.png',
      quantity: 1,
      remark: '少糖',
      phone: '138****1234',
      pickTime: '2026-07-12 下午 2 点',
      deliveryMode: 'pickup',
      deliveryFee: 0
    }
  },
  success: res => {
    const orderId = res.result.data.orderId
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'create'` |
| `openid` | String | 是 | 用户 openid |
| `orderData` | Object | 是 | 订单数据 |
| `orderData.goodsId` | String | 是 | 商品 ID |
| `orderData.name` | String | 是 | 商品名称 |
| `orderData.price` | Number | 是 | 单价 |
| `orderData.image` | String | 是 | 商品图片 |
| `orderData.quantity` | Number | 是 | 数量 |
| `orderData.remark` | String | 否 | 备注 |
| `orderData.phone` | String | 否 | 联系电话 |
| `orderData.pickTime` | String | 否 | 取餐时间 |
| `orderData.deliveryMode` | String | 是 | `'pickup'` 自取 / `'deliver'` 外卖 |
| `orderData.deliveryFee` | Number | 否 | 配送费 |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": { "orderId": "order001" }
}
```

### 4.2 创建多商品订单

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: {
    action: 'createMulti',
    openid: 'oXXXX...',
    orderData: {
      goodsList: [
        { goodsId: 'abc123', name: '抹茶巴斯克', price: 30, image: '...', quantity: 1, remark: '' },
        { goodsId: 'def456', name: '抹茶红豆软包', price: 8, image: '...', quantity: 2, remark: '' }
      ],
      remark: '需要生日帽和蜡烛',
      phone: '138****1234',
      pickTime: '2026-07-12 下午 2 点',
      deliveryMode: 'pickup',
      deliveryFee: 0
    }
  },
  success: res => {
    const { orderId, orderNo } = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'createMulti'` |
| `openid` | String | 是 | 用户 openid |
| `orderData` | Object | 是 | 订单数据 |
| `orderData.goodsList` | Array | 是 | 商品列表数组 |
| `orderData.goodsList[].goodsId` | String | 是 | 商品 ID |
| `orderData.goodsList[].name` | String | 是 | 商品名称 |
| `orderData.goodsList[].price` | Number | 是 | 单价 |
| `orderData.goodsList[].image` | String | 是 | 商品图片 |
| `orderData.goodsList[].quantity` | Number | 是 | 数量 |
| `orderData.goodsList[].remark` | String | 否 | 单商品备注 |
| `orderData.remark` | String | 否 | 整单备注 |
| `orderData.phone` | String | 否 | 联系电话 |
| `orderData.pickTime` | String | 否 | 取餐时间 |
| `orderData.deliveryMode` | String | 是 | `'pickup'` / `'deliver'` |
| `orderData.deliveryFee` | Number | 否 | 配送费 |
| `orderData.deliveryAddress` | Object | 否 | 外卖地址 `{contactName, phone, address}` |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderId": "order002",
    "orderNo": "812"
  }
}
```

### 4.3 批量创建（降级模式）

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: {
    action: 'batchCreate',
    openid: 'oXXXX...',
    orderData: [
      { goodsId: 'abc123', name: '抹茶巴斯克', price: 30, quantity: 1, ... },
      { goodsId: 'def456', name: '抹茶红豆软包', price: 8, quantity: 2, ... }
    ]
  },
  success: res => {
    const { orderIds, orderNos } = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'batchCreate'` |
| `openid` | String | 是 | 用户 openid |
| `orderData` | Array | 是 | 每个商品建一条订单 |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderIds": ["order003", "order004"],
    "orderNos": ["813", "814"]
  }
}
```

### 4.4 查询订单列表

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: { action: 'list', openid: 'oXXXX...', status: 'pending' },
  success: res => {
    const orders = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'list'` |
| `openid` | String | 是 | 用户 openid |
| `status` | String | 否 | 状态筛选。可选：`pending` / `using` / `ready` / `delivering` / `review` / `completed`。不传返回全部 |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "_id": "order002",
      "openid": "oXXXX...",
      "orderNo": "812",
      "goodsList": [
        { "goodsId": "abc123", "name": "抹茶巴斯克", "price": 30, "quantity": 1 }
      ],
      "totalCount": 1,
      "totalAmount": 30,
      "deliveryFee": 0,
      "remark": "需要生日帽和蜡烛",
      "phone": "138****1234",
      "pickTime": "2026-07-12 下午 2 点",
      "deliveryMode": "pickup",
      "status": "pending",
      "createTime": "2026-07-12T06:00:00Z"
    }
  ]
}
```

### 4.5 订单详情

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: { action: 'detail', id: 'order002' },
  success: res => {
    const order = res.result.data
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'detail'` |
| `id` | String | 是 | 订单 `_id` |

**返回：** 同 4.4 单条订单对象

### 4.6 更新订单状态

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: { action: 'updateStatus', id: 'order002', status: 'ready' },
  success: res => {}
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'updateStatus'` |
| `id` | String | 是 | 订单 `_id` |
| `status` | String | 是 | 新状态值 |

**状态流转：**

```
pending（待付款）→ using（待使用）→ ready（待取餐）→ delivering（待收货）→ review（待评价）→ completed（已完成）
```

**返回：**

```json
{ "code": 0, "message": "success", "data": {} }
```

### 4.7 删除订单

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: { action: 'remove', id: 'order002' },
  success: res => {}
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'remove'` |
| `id` | String | 是 | 订单 `_id` |

**返回：**

```json
{ "code": 0, "message": "success", "data": {} }
```

### 4.8 再来一单

**调用：**

```javascript
wx.cloud.callFunction({
  name: 'createOrder',
  data: { action: 'addToCart', openid: 'oXXXX...', id: 'order002' },
  success: res => {
    const addedCount = res.result.data.addedCount
  }
})
```

**入参：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | String | 是 | 固定值 `'addToCart'` |
| `openid` | String | 是 | 用户 openid |
| `id` | String | 是 | 订单 `_id` |

**返回：**

```json
{
  "code": 0,
  "message": "success",
  "data": { "addedCount": 2 }
}
```

---

## 附录：错误码

| code | 含义 | 常见原因 |
|------|------|----------|
| `0` | 成功 | - |
| `-1` | 失败 | 参数缺失 / 未知 action / 服务器错误 |

## 附录：订单状态枚举

| 状态值 | 中文含义 | 说明 |
|--------|----------|------|
| `pending` | 待付款 | 订单已创建，等待支付 |
| `using` | 待使用 | 已支付，等待使用 |
| `ready` | 待取餐 | 商家已备餐，等待取餐 |
| `delivering` | 待收货 | 外卖配送中 |
| `review` | 待评价 | 已完成，等待评价 |
| `completed` | 已完成 | 订单完结 |
