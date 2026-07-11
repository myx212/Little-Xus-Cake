// pages/profile/profile.js
var QRCode = require('../../utils/qrcode.js');

Page({
  data: {
    nickname: '',
    avatar: '',
    phone: '',
    openid: '',
    balance: '0.00',
    couponCount: 0,
    showMemberCode: false,
    showNicknameEdit: false,
    editNickname: '',
    memberId: ''
  },

  onShow: function () {
    this.loadUserInfo();
    this.loadBalance();
    this.loadCouponCount();
  },

  // 加载用户信息
  loadUserInfo: function () {
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (userInfo && userInfo.openid) {
      this.setData({
        nickname: userInfo.nickname || '',
        avatar: userInfo.avatar || '',
        phone: userInfo.phone || '',
        openid: userInfo.openid
      });
    } else {
      // 未登录，跳转登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  },

  // 加载钱包余额
  loadBalance: function () {
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
          that.setData({ balance: (res.data[0].balance || 0).toFixed(2) });
        }
      }
    });
  },

  // 加载优惠券数量
  loadCouponCount: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) return;

    var db = wx.cloud.database();
    db.collection('coupons').where({
      openid: userInfo.openid,
      status: 'unused'
    }).count({
      success: function (res) {
        that.setData({ couponCount: res.total });
      }
    });
  },

  // 点击昵称，弹出修改框
  onEditNickname: function () {
    this.setData({
      showNicknameEdit: true,
      editNickname: this.data.nickname
    });
  },

  // 昵称输入
  onEditNicknameInput: function (e) {
    this.setData({ editNickname: e.detail.value });
  },

  // 关闭昵称编辑
  onCloseNicknameEdit: function () {
    this.setData({ showNicknameEdit: false });
  },

  // 确认修改昵称
  onConfirmNickname: function () {
    var that = this;
    var newNickname = this.data.editNickname.trim();
    if (!newNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (newNickname.length > 20) {
      wx.showToast({ title: '昵称不能超过20个字符', icon: 'none' });
      return;
    }

    var db = wx.cloud.database();
    db.collection('contact').where({
      openid: this.data.openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          db.collection('contact').doc(res.data[0]._id).update({
            data: {
              nickname: newNickname,
              updateTime: db.serverDate()
            },
            success: function () {
              var app = getApp();
              app.globalData.userInfo.nickname = newNickname;
              that.setData({
                nickname: newNickname,
                showNicknameEdit: false
              });
              wx.showToast({ title: '昵称已修改', icon: 'success' });
            },
            fail: function () {
              wx.showToast({ title: '修改失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 选择/更换头像
  onChooseAvatar: function () {
    var that = this;
    var db = wx.cloud.database();

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var filePath = res.tempFilePaths[0];

        wx.showLoading({ title: '上传中...' });

        // 上传到云存储
        var cloudPath = 'avatars/' + that.data.openid + '_' + Date.now() + '.png';
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: filePath,
          success: function (uploadRes) {
            var fileID = uploadRes.fileID;

            // 更新contact集合中的头像
            db.collection('contact').where({
              openid: that.data.openid
            }).get({
              success: function (queryRes) {
                if (queryRes.data.length > 0) {
                  db.collection('contact').doc(queryRes.data[0]._id).update({
                    data: {
                      avatar: fileID,
                      updateTime: db.serverDate()
                    },
                    success: function () {
                      // 更新全局数据
                      var app = getApp();
                      app.globalData.userInfo.avatar = fileID;

                      that.setData({ avatar: fileID });
                      wx.hideLoading();
                      wx.showToast({ title: '头像已更新', icon: 'success' });
                    }
                  });
                }
              }
            });
          },
          fail: function () {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      }
    });
  },

  // 跳转订单页
  onGoOrders: function () {
    wx.navigateTo({
      url: '/pages/order-list/order-list'
    });
  },

  // 菜单点击
  onMenuTap: function (e) {
    var type = e.currentTarget.dataset.type;
    switch (type) {
      case 'focus':
        wx.navigateTo({ url: '/pages/stamp/stamp' });
        break;
      case 'address':
        wx.navigateTo({ url: '/pages/address/address' });
        break;
      case 'points':
        wx.navigateTo({ url: '/pages/points/points' });
        break;
    }
  },

  // 显示会员码弹窗
  onShowMemberCode: function () {
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/login/login' });
      }, 1500);
      return;
    }

    // 生成会员号（取openid后6位）
    var memberId = 'XU' + userInfo.openid.slice(-6).toUpperCase();

    this.setData({
      showMemberCode: true,
      memberId: memberId,
      qrSize: 200
    });

    // 延迟绘制二维码，确保canvas已渲染
    var that = this;
    setTimeout(function () {
      that.drawQRCode(userInfo.openid);
    }, 500);
  },

  // 关闭会员码弹窗
  onCloseMemberCode: function () {
    this.setData({ showMemberCode: false });
  },

  // 绘制二维码
  drawQRCode: function (content) {
    var that = this;

    wx.getSystemInfo({
      success: function (sysInfo) {
        // 400rpx 转逻辑像素（canvas style 和绘制坐标都用逻辑像素）
        var logicalSize = Math.round(400 / 750 * sysInfo.windowWidth);

        that.setData({ qrSize: logicalSize });

        setTimeout(function () {
          QRCode.create(content, logicalSize, 'memberQrcode');
        }, 300);
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadUserInfo();
    this.loadBalance();
    this.loadCouponCount();
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 800);
  }
})