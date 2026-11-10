const automator = require('miniprogram-automator')
;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  await mp.reLaunch('/pages/jobSearch/jobSearch')
  await new Promise(r => setTimeout(r, 3500))
  const info = await mp.evaluate(() => {
    const p = getCurrentPages().slice(-1)[0]
    const proto = Object.getPrototypeOf(p) || {}
    return {
      keys: Object.keys(p),
      hasFetch: typeof p.fetchTasks,
      protoKeys: Object.getOwnPropertyNames(proto).slice(0, 20)
    }
  })
  console.log(JSON.stringify(info))
  await mp.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
