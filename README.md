# Little Xu's Cake 小徐的蛋糕 · 甜品烘焙微信小程序

> 一款面向线下甜品烘焙门店的微信小程序，支持商品浏览、AI 智能顾问点单、购物车、订单管理、钱包储值、积分商城、集点卡等完整业务闭环。

**GitHub 仓库：** https://github.com/myx212/Little-Xus-Cake

---

## 目录

- [1. 项目简介](#1-项目简介)
- [2. 完整功能清单](#2-完整功能清单)
- [3. 技术栈](#3-技术栈)
- [4. 项目目录结构](#4-项目目录结构)
- [5. 云数据库 / 云存储设计](#5-云数据库--云存储设计)
- [6. 安装与本地运行部署指南](#6-安装与本地运行部署指南)
- [7. API 接口文档](#7-api-接口文档)
- [8. 项目截图与演示体验码](#8-项目截图与演示体验码)

---

## 1. 项目简介

**Little Xu's Cake 小徐的蛋糕** 是一款基于 **微信原生小程序 + 微信云开发（CloudBase）** 的甜品烘焙店铺数字化解决方案。

### 核心亮点

| 亮点 | 说明 |
|------|------|
| 🤖 **AI 甜品顾问** | 文字输入「场景 → 口味 → 预算」三步引导，智能推荐商品，一键下单 |
| 🛒 **完整购物闭环** | 浏览 → 加购 → 结算（自取/外卖）→ 支付（余额/微信/混合）→ 订单追踪 |
|  **多商品订单** | 1 笔订单支持多个商品（goodsList 数组），订单列表卡片式展示 |
|  **钱包储值** | 余额充值、余额支付、余额不足自动混合支付 |
| 🏆 **积分 & 集点** | 消费赠积分、积分兑换商品、集点卡盖章（满 10 章送好礼） |
| 📍 **地址管理** | 微信地图选点、联系人/手机号/地址标签（家/公司） |

---

## 2. 完整功能清单

### 2.1 商品模块

| 功能 | 说明 |
|------|------|
| 商品列表 | 按分类 Tab 切换（蛋糕/面包/饮品/甜点），按创建时间倒序 |
| 商品详情 | 图片轮播、价格、库存、描述、数量选择、备注输入 |
| 商品分类 | 首页分类导航 + 商品页 Tab 筛选 |

### 2.2 购物车模块

| 功能 | 说明 |
|------|------|
| 加入购物车 | 从详情页/首页一键加购，已存在则数量叠加 |
| 数量修改 | 购物车内 +/- 调整数量，实时计算小计 |
| 删除/清空 | 单条删除或一键清空购物车 |
| 购物车角标 | TabBar 显示购物车商品总数 |

### 2.3 下单结算模块

| 功能 | 说明 |
|------|------|
| 配送方式 | 自取（选时间）/ 外卖（选地址 + 配送费）切换 |
| 取餐时间 | 自取模式选择取餐时间段 |
| 地址管理 | 外卖模式选择/新增收货地址（微信地图选点） |
| 卡片备注 | 整单备注（如"需要生日帽和蜡烛"） |
| 订单总额 | 商品总价 + 配送费，实时计算 |
| 多商品下单 | 1 笔订单包含多个商品（goodsList 数组） |

### 2.4 支付模块

| 功能 | 说明 |
|------|------|
| 余额支付 | 钱包余额 ≥ 订单金额时直接扣款 |
| 混合支付 | 余额不足时自动余额全扣 + 剩余走微信支付 |
| 支付降级 | 云函数 createMulti 未部署时自动降级 batchCreate |

### 2.5 订单模块

| 功能 | 说明 |
|------|------|
| 订单列表 | 6 个状态 Tab：待付款/待使用/待取餐/待收货/待评价/已完成 |
| 订单详情 | 商品列表、金额、配送信息、状态流转 |
| 再来一单 | 一键将订单商品全部加回购物车 |
| 删除订单 | 用户可删除已完成订单 |
| 状态流转 | pending → using → ready → delivering → review → completed |

### 2.6 AI 甜品顾问模块 

| 功能 | 说明 |
|------|------|
| 三步引导 | 场景输入 → 口味偏好 → 预算范围，文字交互 |
| 智能推荐 | 根据用户输入匹配商品，生成推荐套餐列表 |
| 一键下单 | 推荐商品直接加入购物车或跳转确认订单页 |
| AI 表情反馈 | 根据对话阶段显示不同表情（思考/开心/惊讶等） |

### 2.7 个人中心模块

| 功能 | 说明 |
|------|------|
| 用户信息 | 微信授权登录，显示头像/昵称 |
| 订单入口 | 快速跳转订单列表 |
| 钱包充值 | 选择面额充值，余额实时显示 |
| 积分中心 | 查看积分余额，积分商城兑换商品 |
| 集点卡 | 消费盖章，集满 10 章兑换好礼 |
| 地址管理 | 新增/编辑/删除/设为默认地址 |
| 联系客服 | 一键拨打商家电话 |

---

## 3. 技术栈

### 3.1 前端

| 技术 | 说明 |
|------|------|
| **框架** | 微信小程序原生框架（WXML / WXSS / JavaScript / JSON） |
| **路由** | 小程序内置路由系统（`wx.navigateTo` / `wx.redirectTo` / `wx.switchTab`） |
| **状态管理** | `getApp().globalData` + 页面级 `this.setData()` |
| **UI 风格** | 自定义 TabBar + 原生导航栏，主题色：米色 `#FEFFEF` + 粉色 `#FFEAE3` + 棕色 `#C4956A` |

### 3.2 后端

| 技术 | 说明 |
|------|------|
| **BaaS** | 微信云开发 CloudBase（云函数 + 云数据库 + 云存储） |
| **云函数 Runtime** | Node.js 12/14，使用 `wx-server-sdk` |
| **数据库** | CloudBase NoSQL 文档型数据库（5 张核心集合） |
| **云存储** | 存储商品图片、AI 表情等静态资源 |

### 3.3 开发工具

| 工具 | 说明 |
|------|------|
| **IDE** | 微信开发者工具 Stable ≥ 1.06.240 |
| **版本控制** | Git + GitHub |
| **代码规范** | ESLint（`.eslintrc.js`） |

---

## 4. 项目目录结构

```
Little-Xus-Cake/
│
├── app.js                          # 小程序入口（登录逻辑 / globalData）
├── app.json                        # 全局配置（20 个路由注册 / 导航栏 / TabBar）
├── app.wxss                        # 全局样式（主题色 / 字体 / 通用类）
├── project.config.json             # 项目配置（AppID / 云开发环境 ID）
├── sitemap.json                    # 小程序搜索索引配置
├── .eslintrc.js                    # ESLint 代码规范配置
├── .gitignore                      # Git 忽略文件
├── README.md                       # 项目文档
│
├── pages/                          # 【20 个业务页面】
│   ├── login/                      # 登录授权页
│   ├── home/                       # 首页（Banner / 分类 / AI 入口）
│   ├── order/                      # 分类商品页（Tab 切换）
│   ├── goods-detail/               # 商品详情页
│   ├── cart/                       # 购物车页
│   ├── confirm-order/              # 普通确认订单页（自取/外卖）
│   ├── pay-success/                # 普通支付成功页
│   ├── order-list/                 # 订单列表页（6 状态 Tab）
│   ├── profile/                    # 个人中心页
│   ├── ai-order/                   # ⭐ AI 甜品顾问（三步引导）
│   ├── ai-confirm-order/           # AI 推荐确认订单页
│   ├── ai-pay-success/             # AI 支付成功页
│   ├── address/                    # 地址列表页
│   ├── address-edit/               # 地址新增/编辑页
│   ├── address-map/                # 微信地图选点页
│   ├── points/                     # 积分中心 + 积分商城
│   ├── recharge/                   # 钱包充值页
│   ├── stamp/                      # 集点卡页
│   └── index/                      # 首页入口（兼容）
│
├── components/                     # 【自定义组件】
│   └── custom-tabbar/              # 自定义底部导航栏
│
├── cloudfunctions/                 # 【4 个云函数 / 18 个 API 接口】
│   ├── getUserOpenid/              # 获取用户 openid
│   ├── getGoodsList/               # 商品列表 / 详情 / 购物车查询
│   ├── getCartList/                # 购物车 CRUD
│   └── createOrder/                # ⭐ 订单全生命周期（含多商品下单）
│
├── data/                           # 商品 Mock 数据（JSON）
│
├── images/                         # 静态资源
│   ├── cake/                       # 蛋糕商品图
│   ├── gift/                       # 礼品图
│   ├── home/                       # 首页资源
│   ── ai/                         # AI 顾问表情（new.png / success.png）
│
└── utils/                          # 工具函数
    ── qrcode.js                   # 二维码生成工具
```

---

## 5. 云数据库 / 云存储设计

### 5.1 数据库集合设计

本项目使用微信云开发 NoSQL 文档型数据库，共 **5 张核心集合**：

#### `goods` — 商品表

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `_id` | String | 商品 ID（自动生成） | `"abc123"` |
| `name` | String | 商品名称 | `"抹茶巴斯克"` |
| `category` | String | 分类 | `"蛋糕"` |
| `price` | Number | 单价（元） | `30` |
| `image` | String | 商品图片（云存储 URL） | `"cloud://xxx/cake1.png"` |
| `description` | String | 商品描述 | `"宇治抹茶 + 北海道红豆"` |
| `stock` | Number | 库存数量 | `50` |
| `createTime` | Date | 创建时间 | `2026-07-11T08:00:00Z` |

#### `cart` — 购物车表

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `_id` | String | 购物车记录 ID | `"cart001"` |
| `openid` | String | 用户唯一标识 | `"oXXXX..."` |
| `goodsId` | String | 关联商品 ID | `"abc123"` |
| `name` | String | 商品名称 | `"抹茶巴斯克"` |
| `price` | Number | 单价 | `30` |
| `image` | String | 商品图片 | `"cloud://xxx.png"` |
| `quantity` | Number | 数量 | `2` |
| `remark` | String | 备注 | `"少糖"` |
| `createTime` | Date | 加入时间 | - |
| `updateTime` | Date | 最后更新时间 | - |

#### `orders` — 订单表 ⭐（支持多商品）

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `_id` | String | 订单 ID | `"order001"` |
| `openid` | String | 用户唯一标识 | `"oXXXX..."` |
| `orderNo` | String | 3 位取餐号 | `"812"` |
| `goodsList` | Array | **多商品列表** | `[{goodsId, name, price, image, quantity, remark}]` |
| `totalCount` | Number | 商品总件数 | `3` |
| `totalAmount` | Number | 订单总额（含配送费） | `98` |
| `deliveryFee` | Number | 配送费 | `5` |
| `remark` | String | 整单备注 | `"需要生日帽"` |
| `phone` | String | 联系电话 | `"138****1234"` |
| `pickTime` | String | 取餐时间 | `"2026-07-12 下午 2 点"` |
| `deliveryMode` | String | 配送方式 | `"pickup"` / `"deliver"` |
| `deliveryAddress` | Object | 收货地址 | `{contactName, phone, address}` |
| `status` | String | 订单状态 | `pending/using/ready/delivering/review/completed` |
| `createTime` | Date | 创建时间 | - |
| `updateTime` | Date | 更新时间 | - |

> **兼容设计：** 老订单（单商品）保留 `goodsId/name/price/image/quantity` 字段，新订单使用 `goodsList` 数组，前端渲染时自动判断。

#### `contact` — 用户表（余额 + 积分）

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `_id` | String | 用户记录 ID | `"user001"` |
| `openid` | String | 微信 openid | `"oXXXX..."` |
| `nickName` | String | 昵称 | `"Winnie"` |
| `avatarUrl` | String | 头像 URL | `"cloud://xxx.png"` |
| `phone` | String | 手机号 | `"138****1234"` |
| `balance` | Number | 钱包余额（元） | `288.00` |
| `points` | Number | 积分 | `1680` |
| `stamps` | Number | 集点个数（0-9） | `5` |
| `createTime` | Date | 注册时间 | - |
| `updateTime` | Date | 最后更新时间 | - |

#### `points_products` — 积分商城兑换品表

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `_id` | String | 兑换品 ID | `"gift001"` |
| `name` | String | 兑换品名称 | `"抹茶曲奇礼盒"` |
| `points` | Number | 所需积分 | `500` |
| `image` | String | 兑换品图片 | `"cloud://xxx.png"` |
| `stock` | Number | 库存 | `20` |
| `description` | String | 描述 | `"手工抹茶曲奇 12 枚装"` |

### 5.2 云存储设计

| 存储路径 | 用途 | 示例 |
|----------|------|------|
| `images/cake/` | 蛋糕商品图 | `cake1.png`, `cake2.png` |
| `images/gift/` | 礼品/兑换品图 | `gift1.png` |
| `images/home/` | 首页 Banner/图标 | `banner.png`, `icon.png` |
| `images/ai/` | AI 顾问表情 | `new.png`, `success.png` |
| 根目录 PNG | 聊天表情 | `angry.png`, `happy.png`, `sad.png`, `shy.png`, `surprise.png`, `thinking.png`, `wink.png` |

### 5.3 数据库权限设计

| 集合 | 读权限 | 写权限 | 说明 |
|------|--------|--------|------|
| `goods` | 所有用户 | 仅创建者 | 商品公开浏览 |
| `cart` | 仅创建者 | 仅创建者 | 购物车私有 |
| `orders` | 仅创建者 | 仅创建者 | 订单私有 |
| `contact` | 仅创建者 | 仅创建者 | 用户信息私有 |
| `points_products` | 所有用户 | 仅创建者 | 兑换品公开浏览 |

---

## 6. 安装与本地运行部署指南

### 6.1 前置环境

| 依赖 | 版本要求 | 下载地址 |
|------|----------|----------|
| 微信开发者工具 | Stable ≥ 1.06.240 | https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html |
| 微信小程序 AppID | 已开通（或测试号） | https://mp.weixin.qq.com/ |
| 微信云开发环境 | 已开通并初始化 | 开发者工具内 → 云开发面板 |

### 6.2 Step 1：克隆项目

```bash
git clone https://github.com/myx212/Little-Xus-Cake.git
cd Little-Xus-Cake
```

### 6.3 Step 2：导入项目

1. 打开 **微信开发者工具** → 点击「导入项目」
2. 项目目录选择克隆的 `Little-Xus-Cake` 文件夹
3. AppID 填写自己的小程序 AppID（无则选「测试号」）
4. 后端服务选择「微信云开发」，云开发环境 ID 填入 `project.config.json`

### 6.4 Step 3：初始化云开发数据库

在微信开发者工具 → 云开发 → 数据库 → 创建以下 5 个集合：

| 集合名 | 说明 | 权限设置 |
|--------|------|----------|
| `goods` | 商品表 | 所有用户可读，仅创建者可读写 |
| `cart` | 购物车表 | 仅创建者可读写 |
| `orders` | 订单表 | 仅创建者可读写 |
| `contact` | 用户表 | 仅创建者可读写 |
| `points_products` | 积分兑换品表 | 所有用户可读，仅创建者可读写 |

> **初始化商品数据：** 将 `data/` 目录下的 JSON 文件导入 `goods` 集合。

### 6.5 Step 4：上传部署云函数

在左侧项目树依次对 4 个云函数文件夹 **右键 → 上传并部署：云端安装依赖**：

```
cloudfunctions/
── getUserOpenid/      # 获取用户 openid
├── getGoodsList/       # 商品列表 / 详情 / 购物车查询
├── getCartList/        # 购物车 CRUD
── createOrder/        # ⭐ 订单全生命周期（含多商品下单）
```

> ⚠️ **必须部署！** 不部署调用云函数会返回 `cloud function not found`。

### 6.6 Step 5：编译预览

| 操作 | 说明 |
|------|------|
| **编译** | 开发者工具顶部点击「编译」，在模拟器运行 |
| **预览** | 点击「预览」生成二维码，微信扫码真机预览（有效期 7 天） |
| **真机调试** | 点击「真机调试」，可在真机查看 console.log / network |

### 6.7 部署为体验版（生成可分享链接）

1. 开发者工具右上角「上传」→ 填写版本号（如 `v1.0.0`）+ 备注
2. 登录 [微信公众平台](https://mp.weixin.qq.com/) → 「版本管理」
3. 在「开发版」列表 → 选择刚上传的版本 → 点击 **「选为体验版」**
4. 「版本管理 → 体验版 → 生成体验版二维码」
5. ✅ 生成的 **体验版小程序链接** 即为部署后可直接分享的访问入口
6. 在「成员管理 → 体验成员」添加微信号，所有体验成员扫码即可使用

---

## 7. API 接口文档

### 7.1 调用方式

所有云函数统一调用方式：

```javascript
wx.cloud.callFunction({
  name: '云函数名',
  data: { action: '动作名', /* 其他参数 */ },
  success: res => {
    // res.result = { code: 0, message: 'success', data: {} }
  },
  fail: err => {
    console.error(err)
  }
})
```

### 7.2 统一响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| code | 含义 |
|------|------|
| `0` | 成功 |
| `-1` | 参数缺失 / 未知 action / 服务器错误 |

---

### 7.3 getUserOpenid — 获取用户身份

> 云函数路径：`cloudfunctions/getUserOpenid/index.js`

| # | action | 入参 | 出参 data | 说明 |
|---|--------|------|-----------|------|
| 1 | *(无)* | 无 | `{ openid, appid, unionid }` | 获取当前用户 openid，所有接口前置依赖 |

**调用示例：**

```javascript
wx.cloud.callFunction({
  name: 'getUserOpenid',
  success: res => {
    const openid = res.result.data.openid
  }
})
```

---

### 7.4 getGoodsList — 商品与购物车查询

> 云函数路径：`cloudfunctions/getGoodsList/index.js`

| # | action | 入参 | 出参 data | 说明 |
|---|--------|------|-----------|------|
| 2 | `list` | `category?: string` | `Goods[]` | 获取商品列表，可按分类筛选 |
| 3 | `detail` | `id: string` | `Goods` | 获取单个商品详情 |
| 4 | `cartList` | `openid: string` | `CartItem[]` | 获取用户购物车列表 |
| 5 | `cartCount` | `openid: string` | `{ total: number }` | 获取购物车商品总数（角标） |

**调用示例：**

```javascript
// 获取商品列表
wx.cloud.callFunction({
  name: 'getGoodsList',
  data: { action: 'list', category: '蛋糕' },
  success: res => {
    const goodsList = res.result.data
  }
})

// 获取商品详情
wx.cloud.callFunction({
  name: 'getGoodsList',
  data: { action: 'detail', id: 'abc123' },
  success: res => {
    const goods = res.result.data
  }
})
```

---

### 7.5 getCartList — 购物车 CRUD

> 云函数路径：`cloudfunctions/getCartList/index.js`

| # | action | 入参 | 出参 data | 说明 |
|---|--------|------|-----------|------|
| 6 | `list` | `openid: string` | `CartItem[]` | 查询购物车列表 |
| 7 | `add` | `openid, item: CartItem` | `{ action: 'added' \| 'updated' }` | 加购（已存在则数量叠加） |
| 8 | `updateQty` | `id: string, delta: number` | - | 购物车数量 ±N |
| 9 | `remove` | `id: string` | - | 删除单条购物车记录 |
| 10 | `clear` | `openid: string` | - | 清空购物车 |

**调用示例：**

```javascript
// 加入购物车
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
  }
})

// 修改数量
wx.cloud.callFunction({
  name: 'getCartList',
  data: { action: 'updateQty', id: 'cart001', delta: 1 }
})
```

---

### 7.6 createOrder — 订单全生命周期 ⭐

> 云函数路径：`cloudfunctions/createOrder/index.js`

| # | action | 入参 | 出参 data | 说明 |
|---|--------|------|-----------|------|
| 11 | `create` | `openid, orderData` | `{ orderId }` | 创建单商品订单（兼容老数据） |
| 12 | `createMulti` | `openid, orderData: { goodsList[], remark?, phone?, pickTime?, deliveryMode?, deliveryAddress?, deliveryFee? }` | `{ orderId, orderNo }` | **⭐ 创建多商品订单**（1 订单 = goodsList 数组） |
| 13 | `batchCreate` | `openid, orderData: OrderItem[]` | `{ orderIds, orderNos }` | 降级模式：每个商品建 1 条订单 |
| 14 | `list` | `openid, status?: string` | `Order[]` | 按状态筛选订单列表 |
| 15 | `detail` | `id: string` | `Order` | 订单详情 |
| 16 | `updateStatus` | `id, status` | - | 更新订单状态 |
| 17 | `remove` | `id` | - | 删除订单 |
| 18 | `addToCart` | `openid, id` | `{ addedCount }` | **再来一单**：批量加购订单商品 |

**调用示例：**

```javascript
// 创建多商品订单
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

// 再来一单
wx.cloud.callFunction({
  name: 'createOrder',
  data: { action: 'addToCart', openid: 'oXXXX...', id: 'order001' },
  success: res => {
    const addedCount = res.result.data.addedCount
  }
})
```

---

## 8. 项目截图与演示体验码

### 8.1 项目截图

> 以下为小程序主要页面截图（实际使用时替换为真实截图）

| 页面 | 截图 | 说明 |
|------|------|------|
| 首页 | ![首页](images/home/home.png) | Banner 轮播 + 分类导航 + AI 顾问入口 |
| 商品列表 | ![商品列表](images/cake/cake1.png) | Tab 分类筛选 + 商品卡片 |
| 商品详情 | ![商品详情](images/cake/cake2.png) | 图片轮播 + 规格选择 + 加入购物车 |
| 购物车 | ![购物车](images/cake/cake3.png) | 商品列表 + 数量调整 + 结算 |
| AI 顾问 | ![AI 顾问](images/ai/new.png) | 三步引导 + 文字交互 + 智能推荐 |
| 订单列表 | ![订单列表](images/home/home.png) | 6 状态 Tab + 多商品卡片渲染 |
| 个人中心 | ![个人中心](images/home/home.png) | 用户信息 + 钱包/积分/集点入口 |

### 8.2 演示体验码

#### 方式 A：开发者工具预览（即时可用）

1. 打开微信开发者工具 → 导入本项目
2. 点击右上角 **「预览」** → 生成二维码
3. 微信扫码即可在真机使用（有效期 7 天）

#### 方式 B：体验版（固定链接，需上传版本）

1. 开发者工具右上角「上传」→ 填写版本号 + 备注
2. 登录 [微信公众平台](https://mp.weixin.qq.com/) → 「版本管理」→ 选为体验版
3. 生成体验版二维码 → 微信扫码使用

> **体验版链接格式：** `https://servicewechat.com/{AppID}/page-frame.html`

#### 方式 C：正式版（面向所有用户）

1. 体验版验证通过 → 提交审核
2. 微信官方审核（1-24 小时）
3. 审核通过 → 发布上线
4. 微信「发现 → 小程序」搜索 **「Little Xu's Cake」** 即可使用

---

## 附录

### A. 异常场景覆盖

| 场景 | 异常 | 处理方案 |
|------|------|----------|
| 支付 | 云函数 createMulti 未部署 | 自动降级 batchCreate |
| 支付 | 余额不足 | 混合支付（余额全扣 + 剩余微信） |
| 下单 | 购物车为空 | 前端拦截提示 |
| 下单 | 外卖未填地址 | 强制跳转选地址 |
| 订单 | 老订单无 goodsList | fallback 单商品渲染 |
| 输入 | 超长文本 | CSS 截断 + 气泡宽度限制 |
| 云函数 | 参数缺失 | 判空返回 code=-1 |

### B. 加分项说明

| 加分项 | 落地情况 | 文件位置 |
|--------|----------|----------|
| **CI/CD** | ✅ GitHub Actions 自动检查：push 时自动跑 ESLint + 单元测试 + 云函数结构校验 | `.github/workflows/ci.yml` |
| **单元测试** | ✅ Jest 测试框架，30+ 测试用例，覆盖金额计算、参数校验、订单号生成、购物车逻辑 | `__tests__/createOrder.test.js` `__tests__/cartAndGoods.test.js` |
| **工程化** | ✅ 统一日志工具（logger.js）+ 结构化错误监控 + 云函数全链路日志记录 | `cloudfunctions/common/logger.js` |

#### CI/CD 流水线

```yaml
push → checkout → setup Node.js → npm ci → ESLint → Jest tests → 云函数结构校验 → 项目配置校验
```

#### 单元测试运行

```bash
npm test              # 运行所有测试
npm run test:coverage # 生成覆盖率报告
```

#### 日志与错误监控

所有云函数使用统一的 `logger.wrap()` 包裹，自动记录：
- 请求开始/成功/失败
- 时间戳、云函数名、action
- 错误堆栈信息

查看方式：**微信开发者工具 → 云开发 → 日志**

---

**License:** MIT © Little Xu's Cake
