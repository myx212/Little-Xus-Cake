// pages/pay-success/pay-success.js
Page({
  data: {
    orderNo: '0107',
    payAmount: '0.00',
    payTime: '',
    orderIds: [],
    goodsList: [],
    totalCount: 0,
    currentStep: 2,
    waitTime: 15,
    rewardPoints: 0,
    deliveryMode: 'pickup',
    pickTime: '',
    deliveryAddress: ''
  },

  onLoad: function (options) {
    var orderNo = options.orderNo || this.generateOrderNo();
    var amount = options.amount || '0.00';
    var orderIds = options.orderIds ? options.orderIds.split(',') : [];
    var pickTime = options.pickTime ? decodeURIComponent(options.pickTime) : '';
    var deliveryMode = options.deliveryMode || 'pickup';
    var deliveryAddress = options.deliveryAddress ? decodeURIComponent(options.deliveryAddress) : '';

    var now = new Date();
    var payTime = now.getFullYear() + '-' +
      this.padZero(now.getMonth() + 1) + '-' +
      this.padZero(now.getDate()) + ' ' +
      this.padZero(now.getHours()) + ':' +
      this.padZero(now.getMinutes()) + ':' +
      this.padZero(now.getSeconds());

    this.setData({
      orderNo: orderNo,
      payAmount: amount,
      payTime: payTime,
      orderIds: orderIds,
      deliveryMode: deliveryMode,
      pickTime: pickTime,
      deliveryAddress: deliveryAddress
    });

    // 加载订单商品详情
    this.loadOrderGoods(orderIds);

    // 启动倒计时，15分钟后自动变为待取餐
    this.startCountdown(15, orderIds);
  },

  // 倒计时：waitTime 分钟后自动变为待取餐
  startCountdown: function (minutes, orderIds) {
    var that = this;
    var remaining = minutes * 60; // 转为秒

    that.countdownTimer = setInterval(function () {
      remaining--;

      if (remaining <= 0) {
        clearInterval(that.countdownTimer);
        // 倒计时结束，变为待取餐
        that.setData({
          currentStep: 3,
          waitTime: 0
        });
        that.updateOrderStatusToReady(orderIds);
        wx.showToast({ title: '您的订单已制作完成，请取餐', icon: 'none', duration: 3000 });
        return;
      }

      // 更新剩余分钟数显示
      var min = Math.ceil(remaining / 60);
      that.setData({ waitTime: min });
    }, 1000);
  },

  // 更新订单状态为「待取餐」
  updateOrderStatusToReady: function (orderIds) {
    if (orderIds.length === 0) return;

    var db = wx.cloud.database();
    orderIds.forEach(function (id) {
      db.collection('orders').doc(id).update({
        data: {
          status: 'ready'
        }
      });
    });
  },

  // 加载订单商品（调用 createOrder 云函数）
  loadOrderGoods: function (orderIds) {
    if (orderIds.length === 0) return;

    var that = this;
    var goodsList = [];
    var loaded = 0;

    orderIds.forEach(function (id) {
      wx.cloud.callFunction({
        name: 'createOrder',
        data: { action: 'detail', id: id },
        success: function (res) {
          if (res.result.code === 0) {
            var item = res.result.data;
            goodsList.push(item);
          }
          loaded++;
          if (loaded === orderIds.length) {
            var count = 0;
            var points = 0;
            goodsList.forEach(function (g) {
              count += (g.quantity || 1);
              points += Math.floor(g.price * (g.quantity || 1));
            });
            that.setData({
              goodsList: goodsList,
              totalCount: count,
              rewardPoints: points,
              deliveryMode: goodsList[0].deliveryMode || that.data.deliveryMode,
              pickTime: goodsList[0].pickTime || that.data.pickTime
            });

            // 更新订单状态为「制作中」或「配送中」
            that.updateOrderStatus(orderIds);

            // 将消费金额转为积分，累加到用户账户
            that.addPointsToUser(points);

            // 每购买一件商品获得1个杯章
            that.addStampCount(count);
          }
        },
        fail: function () {
          loaded++;
          if (loaded === orderIds.length) {
            // 查询失败，使用默认值
            that.setData({
              totalCount: orderIds.length,
              rewardPoints: Math.floor(parseFloat(that.data.payAmount) || 0)
            });
          }
        }
      });
    });
  },

  // 将积分累加到用户账户
  addPointsToUser: function (points) {
    if (points <= 0) return;

    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) return;

    var db = wx.cloud.database();

    db.collection('contact').where({
      openid: userInfo.openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          var currentPoints = res.data[0].points || 0;
          db.collection('contact').doc(res.data[0]._id).update({
            data: {
              points: currentPoints + points
            },
            success: function () {
              console.log('积分已累加：' + points);
            }
          });
        }
      }
    });
  },

  // 累加集章数
  addStampCount: function (count) {
    if (count <= 0) return;

    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) return;

    var db = wx.cloud.database();

    db.collection('contact').where({
      openid: userInfo.openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          var currentStamp = res.data[0].stampCount || 0;
          var newStamp = currentStamp + count;
          db.collection('contact').doc(res.data[0]._id).update({
            data: {
              stampCount: newStamp
            },
            success: function () {
              console.log('集章已累加：' + count);

              // 记录集章记录
              db.collection('stamp_records').add({
                data: {
                  openid: userInfo.openid,
                  text: '获得' + count + '个杯章',
                  createTime: db.serverDate()
                }
              });

              // 集满6个章自动发放优惠券
              if (newStamp >= 6 && currentStamp < 6) {
                db.collection('coupons').add({
                  data: {
                    openid: userInfo.openid,
                    name: '满80减10元券',
                    type: 'full_reduce',
                    threshold: 80,
                    reduce: 10,
                    status: 'unused',
                    createTime: db.serverDate()
                  }
                });

                wx.showModal({
                  title: '恭喜获得优惠券！',
                  content: '集满6个章，获得「满80减10元券」一张，可在购物车中使用',
                  showCancel: false,
                  confirmColor: '#C4956A'
                });
              }
            }
          });
        }
      }
    });
  },

  // 生成取餐号（3-4位）
  generateOrderNo: function () {
    var random = Math.floor(Math.random() * 900 + 100);
    return random.toString();
  },

  // 更新订单状态为「制作中」
  updateOrderStatus: function (orderIds) {
    if (orderIds.length === 0) return;

    var db = wx.cloud.database();
    var that = this;
    var isDelivery = that.data.deliveryMode === 'deliver';

    orderIds.forEach(function (id) {
      db.collection('orders').doc(id).update({
        data: {
          status: isDelivery ? 'ready' : 'using',
          payTime: new Date(),
          orderNo: that.data.orderNo
        }
      });
    });
  },

  // 查看订单
  onGoOrder: function () {
    wx.redirectTo({
      url: '/pages/order-list/order-list'
    });
  },

  // 返回首页
  onGoHome: function () {
    wx.redirectTo({
      url: '/pages/home/home'
    });
  },

  // 补零
  padZero: function (n) {
    return n < 10 ? '0' + n : '' + n;
  },

  // 页面卸载时清除定时器
  onUnload: function () {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }
})