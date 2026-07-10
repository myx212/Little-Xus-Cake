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

  // 加载订单列表（调用 createOrder 云函数）
  loadOrders: function () {
    var that = this;
    var currentTab = this.data.currentTab;

    wx.showLoading({ title: '加载中' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (res) {
        var openid = res.result.openid;

        // 根据Tab确定筛选状态
        var status = '';
        if (currentTab === 'pending') status = 'pending';
        else if (currentTab === 'using') status = 'using';
        else if (currentTab === 'delivering') status = 'ready';
        else if (currentTab === 'review') status = 'review';
        else if (currentTab === 'completed') status = 'completed';

        wx.cloud.callFunction({
          name: 'createOrder',
          data: {
            action: 'list',
            openid: openid,
            status: status || undefined
          },
          success: function (queryRes) {
            if (queryRes.result.code === 0) {
              var list = queryRes.result.data.map(function (item) {
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
                  orderNo: item.orderNo || that.generateShortNo(item._id),
                  statusText: statusText,
                  description: item.remark || '需要生日帽和蜡烛，写卡片上插在蛋糕托盘'
                });
              });

              that.setData({ orderList: list });
            }
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

  // 我已取餐 / 确认收货 — 更新订单状态为待评价（调用 createOrder 云函数）
  onConfirmReceive: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认操作',
      content: '确认已取餐？订单将标记为待评价',
      success: function (res) {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'createOrder',
            data: { action: 'updateStatus', id: id, status: 'review' },
            success: function () {
              wx.showToast({ title: '已确认取餐', icon: 'success' });
              that.loadOrders();
            },
            fail: function () {
              wx.showToast({ title: '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 再来一单 — 重新下单相同商品（调用 createOrder 云函数）
  onReorder: function (e) {
    var id = e.currentTarget.dataset.id;

    wx.showLoading({ title: '加载中' });

    wx.cloud.callFunction({
      name: 'getUserOpenid',
      success: function (openRes) {
        var openid = openRes.result.openid;

        wx.cloud.callFunction({
          name: 'createOrder',
          data: { action: 'addToCart', openid: openid, id: id },
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
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
      }
    });
  },

  // 删除订单（调用 createOrder 云函数）
  onDeleteOrder: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该订单吗？',
      success: function (res) {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'createOrder',
            data: { action: 'remove', id: id },
            success: function () {
              wx.showToast({ title: '已删除', icon: 'success' });
              that.loadOrders();
            },
            fail: function () {
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 查看订单 — 跳转到支付成功页（订单详情）（调用 createOrder 云函数）
  onViewOrder: function (e) {
    var id = e.currentTarget.dataset.id;

    wx.cloud.callFunction({
      name: 'createOrder',
      data: { action: 'detail', id: id },
      success: function (res) {
        if (res.result.code === 0) {
          var order = res.result.data;
          wx.navigateTo({
            url: '/pages/pay-success/pay-success?orderNo=' + (order.orderNo || '') + '&amount=' + order.totalAmount + '&orderIds=' + id
          });
        }
      }
    });
  },

  // 评价（调用 createOrder 云函数）
  onReview: function (e) {
    var id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '订单评价',
      editable: true,
      placeholderText: '请描述您的用餐体验',
      success: function (res) {
        if (res.confirm && res.content) {
          wx.cloud.callFunction({
            name: 'createOrder',
            data: {
              action: 'updateStatus',
              id: id,
              status: 'completed'
            },
            success: function () {
              wx.showToast({ title: '评价成功', icon: 'success' });
            },
            fail: function () {
              wx.showToast({ title: '评价失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 根据 _id 生成短订单号（取后4位转大写）
  generateShortNo: function (id) {
    if (!id) return '0000';
    return id.substring(id.length - 4).toUpperCase();
  },

  // 补零
  padZero: function (n) {
    return n < 10 ? '0' + n : '' + n;
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    var that = this;
    this.loadOrders();
    // 延迟关闭刷新动画，等待数据加载完成
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 800);
  }
})
