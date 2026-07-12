// pages/ai-confirm-order/ai-confirm-order.js
Page({
  data: {
    cartList: [],
    totalAmount: '0.00',
    deliveryMode: 'pickup',
    pickTime: '尽快取餐',
    walletBalance: '0.00',
    showPayModal: false,
    showPayFail: false,
    orderIds: [],
    orderNos: [],
    payMethod: 'wechat'
  },

  onLoad: function (options) {
    var that = this;
    var app = getApp();
    var cartList = [];

    if (app.globalData && app.globalData.aiCartList && app.globalData.aiCartList.length > 0) {
      cartList = app.globalData.aiCartList;
    } else {
      try {
        cartList = wx.getStorageSync('aiCartList') || [];
      } catch (e) {
        cartList = [];
      }
    }

    var total = 0;
    cartList.forEach(function (item) {
      total += item.price * (item.quantity || 1);
    });

    that.setData({
      cartList: cartList,
      totalAmount: total.toFixed(2)
    });

    that.loadWalletBalance();
  },

  onBack: function () {
    wx.navigateBack();
  },

  loadWalletBalance: function () {
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
          var balance = (res.data[0].balance || 0).toFixed(2);
          that.setData({ walletBalance: balance });
        }
      }
    });
  },

  // 点击去支付
  onPayTap: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (this.data.cartList.length === 0) {
      wx.showToast({ title: '没有商品', icon: 'none' });
      return;
    }
    this.setData({ showPayModal: true });
  },

  // 选择支付方式
  onSelectPayMethod: function (e) {
    var method = e.currentTarget.dataset.method;
    this.setData({ payMethod: method });
  },

  stopPropagation: function () {},

  onCloseModal: function () {
    this.setData({ showPayModal: false });
  },

  onCancelPay: function () {
    this.setData({ showPayModal: false });
    wx.showToast({ title: '支付已取消', icon: 'none' });
  },

  // 确认支付（优先 createMulti 单订单多商品，失败自动降级 batchCreate）
  onConfirmPay: function () {
    var that = this;
    this.setData({ showPayModal: false });
    wx.showLoading({ title: '支付中...' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;
        var cartList = that.data.cartList;

        // 多商品参数（createMulti 格式）
        var goodsList = cartList.map(function (item) {
          return {
            goodsId: item.goodsId || item._id,
            cartId: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity || 1
          };
        });

        var multiOrderData = {
          goodsList: goodsList,
          remark: '',
          phone: '',
          pickTime: that.data.pickTime,
          deliveryMode: that.data.deliveryMode
        };

        // 批量参数（batchCreate 降级格式）
        var batchOrderData = cartList.map(function (item) {
          return {
            goodsId: item.goodsId || item._id,
            cartId: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity || 1,
            remark: '',
            phone: '',
            pickTime: that.data.pickTime,
            deliveryMode: that.data.deliveryMode
          };
        });

        // 公共：订单成功后续处理
        var handleSuccess = function (orderNos, orderIds) {
          that.setData({ orderIds: orderIds, orderNos: orderNos });
          if (that.data.payMethod === 'wallet') {
            that.deductWalletBalance(openid, function () {
              that.goToPaySuccess(orderNos, orderIds);
            });
          } else {
            that.goToPaySuccess(orderNos, orderIds);
          }
        };

        // 降级：batchCreate
        var fallbackBatchCreate = function () {
          wx.cloud.callFunction({
            name: 'createOrder',
            data: {
              action: 'batchCreate',
              openid: openid,
              orderData: batchOrderData
            },
            success: function (fallbackRes) {
              if (fallbackRes.result.code === 0) {
                var fbOrderIds = fallbackRes.result.data.orderIds || [];
                var fbOrderNos = fallbackRes.result.data.orderNos || [];
                handleSuccess(fbOrderNos, fbOrderIds);
              } else {
                wx.hideLoading();
                that.setData({ showPayFail: true });
              }
            },
            fail: function () {
              wx.hideLoading();
              that.setData({ showPayFail: true });
            }
          });
        };

        // 主流程：优先 createMulti
        wx.cloud.callFunction({
          name: 'createOrder',
          data: {
            action: 'createMulti',
            openid: openid,
            orderData: multiOrderData
          },
          success: function (orderRes) {
            if (orderRes.result.code === 0) {
              var orderId = orderRes.result.data.orderId;
              var orderNo = orderRes.result.data.orderNo;
              var orderIds = orderId ? [orderId] : [];
              var orderNos = orderNo ? [orderNo] : [];
              handleSuccess(orderNos, orderIds);
            } else {
              // createMulti 失败（多为云函数未上传，返回"未知action"）→ 降级
              fallbackBatchCreate();
            }
          },
          fail: function () {
            fallbackBatchCreate();
          }
        });
      },
      fail: function () {
        wx.hideLoading();
        that.setData({ showPayFail: true });
      }
    });
  },

  deductWalletBalance: function (openid, callback) {
    var that = this;
    var db = wx.cloud.database();
    var _ = db.command;
    var totalAmount = parseFloat(that.data.totalAmount);
    var walletBalance = parseFloat(that.data.walletBalance);
    var deductAmount = Math.min(totalAmount, walletBalance);

    db.collection('contact').where({
      openid: openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          db.collection('contact').doc(res.data[0]._id).update({
            data: {
              balance: _.inc(-deductAmount),
              updateTime: db.serverDate()
            },
            success: function () {
              var app = getApp();
              if (app.globalData.userInfo) {
                app.globalData.userInfo.balance = walletBalance - deductAmount;
              }
              callback();
            },
            fail: function () {
              wx.hideLoading();
              wx.showToast({ title: '扣款失败', icon: 'none' });
            }
          });
        } else {
          callback();
        }
      },
      fail: function () {
        callback();
      }
    });
  },

  goToPaySuccess: function (orderNos, orderIds) {
    var that = this;
    setTimeout(function () {
      wx.hideLoading();
      var orderNo = (orderNos && orderNos[0]) || Math.floor(Math.random() * 900 + 100).toString();
      var orderIdsStr = (orderIds || []).join(',');

      // 跳转到 AI 支付成功页面
      wx.redirectTo({
        url: '/pages/ai-pay-success/ai-pay-success?orderNo=' + orderNo + '&amount=' + that.data.totalAmount + '&orderIds=' + orderIdsStr
      });
    }, 1800);
  },

  onCloseFail: function () {
    this.setData({ showPayFail: false });
  },

  onRetryPay: function () {
    this.setData({ showPayFail: false });
    this.onConfirmPay();
  }
});
