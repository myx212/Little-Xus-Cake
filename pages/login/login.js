// pages/login/login.js
Page({
  data: {},

  onLoad: function () {
    // 检查是否已登录
    var app = getApp();
    if (app.globalData.userInfo && app.globalData.userInfo.openid) {
      wx.redirectTo({
        url: '/pages/home/home'
      });
    }
  },

  // 选择头像后直接登录（昵称默认"微信用户"）
  onChooseAvatar: function (e) {
    var that = this;
    var avatarUrl = e.detail.avatarUrl;
    var db = wx.cloud.database();

    wx.showLoading({ title: '登录中...' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        db.collection('contact').where({
          openid: openid
        }).get({
          success: function (queryRes) {
            if (queryRes.data.length > 0) {
              // 已存在，更新头像
              db.collection('contact').doc(queryRes.data[0]._id).update({
                data: {
                  avatar: avatarUrl,
                  updateTime: db.serverDate()
                },
                success: function () {
                  var user = queryRes.data[0];
                  that.saveAndGo(openid, user.nickname || '微信用户', avatarUrl);
                },
                fail: function () {
                  wx.hideLoading();
                  wx.showToast({ title: '更新失败', icon: 'none' });
                }
              });
            } else {
              // 新建用户
              db.collection('contact').add({
                data: {
                  openid: openid,
                  nickname: '微信用户',
                  avatar: avatarUrl,
                  phone: '',
                  points: 0,
                  stampCount: 0,
                  createTime: db.serverDate(),
                  updateTime: db.serverDate()
                },
                success: function () {
                  that.saveAndGo(openid, '微信用户', avatarUrl);
                },
                fail: function () {
                  wx.hideLoading();
                  wx.showToast({ title: '注册失败', icon: 'none' });
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
