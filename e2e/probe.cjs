const automator = require('miniprogram-automator')

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  await mp.reLaunch('/pages/index/index')
  await new Promise((r) => setTimeout(r, 4000))

  const probe = await mp.evaluate(() => {
    const pages = getCurrentPages()
    const p = pages[pages.length - 1]
    return {
      route: p && p.route,
      keys: p ? Object.keys(p.data) : [],
      categories: p && p.data.categories,
      jobs: p && (p.data.recommendJobs || p.data.latestJobs)
    }
  })
  console.log(JSON.stringify(probe, null, 2).slice(0, 1500))

  const page = await mp.currentPage()
  const el = await page.$('.category-name')
  if (el) console.log('首个分类元素文本:', await el.text())
  else console.log('未找到 .category-name')

  await mp.disconnect()
  process.exit(0)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })