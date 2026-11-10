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

function brief(job) {
  return {
    id: job._id,
    title: job.title,
    categoryId: job.categoryId,
    jobType: job.jobType,
    salary: job.salary,
    salaryUnit: job.salaryUnit || 1,
    workArea: job.workArea,
    duration: job.duration,
    isTop: !!job.isTop,
    isUrgent: !!job.isUrgent,
    status: job.status,
    viewCount: job.viewCount || 0,
    applyCount: job.applyCount || 0,
    createdAt: job.createdAt,
    employerVerified: !!job.employerVerified,
    latitude: job.latitude,
    longitude: job.longitude
  }
}

async function unlockState(openid, jobId) {
  if (!openid) return false
  const res = await L.db().collection('unlocks').where({ openid, jobId }).limit(1).get()
  return res.data.length > 0
}

exports.create = async (ctx) => {
  const d = ctx.data || {}
  const required = ['title', 'categoryId', 'salary', 'workArea', 'contactName', 'contactPhone']
  for (const k of required) {
    if (!d[k]) return L.fail('缺少必填项：' + k)
  }
  const days = parseInt(await L.getConfig('jobValidDays', 7), 10) || 7
  const now = Date.now()
  const job = Object.assign(pick(d), {
    ownerOpenid: ctx.openid,
    employerName: ctx.user.enterprise && ctx.user.enterprise.companyName || ctx.user.nickname || '',
    employerVerified: !!ctx.user.enterpriseVerified,
    contactPhoneEnc: L.encryptText(d.contactPhone),
    isTop: false,
    status: 0, // 0 待审核 1 通过 2 下架 3 过期 4 拒绝
    rejectReason: '',
    viewCount: 0,
    applyCount: 0,
    createdAt: now,
    updatedAt: now,
    expireAt: now + days * DAY
  })
  const add = await L.db().collection('jobs').add({ data: job })
  return L.ok({ id: add._id, status: job.status })
}

exports.list = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const d = ctx.data
  let w = { status: 1 }
  if (d.categoryId) w.categoryId = d.categoryId
  if (d.city) w.workArea = L.db().RegExp({ regexp: String(d.city), options: 'i' })
  if (d.keyword) {
    w = L.withKeyword(w, ['title', 'workArea', 'techReq', 'employerName'], d.keyword)
  }
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

  const coll = L.db().collection('jobs')
  const total = (await coll.where(w).count()).total
  let query = coll.where(w).orderBy('isTop', 'desc')
  if (d.sort === 'salary') query = query.orderBy('salary', 'desc')
  else if (d.sort === 'views') query = query.orderBy('viewCount', 'desc')
  const res = await query.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map(brief), total, page, pageSize))
}

exports.detail = async (ctx) => {
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  const job = res.data
  if (job.status !== 1 && job.ownerOpenid !== ctx.openid) return L.fail('信息已下架', 404)

  if (ctx.openid && ctx.openid !== job.ownerOpenid) {
    await L.db().collection('jobs').doc(id).update({ data: { viewCount: L.cmd().inc(1) } })
  }

  const unlocked = ctx.openid === job.ownerOpenid || await unlockState(ctx.openid, id)
  const isOwner = ctx.openid === job.ownerOpenid
  const phone = L.decryptText(job.contactPhoneEnc)

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
    isTop: !!job.isTop,
    isUrgent: !!job.isUrgent,
    status: job.status,
    employerName: job.employerName,
    employerVerified: !!job.employerVerified,
    isOwner,
    viewCount: job.viewCount || 0,
    applyCount: job.applyCount || 0,
    createdAt: job.createdAt,
    expireAt: job.expireAt
  })
}

exports.recommended = async (ctx) => exports.list(Object.assign({}, ctx, {
  data: Object.assign({ pageSize: 10 }, ctx.data)
}))

exports.nearby = async (ctx) => {
  const d = ctx.data || {}
  const lat = Number(d.latitude)
  const lng = Number(d.longitude)
  if (!lat || !lng) return exports.list(ctx)

  const { page, pageSize } = L.pager(d)
  const radius = Number(d.radiusKm || 300)

  const res = await L.db().collection('jobs').where({ status: 1 }).limit(200).get()
  const withDistance = res.data
    .filter((j) => typeof j.latitude === 'number' && typeof j.longitude === 'number')
    .map((j) => Object.assign({}, j, {
      distance: L.distanceKm(lat, lng, j.latitude, j.longitude)
    }))
    .filter((j) => j.distance <= radius)
    .sort((a, b) => a.distance - b.distance)

  const total = withDistance.length
  const slice = withDistance.slice((page - 1) * pageSize, page * pageSize)
  return L.ok(L.listResult(slice.map((j) => Object.assign(brief(j), { distance: j.distance })), total, page, pageSize))
}

exports.latest = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const coll = L.db().collection('jobs').where({ status: 1 })
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map(brief), total, page, pageSize))
}

exports.mine = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = { ownerOpenid: ctx.openid }
  if (ctx.data.status !== undefined && ctx.data.status !== '') w.status = Number(ctx.data.status)
  const coll = L.db().collection('jobs').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map(brief), total, page, pageSize))
}

exports.update = async (ctx) => {
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权修改', 403)

  const patch = Object.assign(pick(ctx.data), { updatedAt: Date.now(), status: 0 })
  if (ctx.data.contactPhone) patch.contactPhoneEnc = L.encryptText(ctx.data.contactPhone)
  await L.db().collection('jobs').doc(id).update({ data: patch })
  return L.ok({ id, status: 0 })
}

exports.remove = async (ctx) => {
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权删除', 403)
  await L.db().collection('jobs').doc(id).update({ data: { status: 2, updatedAt: Date.now() } })
  return L.ok({ id })
}

exports.unlockContact = async (ctx) => {
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  const job = res.data

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
  const id = ctx.params.id
  const res = await L.db().collection('jobs').doc(id).get().catch(() => null)
  if (!res || !res.data) return L.fail('招工信息不存在', 404)
  if (res.data.ownerOpenid !== ctx.openid) return L.fail('无权操作', 403)

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
      openid: ctx.openid,
      type: 2,
      amount: -cost,
      businessType: '置顶',
      businessId: id,
      remark: res.data.title,
      createdAt: now
    }
  })
  return L.ok({ id, cost, topExpireAt: now + days * DAY })
}