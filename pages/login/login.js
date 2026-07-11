// pages/login/login.js
Page({
  data: {
    showNicknameInput: false,
    tempNickname: '',
    tempAvatar: ''
  },

  onLoad: function () {
    // 检查是否已登录
    var app = getApp();
    if (app.globalData.userInfo && app.globalData.userInfo.openid) {
      wx.redirectTo({
        url: '/pages/home/home'
      });
    }
  },

  // 选择头像（通过 button open-type="chooseAvatar"）
  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    this.setData({
      tempAvatar: avatarUrl,
      showNicknameInput: true,
      tempNickname: ''
    });
  },

  // 昵称输入
  onNicknameInput: function (e) {
    this.setData({ tempNickname: e.detail.value });
  },

  // 关闭弹窗
  onCloseNickname: function () {
    this.setData({ showNicknameInput: false });
  },

  // 确认登录
  onConfirmLogin: function () {
    var that = this;
    var nickname = this.data.tempNickname.trim() || '微信用户';
    var avatar = this.data.tempAvatar;
    var db = wx.cloud.database();

    this.setData({ showNicknameInput: false });
    wx.showLoading({ title: '登录中...' });

    // 获取openid
    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        // 查询contact集合
        db.collection('contact').where({
          openid: openid
        }).get({
          success: function (queryRes) {
            if (queryRes.data.length > 0) {
              // 已存在，更新
              db.collection('contact').doc(queryRes.data[0]._id).update({
                data: {
                  nickname: nickname,
                  avatar: avatar,
                  updateTime: db.serverDate()
                },
                success: function () {
                  that.saveAndGo(openid, nickname, avatar);
                },
                fail: function () {
                  wx.hideLoading();
                  wx.showToast({ title: '更新失败', icon: 'none' });
                }
              });
            } else {
              // 新建
              db.collection('contact').add({
                data: {
                  openid: openid,
                  nickname: nickname,
                  avatar: avatar,
                  phone: '',
                  createTime: db.serverDate(),
                  updateTime: db.serverDate()
                },
                success: function () {
                  that.saveAndGo(openid, nickname, avatar);
                },
                fail: function () {
                  wx.hideLoading();
                  wx.showToast({ title: '注册失败', icon: 'none' });
                }
              });
            }
          }
        });
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '获取openid失败', icon: 'none' });
      }
    });
  },

  // 保存用户信息并跳转
  saveAndGo: function (openid, nickname, avatar) {
    var app = getApp();
    app.globalData.userInfo = {
      openid: openid,
      nickname: nickname,
      avatar: avatar,
      phone: ''
    };

    wx.hideLoading();
    wx.showToast({ title: '登录成功', icon: 'success' });

    setTimeout(function () {
      wx.redirectTo({
        url: '/pages/home/home'
      });
    }, 1000);
  }
})