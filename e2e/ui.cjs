/**
 * 交互式 UI 验收：截图 + 真实点击 + 路由断言
 * 前置：cli auto --auto-port 9420；node scripts/dev-api.cjs
 */
const fs = require('fs')
const path = require('path')
const automator = require('miniprogram-automator')

const WS = process.argv[2] || 'ws://127.0.0.1:9420'
const SHOTS = path.resolve(__dirname, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

let pass = 0
let fail = 0
const fails = []

function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ✓ ' + name + (detail ? '  ' + detail : '')) }
  else { fail++; fails.push(name); console.log('  ✗ ' + name + (detail ? '  ' + detail : '')) }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const mp = await automator.connect({ wsEndpoint: WS })
  console.log('已连接模拟器')

  const shot = async (n) => mp.screenshot({ path: path.join(SHOTS, n + '.png') })
  const route = () => mp.evaluate(() => {
    const p = getCurrentPages()
    return p[p.length - 1].route
  })

  // 1. 首页
  await mp.reLaunch('/pages/index/index')
  await sleep(3500)
  await shot('01-index')
  let page = await mp.currentPage()
  const cat = await page.$('.category-name')
  check('首页工种渲染', !!cat, cat ? await cat.text() : '未找到 .category-name')

  // 2. 点工种 → 分类页
  const catItem = await page.$('.category-item')
  if (catItem) {
    await catItem.tap()
    await sleep(2000)
    const r = await route()
    check('点击工种跳转', r === 'pages/category/categoryJobs', r)
    await shot('02-category')
    await mp.navigateBack()
    await sleep(1200)
  } else {
    check('点击工种跳转', false, '无 .category-item')
  }

  // 3. 详情页（真实 id=j1）
  await mp.navigateTo('/pages/jobDetail/jobDetail?id=j1')
  await sleep(2500)
  let r = await route()
  check('详情页打开', r === 'pages/jobDetail/jobDetail', r)
  await shot('03-detail')
  const dp = await mp.currentPage()
  const dt = await dp.$('.job-title')
  check('详情页标题渲染', !!dt, dt ? await dt.text() : '空')
  const sal = await dp.$('.amount')
  check('详情页薪资渲染', !!sal, sal ? await sal.text() : '空')
  await mp.navigateBack()
  await sleep(1200)

  // 4. 搜索页
  await mp.reLaunch('/pages/jobSearch/jobSearch')
  await sleep(4000)
  await shot('04-search')
  const sp = await mp.currentPage()
  let anyItem = await sp.$('.item')
  if (!anyItem) { await sleep(2500); anyItem = await sp.$('.item') }
  check('搜索页有列表项', !!anyItem)

  // 5. 发布页
  await mp.navigateTo('/pages/employer/jobPost')
  await sleep(2000)
  await shot('05-publish')
  const pp = await mp.currentPage()
  const picker = await pp.$('.picker')
  check('发布页工种选择器渲染', !!picker, picker ? await picker.text() : '空')

  // 6. 个人中心
  await mp.switchTab('/pages/mine/mine')
  await sleep(2000)
  await shot('06-mine')

  // 7. 黑老板查询
  await mp.navigateTo('/pages/blacklist/query')
  await sleep(1800)
  await shot('07-blacklist')

  // 8. 培训
  await mp.navigateTo('/pages/training/training')
  await sleep(2000)
  await shot('08-training')
  const tp = await mp.currentPage()
  const course = await tp.$('.title')
  check('培训课程渲染', !!course, course ? await course.text() : '空')

  // 9. 保险
  await mp.navigateTo('/pages/mine/insurance')
  await sleep(2000)
  await shot('09-insurance')
  const ip = await mp.currentPage()
  const prod = await ip.$('.name')
  check('保险产品渲染', !!prod, prod ? await prod.text() : '空')

  // 10. 积分与余额
  await mp.navigateTo('/pages/wallet/index')
  await sleep(2200)
  await shot('10-wallet')
  const wp = await mp.currentPage()
  const pnum = await wp.$('.num')
  check('积分页渲染', !!pnum, pnum ? await pnum.text() : '空')

  // 11. 客服中心
  await mp.navigateTo('/pages/service/index')
  await sleep(1600)
  await shot('11-service')
  const svp = await mp.currentPage()
  const q = await svp.$('.q')
  check('客服 FAQ 渲染', !!q, q ? (await q.text()).slice(0, 16) : '空')

  // 12. 我的求职
  await mp.navigateTo('/pages/resume/my')
  await sleep(2200)
  await shot('12-resume')
  const rp = await mp.currentPage()
  const sec = await rp.$('.section-title')
  check('我的求职页渲染', !!sec, sec ? await sec.text() : '空')

  console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败')
  if (fails.length) console.log('失败项: ' + fails.join(' / '))
  await mp.disconnect()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('E2E 异常:', e.message); process.exit(1) })