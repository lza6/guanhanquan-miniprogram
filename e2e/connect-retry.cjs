const automator = require('miniprogram-automator')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
;(async () => {
  for (let i = 1; i <= 12; i++) {
    try {
      const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
      console.log('连接成功（第', i, '次尝试）')
      const page = await mp.reLaunch('/pages/index/index')
      await sleep(3000)
      console.log('首页路由:', page.path)
      await mp.disconnect()
      process.exit(0)
    } catch (e) {
      console.log('第', i, '次失败:', e.message.slice(0, 80))
      await sleep(6000)
    }
  }
  process.exit(1)
})()
