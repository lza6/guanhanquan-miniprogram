const L = require('../lib')

/* ---------- 评价 ---------- */
exports.createReview = async (ctx) => {
  const d = ctx.data || {}
  if (!d.toOpenid || !d.rating) return L.fail('缺少评价对象或评分')
  const rate = Number(d.rating)
  if (rate < 1 || rate > 5) return L.fail('评分需在 1-5 之间')

  const add = await L.db().collection('reviews').add({
    data: {
      fromOpenid: ctx.openid,
      fromName: ctx.user.nickname || '',
      toOpenid: d.toOpenid,
      jobId: d.jobId || '',
      rating: rate,
      content: String(d.content || '').slice(0, 500),
      createdAt: Date.now()
    }
  })
  return L.ok({ id: add._id })
}

async function reviewsBy(field, value) {
  const res = await L.db().collection('reviews').where({ [field]: value })
    .orderBy('createdAt', 'desc').limit(50).get()
  const list = res.data.map((r) => ({
    id: r._id,
    fromName: r.fromName,
    rating: r.rating,
    content: r.content,
    createdAt: r.createdAt
  }))
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
  return L.ok({ records: list, total: list.length, totalPage: 1, average: Number(avg.toFixed(1)) })
}

exports.jobReviews = async (ctx) => {
  const job = await L.db().collection('jobs').doc(ctx.params.id).get().catch(() => null)
  if (!job || !job.data) return L.fail('招工信息不存在', 404)
  return reviewsBy('toOpenid', job.data.ownerOpenid)
}

exports.workerReviews = async (ctx) => {
  const r = await L.db().collection('resumes').doc(ctx.params.id).get().catch(() => null)
  if (!r || !r.data) return L.fail('简历不存在', 404)
  return reviewsBy('toOpenid', r.data._openid)
}

exports.employerReviews = async (ctx) => reviewsBy('toOpenid', ctx.params.id)

/* ---------- 通知 ---------- */
exports.notifications = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const coll = L.db().collection('notifications').where({ openid: ctx.openid })
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  const records = res.data.map((n) => ({
    id: n._id, title: n.title, content: n.content,
    type: n.type, isRead: !!n.isRead, createdAt: n.createdAt
  }))
  const unread = (await L.db().collection('notifications')
    .where({ openid: ctx.openid, isRead: false }).count()).total
  return L.ok(Object.assign(L.listResult(records, total, page, pageSize), { unread }))
}

exports.readNotification = async (ctx) => {
  await L.db().collection('notifications')
    .where({ _id: ctx.params.id, openid: ctx.openid })
    .update({ data: { isRead: true } })
  return L.ok()
}

exports.readAllNotifications = async (ctx) => {
  await L.db().collection('notifications')
    .where({ openid: ctx.openid, isRead: false })
    .update({ data: { isRead: true } })
  return L.ok()
}

/* ---------- 收藏 ---------- */
exports.toggleFavorite = async (ctx) => {
  const jobId = ctx.data.jobId
  if (!jobId) return L.fail('缺少 jobId')
  const coll = L.db().collection('favorites')
  const res = await coll.where({ openid: ctx.openid, jobId }).limit(1).get()
  if (res.data.length) {
    await coll.doc(res.data[0]._id).remove()
    return L.ok({ favorited: false })
  }
  await coll.add({ data: { openid: ctx.openid, jobId, createdAt: Date.now() } })
  return L.ok({ favorited: true })
}

exports.checkFavorite = async (ctx) => {
  const res = await L.db().collection('favorites')
    .where({ openid: ctx.openid, jobId: ctx.params.id }).limit(1).get()
  return L.ok({ favorited: res.data.length > 0 })
}

exports.favorites = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const coll = L.db().collection('favorites').where({ openid: ctx.openid })
  const total = (await coll.count()).total
  const favs = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  const ids = favs.data.map((f) => f.jobId)
  if (!ids.length) return L.ok(L.listResult([], 0, page, pageSize))
  const jobs = await L.db().collection('jobs').where({ _id: L.cmd().in(ids) }).get()
  const map = {}
  jobs.data.forEach((j) => { map[j._id] = j })
  const records = favs.data.filter((f) => map[f.jobId]).map((f) => {
    const j = map[f.jobId]
    return {
      id: j._id, title: j.title, salary: j.salary, workArea: j.workArea,
      duration: j.duration, isTop: !!j.isTop, status: j.status, favoritedAt: f.createdAt
    }
  })
  return L.ok(L.listResult(records, total, page, pageSize))
}

/* ---------- 保险 / 培训 ---------- */
exports.insurances = async () => {
  const res = await L.db().collection('insurances').where({ enabled: true }).limit(20).get().catch(() => ({ data: [] }))
  return L.ok(res.data.map((i) => ({
    id: i._id, name: i.name, price: i.price, coverage: i.coverage, intro: i.intro
  })))
}

exports.buyInsurance = async (ctx) => {
  const res = await L.db().collection('insurances').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('保险产品不存在', 404)
  const price = Number(res.data.price || 0)
  const upd = await L.db().collection('users')
    .where({ _id: ctx.user._id, balance: L.cmd().gte(price) })
    .update({ data: { balance: L.cmd().inc(-price) } })
  if (!upd.stats || upd.stats.updated !== 1) return L.fail('余额不足', 402)
  const add = await L.db().collection('user_insurances').add({
    data: { openid: ctx.openid, insuranceId: ctx.params.id, name: res.data.name, price, createdAt: Date.now() }
  })
  await L.db().collection('wallet').add({
    data: { openid: ctx.openid, type: 4, amount: -price, businessType: '购买保险', businessId: ctx.params.id, remark: res.data.name, createdAt: Date.now() }
  })
  return L.ok({ id: add._id })
}

exports.myInsurances = async (ctx) => {
  const res = await L.db().collection('user_insurances')
    .where({ openid: ctx.openid }).orderBy('createdAt', 'desc').limit(50).get()
  return L.ok(res.data.map((i) => ({ id: i._id, name: i.name, price: i.price, createdAt: i.createdAt })))
}

exports.trainings = async (ctx) => {
  const res = await L.db().collection('trainings').where({ enabled: true }).limit(50).get().catch(() => ({ data: [] }))
  return L.ok(res.data.map((t) => ({
    id: t._id, title: t.title, cover: t.cover, price: t.price,
    type: t.type, teacher: t.teacher, intro: t.intro
  })))
}

exports.trainingDetail = async (ctx) => {
  const res = await L.db().collection('trainings').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('课程不存在', 404)
  return L.ok(res.data)
}

exports.enrollTraining = async (ctx) => {
  const res = await L.db().collection('trainings').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('课程不存在', 404)
  const add = await L.db().collection('training_enrolls').add({
    data: { openid: ctx.openid, trainingId: ctx.params.id, createdAt: Date.now() }
  })
  return L.ok({ id: add._id })
}

/* ---------- 举报 ---------- */
exports.createReport = async (ctx) => {
  const d = ctx.data || {}
  if (!d.reportType) return L.fail('请选择举报类型')
  const add = await L.db().collection('reports').add({
    data: {
      reporterOpenid: ctx.openid,
      jobId: d.jobId || '',
      bossPhone: d.bossPhone || '',
      reportType: Number(d.reportType),
      reason: String(d.reason || '').slice(0, 500),
      evidence: Array.isArray(d.evidence) ? d.evidence.slice(0, 9) : [],
      status: 0,
      createdAt: Date.now()
    }
  })
  return L.ok({ id: add._id })
}

/* ---------- 意见反馈 ---------- */
exports.createFeedback = async (ctx) => {
  const content = String((ctx.data && ctx.data.content) || '').trim()
  if (content.length < 5) return L.fail('请至少写 5 个字')
  const add = await L.db().collection('feedback').add({
    data: {
      openid: ctx.openid,
      type: Number(ctx.data.type || 1),
      content: content.slice(0, 500),
      contact: String(ctx.data.contact || '').slice(0, 50),
      images: Array.isArray(ctx.data.images) ? ctx.data.images.slice(0, 3) : [],
      status: 0,
      createdAt: Date.now()
    }
  })
  return L.ok({ id: add._id })
}

/* ---------- 我的课程 ---------- */
exports.myCourses = async (ctx) => {
  const enrolls = await L.db().collection('training_enrolls')
    .where({ openid: ctx.openid }).orderBy('createdAt', 'desc').limit(50).get()
  if (!enrolls.data.length) return L.ok({ records: [], total: 0, totalPage: 1 })

  const ids = enrolls.data.map((e) => e.trainingId)
  const trainings = await L.db().collection('trainings').where({ _id: L.cmd().in(ids) }).get()
  const map = {}
  trainings.data.forEach((t) => { map[t._id] = t })

  const records = enrolls.data.filter((e) => map[e.trainingId]).map((e) => {
    const t = map[e.trainingId]
    return {
      id: e._id,
      trainingId: e.trainingId,
      title: t.title,
      cover: t.cover,
      teacher: t.teacher,
      enrolledAt: e.createdAt
    }
  })
  return L.ok({ records, total: records.length, totalPage: 1 })
}

/** 我的反馈记录 */
exports.myFeedback = async (ctx) => {
  const res = await L.db().collection('feedback')
    .where({ openid: ctx.openid }).orderBy('createdAt', 'desc').limit(50).get()
  return L.ok({
    records: res.data.map((f) => ({
      id: f._id, content: f.content, type: f.type, status: f.status, createdAt: f.createdAt
    })),
    total: res.data.length,
    totalPage: 1
  })
}
