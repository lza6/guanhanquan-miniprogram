const path = require('path')
const automator = require('miniprogram-automator')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  for (const [p, name] of [['/pages/index/index','n1-index'],['/pages/jobDetail/jobDetail?id=j1','n2-detail'],['/pages/message/index','n3-message']]) {
    await (p.indexOf('index/index') > 0 ? mp.reLaunch(p) : mp.navigateTo(p))
    await sleep(2500)
    await mp.screenshot({ path: path.join(__dirname, 'shots', name + '.png') })
  }
  console.log('ok')
  await mp.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
