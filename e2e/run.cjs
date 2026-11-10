/**
 * 管焊圈小程序 E2E 验收（miniprogram-automator）
 * 前置：cli.bat auto --project <root> --auto-port 9420
 * 用法：node run.cjs [ws://127.0.0.1:9420]
 */
const fs = require('fs')
const path = require('path')
const automator = require('miniprogram-automator')

const WS = process.argv[2] || 'ws://127.0.0.1:9420'
const SHOTS = path.resolve(__dirname, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

const results = []
const errors = []

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (detail ? '  ' + detail : ''))
}

async function shot(miniProgram, name) {
  const file = path.join(SHOTS, name + '.png')
  await miniProgram.screenshot({ path: file })
  return file
}

;(async () => {
  const mp = await automator.connect({ wsEndpoint: WS })
  console.log('已连接模拟器')

  mp.on('console', (msg) => {
    if (msg.type === 'error') errors.push(String(msg.args && msg.args.join(' ')))
  })
  mp.on('exception', (e) => errors.push('exception: ' + JSON.stringify(e)))

  // 1. 首页
  let page = await mp.reLaunch('/pages/index/index')
  await page.waitFor(2500)
  const home = await page.data()
  await shot(mp, '01-index')
  record('首页渲染', Array.isArray(home.categories) && home.categories.length > 0,
    '工种 ' + (home.categories || []).length + ' 个')
  const job0 = (home.recommendJobs || [])[0] || (home.latestJobs || [])[0]
  record('首页岗位数据', !!job0, job0 ? job0.title + ' ' + job0.salary : '无')

  // 2. 搜索页
  page = await mp.navigateTo('/pages/jobSearch/jobSearch')
  await page.waitFor(2000)
  const search = await page.data()
  await shot(mp, '02-search')
  record('搜索页列表', (search.taskList || []).length > 0, '任务 ' + (search.taskList || []).length + ' 条')

  // 3. 详情页（用首页第一条的 id）
  if (job0 && job0.id) {
    page = await mp.navigateTo('/pages/jobDetail/jobDetail?id=' + job0.id)
    await page.waitFor(2000)
    const detail = await page.data()
    await shot(mp, '03-detail')
    record('详情页加载', !!detail.job, detail.job ? detail.job.title + ' / ' + detail.job.salary : '空')
    record('详情页手机号默认隐藏', detail.job && detail.job.contactUnlocked === false,
      detail.job ? detail.job.contactPhone : '')
  }

  // 4. 黑老板查询
  page = await mp.navigateTo('/pages/blacklist/query')
  await page.waitFor(1200)
  await shot(mp, '04-blacklist')
  record('黑老板查询页渲染', true)

  // 5. 培训
  page = await mp.navigateTo('/pages/training/training')
  await page.waitFor(1500)
  const tr = await page.data()
  await shot(mp, '05-training')
  record('培训课程列表', (tr.courses || []).length > 0, '课程 ' + (tr.courses || []).length + ' 门')

  // 6. 保险
  page = await mp.navigateTo('/pages/mine/insurance')
  await page.waitFor(1500)
  const ins = await page.data()
  await shot(mp, '06-insurance')
  record('保险产品列表', (ins.products || []).length > 0, '产品 ' + (ins.products || []).length + ' 个')

  // 7. 反馈
  page = await mp.navigateTo('/pages/mine/feedback')
  await page.waitFor(1200)
  await shot(mp, '07-feedback')
  record('反馈页渲染', true)

  // 8. 个人中心
  page = await mp.switchTab('/pages/mine/mine')
  await page.waitFor(1500)
  await shot(mp, '08-mine')
  record('个人中心渲染', true)

  // 9. 发布页
  page = await mp.navigateTo('/pages/employer/jobPost')
  await page.waitFor(1500)
  const post = await page.data()
  await shot(mp, '09-publish')
  record('发布页工种加载', (post.categories || []).length > 0, '工种 ' + (post.categories || []).length + ' 个')

  // 10. 登录页
  page = await mp.navigateTo('/pages/login/login')
  await page.waitFor(1200)
  await shot(mp, '10-login')
  record('登录页渲染', true)

  console.log('\n控制台错误 ' + errors.length + ' 条')
  errors.slice(0, 10).forEach((e) => console.log('  ! ' + e.slice(0, 160)))

  const failed = results.filter((r) => !r.ok)
  console.log('\n结果: ' + (results.length - failed.length) + ' 通过, ' + failed.length + ' 失败')
  await mp.disconnect()
  process.exit(failed.length ? 1 : 0)
})().catch((e) => {
  console.error('E2E 失败:', e.message)
  process.exit(1)
})