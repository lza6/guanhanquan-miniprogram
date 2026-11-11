const L = require('../lib')

const JOB_FIELDS = [
  'title', 'categoryId', 'jobType', 'salary', 'salaryUnit', 'workArea', 'workAddress',
  'duration', 'certificateReq', 'ageLimit', 'techReq', 'otherReq', 'payType',
  'accommodation', 'travelReimburse', 'otherBenefits', 'contactName', 'wechatSame',
  'isUrgent', 'longitude', 'latitude', 'workerCount', 'genderLimit'
]

const DAY = 24 * 3600 * 1000

function pick(data) {
  const out = {}
  JOB_FIELDS.forEach((k) => {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') out[k] = data[k]
  })
  return out
}

function brief(job, now = Date.now()) {
  return {
    id: job._id,
    title: job.title,
    categoryId: job.categoryId,
    jobType: job.jobType,
    salary: job.salary,
    salaryUnit: job.salaryUnit || 1,
    workArea: job.workArea,
    workAddress: job.workAddress || '',
    duration: job.duration,
    isTop: !!job.isTop && Number(job.topExpireAt || 0) > now,
    isUrgent: !!job.isUrgent,
    status: job.status,
    viewCount: job.viewCount || 0,
    applyCount: job.applyCount || 0,
    createdAt: job.createdAt,
    priorityAt: job.priorityAt || job.createdAt || 0,
    employerName: job.employerName || '',
    employerVerified: !!job.employerVerified,
    latitude: job.latitude,
    longitude: job.longitude,
    expireAt: job.expireAt || 0,
    topExpireAt: job.topExpireAt || 0
  }
}

async function unlockState(openid, jobId) {
  if (!openid) return false
  const res = await L.db().collection('unlocks').where({ openid, jobId }).limit(1).get()
  return res.data.length > 0
}

/** 懒过期：读取前把到期岗位置为已过期，把到期置顶取消。无需定时任务也能保证展示正确。 */
async function sweepExpired() {
  const now = Date.now()
  const jobs = L.db().collection('jobs')
  await jobs.where({ status: 1, expireAt: L.cmd().lte(now) }).update({
    data: { status: 3, isTop: false, updatedAt: now }
  })
  await jobs.where({ isTop: true, topExpireAt: L.cmd().lte(now) }).update({
    data: { isTop: false, updatedAt: now }
  })
}

exports.create = async (ctx) => {
  const d = ctx.data || {}
  const required = ['title', 'categoryId', 'salary', 'workArea', 'contactName', 'contactPhone']
  for (const k of required) {
    if (k === 'salary' && Number(d.salaryUnit) === 4) continue
    if (!d[k]) return L.fail('缺少必填项：' + k)
  }
  const allowedDays = [7, 15, 30]
  const requested = parseInt(d.validDays, 10)
  const days = allowedDays.indexOf(requested) >= 0
    ? requested
    : (parseInt(await L.getConfig('jobValidDays', 7), 10) || 7)
  const now = Date.now()
  const job = Object.assign(pick(d), {
    ownerOpenid: ctx.openid,
    employerName: ctx.user.enterprise && ctx.user.enterprise.companyName || ctx.user.nickname || '',
    employerVerified: !!ctx.user.enterpriseVerified,
    contactPhoneEnc: L.encryptText(d.contactPhone),
    isTop: false,
    requestTop: !!d.requestTop,
    status: 0, // 0 待审核 1 通过 2 下架 3 过期 4 拒绝
    rejectReason: '',
    viewCount: 0,
    applyCount: 0,
    createdAt: now,
    priorityAt: now,
    updatedAt: now,
    expireAt: now + days * DAY
  })
  await L.db().collection('users').doc(ctx.user._id).update({
    data: { userType: 'employer', updatedAt: now }
  })
  const add = await L.db().collection('jobs').add({ data: job })
  return L.ok({ id: add._id, status: job.status, expireAt: job.expireAt })
}

exports.list = async (ctx) => {
  await sweepExpired()
  const { page, pageSize, skip } = L.pager(ctx.data)
  const d = ctx.data
  let w = { status: 1 }
  if (d.categoryId) w.categoryId = d.categoryId
  if (d.city) w.workArea = L.db().RegExp({ regexp: String(d.city), options: 'i' })
  if (d.minSalary && d.maxSalary) {
    w.salary = L.cmd().gte(Number(d.minSalary)).and(L.cmd().lte(Number(d.maxSalary)))
  } else if (d.minSalary) {
    w.salary = L.cmd().gte(Number(d.minSalary))
  } else if (d.maxSalary) {
    w.salary = L.cmd().lte(Number(d.maxSalary))
  }
  if (d.isUrgent) w.isUrgent = true
  if (d.createdWithin) {
    const hours = Number(d.createdWithin)
    if (hours > 0) w.createdAt = L.cmd().gte(Date.now() - hours * 3600 * 1000)
  }
  if (d.keyword) {
    const kw = String(d.keyword).trim()
    const range = kw.match(/^(\d+)\s*(?:-|~|到)\s*(\d+)\s*(?:元)?(?:\/天)?$/)
    const above = kw.match(/^(\d+)\s*(?:以上|\+)\s*(?:元)?(?:\/天)?$/)
    if (range) {
      w.salary = L.cmd().gte(Number(range[1])).and(L.cmd().lte(Number(range[2])))
    } else if (above) {
      w.salary = L.cmd().gte(Number(above[1]))
    } else {
      w = L.withKeyword(w, ['title', 'workArea', 'techReq', 'employerName'], kw)
    }
  }

  const coll = L.db().collection('jobs')
  const total = (await coll.where(w).count()).total
  let query = coll.where(w).orderBy('isTop', 'desc')
  if (d.sort === 'salary') query = query.orderBy('salary', 'desc')
  else if (d.sort === 'views') query = query.orderBy('viewCount', 'desc')
  const res = await query.orderBy('priorityAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((j) => brief(j)), total, page, pageSize))
}

exports.detail = async (ctx) => {
  await sweepExpired()
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  const job = res.data
  const isOwner = ctx.openid === job.ownerOpenid
  if (job.status !== 1 && !isOwner) {
    return L.fail(job.status === 3 ? '信息已过期' : '信息已下架', 404)
  }

  if (ctx.openid && !isOwner) {
    await L.db().collection('jobs').doc(id).update({ data: { viewCount: L.cmd().inc(1) } })
  }

  const unlocked = isOwner || await unlockState(ctx.openid, id)
  const phone = L.decryptText(job.contactPhoneEnc)
  const now = Date.now()

  return L.ok({
    id: job._id,
    title: job.title,
    categoryId: job.categoryId,
    jobType: job.jobType,
    salary: job.salary,
    salaryUnit: job.salaryUnit || 1,
    workArea: job.workArea,
    workAddress: job.workAddress,
    duration: job.duration,
    certificateReq: job.certificateReq,
    ageLimit: job.ageLimit,
    techReq: job.techReq,
    otherReq: job.otherReq,
    payType: job.payType,
    accommodation: job.accommodation,
    travelReimburse: job.travelReimburse,
    otherBenefits: job.otherBenefits,
    contactName: job.contactName,
    contactPhone: unlocked ? phone : L.maskPhone(phone),
    contactUnlocked: unlocked,
    unlockCost: unlocked ? 0 : Number(await L.getConfig('contactCost', 5)),
    wechatSame: !!job.wechatSame,
    isTop: !!job.isTop && Number(job.topExpireAt || 0) > now,
    isUrgent: !!job.isUrgent,
    status: job.status,
    employerName: job.employerName,
    employerVerified: !!job.employerVerified,
    isOwner,
    viewCount: job.viewCount || 0,
    applyCount: job.applyCount || 0,
    createdAt: job.createdAt,
    expireAt: job.expireAt || 0,
    topExpireAt: job.topExpireAt || 0
  })
}

exports.recommended = async (ctx) => exports.list(Object.assign({}, ctx, {
  data: Object.assign({ pageSize: 20 }, ctx.data)
}))

exports.nearby = async (ctx) => {
  await sweepExpired()
  const d = ctx.data || {}
  const lat = Number(d.latitude)
  const lng = Number(d.longitude)
  if (!lat || !lng) return exports.list(ctx)

  const { page, pageSize } = L.pager(d)
  const radius = Number(d.radiusKm || 300)

  const res = await L.db().collection('jobs').where({ status: 1 }).limit(200).get()
  const now = Date.now()
  const withDistance = res.data
    .filter((j) => typeof j.latitude === 'number' && typeof j.longitude === 'number')
    .map((j) => Object.assign({}, j, {
      distance: L.distanceKm(lat, lng, j.latitude, j.longitude)
    }))
    .filter((j) => j.distance <= radius)
    .sort((a, b) => a.distance - b.distance)

  const total = withDistance.length
  const slice = withDistance.slice((page - 1) * pageSize, page * pageSize)
  return L.ok(L.listResult(slice.map((j) => Object.assign(brief(j, now), { distance: j.distance })), total, page, pageSize))
}

exports.latest = async (ctx) => {
  await sweepExpired()
  const { page, pageSize, skip } = L.pager(ctx.data)
  const coll = L.db().collection('jobs').where({ status: 1 })
  const total = (await coll.count()).total
  const res = await coll.orderBy('isTop', 'desc').orderBy('priorityAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((j) => brief(j)), total, page, pageSize))
}

exports.mine = async (ctx) => {
  await sweepExpired()
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = { ownerOpenid: ctx.openid, status: L.cmd().neq(5) }
  if (ctx.data.status !== undefined && ctx.data.status !== '') w.status = Number(ctx.data.status)
  const coll = L.db().collection('jobs').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((j) => brief(j)), total, page, pageSize))
}

exports.update = async (ctx) => {
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权修改', 403)
  if (Number(res.data.status) === 5) return L.fail('已删除的岗位不可编辑', 410)

  const allowedDays = [7, 15, 30]
  const requested = parseInt(ctx.data.validDays, 10)
  const days = allowedDays.indexOf(requested) >= 0
    ? requested
    : (parseInt(await L.getConfig('jobValidDays', 7), 10) || 7)
  const now = Date.now()
  const patch = Object.assign(pick(ctx.data), {
    updatedAt: now,
    status: 0,
    expireAt: now + days * DAY,
    rejectReason: ''
  })
  if (ctx.data.contactPhone) patch.contactPhoneEnc = L.encryptText(ctx.data.contactPhone)
  await L.db().collection('jobs').doc(id).update({ data: patch })
  return L.ok({ id, status: 0 })
}

exports.setStatus = async (ctx) => {
  const id = ctx.params.id
  const target = Number(ctx.data.status)
  if (![1, 2].includes(target)) return L.fail('状态值不合法')
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权操作', 403)
  const current = Number(res.data.status)
  if (target === 2 && current !== 1) return L.fail('只有已发布的岗位可以暂停')
  if (target === 1 && current !== 2) return L.fail('只有已暂停的岗位可以恢复')
  await L.db().collection('jobs').doc(id).update({
    data: { status: target, updatedAt: Date.now() }
  })
  return L.ok({ id, status: target })
}

exports.remove = async (ctx) => {
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权删除', 403)
  await L.db().collection('jobs').doc(id).update({
    data: { status: 5, isTop: false, topExpireAt: 0, updatedAt: Date.now() }
  })
  return L.ok({ id, status: 5 })
}

exports.unlockContact = async (ctx) => {
  await sweepExpired()
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  const job = res.data
  if (job.status !== 1 && job.ownerOpenid !== ctx.openid) return L.fail('信息已下架或过期', 404)

  const already = await unlockState(ctx.openid, id)
  if (already || job.ownerOpenid === ctx.openid) {
    return L.ok({ contactPhone: L.decryptText(job.contactPhoneEnc) })
  }

  const cost = Number(await L.getConfig('contactCost', 5))
  const upd = await L.db().collection('users')
    .where({ _id: ctx.user._id, points: L.cmd().gte(cost) })
    .update({ data: { points: L.cmd().inc(-cost) } })
  if (!upd.stats || upd.stats.updated !== 1) {
    return L.fail('积分不足，请先签到或充值', 402)
  }

  await L.db().collection('unlocks').add({
    data: { openid: ctx.openid, jobId: id, createdAt: Date.now() }
  })
  await L.db().collection('wallet').add({
    data: {
      openid: ctx.openid,
      type: 2,
      amount: -cost,
      businessType: '查看联系方式',
      businessId: id,
      remark: job.title,
      createdAt: Date.now()
    }
  })
  return L.ok({ contactPhone: L.decryptText(job.contactPhoneEnc), cost })
}

exports.top = async (ctx) => {
  await sweepExpired()
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权操作', 403)
  if (res.data.status !== 1) return L.fail('岗位审核通过后才能置顶')

  const cost = Number(await L.getConfig('topCost', 30))
  const days = Number(await L.getConfig('topDays', 7))
  const upd = await L.db().collection('users')
    .where({ _id: ctx.user._id, points: L.cmd().gte(cost) })
    .update({ data: { points: L.cmd().inc(-cost) } })
  if (!upd.stats || upd.stats.updated !== 1) return L.fail('积分不足', 402)

  const now = Date.now()
  await L.db().collection('jobs').doc(id).update({
    data: { isTop: true, topExpireAt: now + days * DAY, updatedAt: now }
  })
  await L.db().collection('wallet').add({
    data: {
      openid: ctx.openid, type: 2, amount: -cost,
      businessType: '置顶', businessId: id, remark: res.data.title, createdAt: now
    }
  })
  return L.ok({ id, cost, topExpireAt: now + days * DAY })
}

exports.refresh = async (ctx) => {
  await sweepExpired()
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权操作', 403)
  if (res.data.status !== 1) return L.fail('岗位审核通过后才能刷新')

  const cost = Number(await L.getConfig('refreshCost', 5))
  const upd = await L.db().collection('users')
    .where({ _id: ctx.user._id, points: L.cmd().gte(cost) })
    .update({ data: { points: L.cmd().inc(-cost) } })
  if (!upd.stats || upd.stats.updated !== 1) return L.fail('积分不足', 402)

  const now = Date.now()
  await L.db().collection('jobs').doc(id).update({ data: { priorityAt: now, updatedAt: now } })
  await L.db().collection('wallet').add({
    data: {
      openid: ctx.openid, type: 2, amount: -cost,
      businessType: '刷新', businessId: id, remark: res.data.title, createdAt: now
    }
  })
  return L.ok({ id, cost, priorityAt: now })
}

exports.brief = brief
exports.sweepExpired = sweepExpired