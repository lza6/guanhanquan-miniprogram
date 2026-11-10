const automator = require('miniprogram-automator')
;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const r = await mp.evaluate(() => new Promise((res) => {
    wx.request({
      url: 'http://localhost:3001/api/jobs/list',
      method: 'GET',
      data: { page: 1, pageSize: 10 },
      success: (x) => res({ status: x.statusCode, total: x.data && x.data.data && x.data.data.total }),
      fail: (e) => res({ err: e.errMsg })
    })
  }))
  console.log('data 对象传参:', JSON.stringify(r))
  await mp.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
