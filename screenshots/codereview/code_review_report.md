# Little Xu's Cake · Code Review 报告

> 审查范围：核心云函数 `createOrder/index.js`（订单创建/查询/管理）
> 审查工具：AI Code Review + Security Review
> 审查日期：2026-07-13

---

## 一、Code Review — 问题清单（按严重度排序）

| No. | Issue Title | Severity | AI 优化建议 | 代码位置 |
|-----|-------------|----------|-------------|----------|
| 1 | **订单金额信任前端传递** | HIGH | 云函数端必须根据 `goods.price × quantity + deliveryFee` 重新计算 totalAmount，禁止使用前端传的 `orderData.totalAmount`，防止篡改（如商品 ¥100 改成 ¥0.01 下单） | `createOrder/index.js:46-114` |
| 2 | **取餐号/订单号只用 Math.random() 生成 3 位数字（重复概率高）** | MEDIUM | 建议拼接日期前缀（如 `MMdd-3位随机`：0712-812）或用 db 自增计数器（`_.inc(1)`），保证高并发下唯一 | `createOrder/index.js:69` |
| 3 | **两次 getUserOpenid 网络往返（order-list 加载订单、confirm-order 支付）** | MEDIUM | 将 openid 缓存到 `app.globalData.openid`（首次调用 getUserOpenid 后持久化），避免每个页面首次 loadOrders 都要先 callFunction 获取 openid（减少 300~500ms 白屏） | `pages/order-list/order-list.js:26-45` |
| 4 | **createMulti 失败降级 batchCreate → 购物车 remove 会 N 次循环 callFunction** | MEDIUM | 新增 getCartList action: `batchRemove(ids[])` 一次删除，或直接 `clear` + 前端校验 only 已选 | `pages/confirm-order/confirm-order.js:415-423` |
| 5 | **云函数 list/detail/updateStatus/remove 未校验「该 openid == 订单创建者」（IDOR 越权）** | HIGH | 每个操作先查订单 `.where({_id:id, openid:openid})`，确保用户只能操作自己的订单，防止遍历订单号篡改/删除他人订单 | `createOrder/index.js:126-175` |
| 6 | **confirm-order 与 ai-confirm-order 支付逻辑代码高度重复（拷贝粘贴 80%）** | LOW | 抽公共 `utils/payOrderHelper.js`：`createMultiWithFallback(openid, goodsList, meta)`，两个页面 import 调用，后续修 Bug 改 1 处即可 | `pages/confirm-order/confirm-order.js:349-502` |
| 7 | **order-list description 写死了「需要生日帽和蜡烛…」兜底文案** | LOW | 老数据 description fallback 用商品 description 字段，或空字符串不显示 | `pages/order-list/order-list.js:71` |
| 8 | **createMulti 缺少单条商品字段校验（price=负数 / quantity=0）** | HIGH | 循环 goodsList 时校验：`if (!item.price \|\| item.price <=0 \|\| !item.quantity \|\| item.quantity<1) return {code:-1,message:'商品参数非法'}` | `createOrder/index.js:56-62` |
| 9 | **多商品图片大小 120rpx，单商品 140rpx → 可再统一** | LOW | 可选：两种模式统一用 130rpx 缩略图，视觉一致性更高 | `pages/order-list/order-list.wxss:121,262` |

---

## 二、Security Review — 安全漏洞清单

| # | Category | Title | Severity | Confidence | 证据 Source → Sink | 建议 | 位置 |
|---|----------|-------|----------|------------|-------------------|------|------|
| 1 | **authz_idor** | 订单「详情/修改状态/删除/再来一单」无 openid 归属校验，可水平越权操作他人订单 | HIGH | 0.94 | 前端传任意 `id` → 云函数直接 `doc(id).get/update/remove`（无 where(openid==当前)）→ 任意用户只要知道订单号就能删别人订单/改状态 | 每个订单操作先 `where({_id:id, openid: openid}).get()` 校验归属 | `createOrder/index.js:155-210` |
| 2 | **business_logic_tamper** | 订单 totalAmount/deliveryFee 完全信任前端传入，可篡改价格 0 元下单 | HIGH | 0.96 | 攻击者控制台改 `wx.cloud.callFunction` 参数 `orderData.totalAmount=0.01, price=0.01` → 云函数直接 `orders.add(...)` 写入数据库不校验 | 云函数端用 goods 表真实价格 `db.collection('goods').doc(goodsId).get()` 查出原价 × qty 汇总 | `createOrder/index.js:46-114` |
| 3 | **authz_idor** | 购物车 list/updateQty/remove/clear 缺少 openid 二次校验（传 openid 参数不可信） | MEDIUM | 0.88 | 前端传 `openid` → 云函数直接用，可伪造他人 openid 看/删他人购物车 | 云函数端**禁止用前端传的 openid**，统一 `cloud.getWXContext().OPENID` 获取真实用户 openid | `getCartList/index.js:18-95` |
| 4 | **weak_crypto** | 取餐号仅 3 位 Math.random()，可枚举预测 + 撞号率高 | LOW | 0.81 | `Math.floor(Math.random()*900+100)` 仅 900 种可能，一天几百单必撞 | 引入日期前缀（0712-812）+ 数据库计数器 `counter` 集合 `_.inc(1)` 自增 | `createOrder/index.js:69` |
| 5 | **untrusted_input_validation** | goodsList[] 商品 price/quantity 无服务端校验（负数/0/超大数量可入库） | MEDIUM | 0.90 | 前端传 `{price:-100, quantity:0}` → 云函数直接写 orders 表 → totalAmount 算出负数导致退款 | 云函数循环校验：`if (!(price>0 && quantity>0 && quantity<=999)) return 参数非法` | `createOrder/index.js:56-62` |

---

## 三、业务流程改造图

```
用户下单 N 件商品
       │
       ▼
  ┌─ 多商品模式? ─┐
  │ Yes            │ No
  ▼                ▼
构造 goodsList[]   action: create
+ 整单备注/地址     (原单商品逻辑)
       │
       ▼
调用 createOrder
  → action: createMulti
       │
       ▼
  ┌─ 云函数返回 code=0? ─
  │ Yes                    │ No (未知action/未部署)
  ▼                        ▼
生成 1 条订单记录        ⬇️ 自动降级 fallback
+ 1 个取餐号              调用 batchCreate
       │                  生成 N 条独立订单
       ▼                        │
订单列表：一张卡片          订单列表：每张卡片
循环渲染 goodsList[]         1 个商品（兼容老数据）
+ 虚线分隔
       │
       ▼
点击再来一单
→ addToCart 批量加所有商品
```

---

## 四、技术调用链图

```
前端 Page                    createOrder 云函数              CloudBase 数据库
    │                              │                              │
    │  {action:'createMulti',      │                              │
    │   orderData:{goodsList:[...]}}                              │
    │─────────────────────────────→│                              │
    │                              │ 校验 goodsList.isArray ✅     │
    │                              │                              │
    │                              │ loop 遍历 goodsList:          │
    │                              │   goodsTotal += price*qty     │
    │                              │   totalCount += qty           │
    │                              │                              │
    │                              │ totalAmount = goodsTotal      │
    │                              │             + deliveryFee     │
    │                              │ orderNo = 随机 3 位           │
    │                              │                              │
    │                              │─────────────────────────────→│
    │                              │         orders.add(1条文档)    │
    │                              │         含 goodsList[]        │
    │                              │←─────────────────────────────│
    │                              │         返回 orderId           │
    │←─────────────────────────────│                              │
    │  {code:0, data:{orderId,     │                              │
    │            orderNo}}         │                              │
    │                              │                              │
    │  ┌─ 云函数未部署(code=-1) ─┐ │                              │
    │  │ ⚠️ fallbackBatchCreate()│ │                              │
    │  │ 调用 batchCreate         │ │                              │
    │  │─────────────────────────→│                              │
    │  │         orders.add(N条)  │─────────────────────────────→│
    │  │←─────────────────────────│←─────────────────────────────│
    │  │  {code:0, orderIds:[...]}│                              │
    │  └──────────────────────────┘                              │
    │                              │                              │
    │  扣款钱包 / 跳 pay-success    │                              │
```

---

## 五、AI 优化建议汇总

| # | 建议 | 预期收益 | 改动范围 | 优先级 |
|---|------|----------|----------|--------|
| 1 | 云函数端重新计算 totalAmount（不信任前端） | 防止金额篡改，保障交易安全 | `createOrder/index.js` | P0 |
| 2 | 每个订单操作加 openid 归属校验 | 防止 IDOR 越权，保护用户数据 | `createOrder/index.js` | P0 |
| 3 | 商品字段服务端校验（price>0, quantity>0） | 防止负数/0 值入库 | `createOrder/index.js` | P0 |
| 4 | openid 缓存到 app.globalData | 减少 300~500ms 白屏 | `app.js` + 各页面 | P1 |
| 5 | 取餐号改为 `MMdd-随机3位` 格式 | 降低撞号率 | `createOrder/index.js` | P1 |
| 6 | 购物车批量删除接口 `batchRemove` | 减少 N 次网络请求 | `getCartList` 云函数 | P1 |
| 7 | 抽取公共支付逻辑 `utils/payOrderHelper.js` | 消除 80% 重复代码 | 新建 utils 文件 | P2 |
| 8 | order-list description 动态 fallback | 避免所有订单显示同一文案 | `order-list.js` | P2 |
| 9 | 统一缩略图尺寸为 130rpx | 视觉一致性 | `order-list.wxss` | P3 |

---


