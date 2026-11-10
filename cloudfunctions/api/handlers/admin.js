const crypto = require('crypto')
const L = require('../lib')

const DAY = 24 * 3600 * 1000

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + '|' + salt).digest('hex')
}

exports.login = async (ctx) => {
  const { username, password } = ctx.data || {}
  if (!username || !password) return L.fail('请输入账号和密码')

  const res = await L.db().collection('admins').where({ username }).limit(1).get()
  let admin = res.data[0]

  if (!admin) {
    // 首次部署引导：仅在 admins 为空且配置了 ADMIN_INIT_PASSWORD 时创建
    const total = (await L.db().collection('admins').count()).total
    const initPwd = process.env.ADMIN_INIT_PASSWORD || ''
    if (total === 0 && initPwd && username === 'admin') {
      if (password !== initPwd) return L.fail('账号或密码错误')
      const salt = crypto.randomBytes(8).toString('hex')
      const doc = {
        username, salt, passwordHash: hashPassword(initPwd, salt),
        role: 'super', createdAt: Date.now()
      }
      const add = await L.db().collection('admins').add({ data: doc })
      admin = Object.assign({ _id: add._id }, doc)
    } else {
      return L.fail('账号或密码错误')
    }
  }

  if (hashPassword(password, admin.salt) !== admin.passwordHash) {
    return L.fail('账号或密码错误')
  }

  const secret = await L.getConfig('adminSecret', process.env.ADMIN_SECRET || 'ghq-admin-secret')
  const token = L.signToken({
    adminId: admin._id,
    username: admin.username,
    role: admin.role,
    exp: Date.now() + 12 * 3600 * 1000
  }, secret)

  return L.ok({ token, username: admin.username, role: admin.role })
}

exports.overview = async () => {
  const db = L.db()
  const startOfDay = new Date(new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10) + 'T00:00:00+08:00').getTime()
  const count = async (coll, where) => (await db.collection(coll).where(where || {}).count()).total

  return L.ok({
    users: await count('users'),
    jobs: {
      total: await count('jobs'),
      pending: await count('jobs', { status: 0 }),
      online: await count('jobs', { status: 1 }),
      rejected: await count('jobs', { status: 4 })
    },
    applications: await count('applications'),
    blacklistPending: await count('blacklist', { status: 0 }),
    reportsPending: await count('reports', { status: 0 }),
    today: {
      newUsers: await count('users', { createdAt: L.cmd().gte(startOfDay) }),
      newJobs: await count('jobs', { createdAt: L.cmd().gte(startOfDay) })
    }
  })
}

exports.jobs = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = {}
  if (ctx.data.status !== undefined && ctx.data.status !== '') w.status = Number(ctx.data.status)
  if (ctx.data.keyword) w.title = L.db().RegExp({ regexp: String(ctx.data.keyword), options: 'i' })
  const coll = L.db().collection('jobs').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((j) => ({
    id: j._id, title: j.title, salary: j.salary, workArea: j.workArea,
    contactName: j.contactName, status: j.status, rejectReason: j.rejectReason || '',
    ownerOpenid: j.ownerOpenid, createdAt: j.createdAt
  })), total, page, pageSize))
}

exports.reviewJob = async (ctx) => {
  const pass = !!(ctx.data && ctx.data.pass)
  const patch = { updatedAt: Date.now(), status: pass ? 1 : 4, rejectReason: pass ? '' : String(ctx.data.reason || '') }
  const res = await L.db().collection('jobs').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)

  await L.db().collection('jobs').doc(ctx.params.id).update({ data: patch })
  await L.db().collection('notifications').add({
    data: {
      openid: res.data.ownerOpenid,
      title: pass ? '招工信息审核通过' : '招工信息未通过审核',
      content: pass ? '「' + res.data.title + '」已上线' : '「' + res.data.title + '」被驳回：' + patch.rejectReason,
      type: 2, isRead: false, createdAt: Date.now()
    }
  })
  return L.ok({ id: ctx.params.id, status: patch.status })
}

exports.users = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  let w = {}
  if (ctx.data.keyword) {
    w = L.withKeyword(w, ['nickname', 'phone'], ctx.data.keyword)
  }
  const coll = L.db().collection('users').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((u) => ({
    id: u._id, nickname: u.nickname, phone: L.maskPhone(u.phone), userType: u.userType,
    points: u.points || 0, balance: u.balance || 0, status: u.status || 0, createdAt: u.createdAt
  })), total, page, pageSize))
}

exports.setUserStatus = async (ctx) => {
  const status = Number(ctx.data.status)
  if (![0, 1].includes(status)) return L.fail('状态值不合法')
  await L.db().collection('users').doc(ctx.params.id).update({ data: { status, updatedAt: Date.now() } })
  return L.ok({ id: ctx.params.id, status })
}

exports.blacklist = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = {}
  if (ctx.data.status !== undefined && ctx.data.status !== '') w.status = Number(ctx.data.status)
  const coll = L.db().collection('blacklist').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((b) => ({
    id: b._id, bossPhone: b.bossPhoneMasked, bossName: b.bossName, reasonType: b.reasonType,
    reasonDetail: b.reasonDetail, evidence: b.evidence || [], status: b.status, createdAt: b.createdAt
  })), total, page, pageSize))
}

exports.reviewBlacklist = async (ctx) => {
  const pass = !!(ctx.data && ctx.data.pass)
  await L.db().collection('blacklist').doc(ctx.params.id).update({
    data: { status: pass ? 1 : 2, reviewedAt: Date.now(), reviewerId: ctx.admin.adminId }
  })
  return L.ok({ id: ctx.params.id, status: pass ? 1 : 2 })
}

exports.reports = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = {}
  if (ctx.data.status !== undefined && ctx.data.status !== '') w.status = Number(ctx.data.status)
  const coll = L.db().collection('reports').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((r) => ({
    id: r._id, jobId: r.jobId, bossPhone: r.bossPhone, reportType: r.reportType,
    reason: r.reason, evidence: r.evidence || [], status: r.status, createdAt: r.createdAt
  })), total, page, pageSize))
}

exports.handleReport = async (ctx) => {
  const status = Number(ctx.data.status)
  if (![0, 1, 2, 3].includes(status)) return L.fail('状态值不合法')
  await L.db().collection('reports').doc(ctx.params.id).update({
    data: { status, handleRemark: String(ctx.data.remark || ''), handleTime: Date.now() }
  })
  return L.ok({ id: ctx.params.id, status })
}

exports.banners = async () => {
  const res = await L.db().collection('banners').orderBy('sort', 'asc').limit(50).get()
  return L.ok(res.data)
}

exports.saveBanner = async (ctx) => {
  const d = ctx.data || {}
  if (!d.imageUrl) return L.fail('缺少图片地址')
  const doc = {
    imageUrl: d.imageUrl,
    link: d.link || '',
    title: d.title || '',
    sort: Number(d.sort || 0),
    enabled: d.enabled !== false,
    updatedAt: Date.now()
  }
  if (d.id) {
    await L.db().collection('banners').doc(d.id).update({ data: doc })
    return L.ok({ id: d.id })
  }
  const add = await L.db().collection('banners').add({ data: Object.assign(doc, { createdAt: Date.now() }) })
  return L.ok({ id: add._id })
}

exports.deleteBanner = async (ctx) => {
  await L.db().collection('banners').doc(ctx.params.id).remove()
  return L.ok({ id: ctx.params.id })
}

exports.finance = async (ctx) => {
  const db = L.db()
  const { page, pageSize, skip } = L.pager(ctx.data)
  const coll = db.collection('wallet')
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()

  const paidOrders = await db.collection('orders').where({ status: 'paid' }).limit(1000).get()
  const rechargeTotal = paidOrders.data.reduce((s, o) => s + Number(o.amount || 0), 0)
  const consume = res.data.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0)

  return L.ok(Object.assign(L.listResult(res.data.map((r) => ({
    id: r._id, openid: r.openid, type: r.type, amount: r.amount,
    businessType: r.businessType, remark: r.remark, createdAt: r.createdAt
  })), total, page, pageSize), { rechargeTotal, consumeInPage: consume, paidOrderCount: paidOrders.data.length }))
}