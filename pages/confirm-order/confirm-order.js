// pages/confirm-order/confirm-order.js
Page({
  data: {
    goodsList: [],
    totalAmount: '0.00',
    totalCount: 0,
    phone: '',
    pickTime: '',
    remark: '',
    deliveryMode: 'pickup',
    fromCart: false,
    showPayModal: false,
    showPayFail: false,
    orderIds: []
  },

  onLoad: function (options) {
    // 接收参数：ids（购物车ID列表）或 goodsId（商品ID，来自详情页立即购买）
    if (options.ids) {
      var ids = options.ids.split(',');
      this.setData({ fromCart: true });
      this.loadGoods(ids, 'cart');
    } else if (options.goodsId) {
      this.setData({ buyNowQuantity: parseInt(options.quantity) || 1 });
      this.loadGoods([options.goodsId], 'goods');
    }
  },

  // 加载商品详情
  loadGoods: function (ids, type) {
    var that = this;
    var db = wx.cloud.database();

    wx.showLoading({ title: '加载中' });

    var goodsList = [];
    var loaded = 0;
    var failed = 0;

    ids.forEach(function (id) {
      var collection = type === 'cart' ? 'cart' : 'goods';
      db.collection(collection).doc(id).get({
        success: function (res) {
          goodsList.push(res.data);
          loaded++;
          if (loaded + failed === ids.length) {
            that.finishLoading(goodsList);
          }
        },
        fail: function () {
          // cart 查不到，尝试从 orders 集合查
          db.collection('orders').doc(id).get({
            success: function (res) {
              goodsList.push(res.data);
              loaded++;
              if (loaded + failed === ids.length) {
                that.finishLoading(goodsList);
              }
            },
            fail: function () {
              failed++;
              if (loaded + failed === ids.length) {
                that.finishLoading(goodsList);
              }
            }
          });
        },
        complete: function () {
          if (loaded + failed === ids.length && goodsList.length === 0) {
            wx.hideLoading();
          }
        }
      });
    });
  },

  // 完成加载，计算总价
  finishLoading: function (goodsList) {
    wx.hideLoading();
    if (goodsList.length === 0) {
      wx.showToast({ title: '未找到商品信息', icon: 'none' });
      return;
    }
    var that = this;
    var total = 0;
    var count = 0;
    goodsList.forEach(function (item) {
      // 如果是从商品详情页立即购买来的，使用传递的 quantity
      if (item.quantity === undefined && that.data.buyNowQuantity) {
        item.quantity = that.data.buyNowQuantity;
      }
      total += item.price * (item.quantity || 1);
      count += (item.quantity || 1);
    });

    this.setData({
      goodsList: goodsList,
      totalAmount: total.toFixed(2),
      totalCount: count,
      phone: goodsList[0].phone || '',
      pickTime: goodsList[0].pickTime || '',
      remark: goodsList[0].remark || '',
      deliveryMode: goodsList[0].deliveryMode || 'pickup'
    });
  },

  // 切换配送方式
  onDeliveryTap: function (e) {
    this.setData({ deliveryMode: e.currentTarget.dataset.mode });
  },

  // 电话输入
  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value });
  },

  // 选择取餐时间
  onPickTime: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['立即取餐', '1小时后', '2小时后', '3小时后'],
      success: function (res) {
        var times = ['立即取餐', '1小时后', '2小时后', '3小时后'];
        that.setData({ pickTime: times[res.tapIndex] });
      }
    });
  },

  // 填写留言
  onRemark: function () {
    var that = this;
    wx.showModal({
      title: '卡片留言',
      editable: true,
      placeholderText: '填写祝福语或特殊要求',
      success: function (res) {
        if (res.confirm && res.content) {
          that.setData({ remark: res.content });
        }
      }
    });
  },

  // 付款 — 弹出支付选择弹窗
  onPay: function () {
    if (!this.data.phone) {
      wx.showToast({ title: '请填写联系电话', icon: 'none' });
      return;
    }

    this.setData({ showPayModal: true });
  },

  // 阻止弹窗内容点击穿透
  stopPropagation: function () {},

  // 关闭弹窗
  onCloseModal: function () {
    this.setData({ showPayModal: false });
  },

  // 取消支付
  onCancelPay: function () {
    this.setData({ showPayModal: false });
    wx.showToast({ title: '支付已取消', icon: 'none' });
  },

  // 确认支付
  onConfirmPay: function () {
    var that = this;
    var db = wx.cloud.database();

    this.setData({ showPayModal: false });
    wx.showLoading({ title: '支付中...' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;
        var goodsList = that.data.goodsList;
        var successCount = 0;
        var orderIds = [];

        goodsList.forEach(function (item) {
          db.collection('orders').add({
            data: {
              openid: openid,
              goodsId: item.goodsId || item._id,
              cartId: item._id,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: item.quantity || 1,
              remark: that.data.remark,
              phone: that.data.phone,
              pickTime: that.data.pickTime,
              deliveryMode: that.data.deliveryMode,
              totalAmount: item.price * (item.quantity || 1),
              status: 'pending',
              createTime: db.serverDate()
            },
            success: function (addRes) {
              orderIds.push(addRes._id);
              successCount++;
              if (successCount === goodsList.length) {
                // 如果是从购物车来的，清空已结算的商品
                if (that.data.fromCart) {
                  var cartIds = goodsList.map(function (g) { return g._id; });
                  cartIds.forEach(function (cartId) {
                    db.collection('cart').doc(cartId).remove();
                  });
                }

                // 模拟支付延迟2秒
                setTimeout(function () {
                  wx.hideLoading();
                  // 生成取餐号（3-4位）
                  var orderNo = Math.floor(Math.random() * 900 + 100).toString();

                  wx.redirectTo({
                    url: '/pages/pay-success/pay-success?orderNo=' + orderNo + '&amount=' + that.data.totalAmount + '&orderIds=' + orderIds.join(',')
                  });
                }, 2000);
              }
            },
            fail: function () {
              wx.hideLoading();
              that.setData({ showPayFail: true });
            }
          });
        });
      },
      fail: function () {
        wx.hideLoading();
        that.setData({ showPayFail: true });
      }
    });
  },

  // 关闭失败弹窗
  onCloseFail: function () {
    this.setData({ showPayFail: false });
  },

  // 重新支付
  onRetryPay: function () {
    this.setData({ showPayFail: false });
    this.onPay();
  },

  // 补零
  padZero: function (n) {
    return n < 10 ? '0' + n : '' + n;
  }
})