// pages/ai-pay-success/ai-pay-success.js
Page({
  data: {
    orderNo: '',
    amount: '0.00',
    orderIds: []
  },

  onLoad: function (options) {
    this.setData({
      orderNo: options.orderNo || '',
      amount: options.amount || '0.00',
      orderIds: options.orderIds ? options.orderIds.split(',') : []
    });
  },

  onViewOrder: function () {
    wx.redirectTo({
      url: '/pages/order-list/order-list'
    });
  },

  onBackHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
