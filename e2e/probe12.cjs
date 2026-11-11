const automator = require('miniprogram-automator')
;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const r = await mp.evaluate(() => {
    const u = wx.getStorageSync('ghq_user')
    return { stored: u ? { nickname: u.nickname, id: u.id } : null, base: (typeof getApp !== 'undefined' && getApp()) ? 'app ok' : 'no app' }
  })
  console.log(JSON.stringify(r))
  const req = await mp.evaluate(() => new Promise((res) => {
    wx.request({ url: 'http://localhost:3001/api/users/profile', header: { 'X-Openid': 'dev-openid' }, success: (x) => res({ s: x.statusCode, d: x.data && x.data.data && x.data.data.nickname, m: x.data && x.data.message }), fail: (e) => res({ err: e.errMsg }) })
  }))
  console.log('profile 直连:', JSON.stringify(req))
  await mp.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
