/**
 * wx-server-sdk 的 mock 实现
 * 用于单元测试环境，避免依赖真实的微信云开发 SDK
 */

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  add: jest.fn().mockResolvedValue({ _id: 'mock_id' }),
  get: jest.fn().mockResolvedValue({ data: [] }),
  update: jest.fn().mockResolvedValue({}),
  remove: jest.fn().mockResolvedValue({}),
  orderBy: jest.fn().mockReturnThis(),
  command: {
    inc: jest.fn(),
  },
  serverDate: jest.fn().mockReturnValue(new Date()),
}

const mockCloud = {
  init: jest.fn(),
  database: jest.fn().mockReturnValue(mockDb),
  getWXContext: jest.fn().mockReturnValue({
    OPENID: 'mock_openid',
    APPID: 'mock_appid',
    UNIONID: 'mock_unionid',
  }),
  DYNAMIC_CURRENT_ENV: 'mock_env',
}

module.exports = mockCloud
