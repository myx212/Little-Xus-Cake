// pages/goods-detail/goods-detail.js
Page({
  data: {
    goods: {},
    quantity: 1,
    remark: '',
    cartTotal: 0
  },

  onLoad: function (options) {
    // 接收商品id参数，从云数据库读取详情
    if (options.id) {
      this.loadGoodsDetail(options.id);
    }
  },

  onShow: function () {
    this.loadCartTotal();
  },

  // 加载购物车总数量
  loadCartTotal: function () {
    var that = this;
    var db = wx.cloud.database();

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        db.collection('cart')
          .where({ openid: openid })
          .count({
            success: function (countRes) {
              that.setData({ cartTotal: countRes.total });
            }
          });
      }
    });
  },

  // 加载商品详情
  loadGoodsDetail: function (id) {
    var that = this;
    var db = wx.cloud.database();

    wx.showLoading({ title: '加载中' });

    db.collection('goods')
      .doc(id)
      .get({
        success: function (res) {
          that.setData({
            goods: res.data
          });
          // 设置页面标题
          wx.setNavigationBarTitle({
            title: res.data.name
          });
        },
        fail: function (err) {
          console.error('加载商品详情失败:', err);
          wx.showToast({ title: '加载失败', icon: 'none' });
        },
        complete: function () {
          wx.hideLoading();
        }
      });
  },

  // 备注输入
  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value });
  },

  // 数量减少
  onQtyMinus: function () {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },

  // 数量增加
  onQtyPlus: function () {
    this.setData({ quantity: this.data.quantity + 1 });
  },

  // 加入购物车
  onAddCart: function () {
    var that = this;
    var goods = this.data.goods;
    var quantity = this.data.quantity;
    var db = wx.cloud.database();

    wx.showLoading({ title: '添加中' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        db.collection('cart')
          .where({
            openid: openid,
            goodsId: goods._id
          })
          .get({
            success: function (queryRes) {
              if (queryRes.data.length > 0) {
                // 已有商品，累加数量
                var cartId = queryRes.data[0]._id;
                db.collection('cart')
                  .doc(cartId)
                  .update({
                    data: {
                      quantity: db.command.inc(quantity),
                      updateTime: db.serverDate()
                    },
                    success: function () {
                      wx.showToast({ title: '已加入购物车', icon: 'success' });
                    },
                    fail: function () {
                      wx.showToast({ title: '添加失败', icon: 'none' });
                    },
                    complete: function () {
                      wx.hideLoading();
                    }
                  });
              } else {
                // 新增购物车记录
                db.collection('cart')
                  .add({
                    data: {
                      openid: openid,
                      goodsId: goods._id,
                      name: goods.name,
                      price: goods.price,
                      image: goods.image,
                      quantity: quantity,
                      createTime: db.serverDate(),
                      updateTime: db.serverDate()
                    },
                    success: function () {
                      wx.showToast({ title: '已加入购物车', icon: 'success' });
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
  },

  // 分享
  onShare: function () {
    wx.showToast({ title: '分享功能开发中', icon: 'none' });
  },

  // 跳转购物车
  onGoCart: function () {
    wx.navigateTo({
      url: '/pages/cart/cart'
    });
  },

  // 立即购买
  onBuyNow: function () {
    // 跳转到确认订单页，传递当前商品ID和数量
    var goodsId = this.data.goods._id;
    var quantity = this.data.quantity;
    wx.navigateTo({
      url: '/pages/confirm-order/confirm-order?goodsId=' + goodsId + '&quantity=' + quantity
    });
  }
})