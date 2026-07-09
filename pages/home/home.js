// pages/home/home.js
Page({
  data: {},

  onLoad: function () {},

  // 会员充值
  onMemberRecharge: function () {
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/login/login' });
      }, 1500);
      return;
    }

    wx.navigateTo({
      url: '/pages/recharge/recharge'
    });
  },

  // 会员积分 → 跳转积分商城
  onMemberPoints: function () {
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/login/login' });
      }, 1500);
      return;
    }

    wx.navigateTo({
      url: '/pages/points/points'
    });
  },

  // 功能按钮点击
  onFuncTap: function (e) {
    var type = e.currentTarget.dataset.type;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    // 未登录拦截
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/login/login' });
      }, 1500);
      return;
    }

    // 根据类型跳转到订单页，传递模式参数
    var modeMap = {
      'dineIn': 'dineIn',
      'pickUp': 'pickUp',
      'deliver': 'delivery'
    };

    wx.navigateTo({
      url: '/pages/order/order?mode=' + modeMap[type]
    });
  },

  // AI 点餐
  onAiOrder: function () {
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/login/login' });
      }, 1500);
      return;
    }

    wx.navigateTo({
      url: '/pages/ai-order/ai-order'
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    var that = this;
    // 刷新购物车角标
    var app = getApp();
    var userInfo = app.globalData.userInfo;
    if (userInfo && userInfo.openid) {
      wx.cloud.callFunction({
        name: 'getGoodsList',
        data: { action: 'cartCount', openid: userInfo.openid },
        success: function (res) {
          if (res.result.code === 0) {
            that.setData({ cartTotal: res.result.data.total });
          }
        },
        complete: function () {
          wx.stopPullDownRefresh();
        }
      });
    } else {
      wx.stopPullDownRefresh();
    }
  }
})