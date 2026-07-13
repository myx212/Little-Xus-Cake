// pages/points/points.js
Page({
  data: {
    totalPoints: 0,
    todayChecked: false,
    reminderOn: false,
    userInfo: {},
    weekDays: [],
    products: []
  },

  onShow: function () {
    this.loadPointsData();
    this.loadProducts();
  },

  // 加载签到记录（判断今天是否已签到）
  loadCheckInRecord: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) return;

    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
      (today.getMonth() + 1).toString().padStart(2, '0') + '-' +
      today.getDate().toString().padStart(2, '0');

    var db = wx.cloud.database();
    db.collection('check_in_records').where({
      openid: userInfo.openid,
      date: todayStr
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          var weekDays = that.data.weekDays;
          var todayIndex = weekDays.findIndex(function (d) { return d.isToday; });
          if (todayIndex >= 0) {
            weekDays[todayIndex].checked = true;
          }
          that.setData({
            weekDays: weekDays,
            todayChecked: true
          });
        }
      }
    });
  },

  // 加载积分数据
  loadPointsData: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    that.setData({ userInfo: userInfo });

    var db = wx.cloud.database();
    db.collection('contact').where({
      openid: userInfo.openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          var user = res.data[0];
          that.setData({ totalPoints: user.points || 0 });
        }
        that.initWeekDays();
      },
      fail: function () {
        that.initWeekDays();
      }
    });
  },

  // 初始化本周签到
  initWeekDays: function () {
    var dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    var shortNames = ['一', '二', '三', '四', '五', '六', '日'];
    var pointsMap = [10, 10, 30, 20, 30, 50, 50];

    // 获取今天是周几（0=周日, 1=周一...）
    var today = new Date().getDay();
    var todayIndex = today === 0 ? 6 : today - 1; // 转为0-6（周一=0）

    var weekDays = [];
    for (var i = 0; i < 7; i++) {
      weekDays.push({
        name: dayNames[i],
        shortName: shortNames[i],
        points: pointsMap[i],
        checked: i < todayIndex,
        isToday: i === todayIndex
      });
    }

    this.setData({
      weekDays: weekDays,
      todayChecked: weekDays[todayIndex] ? weekDays[todayIndex].checked : false
    });

    // 初始化完星期后，再检查今天的签到记录
    this.loadCheckInRecord();
  },

  // 点击日期
  onDayTap: function (e) {
    // 只能签到今天及之前的日期
    var index = e.currentTarget.dataset.index;
    var weekDays = this.data.weekDays;
    var todayIndex = weekDays.findIndex(function (d) { return d.isToday; });

    if (index <= todayIndex && !weekDays[index].checked) {
      weekDays[index].checked = true;
      this.setData({ weekDays: weekDays });
    }
  },

  // 签到
  onCheckIn: function () {
    if (this.data.todayChecked) {
      wx.showToast({ title: '今日已签到', icon: 'none' });
      return;
    }

    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    var weekDays = that.data.weekDays;
    var todayIndex = weekDays.findIndex(function (d) { return d.isToday; });
    var todayPoints = weekDays[todayIndex].points;

    var db = wx.cloud.database();

    // 更新积分
    db.collection('contact').where({
      openid: userInfo.openid
    }).get({
      success: function (res) {
        if (res.data.length > 0) {
          var currentPoints = res.data[0].points || 0;
          db.collection('contact').doc(res.data[0]._id).update({
            data: {
              points: currentPoints + todayPoints,
              lastCheckIn: db.serverDate()
            },
            success: function () {
              // 写入签到记录
              var today = new Date();
              var todayStr = today.getFullYear() + '-' +
                (today.getMonth() + 1).toString().padStart(2, '0') + '-' +
                today.getDate().toString().padStart(2, '0');
              db.collection('check_in_records').add({
                data: {
                  openid: userInfo.openid,
                  date: todayStr,
                  points: todayPoints,
                  createTime: db.serverDate()
                }
              });

              weekDays[todayIndex].checked = true;
              that.setData({
                weekDays: weekDays,
                todayChecked: true,
                totalPoints: currentPoints + todayPoints
              });
              wx.showToast({ title: '签到成功 +'+ todayPoints +'积分', icon: 'success' });
            }
          });
        }
      }
    });
  },

  // 签到提醒开关
  onToggleReminder: function () {
    this.setData({ reminderOn: !this.data.reminderOn });
  },

  // 加载积分商品
  loadProducts: function () {
    var that = this;
    var db = wx.cloud.database();
    db.collection('points_products').orderBy('createTime', 'desc').get({
      success: function (res) {
        that.setData({ products: res.data });
      },
      fail: function () {
        // 模拟商品数据
        that.setData({
          products: [
            { _id: '1', name: '玫瑰香草千层', price: 13, needPoints: 100, image: '/images/gift/gift1.jpg' },
            { _id: '2', name: '巧克力蛋仔', price: 19, needPoints: 100, image: '/images/gift/gift2.jpg' },
            { _id: '3', name: '草莓奶油蛋糕', price: 28, needPoints: 200, image: '/images/gift/gift3.jpg' },
            { _id: '4', name: '蓝莓芝士蛋糕', price: 32, needPoints: 250, image: '/images/gift/gift4.jpg' },
            { _id: '5', name: '抹茶红豆卷', price: 22, needPoints: 150, image: '/images/gift/gift5.jpg' },
            { _id: '6', name: '焦糖布丁', price: 15, needPoints: 120, image: '/images/gift/gift6.jpg' }
          ]
        });
      }
    });
  },

  // 兑换商品
  onExchange: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var product = this.data.products.find(function (p) { return p._id === id; });

    if (!product) return;

    if (this.data.totalPoints < product.needPoints) {
      wx.showToast({ title: '积分不足', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认兑换',
      content: '确定使用 ' + product.needPoints + ' 积分兑换「' + product.name + '」吗？',
      confirmColor: '#D4B896',
      success: function (res) {
        if (res.confirm) {
          var app = getApp();
          var userInfo = app.globalData.userInfo;
          var db = wx.cloud.database();

          db.collection('contact').where({
            openid: userInfo.openid
          }).get({
            success: function (res) {
              if (res.data.length > 0) {
                var currentPoints = res.data[0].points || 0;
                db.collection('contact').doc(res.data[0]._id).update({
                  data: { points: currentPoints - product.needPoints },
                  success: function () {
                    // 记录兑换
                    db.collection('exchange_records').add({
                      data: {
                        openid: userInfo.openid,
                        text: '兑换' + product.name,
                        createTime: db.serverDate()
                      }
                    });

                    that.setData({ totalPoints: currentPoints - product.needPoints });
                    wx.showToast({ title: '兑换成功', icon: 'success' });
                  }
                });
              }
            }
          });
        }
      }
    });
  },

  // 积分明细
  onShowDetail: function () {
    wx.showToast({ title: '积分明细开发中', icon: 'none' });
  },

  // 兑换记录
  onShowExchange: function () {
    wx.showToast({ title: '兑换记录开发中', icon: 'none' });
  }
})