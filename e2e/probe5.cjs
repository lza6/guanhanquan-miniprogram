const automator = require('miniprogram-automator')
;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  await mp.reLaunch('/pages/jobSearch/jobSearch')
  await new Promise(r => setTimeout(r, 4500))
  const dump = await mp.evaluate(() => {
    const p = getCurrentPages().slice(-1)[0]
    const out = {}
    Object.keys(p.data).forEach((k) => {
      const v = p.data[k]
      if (Array.isArray(v)) out[k] = 'array(' + v.length + ')'
      else if (typeof v === 'string' && v.length < 20) out[k] = v
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v
    })
    return out
  })
  console.log(JSON.stringify(dump))
  await mp.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
