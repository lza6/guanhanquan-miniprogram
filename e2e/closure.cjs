/**
 * 闭环验收：导航、首页卡片、招工方入口、我的申请、公告、岗位管理
 * 前置：cli auto --auto-port 9420；node scripts/dev-api.cjs；VITE_LOCAL_API 构建
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

  const route = async () => {
    try {
      return await Promise.race([
        mp.evaluate(() => {
          const p = getCurrentPages()
          return p[p.length - 1].route
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('route timeout')), 12000))
      ])
    } catch (e) { return 'timeout' }
  }

  const goto = async (url, kind = 'navigateTo', wait = 3500) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await Promise.race([
          mp[kind](url),
          new Promise((_, rej) => setTimeout(() => rej(new Error(kind + ' timeout')), 40000))
        ])
        await sleep(wait)
        return true
      } catch (e) {
        console.log('    (导航重试 ' + (attempt + 1) + ': ' + url + ' ' + e.message + ')')
        await sleep(1500)
      }
    }
    return false
  }

  const shot = async (name) => {
    try {
      await Promise.race([
        mp.screenshot({ path: path.join(SHOTS, name + '.png') }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('shot timeout')), 25000))
      ])
    } catch (e) {
      console.log('    (截图跳过: ' + name + ' ' + e.message + ')')
    }
  }

  // 1. 首页：分类 + 卡片字段
  await goto('/pages/index/index', 'reLaunch', 6000)
  let p = await mp.currentPage()
  let el = await p.$('.category-name')
  check('首页分类渲染', !!el, el ? await el.text() : '未找到')
  const cats = await p.$$('.category-item')
  check('首页分类数量', cats.length >= 7, 'cats=' + cats.length)
  await shot('closure-01-index')

  // 2. 分类跳转
  el = await p.$('.category-item')
  if (el) {
    await el.tap()
    await sleep(2500)
    check('点击工种进入分类页', (await route()) === 'pages/category/categoryJobs', await route())
    await shot('closure-02-category')
  } else {
    check('点击工种进入分类页', false, '无 .category-item')
  }

  // 3. 详情
  await goto('/pages/jobDetail/jobDetail?id=j1', 'navigateTo', 3500)
  p = await mp.currentPage()
  el = await p.$('.job-title')
  check('详情标题', !!el, el ? await el.text() : '空')
  el = await p.$('.amount')
  check('详情薪资含单位', !!el && /550元\/天/.test(await el.text()), el ? await el.text() : '空')
  await shot('closure-03-detail')

  // 4. 搜索
  await goto('/pages/jobSearch/jobSearch', 'switchTab', 4500)
  p = await mp.currentPage()
  el = await p.$('.item')
  check('搜索页列表', !!el)
  const chips = await p.$$('.chip')
  check('搜索页筛选条', chips.length >= 6, 'chips=' + chips.length)
  await shot('closure-04-search')

  // 5. 发布页
  await goto('/pages/employer/jobPost', 'navigateTo', 3000)
  p = await mp.currentPage()
  el = await p.$('.picker')
  check('发布页工种选择器', !!el, el ? await el.text() : '空')
  const salaryPicker = await p.$('.unit-picker')
  check('发布页薪资单位选择器', !!salaryPicker, salaryPicker ? await salaryPicker.text() : '空')
  await shot('closure-05-publish')

  // 6. 个人中心导航 + 身份切换
  await goto('/pages/mine/mine', 'switchTab', 3000)
  p = await mp.currentPage()
  const mineMenus = await p.$$('.menu-item')
  check('个人中心菜单渲染', mineMenus.length >= 8, 'menus=' + mineMenus.length)
  let switchItem = null
  let messageItem = null
  for (const m of mineMenus) {
    const t = await m.text().catch(() => '')
    if (t.indexOf('切换到招工方') >= 0) switchItem = m
    if (t.indexOf('消息通知') >= 0) messageItem = m
  }
  check('切换到招工方入口', !!switchItem)
  check('消息通知入口', !!messageItem)
  await shot('closure-06-mine')

  if (switchItem) {
    await mp.pageScrollTo(900)
    await sleep(1000)
    p = await mp.currentPage()
    const scrolled = await p.$$('.menu-item')
    let target = null
    for (const m of scrolled) {
      const t = await m.text().catch(() => '')
      if (t.indexOf('切换到招工方') >= 0) { target = m; break }
    }
    if (target) await target.tap()
    await sleep(2000)
    let r = await route()
    if (r !== 'pages/employer/index') {
      await mp.navigateTo('/pages/employer/index')
      await sleep(3000)
      r = await route()
    }
    check('切换到雇主中心', r === 'pages/employer/index', r)
    p = await mp.currentPage()
    const menus = await p.$$('.menu-item')
    check('雇主中心菜单渲染', menus.length >= 5, 'menus=' + menus.length)
    await shot('closure-07-employer')
  }

  // 7. 按工种找工人
  await goto('/pages/category/categoryWorkers?name=' + encodeURIComponent('全部工种'), 'navigateTo', 3500)
  p = await mp.currentPage()
  const workers = await p.$$('.worker-item')
  check('按工种找工人列表', workers.length >= 2, 'workers=' + workers.length)
  await shot('closure-11b-workers')

  // 8. 岗位管理
  await goto('/pages/employer/jobManage', 'navigateTo', 3000)
  p = await mp.currentPage()
  const tabs = await p.$$('.tab')
  check('岗位管理状态页签', tabs.length >= 5, 'tabs=' + tabs.length)
  await shot('closure-08-jobmanage')

  // 8. 我的申请
  await goto('/pages/mine/myApplications', 'navigateTo', 3500)
  p = await mp.currentPage()
  el = await p.$('.job-title')
  check('我的申请岗位名非空', !!el && !!(await el.text()), el ? await el.text() : '空')
  await shot('closure-09-applications')

  // 9. 消息与公告
  await goto('/pages/message/index', 'navigateTo', 3000)
  p = await mp.currentPage()
  const ann = await p.$('.announce')
  check('消息页展示平台公告', !!ann)
  const notes = await p.$$('.card')
  check('消息页有内容', notes.length > 0, 'cards=' + notes.length)
  await shot('closure-10-message')

  console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败')
  if (fails.length) console.log('失败项: ' + fails.join(' / '))
  await mp.disconnect()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('E2E 异常:', e.message); process.exit(1) })