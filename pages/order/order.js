// pages/order/order.js
Page({
  data: {
    orderMode: 'pickUp', // dineIn, pickUp, delivery
    // 堂食相关
    tableNumber: '',
    showTableInput: false,
    // 自提相关
    pickupTime: '',
    showTimePicker: false,
    timeSlots: [],
    // 外卖相关
    selectedAddress: null,
    deliveryFee: 0,
    // 分类列表
    categories: [
      { id: 'salt_croissant', name: '盐可颂', tag: '招牌' },
      { id: 'soft_bread', name: '日式软面包' },
      { id: 'rice_bread', name: '米面包' },
      { id: 'bagel', name: '贝果碱水' },
      { id: 'basque', name: '巴斯克蛋糕' },
      { id: 'mochi', name: '麻薯' },
      { id: 'toast', name: '吐司' },
      { id: 'drink', name: '饮品水牛奶' }
    ],
    currentCategory: 0,
    goodsList: []
  },

  onLoad: function (options) {
    // 根据传入的 mode 参数设置订单模式
    if (options.mode) {
      this.setData({ orderMode: options.mode });
    }
    this.loadGoods();
    this.initTimeSlots();
    this.loadDefaultAddress();
  },

  onShow: function () {
    // 每次显示时同步购物车数量
    this.syncCartQty();
  },

  // 初始化时间段（自提用）
  initTimeSlots: function () {
    var slots = [];
    var now = new Date();
    var currentHour = now.getHours();

    // 生成未来 2 小时的时间段，每 30 分钟一个
    for (var i = 0; i < 4; i++) {
      var hour = currentHour + Math.floor(i / 2);
      var minute = (i % 2) * 30;
      var timeStr = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
      slots.push(timeStr);
    }

    this.setData({ timeSlots: slots });
  },

  // 加载默认地址（外卖用）
  loadDefaultAddress: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) return;

    var db = wx.cloud.database();

    // 先尝试读取默认地址
    db.collection('addresses').where({
      openid: userInfo.openid,
      isDefault: true
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          that.setData({ selectedAddress: res.data[0] });
          that.calculateDeliveryFee();
        } else {
          // 没有默认地址，读取任意一个地址
          db.collection('addresses').where({
            openid: userInfo.openid
          }).orderBy('createTime', 'desc').get({
            success: function (res2) {
              if (res2.data.length > 0) {
                that.setData({ selectedAddress: res2.data[0] });
                that.calculateDeliveryFee();
              }
            }
          });
        }
      }
    });
  },

  // 堂食：选择桌号
  onTableInputTap: function () {
    var that = this;
    wx.showModal({
      title: '请输入桌号',
      editable: true,
      placeholderText: '例：A01',
      confirmText: '确认',
      confirmColor: '#C4956A',
      success: function (res) {
        if (res.confirm && res.content) {
          that.setData({ tableNumber: res.content });
          wx.showToast({ title: '桌号已设置', icon: 'success' });
        }
      }
    });
  },

  // 自提：选择取餐时间
  onTimeSlotTap: function (e) {
    var time = e.currentTarget.dataset.time;
    this.setData({ pickupTime: time });
    wx.showToast({ title: '取餐时间已设置', icon: 'success' });
  },

  // 外卖：选择地址
  onAddressTap: function () {
    wx.navigateTo({
      url: '/pages/address/address?from=order',
      events: {
        selectAddress: function (data) {
          this.setData({ selectedAddress: data });
        }.bind(this)
      }
    });
  },

  // 计算配送费（外卖用）
  calculateDeliveryFee: function () {
    // 根据距离计算配送费，这里简化处理
    var fee = 5; // 基础配送费
    this.setData({ deliveryFee: fee });
  },

  // 同步购物车数量到商品列表
  syncCartQty: function () {
    var that = this;
    var db = wx.cloud.database();

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        db.collection('cart')
          .where({ openid: openid })
          .get({
            success: function (queryRes) {
              // 构建 goodsId -> quantity 映射
              var qtyMap = {};
              queryRes.data.forEach(function (item) {
                qtyMap[item.goodsId] = item.quantity;
              });

              // 更新商品列表的 cartQty 字段
              var goodsList = that.data.goodsList.map(function (goods) {
                goods.cartQty = qtyMap[goods._id] || 0;
                return goods;
              });

              that.setData({ goodsList: goodsList });
            }
          });
      }
    });
  },

  // 切换配送方式
  onDeliveryTap: function (e) {
    this.setData({ deliveryMode: e.currentTarget.dataset.mode });
  },

  // 从云数据库加载商品
  loadGoods: function () {
    var that = this;
    var db = wx.cloud.database();
    var categoryKey = this.data.categories[this.data.currentCategory].id;

    wx.showLoading({ title: '加载中' });

    db.collection('goods')
      .where({
        category: categoryKey
      })
      .get({
        success: function (res) {
          that.setData({
            goodsList: res.data
          });
          that.syncCartQty();
        },
        fail: function (err) {
          console.error('加载商品失败:', err);
          wx.showToast({ title: '加载失败', icon: 'none' });
        },
        complete: function () {
          wx.hideLoading();
        }
      });
  },

  // 切换分类
  onCategoryTap: function (e) {
    var index = e.currentTarget.dataset.index;
    this.setData({
      currentCategory: index
    });
    this.loadGoods();
  },

  // 点击商品卡片跳转详情页
  onGoodsTap: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/goods-detail/goods-detail?id=' + id
    });
  },

  // 减少数量
  onQtyMinus: function (e) {
    var goodsId = e.currentTarget.dataset.id;
    var db = wx.cloud.database();
    var that = this;

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        db.collection('cart')
          .where({ openid: openid, goodsId: goodsId })
          .get({
            success: function (queryRes) {
              if (queryRes.data.length > 0) {
                var cartId = queryRes.data[0]._id;
                var currentQty = queryRes.data[0].quantity;

                if (currentQty <= 1) {
                  // 数量为1时再减，删除该记录
                  db.collection('cart').doc(cartId).remove({
                    success: function () {
                      that.syncCartQty();
                    }
                  });
                } else {
                  db.collection('cart').doc(cartId).update({
                    data: {
                      quantity: db.command.inc(-1),
                      updateTime: db.serverDate()
                    },
                    success: function () {
                      that.syncCartQty();
                    }
                  });
                }
              }
            }
          });
      }
    });
  },

  // 加入购物车
  onAddCart: function (e) {
    var goodsId = e.currentTarget.dataset.id;
    var db = wx.cloud.database();
    var that = this;

    wx.showLoading({ title: '添加中' });

    // 获取当前用户openid
    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        // 先查询购物车是否已有该商品
        db.collection('cart')
          .where({
            openid: openid,
            goodsId: goodsId
          })
          .get({
            success: function (queryRes) {
              if (queryRes.data.length > 0) {
                // 已有该商品，数量+1
                var cartId = queryRes.data[0]._id;
                db.collection('cart')
                  .doc(cartId)
                  .update({
                    data: {
                      quantity: db.command.inc(1),
                      updateTime: db.serverDate()
                    },
                    success: function () {
                      wx.showToast({ title: '已加入购物车', icon: 'success' });
                      that.syncCartQty();
                    },
                    fail: function () {
                      wx.showToast({ title: '添加失败', icon: 'none' });
                    },
                    complete: function () {
                      wx.hideLoading();
                    }
                  });
              } else {
                // 新商品，插入记录
                // 找到商品信息
                var goods = that.data.goodsList.find(function (item) {
                  return item._id === goodsId;
                });

                db.collection('cart')
                  .add({
                    data: {
                      openid: openid,
                      goodsId: goodsId,
                      name: goods ? goods.name : '',
                      price: goods ? goods.price : 0,
                      image: goods ? goods.image : '',
                      quantity: 1,
                      createTime: db.serverDate(),
                      updateTime: db.serverDate()
                    },
                    success: function () {
                      wx.showToast({ title: '已加入购物车', icon: 'success' });
                      that.syncCartQty();
                    },
                    fail: function () {
                      wx.showToast({ title: '添加失败', icon: 'none' });
                    },
                    complete: function () {
                      wx.hideLoading();
                    }
                  });
              }
            },
            fail: function () {
              wx.hideLoading();
              wx.showToast({ title: '查询失败', icon: 'none' });
            }
          });
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
      }
    });
  }
})