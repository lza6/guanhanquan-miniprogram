const crypto = require('crypto')
const L = require('../lib')

const DAY = 24 * 3600 * 1000

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + '|' + salt).digest('hex')
}

/* 管理端登录失败限制：单进程内存记账，冷启动重置；多实例部署需改数据库计数。 */
const loginFails = new Map()
const MAX_FAILS = 5
const LOCK_MS = 5 * 60 * 1000

exports.login = async (ctx) => {
  const { username, password } = ctx.data || {}
  if (!username || !password) return L.fail('请输入账号和密码')

  const now = Date.now()
  const rec = loginFails.get(username)
  if (rec && rec.lockedUntil > now) return L.fail('尝试次数过多，请 5 分钟后再试', 429)

  const res = await L.db().collection('admins').where({ username }).limit(1).get()
  let admin = res.data[0]

  if (!admin) {
    // 首次部署引导：仅在 admins 为空且配置了 ADMIN_INIT_PASSWORD 时创建
    const total = (await L.db().collection('admins').count()).total
    const initPwd = process.env.ADMIN_INIT_PASSWORD || ''
    if (total === 0 && initPwd && username === 'admin') {
      if (password !== initPwd) {
        recordFail(username, now)
        return L.fail('账号或密码错误')
      }
      const salt = crypto.randomBytes(8).toString('hex')
      const doc = {
        username, salt, passwordHash: hashPassword(initPwd, salt),
        role: 'super', createdAt: Date.now()
      }
      const add = await L.db().collection('admins').add({ data: doc })
      admin = Object.assign({ _id: add._id }, doc)
    } else {
      recordFail(username, now)
      return L.fail('账号或密码错误')
    }
  }

  if (hashPassword(password, admin.salt) !== admin.passwordHash) {
    recordFail(username, now)
    return L.fail('账号或密码错误')
  }

  loginFails.delete(username)
  const secret = await L.getConfig('adminSecret', process.env.ADMIN_SECRET || 'ghq-admin-secret')
  const token = L.signToken({
    adminId: admin._id,
    username: admin.username,
    role: admin.role,
    exp: Date.now() + 12 * 3600 * 1000
  }, secret)

  return L.ok({ token, username: admin.username, role: admin.role })
}

function recordFail(username, now) {
  const rec = loginFails.get(username) || { count: 0, lockedUntil: 0 }
  rec.count += 1
  if (rec.count >= MAX_FAILS) rec.lockedUntil = now + LOCK_MS
  loginFails.set(username, rec)
}

exports.overview = async () => {
  const dist = await distribution()
  const db = L.db()
  const now = Date.now()
  const startOfDay = new Date(new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10) + 'T00:00:00+08:00').getTime()
  const weekStart = now - 7 * DAY
  const monthStart = now - 30 * DAY
  const count = async (coll, where) => (await db.collection(coll).where(where || {}).count()).total

  const activeUsers = await db.collection('users')
    .where({ lastLoginAt: L.cmd().gte(startOfDay) }).limit(2000).get()
  const monthUsers = await db.collection('users')
    .where({ lastLoginAt: L.cmd().gte(monthStart) }).limit(5000).get()
  const mauSet = new Set(monthUsers.data.map((u) => u._openid))

  return L.ok({
    users: await count('users'),
    jobs: {
      total: await count('jobs'),
      pending: await count('jobs', { status: 0 }),
      online: await count('jobs', { status: 1 }),
      expired: await count('jobs', { status: 3 }),
      rejected: await count('jobs', { status: 4 })
    },
    applications: await count('applications'),
    blacklistPending: await count('blacklist', { status: 0 }),
    reportsPending: await count('reports', { status: 0 }),
    realNamePending: await count('users', { realNameStatus: 0 }),
    enterprisePending: await count('users', { enterpriseStatus: 0 }),
    resumePending: await count('resumes', { reviewStatus: 0 }),
    today: {
      newUsers: await count('users', { createdAt: L.cmd().gte(startOfDay) }),
      newJobs: await count('jobs', { createdAt: L.cmd().gte(startOfDay) })
    },
    activeToday: activeUsers.data.length,
    mau: mauSet.size,
    weekJobs: await count('jobs', { createdAt: L.cmd().gte(weekStart) }),
    monthJobs: await count('jobs', { createdAt: L.cmd().gte(monthStart) }),
    monthUsers: await count('users', { createdAt: L.cmd().gte(monthStart) }),
    pendingFeedback: await count('feedback', { status: 0 }),
    byCategory: dist.byCategory,
    byRegion: dist.byRegion,
    trend7d: await trend7d()
  })
}

/** 工种与地区分布（取前 8） */
async function distribution() {
  const res = await L.db().collection('jobs').where({ status: 1 }).limit(1000).get()
  const now = Date.now()
  const cat = {}
  const region = {}
  res.data.filter((j) => !j.expireAt || j.expireAt > now).forEach((j) => {
    const c = j.title || j.jobType || '其他'
    cat[c] = (cat[c] || 0) + 1
    const r = String(j.workArea || '未填写').split(/[\s·,，]/)[0]
    region[r] = (region[r] || 0) + 1
  })
  const top = (obj) => Object.keys(obj)
    .map((k) => ({ name: k, count: obj[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  return { byCategory: top(cat), byRegion: top(region) }
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
    id: j._id, title: j.title, salary: j.salary, salaryUnit: j.salaryUnit || 1,
    workArea: j.workArea, contactName: j.contactName, status: j.status,
    rejectReason: j.rejectReason || '', ownerOpenid: j.ownerOpenid,
    createdAt: j.createdAt, expireAt: j.expireAt || 0
  })), total, page, pageSize))
}

exports.reviewJob = async (ctx) => {
  const pass = !!(ctx.data && ctx.data.pass)
  const patch = {
    updatedAt: Date.now(),
    status: pass ? 1 : 4,
    rejectReason: pass ? '' : String(ctx.data.reason || '')
  }
  const res = await L.db().collection('jobs').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)

  await L.db().collection('jobs').doc(ctx.params.id).update({ data: patch })

  // 发布时勾选“审核通过后置顶”：审核通过后按当前积分配置扣分并置顶
  let topApplied = false
  let topFailed = false
  if (pass && res.data.requestTop) {
    const ownerRes = await L.db().collection('users')
      .where({ _openid: res.data.ownerOpenid }).limit(1).get()
    const owner = ownerRes.data[0]
    const cost = Number(await L.getConfig('topCost', 30))
    const days = Number(await L.getConfig('topDays', 7))
    if (owner) {
      const upd = await L.db().collection('users')
        .where({ _id: owner._id, points: L.cmd().gte(cost) })
        .update({ data: { points: L.cmd().inc(-cost) } })
      if (upd.stats && upd.stats.updated === 1) {
        const now = Date.now()
        await L.db().collection('jobs').doc(ctx.params.id).update({
          data: { isTop: true, topExpireAt: now + days * DAY, requestTop: false }
        })
        await L.db().collection('wallet').add({
          data: {
            openid: res.data.ownerOpenid, type: 2, amount: -cost,
            businessType: '置顶', businessId: ctx.params.id,
            remark: res.data.title, createdAt: now
          }
        })
        topApplied = true
      } else {
        topFailed = true
      }
    }
  }

  await L.db().collection('notifications').add({
    data: {
      openid: res.data.ownerOpenid,
      title: pass ? '招工信息审核通过' : '招工信息未通过审核',
      content: pass
        ? ('「' + res.data.title + '」已上线' + (topApplied ? '，并已置顶 7 天' : (topFailed ? '；积分不足，未完成置顶' : '')))
        : ('「' + res.data.title + '」被驳回：' + patch.rejectReason),
      type: 2, isRead: false, createdAt: Date.now()
    }
  })
  return L.ok({ id: ctx.params.id, status: patch.status, topApplied, topFailed })
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
    id: u._id,
    nickname: u.nickname,
    phone: L.maskPhone(u.phone),
    userType: u.userType,
    points: u.points || 0,
    balance: u.balance || 0,
    status: u.status || 0,
    realNameStatus: u.realNameStatus !== undefined ? u.realNameStatus : (u.realNameVerified ? 1 : -1),
    enterpriseStatus: u.enterpriseStatus !== undefined ? u.enterpriseStatus : (u.enterpriseVerified ? 1 : -1),
    enterpriseName: (u.enterprise && u.enterprise.companyName) || '',
    createdAt: u.createdAt
  })), total, page, pageSize))
}

exports.userDetail = async (ctx) => {
  const res = await L.db().collection('users').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('用户不存在', 404)
  const u = res.data
  const db = L.db()
  const [jobs, apps, records] = await Promise.all([
    db.collection('jobs').where({ ownerOpenid: u._openid }).count(),
    db.collection('applications').where({ workerOpenid: u._openid }).count(),
    db.collection('wallet').where({ openid: u._openid }).orderBy('createdAt', 'desc').limit(10).get()
  ])
  return L.ok({
    id: u._id,
    openid: u._openid,
    nickname: u.nickname,
    phone: L.maskPhone(u.phone),
    userType: u.userType,
    points: u.points || 0,
    balance: u.balance || 0,
    status: u.status || 0,
    realName: u.realName || '',
    idCardMasked: u.idCardMasked || '',
    realNameStatus: u.realNameStatus !== undefined ? u.realNameStatus : (u.realNameVerified ? 1 : -1),
    enterprise: u.enterprise || null,
    enterpriseStatus: u.enterpriseStatus !== undefined ? u.enterpriseStatus : (u.enterpriseVerified ? 1 : -1),
    showPhone: u.showPhone !== false,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt || 0,
    counts: { jobs: jobs.total, applications: apps.total },
    wallet: records.data.map((r) => ({
      id: r._id, type: r.type, amount: r.amount, businessType: r.businessType,
      remark: r.remark, createdAt: r.createdAt
    }))
  })
}

exports.setUserStatus = async (ctx) => {
  const status = Number(ctx.data.status)
  if (![0, 1].includes(status)) return L.fail('状态值不合法')
  await L.db().collection('users').doc(ctx.params.id).update({ data: { status, updatedAt: Date.now() } })
  return L.ok({ id: ctx.params.id, status })
}

/* ---------- 实名 / 企业认证审核 ---------- */
exports.verifications = async (ctx) => {
  const type = ctx.data.type === 'enterprise' ? 'enterprise' : 'real'
  const status = ctx.data.status === undefined ? 0 : Number(ctx.data.status)
  const { page, pageSize, skip } = L.pager(ctx.data)
  const field = type === 'enterprise' ? 'enterpriseStatus' : 'realNameStatus'
  const coll = L.db().collection('users').where({ [field]: status })
  const total = (await coll.count()).total
  const res = await coll.orderBy('updatedAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((u) => ({
    id: u._id,
    openid: u._openid,
    nickname: u.nickname,
    phone: L.maskPhone(u.phone),
    realName: u.realName || '',
    idCardMasked: u.idCardMasked || '',
    enterprise: u.enterprise || null,
    status,
    rejectReason: type === 'enterprise' ? (u.enterpriseRejectReason || '') : (u.realNameRejectReason || ''),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  })), total, page, pageSize))
}

exports.reviewVerification = async (ctx) => {
  const type = ctx.data.type === 'enterprise' ? 'enterprise' : 'real'
  const pass = !!(ctx.data && ctx.data.pass)
  const reason = String((ctx.data && ctx.data.reason) || '')
  const res = await L.db().collection('users').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('用户不存在', 404)
  const u = res.data

  const patch = type === 'enterprise'
    ? (pass
        ? { enterpriseStatus: 1, enterpriseVerified: true, enterpriseRejectReason: '', updatedAt: Date.now() }
        : { enterpriseStatus: 2, enterpriseVerified: false, enterpriseRejectReason: reason, updatedAt: Date.now() })
    : (pass
        ? { realNameStatus: 1, realNameVerified: true, realNameRejectReason: '', updatedAt: Date.now() }
        : { realNameStatus: 2, realNameVerified: false, realNameRejectReason: reason, updatedAt: Date.now() })

  await L.db().collection('users').doc(ctx.params.id).update({ data: patch })
  await L.db().collection('notifications').add({
    data: {
      openid: u._openid,
      title: pass ? '认证审核通过' : '认证未通过',
      content: pass
        ? (type === 'enterprise' ? '企业认证已通过，发布岗位将展示已认证标识' : '实名认证已通过')
        : ('认证资料被驳回：' + (reason || '资料不完整')),
      type: 2, isRead: false, createdAt: Date.now()
    }
  })
  return L.ok({ id: ctx.params.id, type, status: pass ? 1 : 2 })
}

/* ---------- 简历审核 ---------- */
exports.resumes = async (ctx) => {
  const status = ctx.data.status === undefined ? 0 : Number(ctx.data.status)
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = { reviewStatus: status }
  if (ctx.data.keyword) w.name = L.db().RegExp({ regexp: String(ctx.data.keyword), options: 'i' })
  const coll = L.db().collection('resumes').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('updatedAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((r) => ({
    id: r._id,
    openid: r._openid,
    name: r.name || '未填写',
    phone: r.contactPhoneEnc ? L.decryptText(r.contactPhoneEnc) : (r.contactPhone || ''),
    jobTypes: r.jobTypes || [],
    certificateInfo: r.certificateInfo || '',
    workExperience: r.workExperience || '',
    techDescription: r.techDescription || '',
    expectArea: r.expectArea || '',
    expectSalary: r.expectSalary || '',
    reviewStatus: r.reviewStatus === undefined ? 1 : r.reviewStatus,
    rejectReason: r.rejectReason || '',
    updatedAt: r.updatedAt
  })), total, page, pageSize))
}

exports.reviewResume = async (ctx) => {
  const pass = !!(ctx.data && ctx.data.pass)
  const reason = String((ctx.data && ctx.data.reason) || '')
  const res = await L.db().collection('resumes').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('简历不存在', 404)
  await L.db().collection('resumes').doc(ctx.params.id).update({
    data: {
      reviewStatus: pass ? 1 : 2,
      rejectReason: pass ? '' : reason,
      updatedAt: Date.now()
    }
  })
  await L.db().collection('notifications').add({
    data: {
      openid: res.data._openid,
      title: pass ? '求职简历审核通过' : '求职简历未通过',
      content: pass ? '你的简历已展示给招工方' : ('简历未通过：' + (reason || '资料不完整')),
      type: 2, isRead: false, createdAt: Date.now()
    }
  })
  return L.ok({ id: ctx.params.id, reviewStatus: pass ? 1 : 2 })
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

  const res = await L.db().collection('reports').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('举报记录不存在', 404)
  const report = res.data

  await L.db().collection('reports').doc(ctx.params.id).update({
    data: {
      status,
      handleRemark: String(ctx.data.remark || ''),
      handleTime: Date.now(),
      handlerId: ctx.admin && ctx.admin.adminId
    }
  })

  // 申诉被判定属实（类型 6 + 已处理）→ 撤销对应号码的黑名单标记
  let revoked = 0
  if (report.reportType === 6 && status === 2 && report.bossPhone) {
    const salt = String(await L.getConfig('phoneSalt', process.env.PHONE_SALT || 'ghq-phone-salt'))
    const hash = L.hashPhone(report.bossPhone, salt)
    const bl = await L.db().collection('blacklist')
      .where({ bossPhoneHash: hash, status: 1 }).limit(50).get()
    for (const b of bl.data) {
      await L.db().collection('blacklist').doc(b._id).update({
        data: { status: 2, revokedBy: ctx.admin && ctx.admin.adminId, revokedAt: Date.now(), revokeReason: '申诉核实' }
      })
      revoked += 1
    }
    if (revoked && report.reporterOpenid) {
      await L.db().collection('notifications').add({
        data: {
          openid: report.reporterOpenid,
          title: '申诉已通过',
          content: '你的申诉已核实，相关黑名单标记已撤销（共 ' + revoked + ' 条）。',
          type: 2,
          isRead: false,
          createdAt: Date.now()
        }
      })
    }
  }

  return L.ok({ id: ctx.params.id, status, revoked })
}

/* ---------- 公告 ---------- */
exports.announcements = async () => {
  const res = await L.db().collection('announcements').orderBy('createdAt', 'desc').limit(100).get()
  return L.ok(res.data)
}

exports.saveAnnouncement = async (ctx) => {
  const d = ctx.data || {}
  if (!d.title || !d.content) return L.fail('请填写标题和内容')
  const doc = {
    title: String(d.title).slice(0, 50),
    content: String(d.content).slice(0, 2000),
    pinned: !!d.pinned,
    enabled: d.enabled !== false,
    updatedAt: Date.now()
  }
  if (d.id) {
    await L.db().collection('announcements').doc(d.id).update({ data: doc })
    return L.ok({ id: d.id })
  }
  const add = await L.db().collection('announcements').add({
    data: Object.assign(doc, { createdAt: Date.now() })
  })
  return L.ok({ id: add._id })
}

exports.deleteAnnouncement = async (ctx) => {
  await L.db().collection('announcements').doc(ctx.params.id).remove()
  return L.ok({ id: ctx.params.id })
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

  const all = await db.collection('wallet').orderBy('createdAt', 'desc').limit(2000).get()
  const paidOrders = await db.collection('orders').where({ status: 'paid' }).limit(1000).get()
  const rechargeTotal = paidOrders.data.reduce((s, o) => s + Number(o.amount || 0), 0)

  let pointsConsumed = 0
  let balanceConsumed = 0
  const byBusiness = {}
  all.data.filter((r) => r.amount < 0).forEach((r) => {
    const amount = Math.abs(r.amount)
    if (r.type === 2) pointsConsumed += amount
    if (r.type === 4) balanceConsumed += amount
    const key = r.businessType || '其他'
    byBusiness[key] = (byBusiness[key] || 0) + amount
  })

  return L.ok(Object.assign(L.listResult(res.data.map((r) => ({
    id: r._id, openid: r.openid, type: r.type, amount: r.amount,
    businessType: r.businessType, remark: r.remark, createdAt: r.createdAt
  })), total, page, pageSize), {
    rechargeTotal,
    paidOrderCount: paidOrders.data.length,
    pointsConsumed,
    balanceConsumed,
    byBusiness: Object.keys(byBusiness)
      .map((name) => ({ name, amount: byBusiness[name] }))
      .sort((a, b) => b.amount - a.amount)
  }))
}

/* ---------- 客服 / 意见反馈 ---------- */
exports.feedback = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = {}
  if (ctx.data.status !== undefined && ctx.data.status !== '') w.status = Number(ctx.data.status)
  const coll = L.db().collection('feedback').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((f) => ({
    id: f._id, type: f.type, content: f.content, contact: f.contact,
    images: f.images || [], status: f.status, createdAt: f.createdAt
  })), total, page, pageSize))
}

exports.handleFeedback = async (ctx) => {
  const status = Number(ctx.data.status)
  if (![0, 1, 2].includes(status)) return L.fail('状态值不合法')
  await L.db().collection('feedback').doc(ctx.params.id).update({
    data: { status, handleRemark: String(ctx.data.remark || ''), handleTime: Date.now() }
  })
  return L.ok({ id: ctx.params.id, status })
}

/** 近 7 日新增用户 / 岗位 */
async function trend7d() {
  const start = Date.now() - DAY * 6
  const [users, jobs] = await Promise.all([
    L.db().collection('users').where({ createdAt: L.cmd().gte(start) }).limit(2000).get(),
    L.db().collection('jobs').where({ createdAt: L.cmd().gte(start) }).limit(2000).get()
  ])
  const dayKey = (ts) => {
    const d = new Date(ts)
    return (d.getMonth() + 1) + '/' + d.getDate()
  }
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - DAY * i)
    days.push({ day: (d.getMonth() + 1) + '/' + d.getDate(), users: 0, jobs: 0 })
  }
  const map = {}
  days.forEach((x) => { map[x.day] = x })
  users.data.forEach((u) => { const k = dayKey(u.createdAt); if (map[k]) map[k].users += 1 })
  jobs.data.forEach((j) => { const k = dayKey(j.createdAt); if (map[k]) map[k].jobs += 1 })
  return days
}