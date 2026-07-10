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
    orderIds: [],
    walletBalance: '0.00',
    payMethod: 'wechat', // 'wechat' 或 'wallet'
    needWechatPay: false,
    wechatPayAmount: '0.00',
    deliveryAddress: null,
    deliveryFee: 0,
    finalAmount: '0.00'
  },

  onLoad: function (options) {
    // 接收参数：ids（购物车ID列表）或 goodsId（商品ID，来自详情页立即购买）
    if (options.ids) {
      var ids = options.ids.split(',');
      this.setData({ fromCart: true });
      this.loadGoods(ids, 'cart');
    } else if (options.goodsId) {
      this.setData({ buyNowQuantity: parseInt(options.quantity) || 1 });
      // 接收商品详情页的备注
      if (options.remark) {
        this.setData({ remark: decodeURIComponent(options.remark) });
      }
      this.loadGoods([options.goodsId], 'goods');
    }
    // 如果默认是外卖模式，加载默认地址
    if (this.data.deliveryMode === 'deliver') {
      this.loadDefaultAddress();
    }
  },

  onShow: function () {
    // 从地址页返回时，检查是否选择了地址
    var app = getApp();
    if (app.globalData.selectedAddress) {
      this.setData({ deliveryAddress: app.globalData.selectedAddress });
      app.globalData.selectedAddress = null;
      // 计算配送费
      this.calculateDeliveryFee();
    }
  },

  // 计算配送费
  calculateDeliveryFee: function () {
    // 简单配送费逻辑：3公里内5元，每增加1公里加2元
    var fee = 5;
    this.setData({ deliveryFee: fee });
    this.calculateFinalAmount();
  },

  // 加载商品详情（调用 getGoodsList / createOrder 云函数）
  loadGoods: function (ids, type) {
    var that = this;

    wx.showLoading({ title: '加载中' });

    var goodsList = [];
    var loaded = 0;
    var failed = 0;
    var total = ids.length;

    ids.forEach(function (id) {
      var action = type === 'cart' ? 'cartList' : 'detail';
      var callData = type === 'cart'
        ? { action: 'cartList', openid: getApp().globalData.userInfo ? getApp().globalData.userInfo.openid : '' }
        : { action: 'detail', id: id };

      // 对于 cart 类型，先获取 openid 再调用
      if (type === 'cart') {
        wx.cloud.callFunction({
          name: 'getUserOpenid',
          success: function (openRes) {
            var openid = openRes.result.openid;
            wx.cloud.callFunction({
              name: 'getGoodsList',
              data: { action: 'cartList', openid: openid },
              success: function (res) {
                if (res.result.code === 0) {
                  // 从返回的列表中筛选匹配的 id
                  var matched = res.result.data.filter(function (item) {
                    return ids.indexOf(item._id) !== -1;
                  });
                  matched.forEach(function (item) {
                    goodsList.push(item);
                  });
                }
                loaded++;
                if (loaded + failed === total) {
                  that.finishLoading(goodsList);
                }
              },
              fail: function () {
                failed++;
                if (loaded + failed === total) {
                  that.finishLoading(goodsList);
                }
              }
            });
          },
          fail: function () {
            failed++;
            if (loaded + failed === total) {
              that.finishLoading(goodsList);
            }
          }
        });
      } else {
        // goods 类型，直接查详情
        wx.cloud.callFunction({
          name: 'getGoodsList',
          data: { action: 'detail', id: id },
          success: function (res) {
            if (res.result.code === 0) {
              goodsList.push(res.result.data);
            }
            loaded++;
            if (loaded + failed === total) {
              that.finishLoading(goodsList);
            }
          },
          fail: function () {
            // 尝试从订单中查
            wx.cloud.callFunction({
              name: 'createOrder',
              data: { action: 'detail', id: id },
              success: function (orderRes) {
                if (orderRes.result.code === 0) {
                  goodsList.push(orderRes.result.data);
                }
                loaded++;
                if (loaded + failed === total) {
                  that.finishLoading(goodsList);
                }
              },
              fail: function () {
                failed++;
                if (loaded + failed === total) {
                  that.finishLoading(goodsList);
                }
              }
            });
          }
        });
      }
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

    // 加载钱包余额
    that.loadWalletBalance();
  },

  // 加载钱包余额
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

  // 切换配送方式
  onDeliveryTap: function (e) {
    var mode = e.currentTarget.dataset.mode;
    this.setData({ deliveryMode: mode });
    // 切换到外卖时，加载默认地址并计算配送费
    if (mode === 'deliver') {
      this.loadDefaultAddress();
    }
    // 重新计算总价
    this.calculateFinalAmount();
  },

  // 加载默认地址
  loadDefaultAddress: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.openid) return;

    var db = wx.cloud.database();
    db.collection('addresses').where({
      openid: userInfo.openid,
      isDefault: true
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          that.setData({ deliveryAddress: res.data[0] });
        }
      }
    });
  },

  // 选择配送地址
  onSelectAddress: function () {
    wx.navigateTo({
      url: '/pages/address/address?select=1'
    });
  },

  // 计算最终金额（商品总价 + 配送费）
  calculateFinalAmount: function () {
    var totalAmount = parseFloat(this.data.totalAmount);
    var deliveryFee = this.data.deliveryMode === 'deliver' ? this.data.deliveryFee : 0;
    var finalAmount = totalAmount + deliveryFee;

    this.setData({
      finalAmount: finalAmount.toFixed(2)
    });
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
    // 外卖模式使用地址中的电话，自取模式需要联系电话
    var phone = this.data.phone;
    if (this.data.deliveryMode === 'deliver' && this.data.deliveryAddress) {
      phone = this.data.deliveryAddress.phone;
    }
    if (!phone) {
      wx.showToast({ title: '请填写联系电话', icon: 'none' });
      return;
    }
    // 手机号格式校验：1开头，11位数字
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    // 外卖模式需要选择地址
    if (this.data.deliveryMode === 'deliver' && !this.data.deliveryAddress) {
      wx.showToast({ title: '请选择配送地址', icon: 'none' });
      return;
    }

    // 计算微信支付金额（使用 finalAmount）
    var totalAmount = parseFloat(this.data.finalAmount);
    var walletBalance = parseFloat(this.data.walletBalance);
    var wechatPayAmount = Math.max(0, totalAmount - walletBalance);

    this.setData({
      showPayModal: true,
      wechatPayAmount: wechatPayAmount.toFixed(2),
      needWechatPay: wechatPayAmount > 0
    });
  },

  // 选择支付方式
  onSelectPayMethod: function (e) {
    var method = e.currentTarget.dataset.method;
    this.setData({ payMethod: method });
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

  // 确认支付（优先 createMulti 单订单多商品，失败自动降级到 batchCreate）
  onConfirmPay: function () {
    var that = this;

    this.setData({ showPayModal: false });
    wx.showLoading({ title: '支付中...' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;
        var goodsList = that.data.goodsList;

        // 外卖模式使用地址中的电话
        var orderPhone = that.data.phone;
        if (that.data.deliveryMode === 'deliver' && that.data.deliveryAddress) {
          orderPhone = that.data.deliveryAddress.phone || that.data.phone;
        }

        // 构造 createMulti 格式参数
        var goodsItems = goodsList.map(function (item) {
          return {
            goodsId: item.goodsId || item._id,
            cartId: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity || 1,
            remark: item.remark || ''
          };
        });

        var multiOrderData = {
          goodsList: goodsItems,
          remark: that.data.remark || '',
          phone: orderPhone,
          pickTime: that.data.pickTime,
          deliveryMode: that.data.deliveryMode,
          deliveryAddress: that.data.deliveryAddress ? {
            contactName: that.data.deliveryAddress.contactName,
            phone: that.data.deliveryAddress.phone,
            address: that.data.deliveryAddress.address
          } : null,
          deliveryFee: that.data.deliveryFee
        };

        // 构造 batchCreate 格式参数（降级使用）
        var batchOrderData = goodsList.map(function (item) {
          var itemRemark = item.remark || that.data.remark || '';
          return {
            goodsId: item.goodsId || item._id,
            cartId: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity || 1,
            remark: itemRemark,
            phone: orderPhone,
            pickTime: that.data.pickTime,
            deliveryMode: that.data.deliveryMode,
            deliveryAddress: that.data.deliveryAddress ? {
              contactName: that.data.deliveryAddress.contactName,
              phone: that.data.deliveryAddress.phone,
              address: that.data.deliveryAddress.address
            } : null,
            deliveryFee: that.data.deliveryFee
          };
        });

        // 公共：订单创建成功后的后续处理
        var handleSuccess = function (orderResBatch, orderIds) {
          // 如果是从购物车来的，清空已结算的商品
          if (that.data.fromCart) {
            var cartIds = goodsList.map(function (g) { return g._id; });
            cartIds.forEach(function (cartId) {
              wx.cloud.callFunction({
                name: 'getCartList',
                data: { action: 'remove', id: cartId }
              });
            });
          }

          // 如果使用钱包支付，扣除余额
          if (that.data.payMethod === 'wallet') {
            that.deductWalletBalance(openid, function () {
              that.goToPaySuccess(orderResBatch, orderIds);
            });
          } else {
            that.goToPaySuccess(orderResBatch, orderIds);
          }
        };

        // 降级方案：batchCreate
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
                handleSuccess(fallbackRes, fallbackRes.result.data.orderIds);
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
              var fakeBatchRes = {
                result: {
                  data: {
                    orderNos: orderNo ? [orderNo] : []
                  }
                }
              };
              handleSuccess(fakeBatchRes, orderIds);
            } else {
              // createMulti 失败（大概率是云函数还没上传，未知action）→ 自动降级 batchCreate
              fallbackBatchCreate();
            }
          },
          fail: function () {
            // 网络等失败也降级
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

  // 扣除钱包余额
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
              // 更新全局用户信息
              var app = getApp();
              app.globalData.userInfo.balance = walletBalance - deductAmount;
              callback();
            },
            fail: function () {
              wx.hideLoading();
              wx.showToast({ title: '扣款失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 跳转到支付成功页
  goToPaySuccess: function (orderRes, orderIds) {
    var that = this;
    setTimeout(function () {
      wx.hideLoading();
      var orderNos = orderRes.result.data.orderNos || [];
      var orderNo = orderNos[0] || Math.floor(Math.random() * 900 + 100).toString();

      var url = '/pages/pay-success/pay-success?orderNo=' + orderNo + '&amount=' + that.data.finalAmount + '&orderIds=' + orderIds.join(',') + '&pickTime=' + encodeURIComponent(that.data.pickTime) + '&deliveryMode=' + that.data.deliveryMode;
      if (that.data.deliveryMode === 'deliver' && that.data.deliveryAddress) {
        url += '&deliveryAddress=' + encodeURIComponent(that.data.deliveryAddress.contactName + ' ' + that.data.deliveryAddress.phone + ' ' + that.data.deliveryAddress.address);
      }
      wx.redirectTo({ url: url });
    }, 2000);
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