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

  // 加载购物车总数量（调用 getGoodsList 云函数）
  loadCartTotal: function () {
    var that = this;

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        wx.cloud.callFunction({
          name: 'getGoodsList',
          data: { action: 'cartCount', openid: openid },
          success: function (countRes) {
            if (countRes.result.code === 0) {
              that.setData({ cartTotal: countRes.result.data.total });
            }
          }
        });
      }
    });
  },

  // 加载商品详情（调用 getGoodsList 云函数）
  loadGoodsDetail: function (id) {
    var that = this;

    wx.showLoading({ title: '加载中' });

    wx.cloud.callFunction({
      name: 'getGoodsList',
      data: { action: 'detail', id: id },
      success: function (res) {
        if (res.result.code === 0) {
          that.setData({ goods: res.result.data });
          wx.setNavigationBarTitle({ title: res.result.data.name });
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
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

  // 加入购物车（调用 getCartList 云函数）
  onAddCart: function () {
    var that = this;
    var goods = this.data.goods;
    var quantity = this.data.quantity;

    wx.showLoading({ title: '添加中' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        wx.cloud.callFunction({
          name: 'getCartList',
          data: {
            action: 'add',
            openid: openid,
            item: {
              goodsId: goods._id,
              name: goods.name,
              price: goods.price,
              image: goods.image,
              quantity: quantity,
              remark: that.data.remark || ''
            }
          },
          success: function (cartRes) {
            if (cartRes.result.code === 0) {
              wx.showToast({ title: '已加入购物车', icon: 'success' });
              // 刷新购物车角标
              that.loadCartTotal();
            } else {
              wx.showToast({ title: '添加失败', icon: 'none' });
            }
          },
          fail: function () {
            wx.showToast({ title: '添加失败', icon: 'none' });
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
    var goodsId = this.data.goods._id;
    var quantity = this.data.quantity;
    var remark = this.data.remark || '';
    wx.navigateTo({
      url: '/pages/confirm-order/confirm-order?goodsId=' + goodsId + '&quantity=' + quantity + '&remark=' + encodeURIComponent(remark)
    });
  }
})