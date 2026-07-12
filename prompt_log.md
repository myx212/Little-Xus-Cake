# Little Xu's Cake · Prompt 日志

> 本文档记录开发过程中每条 Prompt、AI 返回的原始输出、对应的功能与文件，便于代码审查。

---

## 目录

| # | 功能点 | 影响文件 | Prompt 摘要 |
|---|--------|----------|-------------|
| 1 | AI 气泡不显示用户真实输入 | `pages/ai-order/ai-order.js` `.wxml` | AI 顾问页用户输入文本后气泡未更新为真实输入内容 |
| 2 | 订单总价计算逻辑错误 | `pages/ai-order/ai-order.js` | AI 推荐列表总价未乘以商品数量 |
| 3 | 页面出现双导航栏 | `pages/ai-order/ai-order.wxml` `ai-confirm-order.wxml` | AI 页面同时渲染了自定义 header 和原生导航栏 |
| 4 | AI 页导航栏主题色不统一 | `pages/ai-order/ai-order.json` | AI 顾问页导航栏背景色与其他页面不一致 |
| 5 | 多商品订单数据模型重构 | `cloudfunctions/createOrder/index.js` | 多商品下单应合并为 1 笔订单而非 N 笔独立订单 |
| 6 | 云函数未部署导致支付失败 | `pages/confirm-order/confirm-order.js` `ai-confirm-order.js` | createMulti action 不存在时需提供降级方案 |
| 7 | 再来一单多商品兼容 | `cloudfunctions/createOrder/index.js` | addToCart 需支持 goodsList 数组批量加购 |
| 8 | 订单列表多商品渲染 | `pages/order-list/order-list.wxml` | 订单列表需支持 goodsList 循环渲染 + 老数据 fallback |
| 9 | 多商品订单行样式设计 | `pages/order-list/order-list.wxss` | 多商品行间距、虚线分隔、缩略图尺寸规范 |
| 10 | AI 交互方式从语音改为文字 | `pages/ai-order/ai-order.*` | 将按住说话按钮替换为文字输入框 + 发送按钮 |
| 11 | AI 确认订单与支付成功页 UI 还原 | `pages/ai-confirm-order/*` `ai-pay-success/*` | 按设计图还原 AI 流程的确认订单页和支付成功页 |
| 12 | AI 一键下单路由跳转错误 | `pages/ai-order/ai-order.js` `ai-confirm-order.json` | AI 流程应跳转 ai-confirm-order 而非普通 confirm-order |

---

## Prompt #1：AI 气泡不显示用户真实输入

**功能点：** AI 顾问页用户输入文本后，聊天气泡未更新为用户的真实输入内容，始终显示默认占位文案。

**影响文件：**
- `pages/ai-order/ai-order.js`
- `pages/ai-order/ai-order.wxml`

**用户 Prompt：**
> 在 AI 甜品顾问页面中，用户通过输入框输入了「巴斯克」作为场景描述，但聊天气泡中显示的仍然是默认占位文案「想吃甜品解解馋」，而不是用户的真实输入。请分析 data 绑定和 WXML 渲染逻辑，找出为什么用户输入没有被正确显示到气泡中，并修复这个问题，使得气泡优先显示用户真实输入，在没有输入时才显示默认文案。

**AI 返回的原始输出：**

```javascript
// ai-order.js data 新增字段
data: {
  userSceneText: '',
  userFlavorText: '',
  userBudgetText: ''
}

// 输入时保存真实输入
onSceneInput(e) {
  this.setData({ userSceneText: e.detail.value })
}

// 提交时使用真实输入
onSceneSubmit() {
  const text = this.data.userSceneText
  this.handleVoiceResult(text)
}
```

```html
<!-- ai-order.wxml 气泡文本 -->
<text class="bubble-text">{{userSceneText || sceneText}}</text>
<text class="bubble-text">{{userFlavorText || flavorText}}</text>
<text class="bubble-text">{{userBudgetText || budgetText}}</text>
```

**解决说明：** 新增 `userSceneText/FlavorText/BudgetText` 三个字段存储用户真实输入，WXML 用 `{{userSceneText || sceneText}}` 优先显示真实输入，fallback 到默认文案。

---

## Prompt #2：订单总价计算逻辑错误

**功能点：** AI 推荐列表生成订单时，总价只累加了商品单价，没有乘以商品数量，导致多件商品时金额计算错误。

**影响文件：**
- `pages/ai-order/ai-order.js`（`generateRecommend` 函数）

**用户 Prompt：**
> 在 AI 顾问页面的 `generateRecommend` 函数中，当用户选择了多件商品时，订单总价的计算结果不正确。例如用户选择了 2 件单价 30 元的商品，总价应该显示 60 元，但实际只显示了 30 元。请检查总价计算逻辑，确认是否遗漏了数量乘法，并修复为 `price * quantity` 的正确计算方式。

**AI 返回的原始输出：**

```javascript
// 修复前（错误）
goodsTotal += (goods.price || 0)

// 修复后（正确）
goodsTotal += (goods.price || 0) * (goods.quantity || 1)
```

**解决说明：** `generateRecommend` 函数中计算总价时，将 `price` 改为 `price * quantity`，确保总价 = 单价 × 数量。

---

## Prompt #3：页面出现双导航栏

**功能点：** AI 顾问页和 AI 确认订单页同时渲染了自定义 header 组件和微信原生导航栏，导致页面顶部出现两个导航栏，视觉重叠。

**影响文件：**
- `pages/ai-order/ai-order.wxml`
- `pages/ai-confirm-order/ai-confirm-order.wxml`

**用户 Prompt：**
> AI 甜品顾问页面和 AI 确认订单页面在真机预览时，顶部出现了两个导航栏：一个是 WXML 中自定义的 `<view class="header">` 组件，另一个是 `app.json` 中配置的原生导航栏（`navigationBarTitleText`）。这两个导航栏同时渲染导致页面布局错乱。请分析原因并移除自定义 header，统一使用原生导航栏，确保全局导航体验一致。

**AI 返回的原始输出：**

```html
<!-- 删除以下自定义 header 代码块 -->
<view class="header">
  <view class="header-back" bindtap="goBack">
    <text class="iconfont icon-back"></text>
  </view>
  <text class="header-title">AI 甜品顾问</text>
  <view class="header-placeholder"></view>
</view>
```

**解决说明：** 删除 WXML 中的自定义 `<view class="header">` 整块代码，统一使用 `app.json` 中配置的原生导航栏。

---

## Prompt #4：AI 页导航栏主题色不统一

**功能点：** AI 顾问页的导航栏背景色为米色（`#FEFFEF`），而其他页面（首页、订单列表等）均为粉色（`#FFEAE3`），整体视觉风格不一致。

**影响文件：**
- `pages/ai-order/ai-order.json`

**用户 Prompt：**
> 小程序中大部分页面的导航栏背景色统一设置为粉色 `#FFEAE3`（在 `app.json` 的 `window` 配置中全局设置），但 AI 甜品顾问页面（`ai-order`）的导航栏显示为米色 `#FEFFEF`。请检查 `ai-order.json` 的页面级配置是否覆盖了全局设置，并将其修改为与全局主题色一致的 `#FFEAE3`，确保所有页面导航栏视觉统一。

**AI 返回的原始输出：**

```json
{
  "navigationBarBackgroundColor": "#FFEAE3",
  "navigationBarTitleText": "AI 甜品顾问",
  "navigationBarTextStyle": "black"
}
```

**解决说明：** 在 `ai-order.json` 中设置 `navigationBarBackgroundColor: "#FFEAE3"`，与其他页面统一为粉色主题。

---

## Prompt #5：多商品订单数据模型重构

**功能点：** 当前多商品下单时，每个商品独立调用 `create` action 创建一条订单记录，导致用户下了 3 件商品就生成 3 笔独立订单，订单列表显示 3 张卡片，不符合「1 笔订单包含多件商品」的业务逻辑。

**影响文件：**
- `cloudfunctions/createOrder/index.js`

**用户 Prompt：**
> 当前小程序的下单逻辑存在问题：当用户从购物车结算多件商品时，前端循环调用 `createOrder` 云函数的 `create` action，每个商品生成一笔独立订单。这导致用户下了 3 件商品（如巴斯克蛋糕 + 抹茶软包 + 曲奇），订单列表会显示 3 张独立卡片，每笔订单只有 1 个商品和 1 个取餐号。
>
> 请重构云函数，新增 `createMulti` action：
> 1. 接收 `goodsList` 数组参数（包含多个商品的 goodsId、name、price、image、quantity、remark）
> 2. 在云函数端计算 `goodsTotal = Σ(price × quantity)` 和 `totalCount = Σ(quantity)`
> 3. 加上 `deliveryFee` 得到 `totalAmount`
> 4. 生成 1 个 `orderNo`（3 位随机取餐号）
> 5. 创建 1 条订单文档，包含完整的 `goodsList` 数组
> 6. 返回 `{ orderId, orderNo }`
>
> 同时需要处理参数校验：`goodsList` 必须是非空数组，每个商品必须有 `price > 0` 和 `quantity >= 1`。

**AI 返回的原始输出：**

```javascript
// createOrder/index.js 新增 createMulti action
if (action === 'createMulti') {
  if (!openid || !orderData || !Array.isArray(orderData.goodsList)) {
    return { code: -1, message: '缺少参数' }
  }

  const goodsList = orderData.goodsList
  let goodsTotal = 0, totalCount = 0

  goodsList.forEach(item => {
    const qty = item.quantity || 1
    goodsTotal += (item.price || 0) * qty
    totalCount += qty
  })

  const deliveryFee = orderData.deliveryFee || 0
  const totalAmount = goodsTotal + deliveryFee
  const orderNo = Math.floor(Math.random() * 900 + 100).toString()
  const initialStatus = orderData.deliveryMode === 'deliver' ? 'ready' : 'using'

  const res = await db.collection('orders').add({
    data: {
      openid: openid,
      goodsList: goodsList,
      totalAmount: totalAmount,
      totalCount: totalCount,
      orderNo: orderNo,
      status: initialStatus,
      remark: orderData.remark || '',
      phone: orderData.phone || '',
      pickTime: orderData.pickTime || '',
      deliveryMode: orderData.deliveryMode || 'pickup',
      deliveryAddress: orderData.deliveryAddress || null,
      deliveryFee: deliveryFee,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  })

  return { code: 0, message: 'success', data: { orderId: res._id, orderNo: orderNo } }
}
```

**解决说明：** 新增 `createMulti` action，接收 `goodsList` 数组，计算总价和总数量，创建 1 条订单文档（含 `goodsList` 字段），返回 `orderId` 和 `orderNo`。

---

## Prompt #6：云函数未部署导致支付失败

**功能点：** 新增的 `createMulti` action 在云函数未重新上传部署时，调用会返回 `code: -1, message: 'unknown action'`，导致用户支付流程中断，弹出「支付失败，请稍后重试」的错误提示。

**影响文件：**
- `pages/confirm-order/confirm-order.js`
- `pages/ai-confirm-order/ai-confirm-order.js`

**用户 Prompt：**
> 在支付流程中，前端调用 `createOrder` 云函数的 `createMulti` action 创建多商品订单。但如果开发者忘记重新上传部署云函数（即云端仍为旧版本，不包含 `createMulti` action），云函数会返回 `{ code: -1, message: 'unknown action' }`，导致前端进入 fail 回调，用户看到「支付失败，请稍后重试」的弹窗。
>
> 请设计一个自动降级（fallback）机制：
> 1. 优先调用 `createMulti` action
> 2. 如果返回 `code !== 0`（包括 unknown action、参数错误等），自动降级调用 `batchCreate` action
> 3. `batchCreate` 将 `goodsList` 拆成多个独立商品，每个商品创建 1 笔订单（兼容老数据格式）
> 4. 降级成功后仍然正常跳转支付成功页
> 5. 只有两个 action 都失败时才显示错误提示
>
> 这个降级逻辑需要同时应用到 `confirm-order.js` 和 `ai-confirm-order.js` 两个页面。

**AI 返回的原始输出：**

```javascript
// 新增降级函数
function fallbackBatchCreate(openid, goodsList, orderData) {
  const items = goodsList.map(item => ({
    goodsId: item.goodsId,
    name: item.name,
    price: item.price,
    image: item.image,
    quantity: item.quantity,
    remark: item.remark || '',
    phone: orderData.phone || '',
    pickTime: orderData.pickTime || '',
    deliveryMode: orderData.deliveryMode || 'pickup',
    deliveryFee: 0
  }))

  return wx.cloud.callFunction({
    name: 'createOrder',
    data: { action: 'batchCreate', openid, orderData: items }
  })
}

// onConfirmPay 中调用
wx.cloud.callFunction({
  name: 'createOrder',
  data: { action: 'createMulti', openid, orderData }
}).then(res => {
  if (res.result.code === 0) {
    // 成功逻辑
  } else {
    // 降级
    return fallbackBatchCreate(openid, goodsList, orderData)
  }
})
```

**解决说明：** 当 `createMulti` 返回 `code !== 0` 时，自动调用 `fallbackBatchCreate` 降级到 `batchCreate` action，每个商品创建一条订单（兼容老数据）。

---

## Prompt #7：再来一单多商品兼容

**功能点：** 订单列表的「再来一单」功能使用 `addToCart` action 将订单商品加回购物车，但该 action 只处理了单商品订单的字段（`goodsId/name/price`），对于多商品订单的 `goodsList` 数组只取了第一个商品，其余商品丢失。

**影响文件：**
- `cloudfunctions/createOrder/index.js`（`addToCart` action）

**用户 Prompt：**
> 订单列表页面的「再来一单」功能通过调用 `createOrder` 云函数的 `addToCart` action 实现，将订单中的商品批量加回购物车。但目前该 action 只处理了老格式的单商品订单（读取 `orderData.goodsId/name/price/image/quantity`），对于新格式的多商品订单（`orderData.goodsList` 数组），只取了数组中第一个商品加入购物车，其余商品全部丢失。
>
> 请重构 `addToCart` action：
> 1. 先查询订单文档，判断是否存在 `goodsList` 数组
> 2. 如果存在 `goodsList`，遍历数组，为每个商品创建一条购物车记录
> 3. 如果不存在 `goodsList`（老数据），按原逻辑创建 1 条购物车记录
> 4. 使用 `Promise.all` 并行执行所有加购操作
> 5. 返回 `addedCount` 告知前端成功加购了几件商品

**AI 返回的原始输出：**

```javascript
// createOrder/index.js addToCart action 改造
if (action === 'addToCart') {
  const order = await db.collection('orders').doc(id).get()
  const orderData = order.data

  let tasks = []

  if (orderData.goodsList && Array.isArray(orderData.goodsList)) {
    // 多商品订单：批量加购
    tasks = orderData.goodsList.map(item => {
      return db.collection('cart').add({
        data: {
          openid: openid,
          goodsId: item.goodsId,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          remark: item.remark || '',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    })
  } else {
    // 单商品订单（老数据）：加购 1 条
    tasks = [db.collection('cart').add({
      data: {
        openid: openid,
        goodsId: orderData.goodsId,
        name: orderData.name,
        price: orderData.price,
        image: orderData.image,
        quantity: orderData.quantity,
        remark: orderData.remark || '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })]
  }

  await Promise.all(tasks)
  return { code: 0, message: 'success', data: { addedCount: tasks.length } }
}
```

**解决说明：** `addToCart` action 判断订单是否有 `goodsList` 数组，有则遍历批量加购，无则按老逻辑加购单商品。返回 `addedCount` 告知前端加购了几件。

---

## Prompt #8：订单列表多商品渲染

**功能点：** 订单列表页面需要支持多商品订单的渲染，当订单包含 `goodsList` 数组时循环显示多行商品，同时兼容老数据（单商品字段直接挂在订单文档上）的 fallback 渲染。

**影响文件：**
- `pages/order-list/order-list.wxml`

**用户 Prompt：**
> 订单列表页面（`order-list.wxml`）当前只支持渲染单商品订单，即订单文档上直接有 `name/price/image/quantity` 字段。现在引入了多商品订单（`goodsList` 数组），需要改造 WXML 渲染逻辑：
>
> 1. 使用 `wx:if="{{item.goodsList}}"` 判断是否为多商品订单
> 2. 多商品订单：用 `wx:for="{{item.goodsList}}"` 循环渲染每一行商品，每行包含缩略图、商品名、备注、价格、数量
> 3. 单商品订单（老数据 fallback）：保持原有渲染逻辑不变
> 4. 多商品行之间用虚线分隔（`border-bottom: dashed`），最后一行不显示分隔线
> 5. 整单备注（`item.remark`）显示在商品列表下方
> 6. 取餐号（`item.orderNo`）显示在卡片右上角

**AI 返回的原始输出：**

```html
<!-- 多商品订单渲染 -->
<block wx:if="{{item.goodsList}}">
  <view class="multi-goods-list">
    <view class="multi-goods-item" wx:for="{{item.goodsList}}" wx:key="goodsId">
      <image class="multi-goods-img" src="{{item.image}}" mode="aspectFill" />
      <view class="multi-goods-info">
        <text class="multi-goods-name">{{item.name}}</text>
        <text class="multi-goods-remark" wx:if="{{item.remark}}">{{item.remark}}</text>
        <view class="multi-goods-bottom">
          <text class="multi-goods-price">¥{{item.price}}</text>
          <text class="multi-goods-qty">×{{item.quantity}}</text>
        </view>
      </view>
    </view>
  </view>
</block>

<!-- 单商品订单渲染（老数据 fallback） -->
<view wx:else class="single-goods-row">
  <image class="goods-img" src="{{item.image}}" mode="aspectFill" />
  <view class="goods-info">
    <text class="goods-name">{{item.name}}</text>
    <text class="goods-remark" wx:if="{{item.remark}}">{{item.remark}}</text>
    <view class="goods-bottom">
      <text class="goods-price">¥{{item.price}}</text>
      <text class="goods-qty">×{{item.quantity}}</text>
    </view>
  </view>
</view>
```

**解决说明：** 用 `wx:if="{{item.goodsList}}"` 判断是否为多商品订单，是则循环 `goodsList` 渲染多行，否则走单商品渲染逻辑（兼容老数据）。

---

## Prompt #9：多商品订单行样式设计

**功能点：** 多商品订单在订单列表中需要规范的行样式，包括行间距、虚线分隔、缩略图尺寸、文字层级等，确保多行商品在视觉上清晰可辨且与单商品订单风格统一。

**影响文件：**
- `pages/order-list/order-list.wxss`

**用户 Prompt：**
> 订单列表页面新增了多商品订单的渲染结构（`.multi-goods-list` / `.multi-goods-item`），请为这些新元素编写 WXSS 样式，要求：
>
> 1. `.multi-goods-item` 每行底部用 `1rpx dashed #F0E6D8` 虚线分隔，最后一行（`:last-child`）去掉边框和底部间距
> 2. 缩略图 `.multi-goods-img` 尺寸 120rpx × 120rpx，圆角 12rpx，右侧间距 20rpx
> 3. 商品名 `.multi-goods-name` 字号 28rpx，颜色 `#333`，字重 500
> 4. 备注 `.multi-goods-remark` 字号 24rpx，颜色 `#999`，上边距 8rpx
> 5. 价格 `.multi-goods-price` 字号 28rpx，颜色 `#C4956A`（主题棕色），字重 600
> 6. 数量 `.multi-goods-qty` 字号 24rpx，颜色 `#999`
> 7. 价格和数量在同一行两端对齐（`justify-content: space-between`）
> 8. 整体风格与单商品订单（`.single-goods-row`）保持视觉一致性

**AI 返回的原始输出：**

```css
.multi-goods-list {
  padding: 0 24rpx;
}

.multi-goods-item {
  display: flex;
  padding-bottom: 20rpx;
  margin-bottom: 20rpx;
  border-bottom: 1rpx dashed #F0E6D8;
}

.multi-goods-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.multi-goods-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.multi-goods-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.multi-goods-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.multi-goods-remark {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.multi-goods-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.multi-goods-price {
  font-size: 28rpx;
  color: #C4956A;
  font-weight: 600;
}

.multi-goods-qty {
  font-size: 24rpx;
  color: #999;
}
```

**解决说明：** 新增 `.multi-goods-*` 系列样式类，多商品行之间用 `border-bottom: 1rpx dashed #F0E6D8` 虚线分隔，最后一行去掉边框。缩略图 120rpx（单商品 140rpx，略小以适配多行布局）。

---

## Prompt #10：AI 交互方式从语音改为文字

**功能点：** AI 顾问页底部的「按住说话」按钮需要改为文字输入框，用户通过键盘打字输入场景/口味/预算描述，点击「发送」按钮或按回车键提交，替代原有的语音识别交互方式。

**影响文件：**
- `pages/ai-order/ai-order.wxml`
- `pages/ai-order/ai-order.js`
- `pages/ai-order/ai-order.wxss`

**用户 Prompt：**
> AI 甜品顾问页面当前的交互方式是「按住说话」按钮（使用微信录音 API），但实际部署环境中语音识别服务不可用。需要将交互方式改为文字输入：
>
> 1. 删除底部的「按住说话」按钮及相关录音逻辑（`RecorderManager`、`onTouchStart/End` 等）
> 2. 替换为 `<input>` 输入框 + 「发送」按钮的布局
> 3. 输入框 placeholder 根据当前步骤动态变化：第 1 步「吃甜品的场景～」，第 2 步「偏好的口味～」，第 3 步「预算范围～」
> 4. `bindinput` 事件实时保存输入值到 data
> 5. `bindconfirm`（回车）和点击「发送」按钮都触发 `onSceneSubmit`
> 6. 提交后将输入值传给 `handleVoiceResult` 处理（函数名保留不变，内部逻辑不变）
> 7. 提交后清空输入框
> 8. 输入框样式：圆角胶囊形，背景 `#F5F0E8`，发送按钮背景 `#C4956A`
> 9. 需要同时处理三步（scene/flavor/budget）的输入，每步使用独立的 input 字段

**AI 返回的原始输出：**

```html
<!-- ai-order.wxml 底部输入区 -->
<view class="input-area">
  <input
    class="chat-input"
    placeholder="吃甜品的场景～"
    value="{{sceneInput}}"
    bindinput="onSceneInput"
    bindconfirm="onSceneSubmit"
    confirm-type="send"
  />
  <view class="send-btn" bindtap="onSceneSubmit">发送</view>
</view>
```

```javascript
// ai-order.js
data: {
  sceneInput: '',
  flavorInput: '',
  budgetInput: ''
},

onSceneInput(e) {
  this.setData({ sceneInput: e.detail.value })
},

onSceneSubmit() {
  const text = this.data.sceneInput.trim()
  if (!text) return
  this.setData({ userSceneText: text })
  this.handleVoiceResult(text)
  this.setData({ sceneInput: '' })
},

// flavorInput / budgetInput 同理
```

```css
/* ai-order.wxss */
.input-area {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #F0E6D8;
}

.chat-input {
  flex: 1;
  height: 72rpx;
  background: #F5F0E8;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.send-btn {
  margin-left: 16rpx;
  padding: 0 32rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #C4956A;
  color: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
}
```

**解决说明：** 删除「按住说话」按钮，替换为 `<input>` + 「发送」按钮。输入时 `bindinput` 保存值，点击发送或回车时 `bindconfirm` 触发 `onSceneSubmit`，将真实输入传给 AI 处理逻辑。

---

## Prompt #11：AI 确认订单与支付成功页 UI 还原

**功能点：** AI 顾问流程的确认订单页和支付成功页需要按照设计图还原 UI，包括商品卡片列表、配送方式切换、取餐时间选择、底部合计栏、支付成功动画等元素。

**影响文件：**
- `pages/ai-confirm-order/ai-confirm-order.wxml` `.wxss` `.js` `.json`
- `pages/ai-pay-success/ai-pay-success.wxml` `.wxss` `.js` `.json`

**用户 Prompt：**
> 请按照设计图还原 AI 甜品顾问流程中的两个页面 UI：
>
> **AI 确认订单页（ai-confirm-order）：**
> 1. 顶部显示从 AI 推荐跳转过来的商品列表，每个商品一行卡片（缩略图 + 名称 + 备注 + 价格 + 数量）
> 2. 配送方式切换区域：「自取」和「外卖配送」两个选项卡，选中态高亮
> 3. 自取模式下显示取餐时间选择器（picker mode="time"）
> 4. 外卖模式下显示收货地址选择入口
> 5. 整单备注输入框
> 6. 底部固定合计栏：左侧显示「合计：¥XXX」，右侧「去支付」按钮（棕色 `#C4956A`）
> 7. 点击去支付调用 `createMulti` action，失败时降级 `batchCreate`
>
> **AI 支付成功页（ai-pay-success）：**
> 1. 页面顶部大尺寸绿色对勾图标（✓），带淡入动画
> 2. 「支付成功」标题文字
> 3. 订单信息卡片：订单号（orderNo）、支付金额
> 4. 底部两个按钮：「返回首页」（线框样式）和「查看订单」（实心棕色）
> 5. 导航栏背景色统一为粉色 `#FFEAE3`

**AI 返回的原始输出：**

```html
<!-- ai-confirm-order.wxml 核心结构 -->
<view class="container">
  <!-- 商品列表卡片 -->
  <view class="goods-card" wx:for="{{cartList}}" wx:key="goodsId">
    <image class="goods-img" src="{{item.image}}" mode="aspectFill" />
    <view class="goods-info">
      <text class="goods-name">{{item.name}}</text>
      <text class="goods-remark" wx:if="{{item.remark}}">{{item.remark}}</text>
      <view class="goods-bottom">
        <text class="goods-price">¥{{item.price}}</text>
        <text class="goods-qty">×{{item.quantity}}</text>
      </view>
    </view>
  </view>

  <!-- 配送方式 -->
  <view class="section">
    <text class="section-title">配送方式</text>
    <view class="delivery-options">
      <view class="option {{deliveryMode==='pickup'?'active':''}}" bindtap="switchMode" data-mode="pickup">自取</view>
      <view class="option {{deliveryMode==='deliver'?'active':''}}" bindtap="switchMode" data-mode="deliver">外卖配送</view>
    </view>
  </view>

  <!-- 取餐时间 -->
  <view class="section" wx:if="{{deliveryMode==='pickup'}}">
    <text class="section-title">取餐时间</text>
    <picker mode="time" bindchange="onPickTimeChange">
      <view class="picker-value">{{pickTime || '请选择取餐时间'}}</view>
    </picker>
  </view>

  <!-- 底部合计栏 -->
  <view class="bottom-bar">
    <view class="total-info">
      <text class="total-label">合计：</text>
      <text class="total-amount">¥{{totalAmount}}</text>
    </view>
    <view class="pay-btn" bindtap="onConfirmPay">去支付</view>
  </view>
</view>
```

```html
<!-- ai-pay-success.wxml 核心结构 -->
<view class="success-container">
  <view class="success-icon">✓</view>
  <text class="success-title">支付成功</text>
  <view class="order-info">
    <text class="info-label">订单号</text>
    <text class="info-value">{{orderNo}}</text>
  </view>
  <view class="order-info">
    <text class="info-label">支付金额</text>
    <text class="info-value amount">¥{{totalAmount}}</text>
  </view>
  <view class="btn-group">
    <view class="btn-outline" bindtap="goHome">返回首页</view>
    <view class="btn-primary" bindtap="goOrderList">查看订单</view>
  </view>
</view>
```

**解决说明：** 确认订单页包含商品卡片列表、配送方式切换（自取/外卖）、取餐时间选择器、底部合计栏 + 去支付按钮。支付成功页包含绿色对勾图标、订单号、支付金额、返回首页/查看订单两个按钮。

---

## Prompt #12：AI 一键下单路由跳转错误

**功能点：** AI 顾问页点击「一键下单」后，路由跳转到了普通确认订单页（`/pages/confirm-order/confirm-order`），但 AI 流程应该跳转到 AI 专用的确认订单页（`/pages/ai-confirm-order/ai-confirm-order`），导致用户看到普通结算页而非 AI 风格的确认页。

**影响文件：**
- `pages/ai-order/ai-order.js`
- `pages/ai-confirm-order/ai-confirm-order.json`

**用户 Prompt：**
> 在 AI 甜品顾问页面中，用户完成三步引导（场景 → 口味 → 预算）后，AI 生成推荐商品列表。用户点击推荐列表底部的「一键下单」按钮时，页面跳转到了普通确认订单页 `/pages/confirm-order/confirm-order`，而不是 AI 专用的确认订单页 `/pages/ai-confirm-order/ai-confirm-order`。
>
> 请修复路由跳转逻辑：
> 1. `ai-order.js` 中「一键下单」的 `wx.redirectTo` 目标 URL 改为 `/pages/ai-confirm-order/ai-confirm-order`
> 2. 通过 URL 参数 `cartList` 传递推荐商品列表数据（JSON 序列化 + encodeURIComponent）
> 3. `ai-confirm-order.json` 配置导航栏背景色为 `#FFEAE3`，标题为「确认订单」
> 4. 确保 `ai-confirm-order.js` 的 `onLoad` 能正确解析 `cartList` 参数并渲染商品列表

**AI 返回的原始输出：**

```javascript
// ai-order.js 修复前（错误）
wx.redirectTo({
  url: '/pages/confirm-order/confirm-order?cartList=' + encodeURIComponent(JSON.stringify(list))
})

// ai-order.js 修复后（正确）
wx.redirectTo({
  url: '/pages/ai-confirm-order/ai-confirm-order?cartList=' + encodeURIComponent(JSON.stringify(list))
})
```

```json
// ai-confirm-order.json
{
  "navigationBarBackgroundColor": "#FFEAE3",
  "navigationBarTitleText": "确认订单",
  "navigationBarTextStyle": "black"
}
```

**解决说明：** 将跳转目标从普通 `confirm-order` 改为 AI 专用 `ai-confirm-order` 页面，并配置导航栏粉色背景，保持 AI 流程的页面一致性。

---

## 附录：Prompt 与 Commit 对应关系

| Prompt # | 对应 Commit | Commit Message |
|----------|-------------|----------------|
| 1, 2, 3, 4, 10, 11, 12 | `76fb53d` (2026-07-12) | feat(ai-advisor): add AI dessert advisor 3-step flow... |
| 5, 7, 8, 9 | `2b74d36` (2026-07-13) | feat: add createOrder/getCartList/getGoodsList cloud functions... |
| 6 | `2b74d36` (2026-07-13) | 同上（支付降级逻辑在 confirm-order 页面） |
