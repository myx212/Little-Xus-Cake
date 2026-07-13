// pages/address-map/address-map.js
Page({
  data: {
    longitude: 118.6757,
    latitude: 24.9139,
    markers: [],
    searchKeyword: '',
    addressList: [],
    selectedAddress: null,
    editId: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ editId: options.id });
      this.loadAddress(options.id);
    } else {
      this.getLocation();
    }
  },

  // 获取当前位置
  getLocation: function () {
    var that = this;
    wx.getLocation({
      type: 'gcj02',
      success: function (res) {
        that.setData({
          longitude: res.longitude,
          latitude: res.latitude,
          markers: [{
            id: 1,
            longitude: res.longitude,
            latitude: res.latitude,
            width: 30,
            height: 30
          }]
        });
        that.searchNearby(res.longitude, res.latitude);
      },
      fail: function () {
        // 定位失败，使用默认坐标（泉州）
        var defaultLng = 118.6757;
        var defaultLat = 24.9139;
        that.setData({
          longitude: defaultLng,
          latitude: defaultLat,
          markers: [{
            id: 1,
            longitude: defaultLng,
            latitude: defaultLat,
            width: 30,
            height: 30
          }]
        });
        that.searchNearby(defaultLng, defaultLat);
      }
    });
  },

  // 重新定位
  onLocate: function () {
    this.getLocation();
  },

  // 地图移动
  onMapMove: function () {
    // 地图移动后重新搜索附近地址
    var that = this;
    setTimeout(function () {
      that.searchNearby(that.data.longitude, that.data.latitude);
    }, 500);
  },

  // 点击地图
  onMapTap: function (e) {
    var longitude = e.detail.longitude;
    var latitude = e.detail.latitude;
    this.setData({
      longitude: longitude,
      latitude: latitude,
      markers: [{
        id: 1,
        longitude: longitude,
        latitude: latitude,
        iconPath: '/images/home/cart.jpg',
        width: 30,
        height: 30
      }]
    });
    this.searchNearby(longitude, latitude);
  },

  // 搜索附近地址（模拟数据）
  searchNearby: function (longitude, latitude) {
    var that = this;
    var keyword = this.data.searchKeyword || '';

    // 模拟地址数据
    var mockData = [
      { name: '泉州站', address: '丰泽区普贤路与东西大道交汇处北侧', distance: '11.2km', longitude: 118.6089, latitude: 24.9765 },
      { name: '泉州南站', address: '晋江市泉州南站公交站点', distance: '34.7km', longitude: 118.5532, latitude: 24.8234 },
      { name: '泉州站-进站口', address: '丰泽区东西大道', distance: '11.3km', longitude: 118.6095, latitude: 24.9770 },
      { name: '泉州东站', address: '台商投资区东园镇', distance: '18.5km', longitude: 118.7823, latitude: 24.9512 },
      { name: '中骏世界城', address: '丰泽区安吉路与毓才街交汇处', distance: '2.1km', longitude: 118.6812, latitude: 24.9201 },
      { name: '浔美浦洪湖公园', address: '丰泽区浔美社区', distance: '3.5km', longitude: 118.6934, latitude: 24.9056 },
      { name: '滨海华庭', address: '丰泽区滨海街', distance: '4.2km', longitude: 118.6978, latitude: 24.9123 },
      { name: '星光耀广场', address: '丰泽区安吉路', distance: '2.8km', longitude: 118.6845, latitude: 24.9178 },
      { name: '青莲寺', address: '丰泽区东海街道', distance: '5.1km', longitude: 118.6723, latitude: 24.9034 },
      { name: '泉州供电公司调度大楼', address: '丰泽区泉秀路', distance: '1.5km', longitude: 118.6701, latitude: 24.9089 },
      { name: '西街', address: '鲤城区西街', distance: '1.2km', longitude: 118.5892, latitude: 24.9138 },
      { name: '开元寺', address: '鲤城区西街176号', distance: '1.3km', longitude: 118.5885, latitude: 24.9145 },
      { name: '钟楼', address: '鲤城区东街与西街交汇处', distance: '1.0km', longitude: 118.5912, latitude: 24.9125 },
      { name: '泉州政府', address: '丰泽区东海街道府前路', distance: '3.8km', longitude: 118.6823, latitude: 24.9012 },
      { name: '万达广场', address: '丰泽区宝洲路', distance: '2.5km', longitude: 118.6756, latitude: 24.9078 },
      { name: '东海泰禾广场', address: '丰泽区东海街道', distance: '4.5km', longitude: 118.6890, latitude: 24.8998 },
      { name: '晋江国际机场', address: '晋江市和平中路', distance: '15.3km', longitude: 118.5892, latitude: 24.7989 },
      { name: '泉州师范学院', address: '丰泽区东海大街', distance: '4.0km', longitude: 118.6845, latitude: 24.9023 },
      { name: '华侨大学', address: '丰泽区城华北路', distance: '6.2km', longitude: 118.6534, latitude: 24.9345 },
      { name: '泉州第一医院', address: '鲤城区东街248号', distance: '1.1km', longitude: 118.5923, latitude: 24.9112 }
    ];

    // 根据关键词过滤
    var filtered = mockData;
    if (keyword) {
      filtered = mockData.filter(function (item) {
        return item.name.indexOf(keyword) !== -1 || item.address.indexOf(keyword) !== -1;
      });
    }

    var list = filtered.map(function (item, index) {
      return {
        name: item.name,
        address: item.address,
        distance: item.distance,
        longitude: item.longitude,
        latitude: item.latitude,
        selected: false
      };
    });

    that.setData({ addressList: list });
  },

  // 搜索输入（实时搜索）
  onSearchInput: function (e) {
    this.setData({ searchKeyword: e.detail.value });
    // 延迟搜索，避免频繁调用
    var that = this;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(function () {
      that.searchNearby(that.data.longitude, that.data.latitude);
    }, 300);
  },

  // 搜索
  onSearch: function () {
    this.searchNearby(this.data.longitude, this.data.latitude);
  },

  // 清除搜索
  onClearSearch: function () {
    this.setData({ searchKeyword: '' });
    this.searchNearby(this.data.longitude, this.data.latitude);
  },

  // 取消搜索
  onCancelSearch: function () {
    this.setData({ searchKeyword: '' });
  },

  // 选择地址
  onSelectAddress: function (e) {
    var index = e.currentTarget.dataset.index;
    var list = this.data.addressList;
    list.forEach(function (item, i) {
      item.selected = (i === index);
    });
    this.setData({
      addressList: list,
      selectedAddress: list[index]
    });
  },

  // 取消
  onCancel: function () {
    wx.navigateBack();
  },

  // 完成
  onComplete: function () {
    var that = this;

    if (!that.data.selectedAddress) {
      wx.showToast({ title: '请选择地址', icon: 'none' });
      return;
    }

    var addr = that.data.selectedAddress;
    var url = '/pages/address-edit/address-edit?name=' +
      encodeURIComponent(addr.name) +
      '&address=' + encodeURIComponent(addr.address) +
      '&longitude=' + addr.longitude +
      '&latitude=' + addr.latitude;

    if (that.data.editId) {
      url += '&id=' + that.data.editId;
    }

    wx.redirectTo({ url: url });
  },

  // 加载地址（编辑模式）
  loadAddress: function (id) {
    var that = this;
    var db = wx.cloud.database();
    db.collection('addresses').doc(id).get({
      success: function (res) {
        var addr = res.data;
        that.setData({
          longitude: addr.longitude,
          latitude: addr.latitude,
          markers: [{
            id: 1,
            longitude: addr.longitude,
            latitude: addr.latitude,
            iconPath: '/images/home/cart.jpg',
            width: 30,
            height: 30
          }],
          addressList: [{
            name: addr.name,
            address: addr.address,
            distance: '0km',
            longitude: addr.longitude,
            latitude: addr.latitude,
            selected: true
          }],
          selectedAddress: {
            name: addr.name,
            address: addr.address,
            longitude: addr.longitude,
            latitude: addr.latitude
          }
        });
      }
    });
  }
})