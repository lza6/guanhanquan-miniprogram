import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

/**
 * 本地开发时用内存版云数据库直接跑云函数 handler，
 * 免去部署即可验证后台交互。生产构建不会包含这段逻辑。
 */
function localCloudMock() {
  return {
    name: 'ghq-local-cloud',
    apply: 'serve',
    configureServer(server) {
      // 仅供本地开发：让首次登录可以引导创建管理员
      process.env.ADMIN_INIT_PASSWORD = process.env.ADMIN_INIT_PASSWORD || 'dev-admin-pass'
      process.env.PAY_SUB_MCH_ID = process.env.PAY_SUB_MCH_ID || 'dev-mch'
      const mock = require(path.resolve(__dirname, '../cloudfunctions/api/test/mock-cloud.js'))
      if (process.env.GHQ_DEV_SEED !== '0') mock.seedDemo()
      const { handle } = require(path.resolve(__dirname, '../cloudfunctions/api/router.js'))

      server.middlewares.use('/api', async (req, res) => {
        let raw = ''
        req.on('data', (c) => { raw += c })
        req.on('end', async () => {
          let data = {}
          try { data = raw ? JSON.parse(raw) : {} } catch (e) { data = {} }
          const url = new URL(req.url, 'http://localhost')
          Object.assign(data, Object.fromEntries(url.searchParams.entries()))

          const auth = req.headers.authorization || ''
          const result = await handle({
            cloud: mock.fakeSdk,
            openid: 'dev-openid',
            path: url.pathname,
            method: (req.method || 'GET').toUpperCase(),
            data,
            token: auth.replace(/^Bearer\s+/i, ''),
            isHttp: true
          })

          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(result))
        })
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), localCloudMock()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  server: {
    port: 5174,
    proxy: {}
  }
})