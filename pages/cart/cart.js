// pages/cart/cart.js
Page({
  data: {
    cartList: [],
    allChecked: false,
    totalAmount: '0.00',
    checkedCount: 0,
    couponUsed: false,
    couponDiscount: 0,
    finalAmount: '0.00',
    couponName: '',
    couponThreshold: 0,
    couponReduce: 0,
    couponId: '',
    hasCoupon: false
  },

  onShow: function () {
    this.loadCartList();
    this.loadCoupon();
  },

  // 加载购物车列表（调用 getCartList 云函数）
  loadCartList: function () {
    var that = this;

    wx.showLoading({ title: '加载中' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        wx.cloud.callFunction({
          name: 'getCartList',
          data: { action: 'list', openid: openid },
          success: function (queryRes) {
            if (queryRes.result.code === 0) {
              var list = queryRes.result.data.map(function (item) {
                return {
                  _id: item._id,
                  goodsId: item.goodsId,
                  name: item.name,
                  price: item.price,
                  image: item.image,
                  quantity: item.quantity,
                  totalPrice: (item.price * item.quantity).toFixed(2),
                  checked: false
                };
              });

              that.setData({ cartList: list });
              that.calcTotal();
            } else {
              wx.showToast({ title: '加载失败', icon: 'none' });
            }
          },
          fail: function (err) {
            console.error('加载购物车失败:', err);
            wx.showToast({ title: '加载失败', icon: 'none' });
          },
          complete: function () {
            wx.hideLoading();
          }
        });
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
      }
    });
  },

  // 加载可用优惠券
  loadCoupon: function () {
    var that = this;
    var db = wx.cloud.database();

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        db.collection('coupons')
          .where({ openid: openid, status: 'unused' })
          .orderBy('createTime', 'desc')
          .get({
            success: function (queryRes) {
              if (queryRes.data.length > 0) {
                var coupon = queryRes.data[0];
                that.setData({
                  hasCoupon: true,
                  couponId: coupon._id,
                  couponName: coupon.name || '满减券',
                  couponThreshold: coupon.threshold || 0,
                  couponReduce: coupon.reduce || 0
                });
              } else {
                that.setData({ hasCoupon: false });
              }
            }
          });
      }
    });
  },

  // 切换单个商品选中
  onToggleCheck: function (e) {
    var id = e.currentTarget.dataset.id;
    var list = this.data.cartList;

    for (var i = 0; i < list.length; i++) {
      if (list[i]._id === id) {
        list[i].checked = !list[i].checked;
        break;
      }
    }

    this.setData({ cartList: list });
    this.calcTotal();
  },

  // 全选/取消全选
  onToggleAll: function () {
    var allChecked = !this.data.allChecked;
    var list = this.data.cartList;

    for (var i = 0; i < list.length; i++) {
      list[i].checked = allChecked;
    }

    this.setData({ cartList: list, allChecked: allChecked });
    this.calcTotal();
  },

  // 数量增加
  onQtyPlus: function (e) {
    var id = e.currentTarget.dataset.id;
    this.updateQty(id, 1);
  },

  // 数量减少
  onQtyMinus: function (e) {
    var id = e.currentTarget.dataset.id;
    var list = this.data.cartList;

    for (var i = 0; i < list.length; i++) {
      if (list[i]._id === id && list[i].quantity > 1) {
        this.updateQty(id, -1);
        break;
      }
    }
  },

  // 更新数量到云数据库
  updateQty: function (id, delta) {
    var that = this;
    var db = wx.cloud.database();

    db.collection('cart')
      .doc(id)
      .update({
        data: {
          quantity: db.command.inc(delta),
          updateTime: db.serverDate()
        },
        success: function () {
          that.loadCartList();
        },
        fail: function () {
          wx.showToast({ title: '更新失败', icon: 'none' });
        }
      });
  },

  // 计算总价和选中数量
  calcTotal: function () {
    var list = this.data.cartList;
    var total = 0;
    var count = 0;
    var allChecked = true;

    for (var i = 0; i < list.length; i++) {
      if (list[i].checked) {
        total += list[i].price * list[i].quantity;
        count += list[i].quantity;
      }
      if (!list[i].checked) {
        allChecked = false;
      }
    }

    // 计算优惠券减免
    var couponDiscount = 0;
    if (this.data.couponUsed && total >= this.data.couponThreshold) {
      couponDiscount = this.data.couponReduce;
    }

    var finalAmount = total - couponDiscount;
    if (finalAmount < 0) finalAmount = 0;

    this.setData({
      totalAmount: total.toFixed(2),
      checkedCount: count,
      allChecked: list.length > 0 ? allChecked : false,
      couponDiscount: couponDiscount,
      finalAmount: finalAmount.toFixed(2)
    });
  },

  // 使用优惠券
  onUseCoupon: function () {
    var total = parseFloat(this.data.totalAmount);

    if (total < this.data.couponThreshold) {
      wx.showToast({
        title: '满¥' + this.data.couponThreshold + '可用',
        icon: 'none'
      });
      return;
    }

    this.setData({ couponUsed: true });
    this.calcTotal();
    wx.showToast({
      title: '已减¥' + this.data.couponReduce,
      icon: 'success'
    });
  },

  // 取消使用优惠券
  onCancelCoupon: function () {
    this.setData({ couponUsed: false });
    this.calcTotal();
  },

  // 切换优惠券使用状态
  onToggleCoupon: function () {
    if (this.data.couponUsed) {
      this.onCancelCoupon();
    } else {
      this.onUseCoupon();
    }
  },

  // 去结算
  onCheckout: function () {
    var list = this.data.cartList;

    // 获取选中的商品
    var checkedItems = list.filter(function (item) { return item.checked; });

    if (checkedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    // 跳转到确认订单页，传递选中的购物车ID和优惠券信息
    var ids = checkedItems.map(function (item) { return item._id; }).join(',');
    var url = '/pages/confirm-order/confirm-order?ids=' + ids;
    if (this.data.couponUsed) {
      url += '&couponDiscount=' + this.data.couponDiscount;
      url += '&couponId=' + this.data.couponId;
    }
    wx.navigateTo({
      url: url
    });
  },

  // 跳转商品详情
  onGoDetail: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/goods-detail/goods-detail?id=' + id
    });
  },

  // 去点餐
  onGoOrder: function () {
    wx.redirectTo({
      url: '/pages/order/order'
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadCartList();
    this.loadCoupon();
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 800);
  }
})
