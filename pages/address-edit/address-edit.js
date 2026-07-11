// pages/address-edit/address-edit.js
Page({
  data: {
    selectedName: '',
    selectedAddress: '',
    selectedLongitude: 0,
    selectedLatitude: 0,
    detailAddress: '',
    contactName: '',
    gender: '先生',
    phone: '',
    tag: '家',
    isDefault: false,
    editId: ''
  },

  onLoad: function (options) {
    if (options.name) {
      this.setData({
        selectedName: decodeURIComponent(options.name),
        selectedAddress: decodeURIComponent(options.address),
        selectedLongitude: parseFloat(options.longitude),
        selectedLatitude: parseFloat(options.latitude)
      });
    }
    if (options.id) {
      this.setData({ editId: options.id });
      this.loadAddress(options.id);
    }
  },

  // 更换地址
  onChangeAddress: function () {
    wx.navigateTo({ url: '/pages/address-map/address-map?from=edit' });
  },

  // 详细地址输入
  onDetailInput: function (e) {
    this.setData({ detailAddress: e.detail.value });
  },

  // 联系人输入
  onContactInput: function (e) {
    this.setData({ contactName: e.detail.value });
  },

  // 性别选择
  onGenderTap: function (e) {
    this.setData({ gender: e.currentTarget.dataset.gender });
  },

  // 手机号输入
  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value });
  },

  // 标签选择
  onTagTap: function (e) {
    this.setData({ tag: e.currentTarget.dataset.tag });
  },

  // 默认地址开关
  onToggleDefault: function () {
    this.setData({ isDefault: !this.data.isDefault });
  },

  // 保存
  onSave: function () {
    var that = this;

    if (!that.data.selectedName) {
      wx.showToast({ title: '请选择地址', icon: 'none' });
      return;
    }
    if (!that.data.contactName) {
      wx.showToast({ title: '请填写联系人', icon: 'none' });
      return;
    }
    if (!that.data.phone || that.data.phone.length !== 11) {
      wx.showToast({ title: '请填写正确的手机号', icon: 'none' });
      return;
    }

    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    var db = wx.cloud.database();
    var addressData = {
      openid: userInfo.openid,
      name: that.data.selectedName,
      address: that.data.selectedAddress,
      detail: that.data.detailAddress,
      contactName: that.data.contactName,
      gender: that.data.gender,
      phone: that.data.phone,
      tag: that.data.tag,
      isDefault: that.data.isDefault,
      longitude: that.data.selectedLongitude,
      latitude: that.data.selectedLatitude,
      updateTime: db.serverDate()
    };

    if (that.data.editId) {
      db.collection('addresses').doc(that.data.editId).update({
        data: addressData,
        success: function () {
          wx.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(function () {
            wx.navigateBack();
          }, 1000);
        },
        fail: function (err) {
          console.error('更新失败:', err);
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      });
    } else {
      addressData.createTime = db.serverDate();
      db.collection('addresses').add({
        data: addressData,
        success: function () {
          wx.showToast({ title: '添加成功', icon: 'success' });
          setTimeout(function () {
            wx.navigateBack();
          }, 1000);
        },
        fail: function (err) {
          console.error('添加失败:', err);
          wx.showToast({ title: '添加失败', icon: 'none' });
        }
      });
    }
  },

  // 加载地址（编辑模式）
  loadAddress: function (id) {
    var that = this;
    var db = wx.cloud.database();
    db.collection('addresses').doc(id).get({
      success: function (res) {
        var addr = res.data;
        that.setData({
          selectedName: addr.name || '',
          selectedAddress: addr.address || '',
          selectedLongitude: addr.longitude || 0,
          selectedLatitude: addr.latitude || 0,
          detailAddress: addr.detail || '',
          contactName: addr.contactName || '',
          gender: addr.gender || '先生',
          phone: addr.phone || '',
          tag: addr.tag || '家',
          isDefault: addr.isDefault || false
        });
      }
    });
  }
})