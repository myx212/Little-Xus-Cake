// components/custom-tabbar/custom-tabbar.js
Component({
  properties: {
    currentTab: {
      type: Number,
      value: 0
    }
  },
  methods: {
    onTabTap: function (e) {
      var index = e.currentTarget.dataset.index;
      var page = e.currentTarget.dataset.page;

      // 如果点击的是当前页，不跳转
      if (index === this.data.currentTab) {
        return;
      }

      wx.redirectTo({
        url: page
      });
    }
  }
})