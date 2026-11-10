/**
 * 本地联调用的 API 服务：直接跑 cloudfunctions 里的同一套 handler + 内存数据库。
 * 用途：没有 AppID / 云环境时，让小程序在开发者工具里也能走完整的真实逻辑。
 *
 *   node scripts/dev-api.js            # 默认 3001 端口
 *   GHQ_DEV_SEED=0 node scripts/dev-api.js
 */
process.env.ADMIN_INIT_PASSWORD = process.env.ADMIN_INIT_PASSWORD || 'dev-admin-pass'
process.env.PAY_SUB_MCH_ID = process.env.PAY_SUB_MCH_ID || 'dev-mch'
process.env.CONTACT_KEY = process.env.CONTACT_KEY || 'dev-contact-key'
process.env.PHONE_SALT = process.env.PHONE_SALT || 'dev-phone-salt'

const http = require('http')
const path = require('path')

const root = path.resolve(__dirname, '..')
const mock = require(path.join(root, 'cloudfunctions/api/test/mock-cloud.js'))
if (process.env.GHQ_DEV_SEED !== '0') mock.seedDemo()
const { handle } = require(path.join(root, 'cloudfunctions/api/router.js'))

const PORT = Number(process.env.PORT || 3001)

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Openid')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  let raw = ''
  req.on('data', (c) => { raw += c })
  req.on('end', async () => {
    let data = {}
    try { data = raw ? JSON.parse(raw) : {} } catch (e) { data = {} }

    const url = new URL(req.url, 'http://localhost')
    let apiPath = url.pathname
    if (apiPath.startsWith('/api')) apiPath = apiPath.slice(4)

    Object.assign(data, Object.fromEntries(url.searchParams.entries()))

    const auth = req.headers.authorization || ''
    const openid = req.headers['x-openid'] || 'dev-openid'

    let result
    try {
      result = await handle({
        cloud: mock.fakeSdk,
        openid,
        path: apiPath,
        method: req.method,
        data,
        token: auth.replace(/^Bearer\s+/i, ''),
        isHttp: true
      })
    } catch (e) {
      result = { success: false, code: 500, message: e.message, data: null }
    }

    const body = JSON.stringify(result)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(body)
    if (process.env.GHQ_DEV_LOG === '1') {
      console.log(req.method, apiPath, '->', result.success ? 'ok' : result.message)
    }
  })
})

server.listen(PORT, () => {
  console.log('本地 API 已启动: http://localhost:' + PORT + '/api')
  console.log('演示数据: ' + (process.env.GHQ_DEV_SEED === '0' ? '关闭' : '已注入'))
})