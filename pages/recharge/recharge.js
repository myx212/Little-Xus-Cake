// pages/recharge/recharge.js
Page({
  data: {
    balance: 0,
    selectedAmount: 0,
    selectedBonus: 0,
    rechargePlans: [
      { amount: 50, bonus: 0 },
      { amount: 100, bonus: 10 },
      { amount: 200, bonus: 30 },
      { amount: 300, bonus: 50 },
      { amount: 500, bonus: 100 },
      { amount: 1000, bonus: 250 }
    ]
  },

  onLoad: function () {
    this.loadBalance();
  },

  // 加载余额
  loadBalance: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    var db = wx.cloud.database();
    db.collection('contact').where({
      openid: userInfo.openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          that.setData({ balance: res.data[0].balance || 0 });
        }
      }
    });
  },

  // 选择充值档位
  onSelectPlan: function (e) {
    this.setData({
      selectedAmount: e.currentTarget.dataset.amount,
      selectedBonus: e.currentTarget.dataset.bonus
    });
  },

  // 充值支付
  onPay: function () {
    var that = this;
    if (this.data.selectedAmount <= 0) {
      wx.showToast({ title: '请选择充值金额', icon: 'none' });
      return;
    }

    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认充值',
      content: '充值 ¥' + this.data.selectedAmount + (this.data.selectedBonus > 0 ? '，赠送 ¥' + this.data.selectedBonus : '') + '，确认支付吗？',
      confirmColor: '#C4956A',
      success: function (res) {
        if (res.confirm) {
          that.doRecharge(userInfo.openid);
        }
      }
    });
  },

  // 执行充值
  doRecharge: function (openid) {
    var that = this;
    var db = wx.cloud.database();
    var amount = this.data.selectedAmount;
    var bonus = this.data.selectedBonus;
    var totalAmount = amount + bonus;

    wx.showLoading({ title: '充值中...' });

    db.collection('contact').where({
      openid: openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          var currentBalance = res.data[0].balance || 0;
          var currentPoints = res.data[0].points || 0;

          db.collection('contact').doc(res.data[0]._id).update({
            data: {
              balance: currentBalance + totalAmount,
              points: currentPoints + amount,
              lastRecharge: db.serverDate()
            },
            success: function () {
              // 记录充值记录
              db.collection('recharge_records').add({
                data: {
                  openid: openid,
                  amount: amount,
                  bonus: bonus,
                  totalAmount: totalAmount,
                  points: amount,
                  createTime: db.serverDate()
                }
              });

              wx.hideLoading();
              wx.showToast({ title: '充值成功', icon: 'success' });

              that.setData({
                balance: currentBalance + totalAmount,
                selectedAmount: 0,
                selectedBonus: 0
              });
            },
            fail: function () {
              wx.hideLoading();
              wx.showToast({ title: '充值失败', icon: 'none' });
            }
          });
        }
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '充值失败', icon: 'none' });
      }
    });
  }
})