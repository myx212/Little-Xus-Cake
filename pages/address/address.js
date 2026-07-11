// pages/address/address.js
Page({
  data: {
    addressList: [],
    isSelectMode: false
  },

  onLoad: function (options) {
    // 如果是选择模式（从确认订单页进入）
    if (options.select === '1') {
      this.setData({ isSelectMode: true });
    }
  },

  onShow: function () {
    this.loadAddresses();
  },

  // 加载地址列表
  loadAddresses: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    var db = wx.cloud.database();
    db.collection('addresses').where({
      openid: userInfo.openid
    }).orderBy('isDefault', 'desc').orderBy('createTime', 'desc').get({
      success: function (res) {
        that.setData({ addressList: res.data });
      }
    });
  },

  // 添加地址
  onAddAddress: function () {
    wx.navigateTo({ url: '/pages/address-map/address-map' });
  },

  // 选择地址（选择模式下使用）
  onSelectAddress: function (e) {
    var address = e.currentTarget.dataset.address;
    var app = getApp();
    // 将选中的地址存入全局变量
    app.globalData.selectedAddress = address;
    // 返回上一页
    wx.navigateBack();
  },

  // 编辑地址
  onEditAddress: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/address-edit/address-edit?id=' + id });
  },

  // 设为默认地址
  onSetDefault: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var db = wx.cloud.database();

    // 先取消所有默认
    db.collection('addresses').where({ openid: getApp().globalData.userInfo.openid }).get({
      success: function (res) {
        res.data.forEach(function (item) {
          if (item._id !== id && item.isDefault) {
            db.collection('addresses').doc(item._id).update({ data: { isDefault: false } });
          }
        });
        db.collection('addresses').doc(id).update({
          data: { isDefault: true },
          success: function () {
            that.loadAddresses();
          }
        });
      }
    });
  },

  // 删除地址
  onDeleteAddress: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var db = wx.cloud.database();

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      confirmColor: '#C4956A',
      success: function (res) {
        if (res.confirm) {
          db.collection('addresses').doc(id).remove({
            success: function () {
              wx.showToast({ title: '已删除', icon: 'success' });
              that.loadAddresses();
            }
          });
        }
      }
    });
  }
})