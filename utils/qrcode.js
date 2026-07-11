// utils/qrcode.js
// 轻量级 QR Code 生成器 - 修复版

var QRCode = (function () {
  // GF(256) 有限域
  var EXP_TABLE = new Array(256);
  var LOG_TABLE = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP_TABLE[i] = x;
      LOG_TABLE[x] = i;
      x <<= 1;
      if (x & 256) x ^= 0x11d;
    }
    EXP_TABLE[255] = EXP_TABLE[0];
  })();

  function gexp(n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return EXP_TABLE[n];
  }
  function glog(n) {
    if (n < 1) throw new Error('glog(' + n + ')');
    return LOG_TABLE[n];
  }

  // 多项式
  function Polynomial(num, shift) {
    this.num = [];
    for (var i = 0; i < num.length; i++) this.num.push(num[i]);
  }
  Polynomial.prototype = {
    get: function (i) { return this.num[i]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++)
        for (var j = 0; j < e.getLength(); j++)
          num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      return new Polynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      // 跳过前导零
      var num = [];
      for (var i = 0; i < this.getLength(); i++) num.push(this.get(i));
      var offset = 0;
      while (offset < num.length && num[offset] === 0) offset++;
      if (offset >= num.length) return new Polynomial([0], 0);
      var ratio = glog(num[offset]) - glog(e.get(0));
      for (var i = 0; i < e.getLength(); i++) num[i + offset] ^= gexp(glog(e.get(i)) + ratio);
      return new Polynomial(num.slice(offset + 1), 0).mod(e);
    }
  };

  function getErrorCorrectPolynomial(length) {
    var a = new Polynomial([1], 0);
    for (var i = 0; i < length; i++)
      a = a.multiply(new Polynomial([1, gexp(i)], 0));
    return a;
  }

  // 数据编码
  function createData(version, ecLevel, data) {
    var rsBlocks = getRSBlocks(version, ecLevel);
    var buffer = new BitBuffer();
    buffer.put(4, 4); // Byte mode
    buffer.put(data.length, 8);
    for (var i = 0; i < data.length; i++) buffer.put(data.charCodeAt(i), 8);

    var totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error('code length overflow');

    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0xEC, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    return createBytes(buffer, rsBlocks);
  }

  function BitBuffer() { this.buffer = []; this.length = 0; }
  BitBuffer.prototype = {
    get: function (i) { return ((this.buffer[i >> 3] >>> (7 - i % 8)) & 1) === 1; },
    put: function (num, length) { for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1); },
    getLengthInBits: function () { return this.length; },
    putBit: function (bit) {
      var bufIndex = this.length >> 3;
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  };

  // RS Blocks table (Version 1-10, L/M/Q/H)
  var RS_BLOCK_TABLE = [
    [1, 26, 19], [1, 44, 34], [1, 70, 55], [1, 100, 80],
    [1, 134, 108], [1, 172, 136], [1, 196, 156], [1, 242, 194],
    [1, 292, 232], [1, 346, 274],
    [1, 26, 16], [1, 44, 28], [1, 70, 44], [2, 50, 32],
    [2, 67, 43], [4, 43, 27], [4, 45, 31], [2, 64, 51],
    [2, 67, 47], [4, 58, 38],
    [1, 26, 13], [1, 44, 22], [2, 35, 17], [2, 50, 24],
    [2, 67, 34], [2, 67, 34], [4, 45, 29], [4, 58, 36],
    [4, 58, 36], [4, 58, 36],
    [1, 26, 9], [1, 44, 16], [2, 35, 13], [2, 50, 18],
    [2, 67, 24], [4, 43, 16], [4, 45, 18], [4, 58, 22],
    [4, 58, 22], [4, 58, 22]
  ];

  function getRSBlocks(version, ecLevel) {
    var table = RS_BLOCK_TABLE[(ecLevel - 1) * 10 + (version - 1)];
    var list = [];
    for (var i = 0; i < table[0]; i++)
      list.push({ totalCount: table[1], dataCount: table[2] });
    return list;
  }

  function createBytes(buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0, maxEcCount = 0;
    var dcdata = [], ecdata = [];

    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      var dc = new Array(dcCount);
      for (var i = 0; i < dc.length; i++) dc[i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;

      var rsPoly = getErrorCorrectPolynomial(ecCount);
      var rawPoly = new Polynomial(dc, rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);

      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var i = 0; i < ecdata[r].length; i++) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
      dcdata[r] = dc;
    }

    var data = [];
    for (var i = 0; i < maxDcCount; i++)
      for (var r = 0; r < rsBlocks.length; r++)
        if (i < dcdata[r].length) data.push(dcdata[r][i]);
    for (var i = 0; i < maxEcCount; i++)
      for (var r = 0; r < rsBlocks.length; r++)
        if (i < ecdata[r].length) data.push(ecdata[r][i]);

    return data;
  }

  // QR Code 矩阵
  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  QRCodeModel.prototype = {
    addData: function (data) {
      this.dataList.push(data);
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col)
        throw new Error(row + ',' + col);
      return this.modules[row][col];
    },
    getModuleCount: function () { return this.moduleCount; },
    make: function () {
      if (this.typeNumber < 1) {
        var typeNumber = 1;
        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = getRSBlocks(typeNumber, this.errorCorrectLevel);
          var buffer = new BitBuffer();
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
          for (var i = 0; i < this.dataList.length; i++) {
            var data = this.dataList[i];
            buffer.put(4, 4);
            buffer.put(data.length, 8);
            for (var j = 0; j < data.length; j++) buffer.put(data.charCodeAt(j), 8);
          }
          if (buffer.getLengthInBits() <= totalDataCount * 8) break;
        }
        this.typeNumber = typeNumber;
      }
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var i = 0; i < this.moduleCount; i++) {
        this.modules[i] = new Array(this.moduleCount);
        for (var j = 0; j < this.moduleCount; j++) this.modules[i][j] = null;
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(true, 0);
      if (this.typeNumber >= 7) this.setupTypeNumber(true);
      if (this.dataCache === null)
        this.dataCache = createData(this.typeNumber, this.errorCorrectLevel, this.dataList.join(''));
      this.mapData(this.dataCache, 0);
    },
    setupPositionProbePattern: function (row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          this.modules[row + r][col + c] =
            (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
            (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4);
        }
      }
    },
    setupTimingPattern: function () {
      for (var r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] !== null) continue;
        this.modules[r][6] = (r % 2 === 0);
      }
      for (var c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] !== null) continue;
        this.modules[6][c] = (c % 2 === 0);
      }
    },
    setupPositionAdjustPattern: function () {
      var pos = [
        [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
        [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
      ];
      var p = pos[this.typeNumber - 1] || [];
      for (var i = 0; i < p.length; i++) {
        for (var j = 0; j < p.length; j++) {
          var row = p[i], col = p[j];
          if (this.modules[row][col] !== null) continue;
          for (var r = -2; r <= 2; r++)
            for (var c = -2; c <= 2; c++)
              this.modules[row + r][col + c] =
                r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
        }
      }
    },
    setupTypeNumber: function (test) {
      var bits = (function (t) {
        var data = t << 3, d = 0;
        for (var i = 0; i < 18; i++) {
          var mod = ((1 & (data >> i)) !== 0);
          if (i < 6) d = (d << 1) | (mod ? 1 : 0);
          else if (i < 12) d = (d << 1) | (mod ? 1 : 0);
          else d = (d << 1) | (mod ? 1 : 0);
        }
        return (d << 12) ^ data;
      })(this.typeNumber);
      for (var i = 0; i < 18; i++) {
        var mod = ((1 & (bits >> i)) !== 0);
        if (!test) mod = !mod;
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern;
      var bits = (function (d) {
        var data = d << 10, d = 0;
        for (var i = 0; i < 18; i++) {
          var mod = ((1 & (data >> i)) !== 0);
          if (i < 6) d = (d << 1) | (mod ? 1 : 0);
          else if (i < 12) d = (d << 1) | (mod ? 1 : 0);
          else d = (d << 1) | (mod ? 1 : 0);
        }
        return (d << 12) ^ data;
      })(data);
      for (var i = 0; i < 15; i++) {
        var mod = ((1 & (bits >> i)) !== 0);
        if (!test) mod = !mod;
        this.modules[i < 6 ? i : i + 1][8] = mod;
        this.modules[8][i < 8 ? this.moduleCount - 1 - i : this.moduleCount - 8 - (i - 7)] = mod;
      }
      this.modules[this.moduleCount - 8][8] = test ? true : (!test);
    },
    mapData: function (data, maskPattern) {
      var inc = -1, row = this.moduleCount - 1, bitIndex = 7, byteIndex = 0;
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              var dark = false;
              if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
              var mask = this.getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    },
    getMask: function (maskPattern, i, j) {
      switch (maskPattern) {
        case 0: return (i + j) % 2 === 0;
        case 1: return i % 2 === 0;
        case 2: return j % 3 === 0;
        case 3: return (i + j) % 3 === 0;
        case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case 5: return (i * j) % 2 + (i * j) % 3 === 0;
        case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
        case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
        default: throw new Error('bad maskPattern:' + maskPattern);
      }
    }
  };

  // 公开 API
  return {
    create: function (text, size, canvasId) {
      var ecLevel = 1; // M
      var qr = new QRCodeModel(0, ecLevel);
      qr.addData(text);
      qr.make();

      var count = qr.getModuleCount();
      var cellSize = Math.floor(size / count);
      var margin = Math.floor((size - cellSize * count) / 2);

      var ctx = wx.createCanvasContext(canvasId);
      ctx.setFillStyle('#FFFFFF');
      ctx.fillRect(0, 0, size, size);
      ctx.setFillStyle('#5C4A32');

      for (var row = 0; row < count; row++) {
        for (var col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
          }
        }
      }

      ctx.draw();
    }
  };
})();

module.exports = QRCode;