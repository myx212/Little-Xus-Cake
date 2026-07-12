// pages/ai-order/ai-order.js
Page({
  data: {
    step: 1, // 1=场景选择, 2=口味选择, 3=预算选择, 4=思考中, 5=推荐结果
    scrollToId: '',
    scene: '',
    sceneText: '',
    userSceneText: '', // 用户实际输入的场景文字（用于气泡显示）
    flavor: '',
    flavorText: '',
    userFlavorText: '', // 用户实际输入的口味文字
    budget: '',
    budgetText: '',
    userBudgetText: '', // 用户实际输入的预算文字
    recommendGoods: [],
    comboTotal: 0,
    comboReason: '',
    comboTime: 15,
    allGoods: [],
    isRecording: false,
    inputText: ''
  },

  // 场景文案映射
  sceneMap: {
    craving: '想吃甜品解解馋',
    healthy: '想要低糖/健康一点',
    afternoon: '想要下午茶搭配',
    random: '不知道，随便推荐'
  },

  // 口味文案映射
  flavorMap: {
    fruit: '水果口味',
    chocolate: '巧克力口味',
    milk: '奶香口味',
    matcha: '抹茶口味'
  },

  // 预算文案映射
  budgetMap: {
    low: '20元以内',
    mid: '20-40元',
    high: '40-60元',
    luxury: '60元以上'
  },

  // 预算上限
  budgetLimit: {
    low: 20,
    mid: 40,
    high: 60,
    luxury: 999
  },

  // 口味关键词（用于匹配商品描述）
  flavorKeywords: {
    fruit: ['草莓', '樱桃', '蓝莓', '树莓', '覆盆子', '蜜桃', '水果', '杨枝甘露', '芒果'],
    chocolate: ['巧克力', '可可', '榛果', '黑莓'],
    milk: ['奶', '奶油', '芝士', '乳酪', '牛奶', '燕麦'],
    matcha: ['抹茶', '绿茶']
  },

  // 场景推荐分类
  sceneCategories: {
    craving: ['salt_croissant', 'mochi', 'basque'],
    healthy: ['soft_bread', 'rice_bread', 'bagel'],
    afternoon: ['salt_croissant', 'mochi', 'drink', 'toast'],
    random: ['salt_croissant', 'soft_bread', 'basque', 'mochi', 'drink']
  },

  onLoad: function (options) {
    this.loadAllGoods();
    this.initRecorder();
  },

  // 初始化录音管理器
  initRecorder: function () {
    var that = this;
    var recorderManager = wx.getRecorderManager();
    this.recorderManager = recorderManager;

    recorderManager.onStart(function () {
      console.log('录音开始');
    });

    recorderManager.onStop(function (res) {
      console.log('录音结束', res);
      // 调用语音识别
      that.voiceRecognition(res.tempFilePath);
    });

    recorderManager.onError(function (err) {
      console.error('录音错误', err);
      wx.showToast({ title: '录音失败', icon: 'none' });
    });

    // 提前请求麦克风权限
    wx.authorize({ scope: 'scope.record' });
  },

  // 语音识别
  voiceRecognition: function (filePath) {
    var that = this;
    wx.showLoading({ title: '识别中...' });

    // 使用微信内置语音识别（需要小程序后台配置）
    // 这里先用模拟方式，实际项目需要接入语音识别服务
    setTimeout(function () {
      wx.hideLoading();
      // 模拟识别结果，根据当前步骤给出默认选择
      if (that.data.step === 1) {
        that.handleVoiceResult('想吃甜品解解馋');
      } else if (that.data.step === 2) {
        that.handleVoiceResult('水果口味');
      } else if (that.data.step === 3) {
        that.handleVoiceResult('20到40元');
      }
    }, 1000);
  },

  // 处理语音识别/文字输入结果
  handleVoiceResult: function (text) {
    var that = this;
    console.log('用户输入', text);

    // 根据当前步骤处理输入结果
    if (this.data.step === 1) {
      // 场景选择
      var scene = this.parseScene(text);
      if (scene) {
        this.setData({
          scene: scene,
          sceneText: this.sceneMap[scene],
          userSceneText: text, // 记录用户实际输入
          step: 2
        });
        setTimeout(function () {
          that.scrollToBottom('msg-3');
        }, 300);
      } else {
        // 兜底：识别不到就默认"随便推荐"
        this.setData({
          scene: 'random',
          sceneText: this.sceneMap['random'],
          userSceneText: text, // 记录用户实际输入
          step: 2
        });
        setTimeout(function () {
          that.scrollToBottom('msg-3');
        }, 300);
      }
    } else if (this.data.step === 2) {
      // 口味选择
      var flavor = this.parseFlavor(text);
      if (!flavor) {
        // 兜底：如果包含具体甜品名但没匹配口味，按关键词推断
        flavor = this.inferFlavorFromGoods(text);
      }
      if (flavor) {
        this.setData({
          flavor: flavor,
          flavorText: this.flavorMap[flavor],
          userFlavorText: text, // 记录用户实际输入
          step: 3
        });
        setTimeout(function () {
          that.scrollToBottom('msg-5');
        }, 300);
      } else {
        // 兜底：默认水果口味（覆盖面最广）
        this.setData({
          flavor: 'fruit',
          flavorText: this.flavorMap['fruit'],
          userFlavorText: text, // 记录用户实际输入
          step: 3
        });
        setTimeout(function () {
          that.scrollToBottom('msg-5');
        }, 300);
      }
    } else if (this.data.step === 3) {
      // 预算选择
      var budget = this.parseBudget(text);
      if (budget) {
        this.setData({
          budget: budget,
          budgetText: this.budgetMap[budget],
          userBudgetText: text, // 记录用户实际输入
          step: 4
        });
        setTimeout(function () {
          that.scrollToBottom('msg-6');
        }, 300);

        setTimeout(function () {
          that.generateRecommend();
        }, 1500);
      } else {
        // 兜底：默认 20-40 元区间
        this.setData({
          budget: 'mid',
          budgetText: this.budgetMap['mid'],
          userBudgetText: text, // 记录用户实际输入
          step: 4
        });
        setTimeout(function () {
          that.scrollToBottom('msg-6');
        }, 300);

        setTimeout(function () {
          that.generateRecommend();
        }, 1500);
      }
    }
  },

  // 解析场景：支持具体甜品名、饮品名、同义词兜底
  parseScene: function (text) {
    // 原始严格匹配
    if (text.indexOf('解馋') >= 0 || text.indexOf('想吃') >= 0 || text.indexOf('馋') >= 0) {
      return 'craving';
    } else if (text.indexOf('健康') >= 0 || text.indexOf('低糖') >= 0 || text.indexOf('少糖') >= 0 || text.indexOf('无糖') >= 0 || text.indexOf('减脂') >= 0 || text.indexOf('轻食') >= 0) {
      return 'healthy';
    } else if (text.indexOf('下午茶') >= 0 || text.indexOf('奶茶') >= 0 || text.indexOf('咖啡') >= 0 || text.indexOf('搭配') >= 0 || text.indexOf('饮料') >= 0 || text.indexOf('饮品') >= 0) {
      return 'afternoon';
    } else if (text.indexOf('随便') >= 0 || text.indexOf('不知道') >= 0 || text.indexOf('都可以') >= 0 || text.indexOf('都行') >= 0 || text.indexOf('推荐') >= 0 || text.indexOf('帮我选') >= 0) {
      return 'random';
    }

    // 甜品关键词兜底 → craving
    var dessertKeywords = ['蛋糕', '千层', '卷', '巴斯克', '芝士', '提拉米苏', '慕斯', '布丁', '曲奇', '饼干', '泡芙', '酥', '挞', '派', '马卡龙', '甜甜圈', '面包', '吐司', '瑞士卷', '浮云卷', '榛果', '巧克力', '草莓', '芒果', '抹茶', '芋泥', '麻薯', '大福', '雪媚娘'];
    for (var i = 0; i < dessertKeywords.length; i++) {
      if (text.indexOf(dessertKeywords[i]) >= 0) {
        return 'craving';
      }
    }

    // 饮品关键词兜底 → afternoon
    var drinkKeywords = ['茶', '咖', '拿铁', '美式', '摩卡', '气泡', '果茶', '柠檬', '甘露', '杨枝', '雪梨', '乌龙'];
    for (var j = 0; j < drinkKeywords.length; j++) {
      if (text.indexOf(drinkKeywords[j]) >= 0) {
        return 'afternoon';
      }
    }

    return '';
  },

  // 解析口味：扩展更多同义词
  parseFlavor: function (text) {
    if (text.indexOf('水果') >= 0 || text.indexOf('草莓') >= 0 || text.indexOf('芒果') >= 0 || text.indexOf('蓝莓') >= 0 || text.indexOf('蔓越') >= 0 || text.indexOf('树莓') >= 0 || text.indexOf('果') >= 0 || text.indexOf('黄桃') >= 0 || text.indexOf('橙') >= 0 || text.indexOf('柠檬') >= 0) {
      return 'fruit';
    } else if (text.indexOf('巧克力') >= 0 || text.indexOf('可可') >= 0 || text.indexOf('榛果') >= 0 || text.indexOf('黑森林') >= 0 || text.indexOf('布朗尼') >= 0) {
      return 'chocolate';
    } else if (text.indexOf('奶') >= 0 || text.indexOf('奶油') >= 0 || text.indexOf('芝士') >= 0 || text.indexOf('巴斯克') >= 0 || text.indexOf('奶酪') >= 0 || text.indexOf('牛乳') >= 0 || text.indexOf('鲜奶') >= 0 || text.indexOf('酸奶') >= 0 || text.indexOf('卡仕达') >= 0) {
      return 'milk';
    } else if (text.indexOf('抹茶') >= 0 || text.indexOf('绿茶') >= 0 || text.indexOf('茶') >= 0 && text.indexOf('奶') === -1) {
      return 'matcha';
    }
    return '';
  },

  // 根据用户提到的具体商品推断口味（兜底）
  inferFlavorFromGoods: function (text) {
    var that = this;
    var allGoods = this.data.allGoods || [];
    if (allGoods.length === 0) return '';

    // 在 allGoods 里找匹配用户输入的商品，然后看它的口味关键词
    var matched = allGoods.filter(function (item) {
      return text.indexOf(item.name) !== -1;
    });

    if (matched.length > 0) {
      var flavors = ['fruit', 'chocolate', 'milk', 'matcha'];
      for (var k = 0; k < flavors.length; k++) {
        var fk = that.flavorKeywords[flavors[k]];
        var item = matched[0];
        for (var kk = 0; kk < fk.length; kk++) {
          if ((item.name || '').indexOf(fk[kk]) !== -1 || (item.description || '').indexOf(fk[kk]) !== -1) {
            return flavors[k];
          }
        }
      }
    }
    return '';
  },

  // 解析预算：支持纯数字、元、块；兜底匹配
  parseBudget: function (text) {
    if (text.indexOf('20') >= 0 && text.indexOf('以内') >= 0) {
      return 'low';
    } else if (text.indexOf('20') >= 0 && text.indexOf('40') >= 0) {
      return 'mid';
    } else if (text.indexOf('40') >= 0 && text.indexOf('60') >= 0) {
      return 'high';
    } else if (text.indexOf('60') >= 0) {
      return 'luxury';
    }

    // 从文本中提取数字判断
    var numMatch = text.match(/(\d+(\.\d+)?)/);
    if (numMatch) {
      var price = parseFloat(numMatch[1]);
      if (price > 0 && price <= 20) return 'low';
      if (price > 20 && price <= 40) return 'mid';
      if (price > 40 && price <= 60) return 'high';
      if (price > 60) return 'luxury';
    }

    // 语义关键词兜底
    if (text.indexOf('便宜') >= 0 || text.indexOf('省钱') >= 0 || text.indexOf('实惠') >= 0) return 'low';
    if (text.indexOf('贵') >= 0 || text.indexOf('高端') >= 0 || text.indexOf('豪华') >= 0 || text.indexOf('好点') >= 0) return 'high';

    return '';
  },

  // 开始录音
  onVoiceStart: function () {
    if (this.data.isRecording) return;
    this.setData({ isRecording: true });
    try {
      this.recorderManager.start({
        duration: 10000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3'
      });
    } catch (e) {
      console.error('录音启动失败', e);
      this.setData({ isRecording: false });
    }
  },

  // 结束录音
  onVoiceEnd: function () {
    if (!this.data.isRecording) return;
    this.setData({ isRecording: false });
    try {
      this.recorderManager.stop();
    } catch (e) {
      console.error('录音停止失败', e);
    }
  },

  // 取消录音
  onVoiceCancel: function () {
    if (!this.data.isRecording) return;
    this.setData({ isRecording: false });
    try {
      this.recorderManager.stop();
    } catch (e) {
      console.error('录音取消失败', e);
    }
  },

  // 文字输入
  onInputText: function (e) {
    this.setData({ inputText: e.detail.value });
  },

  // 发送文字
  onSendText: function () {
    var text = this.data.inputText.trim();
    if (!text) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    // 清空输入框
    this.setData({ inputText: '' });

    // 显示用户消息
    var that = this;
    var msgId = 'msg-user-text-' + Date.now();
    var messages = this.data.messages || [];
    messages.push({
      id: msgId,
      type: 'user',
      content: text
    });
    this.setData({ messages: messages });

    setTimeout(function () {
      that.scrollToBottom(msgId);
    }, 300);

    // 用文字内容走语音识别同样的逻辑
    this.handleVoiceResult(text);
  },

  // 加载所有商品
  loadAllGoods: function () {
    var that = this;
    wx.cloud.callFunction({
      name: 'getGoodsList',
      data: { action: 'list' },
      success: function (res) {
        if (res.result.code === 0) {
          that.setData({ allGoods: res.result.data });
        }
      }
    });
  },

  // 滚动到底部
  scrollToBottom: function (id) {
    this.setData({ scrollToId: id });
  },

  // 选择场景
  onSceneSelect: function (e) {
    var scene = e.currentTarget.dataset.scene;
    var that = this;

    this.setData({
      scene: scene,
      sceneText: this.sceneMap[scene],
      userSceneText: '', // 按钮选择清空原始输入，使用标准文案
      step: 2
    });

    setTimeout(function () {
      that.scrollToBottom('msg-3');
    }, 300);
  },

  // 选择口味
  onFlavorSelect: function (e) {
    var flavor = e.currentTarget.dataset.flavor;
    var that = this;

    this.setData({
      flavor: flavor,
      flavorText: this.flavorMap[flavor],
      userFlavorText: '', // 按钮选择清空原始输入，使用标准文案
      step: 3
    });

    setTimeout(function () {
      that.scrollToBottom('msg-5');
    }, 300);
  },

  // 选择预算
  onBudgetSelect: function (e) {
    var budget = e.currentTarget.dataset.budget;
    var that = this;

    this.setData({
      budget: budget,
      budgetText: this.budgetMap[budget],
      userBudgetText: '', // 按钮选择清空原始输入，使用标准文案
      step: 4
    });

    setTimeout(function () {
      that.scrollToBottom('msg-6');
    }, 300);

    // 模拟 AI 思考 1.5 秒
    setTimeout(function () {
      that.generateRecommend();
    }, 1500);
  },

  // 生成推荐
  generateRecommend: function () {
    var that = this;
    var allGoods = this.data.allGoods;
    var scene = this.data.scene;
    var flavor = this.data.flavor;
    var budget = this.data.budget;
    var maxPrice = this.budgetLimit[budget];

    // 第一轮：按场景分类筛选
    var categories = this.sceneCategories[scene] || this.sceneCategories.random;
    var filtered = allGoods.filter(function (item) {
      return categories.indexOf(item.category) !== -1;
    });

    // 第二轮：按口味关键词筛选
    if (flavor && this.flavorKeywords[flavor]) {
      var keywords = this.flavorKeywords[flavor];
      var flavorMatched = filtered.filter(function (item) {
        var name = item.name || '';
        var desc = item.description || '';
        return keywords.some(function (kw) {
          return name.indexOf(kw) !== -1 || desc.indexOf(kw) !== -1;
        });
      });
      // 如果口味匹配有结果就用，否则保留场景筛选结果
      if (flavorMatched.length > 0) {
        filtered = flavorMatched;
      }
    }

    // 第三轮：按预算筛选
    var budgetMatched = filtered.filter(function (item) {
      return item.price <= maxPrice;
    });

    // 如果预算内没有商品，放宽预算
    if (budgetMatched.length === 0) {
      budgetMatched = filtered.slice(0, 3);
    }

    // 组合套餐逻辑：蛋糕 + 饮品 + 小食
    var combo = this.buildCombo(budgetMatched, maxPrice);

    // 给每个商品添加 quantity 属性
    combo.forEach(function (item) {
      item.quantity = 0;
    });

    // 计算总价（基于已选数量，初始 quantity=0，合计应该为 0）
    var total = 0;
    combo.forEach(function (item) {
      total += item.price * (item.quantity || 0);
    });

    // 生成推荐理由
    var reason = this.generateReason(scene, flavor, budget, combo);

    // 计算制作时间
    var time = Math.max(10, combo.length * 5 + 5);

    this.setData({
      recommendGoods: combo,
      comboTotal: total,
      comboReason: reason,
      comboTime: time,
      step: 5
    });

    setTimeout(function () {
      that.scrollToBottom('msg-10');
    }, 300);
  },

  // 组合套餐
  buildCombo: function (goods, maxPrice) {
    if (goods.length === 0) return [];

    var combo = [];
    var usedIds = [];
    var remaining = maxPrice;

    // 优先选一个主食（蛋糕/面包类）
    var mainCategories = ['basque', 'toast', 'salt_croissant', 'soft_bread', 'rice_bread', 'bagel'];
    var mainGoods = goods.filter(function (item) {
      return mainCategories.indexOf(item.category) !== -1 && usedIds.indexOf(item._id) === -1;
    });
    if (mainGoods.length > 0) {
      var main = mainGoods[0];
      combo.push(main);
      usedIds.push(main._id);
      remaining -= main.price;
    }

    // 再选一个饮品
    var drinks = goods.filter(function (item) {
      return item.category === 'drink' && usedIds.indexOf(item._id) === -1 && item.price <= remaining;
    });
    if (drinks.length > 0) {
      combo.push(drinks[0]);
      usedIds.push(drinks[0]._id);
      remaining -= drinks[0].price;
    }

    // 再选一个小食（麻薯等）
    var snacks = goods.filter(function (item) {
      return (item.category === 'mochi') && usedIds.indexOf(item._id) === -1 && item.price <= remaining;
    });
    if (snacks.length > 0) {
      combo.push(snacks[0]);
      usedIds.push(snacks[0]._id);
    }

    // 如果只有一个商品，再补一个
    if (combo.length === 1) {
      var extra = goods.filter(function (item) {
        return usedIds.indexOf(item._id) === -1 && item.price <= remaining;
      });
      if (extra.length > 0) {
        combo.push(extra[0]);
      }
    }

    // 给每个商品添加推荐理由
    var self = this;
    combo.forEach(function (item) {
      item.reason = self.getGoodsReason(item);
    });

    return combo;
  },

  // 获取单个商品的推荐理由
  getGoodsReason: function (item) {
    var category = item.category;
    var reasons = {
      salt_croissant: '外酥内软，经典法式风味',
      soft_bread: '松软可口，健康低负担',
      rice_bread: '细腻柔软，米香自然',
      bagel: '外韧内软，麦香十足',
      basque: '表面焦香，内里丝滑',
      mochi: 'Q弹软糯，手工现做',
      toast: '柔软拉丝，奶香浓郁',
      drink: '搭配甜品绝佳拍档'
    };
    return reasons[category] || '店长推荐，值得一试';
  },

  // 生成套餐推荐理由
  generateReason: function (scene, flavor, budget, combo) {
    var sceneReasons = {
      craving: '满足你的甜品渴望',
      healthy: '低糖健康，美味无负担',
      afternoon: '完美下午茶搭配',
      random: '店长精选，不会出错'
    };
    var flavorReasons = {
      fruit: '清新水果风味，酸甜不腻',
      chocolate: '浓郁巧克力，甜蜜加倍',
      milk: '奶香四溢，口感醇厚',
      matcha: '抹茶清香，回味悠长'
    };

    var reason = sceneReasons[scene] || '';
    if (flavor && flavorReasons[flavor]) {
      reason += '，' + flavorReasons[flavor];
    }
    return reason;
  },

  // 添加单个商品（+按钮）
  onAddSingle: function (e) {
    var index = e.currentTarget.dataset.index;
    var goods = this.data.recommendGoods;
    goods[index].quantity = (goods[index].quantity || 0) + 1;
    this.setData({ recommendGoods: goods });
    this.calcComboTotal();
  },

  // 移除单个商品（-按钮）
  onRemoveItem: function (e) {
    var index = e.currentTarget.dataset.index;
    var goods = this.data.recommendGoods;
    if (!goods[index].quantity || goods[index].quantity <= 0) return;
    goods[index].quantity = goods[index].quantity - 1;
    this.setData({ recommendGoods: goods });
    this.calcComboTotal();
  },

  // 计算合计
  calcComboTotal: function () {
    var goods = this.data.recommendGoods;
    var total = 0;
    goods.forEach(function (item) {
      total += item.price * (item.quantity || 0);
    });
    this.setData({ comboTotal: total });
  },

  // 全部加入购物车
  onAddAllToCart: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    var goods = this.data.recommendGoods;
    if (goods.length === 0) return;

    wx.showLoading({ title: '添加中...' });

    var added = 0;
    goods.forEach(function (item) {
      wx.cloud.callFunction({
        name: 'getCartList',
        data: {
          action: 'add',
          openid: userInfo.openid,
          item: {
            goodsId: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1
          }
        },
        success: function () {
          added++;
          if (added === goods.length) {
            wx.hideLoading();
            wx.showToast({ title: '已全部加入购物车', icon: 'success' });
          }
        },
        fail: function () {
          added++;
          if (added === goods.length) {
            wx.hideLoading();
            wx.showToast({ title: '添加完成', icon: 'none' });
          }
        }
      });
    });
  },

  // 一键下单
  onOrderNow: function () {
    var that = this;
    var app = getApp();
    var userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    var goods = this.data.recommendGoods;
    // 只取 quantity > 0 的商品
    var selectedGoods = goods.filter(function (item) {
      return item.quantity > 0;
    });

    if (selectedGoods.length === 0) {
      wx.showToast({ title: '请至少选择一个商品', icon: 'none' });
      return;
    }

    // 直接将商品数据传递给 AI 确认订单页（不经过购物车，避免数量累加问题）
    var cartList = selectedGoods.map(function (item) {
      return {
        _id: item._id,
        goodsId: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity
      };
    });

    // 保存到全局变量和本地缓存
    app.globalData.aiCartList = cartList;
    wx.setStorageSync('aiCartList', cartList);

    // 跳转到 AI 专用确认订单页
    wx.navigateTo({
      url: '/pages/ai-confirm-order/ai-confirm-order'
    });
  },

  // 重新开始
  onRestart: function () {
    this.setData({
      step: 1,
      scene: '',
      sceneText: '',
      flavor: '',
      flavorText: '',
      budget: '',
      budgetText: '',
      recommendGoods: [],
      comboTotal: 0,
      comboReason: '',
      comboTime: 15
    });
    this.scrollToBottom('msg-1');
  },

  // 返回
  onBack: function () {
    wx.navigateBack();
  }
})
