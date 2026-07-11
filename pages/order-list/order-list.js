// pages/order-list/order-list.js
Page({
  data: {
    currentTab: 'all',
    orderList: []
  },

  onShow: function () {
    this.loadOrders();
  },

  // 切换Tab
  onTabChange: function (e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.loadOrders();
  },

  // 加载订单列表
  loadOrders: function () {
    var that = this;
    var db = wx.cloud.database();
    var currentTab = this.data.currentTab;

    wx.showLoading({ title: '加载中' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        var query = db.collection('orders').where({ openid: openid });

        // 根据Tab筛选
        if (currentTab === 'pending') {
          query = query.where({ status: 'pending' });
        } else if (currentTab === 'using') {
          query = query.where({ status: 'using' });
        } else if (currentTab === 'delivering') {
          query = query.where({ status: 'ready' });
        } else if (currentTab === 'review') {
          query = query.where({ status: 'review' });
        } else if (currentTab === 'completed') {
          query = query.where({ status: 'completed' });
        }

        query.orderBy('createTime', 'desc').get({
          success: function (queryRes) {
            var list = queryRes.data.map(function (item) {
              var date = item.createTime;
              var timeStr = '';
              if (date) {
                var d = new Date(date);
                timeStr = d.getFullYear() + '-' +
                  that.padZero(d.getMonth() + 1) + '-' +
                  that.padZero(d.getDate()) + ' ' +
                  that.padZero(d.getHours()) + ':' +
                  that.padZero(d.getMinutes());
              }

              var statusText = '待付款';
              if (item.status === 'using') statusText = '待使用';
              else if (item.status === 'delivering') statusText = '待收货';
              else if (item.status === 'ready') statusText = '待取餐';
              else if (item.status === 'review') statusText = '待评价';
              else if (item.status === 'completed') statusText = '已完成';

              return Object.assign({}, item, {
                createTimeStr: timeStr,
                orderNo: item.orderNo || item._id.substring(0, 12).toUpperCase(),
                statusText: statusText,
                description: item.remark || '需要生日帽和蜡烛，写卡片上插在蛋糕托盘'
              });
            });

            that.setData({ orderList: list });
          },
          fail: function (err) {
            console.error('加载订单失败:', err);
          },
          complete: function () {
            wx.hideLoading();
          }
        });
      },
      fail: function () {
        wx.hideLoading();
      }
    });
  },

  // 联系客服
  onContact: function () {
    wx.makePhoneCall({
      phoneNumber: '18888888888',
      fail: function () {
        wx.showToast({ title: '拨打失败', icon: 'none' });
      }
    });
  },

  // 继续付款 — 跳转到确认订单页
  onContinuePay: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/confirm-order/confirm-order?ids=' + id
    });
  },

  // 我已取餐 / 确认收货 — 更新订单状态为待评价
  onConfirmReceive: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var db = wx.cloud.database();

    wx.showModal({
      title: '确认操作',
      content: '确认已取餐？订单将标记为待评价',
      success: function (res) {
        if (res.confirm) {
          db.collection('orders').doc(id).update({
            data: { status: 'review' },
            success: function () {
              wx.showToast({ title: '已确认取餐', icon: 'success' });
              that.loadOrders();
            }
          });
        }
      }
    });
  },

  // 再来一单 — 重新下单相同商品
  onReorder: function (e) {
    var id = e.currentTarget.dataset.id;
    var db = wx.cloud.database();

    wx.showLoading({ title: '加载中' });

    db.collection('orders').doc(id).get({
      success: function (res) {
        var order = res.data;
        // 写入购物车
        db.collection('cart').add({
          data: {
            openid: order.openid,
            goodsId: order.goodsId,
            name: order.name,
            price: order.price,
            image: order.image,
            quantity: order.quantity,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          },
          success: function () {
            wx.hideLoading();
            wx.showToast({ title: '已加入购物车', icon: 'success' });
            setTimeout(function () {
              wx.switchTab({ url: '/pages/order/order' });
            }, 1000);
          },
          fail: function () {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        });
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  // 删除订单
  onDeleteOrder: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var db = wx.cloud.database();

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该订单吗？',
      success: function (res) {
        if (res.confirm) {
          db.collection('orders').doc(id).remove({
            success: function () {
              wx.showToast({ title: '已删除', icon: 'success' });
              that.loadOrders();
            }
          });
        }
      }
    });
  },

  // 查看订单 — 跳转到支付成功页（订单详情）
  onViewOrder: function (e) {
    var id = e.currentTarget.dataset.id;
    var db = wx.cloud.database();

    db.collection('orders').doc(id).get({
      success: function (res) {
        var order = res.data;
        wx.navigateTo({
          url: '/pages/pay-success/pay-success?orderNo=' + (order.orderNo || '') + '&amount=' + order.totalAmount + '&orderIds=' + id
        });
      }
    });
  },

  // 评价
  onReview: function (e) {
    var id = e.currentTarget.dataset.id;
    var db = wx.cloud.database();

    wx.showModal({
      title: '订单评价',
      editable: true,
      placeholderText: '请描述您的用餐体验',
      success: function (res) {
        if (res.confirm && res.content) {
          db.collection('orders').doc(id).update({
            data: {
              status: 'completed',
              review: res.content,
              reviewTime: new Date()
            },
            success: function () {
              wx.showToast({ title: '评价成功', icon: 'success' });
            }
          });
        }
      }
    });
  },

  // 补零
  padZero: function (n) {
    return n < 10 ? '0' + n : '' + n;
  }
})