const automator = require('miniprogram-automator')
;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const r = await mp.evaluate(() => new Promise((res) => {
    wx.request({
      url: 'http://localhost:3001/api/jobs/list?page=1&pageSize=10',
      method: 'GET',
      success: (x) => res({ ok: true, status: x.statusCode, total: x.data && x.data.data && x.data.data.total }),
      fail: (e) => res({ ok: false, err: e.errMsg })
    })
  }))
  console.log('模拟器内直连 API:', JSON.stringify(r))
  await mp.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
