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
  check('未绑手机号报名被拦', !r.success && r.code === 400, r)
  r = await call('w1', 'POST', '/auth/bind-phone', { code: 'mock-phone-code' })
  check('绑定手机号成功', r.success && r.data.phone === '13800000000', r)
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
    bossPhone: '13900001111', bossName: '张', reasonType: 1,
    reasonDetail: '干完活三个月不给工资，电话不接', evidence: ['cloud://evidence1.jpg']
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
  r = await call('', 'GET', '/admin/blacklist', {}, adminToken)
  const blRow = (r.data.records || []).find((x) => x.id === blId)
  check('后台保留证据图', !!blRow && (blRow.evidence || []).length === 1, blRow && blRow.evidence)

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

console.log('\n[11] 薪资单位、有效期与状态')
  r = await call('emp1', 'POST', '/jobs/create', {
    title: '小时工', categoryId: 'hanjie', salary: 30, salaryUnit: 2, validDays: 15,
    workArea: '沈阳', contactName: '张', contactPhone: '13900001111'
  })
  check('薪资单位与有效期入库', r.success && r.data.expireAt > Date.now() + 14 * 86400000, r.data)
  const hourlyId = r.data.id
  await call('', 'POST', '/admin/jobs/' + hourlyId + '/review', { pass: true }, adminToken)
  r = await call('w1', 'GET', '/jobs/detail/' + hourlyId)
  check('详情返回小时薪单位', r.success && r.data.salaryUnit === 2, r.data && r.data.salaryUnit)
  r = await call('w1', 'GET', '/jobs/list', { keyword: '小时工' })
  check('列表返回小时薪单位', r.success && r.data.records[0].salaryUnit === 2, r.data && r.data.records[0])

  await L.db().collection('jobs').doc(hourlyId).update({ data: { expireAt: Date.now() - 1000 } })
  r = await call('w1', 'GET', '/jobs/list', { keyword: '小时工' })
  check('过期岗位不出现在列表', r.success && r.data.total === 0, r.data && r.data.total)
  r = await call('w1', 'GET', '/jobs/detail/' + hourlyId)
  check('过期岗位详情拒绝访问', !r.success && r.code === 404, r)
  const expiredDoc = (await L.db().collection('jobs').doc(hourlyId).get()).data
  check('过期岗位状态置 3', expiredDoc.status === 3, expiredDoc.status)

  await L.db().collection('jobs').doc(jobId).update({ data: { isTop: true, topExpireAt: Date.now() - 1000 } })
  r = await call('w1', 'GET', '/jobs/list', { keyword: '管工' })
  check('置顶到期不再展示置顶', r.success && r.data.records[0] && r.data.records[0].isTop === false, r.data && r.data.records[0])
  const topDoc = (await L.db().collection('jobs').doc(jobId).get()).data
  check('置顶到期写回 isTop=false', topDoc.isTop === false, topDoc.isTop)

  r = await call('emp1', 'POST', '/jobs/status/' + jobId, { status: 2 })
  check('暂停岗位成功', r.success && r.data.status === 2, r)
  r = await call('w1', 'GET', '/jobs/list', { keyword: '管工' })
  check('暂停后列表不可见', r.success && r.data.total === 0, r.data && r.data.total)
  r = await call('emp1', 'POST', '/jobs/status/' + jobId, { status: 1 })
  check('恢复岗位成功', r.success && r.data.status === 1, r)

  await L.db().collection('users').where({ _openid: 'emp1' }).update({ data: { points: 100 } })
  const priorityBefore = (await L.db().collection('jobs').doc(jobId).get()).data.priorityAt
  r = await call('emp1', 'POST', '/jobs/refresh/' + jobId)
  check('刷新岗位扣 5 积分', r.success && r.data.cost === 5, r)
  const priorityAfter = (await L.db().collection('jobs').doc(jobId).get()).data.priorityAt
  check('刷新后排序时间前进', priorityAfter >= priorityBefore, priorityAfter - priorityBefore)

  r = await call('emp1', 'PUT', '/jobs/update/' + jobId, { title: '管工改', salary: 560 })
  check('编辑后回到待审核', r.success && r.data.status === 0, r)
  r = await call('w1', 'GET', '/jobs/list', { keyword: '管工改' })
  check('待审核编辑不展示', r.success && r.data.total === 0, r.data && r.data.total)
  await call('', 'POST', '/admin/jobs/' + jobId + '/review', { pass: true }, adminToken)

  console.log('\n[12] 报名状态与重复操作')
  r = await call('w2', 'POST', '/auth/bind-phone', { code: 'mock-phone-code' })
  check('第二个工人绑定手机号', r.success, r)
  r = await call('w2', 'POST', '/jobs/apply/' + jobId, {})
  check('第二个工人报名成功', r.success, r)
  const app2 = r.data.id
  r = await call('w2', 'POST', '/jobs/applications/cancel/' + jobId + '/' + app2)
  check('取消报名成功', r.success && r.data.status === 'cancelled', r)
  r = await call('w2', 'GET', '/jobs/check-application/' + jobId)
  check('取消后 check 返回未报名', r.success && r.data.applied === false, r.data)
  r = await call('w2', 'POST', '/jobs/apply/' + jobId, {})
  check('取消后可重新报名', r.success, r)
  const app3 = r.data.id
  r = await call('emp1', 'POST', '/jobs/applicants/accept/' + jobId + '/' + app3)
  check('录用成功', r.success && r.data.status === 'accepted', r)
  r = await call('emp1', 'POST', '/jobs/applicants/accept/' + jobId + '/' + app3)
  check('重复录用返回 409', !r.success && r.code === 409, r)

  console.log('\n[13] 实名与企业认证审核')
  const rnUser = 'rn_' + Date.now()
  r = await call(rnUser, 'GET', '/users/profile')
  check('新用户实名状态为未提交', r.success && r.data.realNameStatus === -1, r.data && r.data.realNameStatus)
  r = await call(rnUser, 'POST', '/users/real-name', { realName: '王五', idCard: '210101199001011234' })
  check('提交实名进入待审核', r.success && r.data.status === 0, r)
  r = await call(rnUser, 'GET', '/users/profile')
  check('实名待审核状态回显', r.success && r.data.realNameStatus === 0 && r.data.realNameVerified === false, r.data)
  r = await call('', 'GET', '/admin/verifications', { type: 'real', status: 0 }, adminToken)
  const rnRow = (r.data.records || []).find((x) => x.openid === rnUser)
  check('后台实名待审列表可见', !!rnRow, r.data && r.data.total)
  r = await call('', 'POST', '/admin/verifications/' + rnRow.id + '/review', { type: 'real', pass: true }, adminToken)
  check('实名审核通过', r.success && r.data.status === 1, r)
  r = await call(rnUser, 'GET', '/users/profile')
  check('审核后实名已认证', r.success && r.data.realNameVerified === true && r.data.realNameStatus === 1, r.data)

  const entUser = 'ent_' + Date.now()
  r = await call(entUser, 'PUT', '/employers/profile', {
    companyName: '测试安装公司', creditCode: '91210100MA0X000000',
    license: 'cloud://license.jpg', address: '沈阳', contactName: '李'
  })
  check('企业资料提交成功', r.success && r.data.status === 0, r)
  r = await call('', 'GET', '/admin/verifications', { type: 'enterprise', status: 0 }, adminToken)
  const entRow = (r.data.records || []).find((x) => x.openid === entUser)
  check('后台企业待审列表可见', !!entRow, r.data && r.data.total)
  r = await call('', 'POST', '/admin/verifications/' + entRow.id + '/review', { type: 'enterprise', pass: true }, adminToken)
  check('企业审核通过', r.success && r.data.status === 1, r)
  r = await call(entUser, 'GET', '/employers/profile')
  check('企业认证状态已通过', r.success && r.data.verified === true && r.data.enterpriseStatus === 1, r.data)
  r = await call(entUser, 'POST', '/jobs/create', {
    title: '认证雇主岗位', categoryId: 'guandao', salary: 500, workArea: '沈阳',
    contactName: '李', contactPhone: '13900003333'
  })
  const entJobId = r.data.id
  r = await call(entUser, 'GET', '/jobs/detail/' + entJobId)
  check('认证雇主岗位带认证标识', r.success && r.data.employerVerified === true, r.data && r.data.employerVerified)

  console.log('\n[14] 简历审核、照片与电话加密')
  const rwUser = 'rw_' + Date.now()
  await call(rwUser, 'POST', '/auth/bind-phone', { code: 'mock-phone-code' })
  r = await call(rwUser, 'PUT', '/workers/profile/update', {
    name: '测试焊工', jobTypes: ['焊工'], certificateInfo: '双证',
    certificateImages: ['cloud://cert1.jpg'], workExperience: '5 年',
    techDescription: '氩电焊', expectArea: '沈阳', expectSalary: '600/天',
    availableTime: '随时到岗', contactPhone: '13800000000'
  })
  check('简历提交进入待审核', r.success && r.data.reviewStatus === 0, r.data && r.data.reviewStatus)
  check('证书照片入库', r.success && (r.data.certificateImages || []).length === 1, r.data && r.data.certificateImages)
  const resumeId = r.data.id
  const resumeDoc = (await L.db().collection('resumes').doc(resumeId).get()).data
  check('简历手机号加密存储', !!resumeDoc.contactPhoneEnc && !resumeDoc.contactPhone, Object.keys(resumeDoc))
  r = await call('emp_demo', 'GET', '/workers/list')
  check('待审简历不出现在工人列表', r.success && !(r.data.records || []).some((x) => x.name === '测试焊工'), r.data && r.data.total)
  r = await call('', 'GET', '/admin/resumes', { status: 0 }, adminToken)
  const resumeRow = (r.data.records || []).find((x) => x.id === resumeId)
  check('后台简历待审列表可见', !!resumeRow, r.data && r.data.total)
  r = await call('', 'POST', '/admin/resumes/' + resumeId + '/review', { pass: true }, adminToken)
  check('简历审核通过', r.success && r.data.reviewStatus === 1, r)
  r = await call('emp_demo', 'GET', '/workers/list')
  check('审核后简历进入工人列表', r.success && (r.data.records || []).some((x) => x.name === '测试焊工'), r.data && r.data.total)
  r = await call(entUser, 'GET', '/workers/detail/' + resumeId)
  check('雇主查看简历得到完整手机号', r.success && r.data.contactPhone === '13800000000', r.data && r.data.contactPhone)
  r = await call('w_demo2', 'GET', '/workers/detail/' + resumeId)
  check('其他工人查看简历手机号脱敏', r.success && /\*/.test(r.data.contactPhone), r.data && r.data.contactPhone)
  r = await call(rwUser, 'DELETE', '/workers/profile')
  check('删除简历成功', r.success && r.data.deleted === true, r)
  r = await call('emp_demo', 'GET', '/workers/list')
  check('删除后简历不在列表', r.success && !(r.data.records || []).some((x) => x.name === '测试焊工'), r.data && r.data.total)

  console.log('\n[15] 公告、统计与财务')
  r = await call('', 'POST', '/admin/announcements', { title: '测试公告', content: '这是一条测试公告内容', pinned: true }, adminToken)
  check('后台发布公告', r.success && r.data.id, r)
  const annId = r.data.id
  r = await call('', 'GET', '/announcements/list')
  check('小程序公告列表可见', r.success && (r.data || []).some((x) => x.title === '测试公告'), r.data && r.data.length)
  r = await call('', 'DELETE', '/admin/announcements/' + annId, {}, adminToken)
  check('删除公告成功', r.success, r)
  r = await call('', 'GET', '/announcements/list')
  check('删除后公告消失', r.success && !(r.data || []).some((x) => x.title === '测试公告'), r.data && r.data.length)

  r = await call('', 'GET', '/admin/overview', {}, adminToken)
  check('概览包含月活与月度统计', r.success && typeof r.data.mau === 'number' && r.data.monthJobs !== undefined && r.data.resumePending !== undefined, Object.keys(r.data))
  const insAdd = await L.db().collection('insurances').add({
    data: { name: '测试意外险', price: 30, coverage: '10 万', intro: '测试', enabled: true }
  })
  await L.db().collection('users').where({ _openid: 'w1' }).update({ data: { balance: 100 } })
  r = await call('w1', 'POST', '/insurances/purchase/' + insAdd._id, {})
  check('余额购买保险成功', r.success, r)
  r = await call('', 'GET', '/admin/finance', {}, adminToken)
  check('财务拆分积分与余额', r.success && r.data.pointsConsumed > 0 && r.data.balanceConsumed > 0 && Array.isArray(r.data.byBusiness), r.data)
  r = await call('', 'GET', '/admin/users', {}, adminToken)
  const anyUser = (r.data.records || [])[0]
  r = await call('', 'GET', '/admin/users/' + anyUser.id, {}, adminToken)
  check('用户详情返回认证与流水', r.success && r.data.counts && Array.isArray(r.data.wallet), r.data)

  console.log('\n[16] 充值回调幂等')
  const beforeBalance = (await L.db().collection('users').where({ _openid: 'w1' }).limit(1).get()).data[0].balance
  r = await call('w1', 'POST', '/wallet/recharge', { amount: 10 })
  check('充值下单返回支付参数', r.success && r.data.payment && r.data.outTradeNo, r.data)
  const notify = require('../../pay-notify/index.js')
  const payArg = { outTradeNo: r.data.outTradeNo, returnCode: 'SUCCESS', resultCode: 'SUCCESS', totalFee: 1000 }
  const n1 = await notify.main(payArg)
  const bal1 = (await L.db().collection('users').where({ _openid: 'w1' }).limit(1).get()).data[0].balance
  const n2 = await notify.main(payArg)
  const bal2 = (await L.db().collection('users').where({ _openid: 'w1' }).limit(1).get()).data[0].balance
  check('首次回调入账', n1.errcode === 0 && bal1 === beforeBalance + 10, { n1, bal1, beforeBalance })
  check('重复回调不重复入账', n2.errmsg === 'already paid' && bal2 === bal1, { n2, bal2 })
  console.log('\n[17] 关键词薪资与简历任务')
  await L.setConfig('blacklistQueryCost', 5)
  await L.db().collection('users').where({ _openid: 'w2' }).update({ data: { points: 5 } })
  r = await call('w2', 'GET', '/blacklist/query', { phone: '13900001111' })
  check('黑老板查询按配置扣积分', r.success && r.data.cost === 5, r.data)
  const w2Points = (await L.db().collection('users').where({ _openid: 'w2' }).limit(1).get()).data[0].points
  check('黑老板查询扣 5 分', w2Points === 0, w2Points)
  await L.setConfig('blacklistQueryCost', 0)

  await L.db().collection('users').where({ _openid: 'emp1' }).update({ data: { points: 100 } })
  r = await call('emp1', 'POST', '/jobs/create', {
    title: '置顶请求岗位', categoryId: 'guandao', salary: 600, workArea: '沈阳',
    contactName: '张', contactPhone: '13900001111', requestTop: true
  })
  const reqTopId = r.data.id
  r = await call('', 'POST', '/admin/jobs/' + reqTopId + '/review', { pass: true }, adminToken)
  check('审核通过自动置顶', r.success && r.data.topApplied === true, r)
  const topJob = (await L.db().collection('jobs').doc(reqTopId).get()).data
  check('自动置顶写入生效', topJob.isTop === true && topJob.topExpireAt > Date.now(), topJob)
  const empPoints = (await L.db().collection('users').where({ _openid: 'emp1' }).limit(1).get()).data[0].points
  check('自动置顶扣 30 分', empPoints === 70, empPoints)
  r = await call('w1', 'GET', '/jobs/list', { keyword: '500以上' })
  check('关键词 500 以上按薪资过滤', r.success && (r.data.records || []).every((j) => Number(j.salary) >= 500), (r.data.records || []).map((j) => j.salary))
  r = await call('w1', 'GET', '/jobs/list', { keyword: '200-300' })
  check('关键词 200-300 按区间过滤', r.success && (r.data.records || []).every((j) => Number(j.salary) >= 200 && Number(j.salary) <= 300), (r.data.records || []).map((j) => j.salary))

  const taskUser = 'task_' + Date.now()
  await call(taskUser, 'POST', '/auth/bind-phone', { code: 'mock-phone-code' })
  r = await call(taskUser, 'GET', '/wallet/info')
  check('任务初始未领取', r.success && r.data.profileTaskRewarded === false, r.data)
  const pointsBefore = r.data.points
  r = await call(taskUser, 'PUT', '/workers/profile/update', {
    name: '任务测试', jobTypes: ['焊工'], contactPhone: '13800000000', workExperience: '3 年'
  })
  check('完善简历发放任务积分', r.success && r.data.taskAwarded === 5, r.data)
  r = await call(taskUser, 'GET', '/wallet/info')
  check('任务积分到账且标记已领取', r.success && r.data.points === pointsBefore + 5 && r.data.profileTaskRewarded === true, r.data)
  r = await call(taskUser, 'PUT', '/workers/profile/update', { name: '任务测试2' })
  check('任务不重复发放', r.success && r.data.taskAwarded === 0, r.data)
  console.log('\n[18] 边界')
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
