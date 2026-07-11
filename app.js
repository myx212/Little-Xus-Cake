// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: "cloud1-9g5hksrf567e2555",
      traceUser: true
    });

    // 检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function () {
    var that = this;
    var db = wx.cloud.database();

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        // 从contact集合查询用户信息
        db.collection('contact').where({
          openid: openid
        }).get({
          success: function (queryRes) {
            if (queryRes.data.length > 0) {
              // 已登录，保存用户信息到全局
              var user = queryRes.data[0];
              that.globalData.userInfo = {
                openid: user.openid,
                nickname: user.nickname || '',
                avatar: user.avatar || '',
                phone: user.phone || ''
              };
            }
          }
        });
      }
    });
  },

  // 全局数据
  globalData: {
    userInfo: null
  }
})