/**
 * 统一日志工具
 * 支持 info / warn / error 三个级别
 * 自动附带时间戳、云函数名、action 等上下文
 */

const LOG_LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
const CURRENT_LEVEL = LOG_LEVEL.INFO

function formatLog(level, funcName, action, message, data) {
  const now = new Date().toISOString()
  const log = {
    timestamp: now,
    level,
    funcName,
    action: action || 'unknown',
    message
  }
  if (data !== undefined) log.data = data
  return JSON.stringify(log)
}

module.exports = {
  info(funcName, action, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVEL.INFO) {
      console.log(formatLog('INFO', funcName, action, message, data))
    }
  },

  warn(funcName, action, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVEL.WARN) {
      console.warn(formatLog('WARN', funcName, action, message, data))
    }
  },

  error(funcName, action, message, err) {
    if (CURRENT_LEVEL <= LOG_LEVEL.ERROR) {
      console.error(formatLog('ERROR', funcName, action, message, {
        errorMessage: err && err.message,
        errorStack: err && err.stack
      }))
    }
  },

  /**
   * 统一错误处理包装器
   * 云函数入口直接 wrap 即可
   */
  async wrap(funcName, action, handler) {
    try {
      this.info(funcName, action, 'request start')
      const result = await handler()
      this.info(funcName, action, 'request success', { code: result && result.code })
      return result
    } catch (err) {
      this.error(funcName, action, 'request failed', err)
      return { code: -1, message: '服务器内部错误', error: err.message }
    }
  }
}
