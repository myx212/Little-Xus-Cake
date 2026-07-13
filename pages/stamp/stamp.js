// pages/stamp/stamp.js
Page({
  data: {
    collectedCount: 0,
    currentRecordTab: 'stamp',
    badges: [
      { image: '/images/cake/one.jpg', collected: false },
      { image: '/images/cake/two.jpg', collected: false },
      { image: '/images/cake/three.jpg', collected: false },
      { image: '/images/cake/four.jpg', collected: false },
      { image: '/images/cake/five.jpg', collected: false },
      { image: '/images/cake/six.jpg', collected: false }
    ],
    stampRecords: [],
    exchangeRecords: []
  },

  onShow: function () {
    this.loadStampData();
  },

  // 加载集章数据
  loadStampData: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    var db = wx.cloud.database();

    // 从contact集合读取集章数
    db.collection('contact').where({
      openid: userInfo.openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          var user = res.data[0];
          var count = user.stampCount || 0;
          var badges = that.data.badges;

          // 根据集章数点亮徽章（每2个章点亮1个徽章）
          for (var i = 0; i < badges.length; i++) {
            badges[i].collected = (count >= (i + 1) * 2);
          }

          that.setData({
            collectedCount: count,
            badges: badges
          });
        }
      }
    });

    // 加载集章记录
    db.collection('stamp_records').where({
      openid: userInfo.openid
    }).orderBy('createTime', 'desc').get({
      success: function (res) {
        var records = res.data.map(function (item) {
          return {
            text: item.text || '获得1个杯章',
            time: that.formatTime(item.createTime)
          };
        });
        that.setData({ stampRecords: records });
      }
    });

    // 加载兑换记录
    db.collection('exchange_records').where({
      openid: userInfo.openid
    }).orderBy('createTime', 'desc').get({
      success: function (res) {
        var records = res.data.map(function (item) {
          return {
            text: item.text || '兑换任意饮品券',
            time: that.formatTime(item.createTime)
          };
        });
        that.setData({ exchangeRecords: records });
      }
    });
  },

  // 切换记录Tab
  onSwitchRecordTab: function (e) {
    this.setData({ currentRecordTab: e.currentTarget.dataset.tab });
  },

  // 格式化时间
  formatTime: function (date) {
    if (!date) return '';
    var d = new Date(date);
    var year = d.getFullYear();
    var month = (d.getMonth() + 1).toString().padStart(2, '0');
    var day = d.getDate().toString().padStart(2, '0');
    var hour = d.getHours().toString().padStart(2, '0');
    var minute = d.getMinutes().toString().padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  }
})