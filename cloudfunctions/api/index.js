const cloud = require('wx-server-sdk')
const { handle } = require('./router')
const { parseHttpEvent } = require('./lib')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  let req
  if (event && event.httpMethod) {
    // 云函数 HTTP 访问服务（管理后台走这条）
    req = parseHttpEvent(event)
  } else {
    // 小程序 wx.cloud.callFunction
    req = {
      path: event.path || '/',
      method: (event.method || 'GET').toUpperCase(),
      data: event.data || {},
      token: event.token || ''
    }
  }

  const wxContext = cloud.getWXContext()
  const ctx = {
    cloud,
    openid: wxContext.OPENID || '',
    appid: wxContext.APPID || '',
    unionid: wxContext.UNIONID || '',
    path: req.path,
    method: req.method,
    data: req.data,
    token: req.token,
    isHttp: !!(event && event.httpMethod)
  }

  return handle(ctx)
}