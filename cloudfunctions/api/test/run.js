/**
 * 业务逻辑验收脚本（内存数据库）：
 *   node test/run.js
 * 覆盖：发布 → 审核 → 列表 → 详情 → 积分解锁 → 报名 → 录用 → 黑名单 → 置顶 → 收藏
 * 说明：验证的是云函数业务逻辑本身，不代表已与真实云环境联调。
 */
process.env.ADMIN_INIT_PASSWORD = process.env.ADMIN_INIT_PASSWORD || 'admin-test-pass'
process.env.PAY_SUB_MCH_ID = process.env.PAY_SUB_MCH_ID || 'mock-mch'

const mock = require('./mock-cloud')
const L = require('../lib')
const { handle } = require('../router')

let pass = 0
let fail = 0
const failures = []

function check(name, cond, extra) {
  if (cond) {
    pass++
    console.log('  ✓ ' + name)
  } else {
    fail++
    failures.push(name + (extra ? ' -> ' + JSON.stringify(extra) : ''))
    console.log('  ✗ ' + name + (extra ? '  ' + JSON.stringify(extra) : ''))
  }
}

async function call(openid, method, path, data, token) {
  mock.setOpenid(openid || '')
  return handle({
    cloud: mock.fakeSdk,
    openid: openid || '',
    path,
    method,
    data: data || {},
    token: token || '',
    isHttp: false
  })
}

async function main() {
  mock.reset()

  console.log('\n[1] 登录与用户初始化')
  let r = await call('emp1', 'POST', '/auth/login')
  check('新用户首次登录自动建号', r.success && r.data.user.id)

  console.log('\n[2] 发布招工信息')
  r = await call('emp1', 'POST', '/jobs/create', {
    title: '管工', categoryId: 'guandao', salary: 550, workArea: '新疆乌鲁木齐',
    duration: '工期到年底', certificateReq: '双证', accommodation: '管吃住',
    contactName: '张老板', contactPhone: '13900001111', techReq: '能包口'
  })
  check('发布成功并进入待审核', r.success && r.data.status === 0, r)
  const jobId = r.data.id

  r = await call('emp1', 'POST', '/jobs/create', { title: '焊工' })
  check('缺必填项被拒绝', !r.success && /缺少必填项/.test(r.message), r)

  console.log('\n[3] 审核前不可见')
  r = await call('w1', 'GET', '/jobs/list', {})
  check('待审核信息不出现在列表', r.success && r.data.total === 0, r.data && r.data.total)

  console.log('\n[4] 管理员审核')
  r = await call('', 'POST', '/admin/login', { username: 'admin', password: 'admin-test-pass' })
  check('首次登录用 ADMIN_INIT_PASSWORD 引导建号', r.success && r.data.token, r)
  const adminToken = r.data.token

  r = await call('', 'GET', '/admin/jobs', { status: 0 }, adminToken)
  check('后台看到待审核 1 条', r.success && r.data.total === 1, r.data && r.data.total)

  r = await call('', 'POST', '/admin/jobs/' + jobId + '/review', { pass: true }, adminToken)
  check('审核通过', r.success && r.data.status === 1, r)

  console.log('\n[5] 上线与详情')
  r = await call('w1', 'GET', '/jobs/list', {})
  check('列表可见 1 条', r.success && r.data.total === 1, r.data && r.data.total)
  check('列表不返回联系方式', r.data.records[0] && r.data.records[0].contactPhone === undefined)

  r = await call('w1', 'GET', '/jobs/list', { keyword: '管工' })
  check('关键词命中岗位名', r.success && r.data.total === 1, r.data && r.data.total)

  r = await call('w1', 'GET', '/jobs/list', { keyword: '不存在的词' })
  check('关键词无结果返回空', r.success && r.data.total === 0, r.data && r.data.total)

  r = await call('w1', 'GET', '/jobs/list', { minSalary: 500, maxSalary: 600 })
  check('薪资区间筛选生效', r.success && r.data.total === 1, r.data && r.data.total)

  r = await call('w1', 'GET', '/jobs/detail/' + jobId)
  check('详情默认隐藏手机号', r.success && r.data.contactUnlocked === false && /\*/.test(r.data.contactPhone), r.data && r.data.contactPhone)
  check('详情返回解锁所需积分', r.data.unlockCost === 5, r.data && r.data.unlockCost)

  console.log('\n[6] 积分不足时解锁')
  r = await call('w1', 'POST', '/jobs/contact/' + jobId)
  check('积分不足返回 402', !r.success && r.code === 402, r)

  console.log('\n[7] 签到与解锁')
  r = await call('w1', 'POST', '/wallet/sign-in')
  check('签到得 2 积分', r.success && r.data.points === 2, r.data)
  r = await call('w1', 'POST', '/wallet/sign-in')
  check('同一天重复签到被拦', !r.success && r.code === 409, r)

  await L.db().collection('users').where({ _openid: 'w1' }).update({ data: { points: 50 } })
  r = await call('w1', 'POST', '/jobs/contact/' + jobId)
  check('积分解锁成功返回明文手机号', r.success && r.data.contactPhone === '13900001111', r.data)
  check('解锁扣 5 积分', (await L.db().collection('users').where({ _openid: 'w1' }).limit(1).get()).data[0].points === 45)

  r = await call('w1', 'POST', '/jobs/contact/' + jobId)
  check('重复解锁不再扣分', r.success && (await L.db().collection('users').where({ _openid: 'w1' }).limit(1).get()).data[0].points === 45)

  console.log('\n[8] 报名与录用')
  r = await call('w1', 'POST', '/jobs/apply/' + jobId, { coverLetter: '10 年管工经验' })
  check('报名成功', r.success && r.data.status === 'pending', r)
  const appId = r.data.id

  r = await call('w1', 'POST', '/jobs/apply/' + jobId, {})
  check('重复报名被拦', !r.success && r.code === 400, r)

  r = await call('emp1', 'GET', '/jobs/applicants/list/' + jobId)
  check('老板能看到报名者', r.success && r.data.total === 1, r.data && r.data.total)

  r = await call('w1', 'GET', '/jobs/applicants/list/' + jobId)
  check('非发布者看不到报名列表', !r.success && r.code === 403, r)

  r = await call('emp1', 'POST', '/jobs/applicants/accept/' + jobId + '/' + appId)
  check('录用成功', r.success && r.data.status === 'accepted', r)
  const notif = await L.db().collection('notifications').where({ openid: 'w1' }).get()
  check('工人收到录用通知', notif.data.length === 1, notif.data.length)

  console.log('\n[9] 黑老板库')
  r = await call('w1', 'POST', '/blacklist/submit', {
    bossPhone: '13900001111', bossName: '张', reasonType: 1, reasonDetail: '干完活三个月不给工资，电话不接'
  })
  check('提交标记进入待审核', r.success && r.data.status === 0, r)
  const blId = r.data.id

  r = await call('w1', 'POST', '/blacklist/submit', {
    bossPhone: '13900001111', reasonType: 1, reasonDetail: '同一件事我又提交了一次，内容和上一条完全一样'
  })
  check('同一人重复提交被拦', !r.success && r.code === 409, r)

  r = await call('w2', 'GET', '/blacklist/query', { phone: '13900001111' })
  check('未审核前查询为空', r.success && r.data.count === 0, r.data && r.data.count)

  r = await call('', 'POST', '/admin/blacklist/' + blId + '/review', { pass: true }, adminToken)
  check('管理员确认标记', r.success && r.data.status === 1, r)

  r = await call('w2', 'GET', '/blacklist/query', { phone: '13900001111' })
  check('已确认标记可查到次数', r.success && r.data.count === 1, r.data && r.data.count)
  check('返回原因分类', r.data.reasons[0] && r.data.reasons[0].name === '欠薪/拖薪', r.data && r.data.reasons)
  check('不返回举报人信息', JSON.stringify(r.data).indexOf('w1') < 0)

  console.log('\n[10] 置顶与收藏')
  await L.db().collection('users').where({ _openid: 'emp1' }).update({ data: { points: 100 } })
  r = await call('emp1', 'POST', '/jobs/top/' + jobId)
  check('置顶扣 30 积分', r.success && r.data.cost === 30, r)
  const empUser = (await L.db().collection('users').where({ _openid: 'emp1' }).limit(1).get()).data[0]
  check('置顶后余额 70', empUser.points === 70, empUser.points)

  r = await call('w1', 'POST', '/favorites/toggle', { jobId })
  check('收藏成功', r.success && r.data.favorited === true, r)
  r = await call('w1', 'GET', '/favorites/list')
  check('收藏列表有 1 条', r.success && r.data.total === 1, r.data && r.data.total)
  r = await call('w1', 'POST', '/favorites/toggle', { jobId })
  check('再次点击取消收藏', r.success && r.data.favorited === false, r)

  console.log('\n[11] 边界')
  r = await call('w1', 'GET', '/not-exist')
  check('未知路由返回 404', !r.success && r.code === 404, r)

  r = await call('w3', 'GET', '/jobs/detail/nonexistent')
  check('不存在的岗位返回 404', !r.success && r.code === 404, r)

  r = await call('', 'GET', '/users/profile')
  check('未登录访问需登录接口返回 401', !r.success && r.code === 401, r)

  r = await call('', 'GET', '/admin/overview', {}, 'bad.token')
  check('伪造管理员令牌被拒绝', !r.success && r.code === 401, r)

  console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败')
  if (fail) {
    console.log('失败项:')
    failures.forEach((f) => console.log('  - ' + f))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('运行异常:', e)
  process.exit(1)
})