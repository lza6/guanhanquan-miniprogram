const L = require('../lib')

exports.apply = async (ctx) => {
  const jobId = ctx.params.id
  const jobRes = await L.db().collection('jobs').doc(jobId).get().catch(() => null)
  if (!jobRes || !jobRes.data) return L.fail('招工信息不存在', 404)
  const job = jobRes.data
  if (job.status !== 1) return L.fail('该信息已下架', 400)

  const dup = await L.db().collection('applications')
    .where({ jobId, workerOpenid: ctx.openid, status: L.cmd().in(['pending', 'accepted']) })
    .limit(1).get()
  if (dup.data.length) return L.fail('你已报名该岗位', 400)

  const now = Date.now()
  const app = {
    jobId,
    jobTitle: job.title,
    employerOpenid: job.ownerOpenid,
    workerOpenid: ctx.openid,
    workerName: ctx.user.nickname || '',
    workerPhone: ctx.user.phone || '',
    coverLetter: (ctx.data && ctx.data.coverLetter) || '',
    status: 'pending',
    createdAt: now,
    updatedAt: now
  }
  const add = await L.db().collection('applications').add({ data: app })
  await L.db().collection('jobs').doc(jobId).update({ data: { applyCount: L.cmd().inc(1) } })
  await L.db().collection('notifications').add({
    data: {
      openid: job.ownerOpenid,
      title: '收到新的报名',
      content: (ctx.user.nickname || '有工人') + ' 报名了「' + job.title + '」',
      type: 2,
      isRead: false,
      createdAt: now
    }
  })
  return L.ok({ id: add._id, status: 'pending' })
}

exports.check = async (ctx) => {
  const res = await L.db().collection('applications')
    .where({ jobId: ctx.params.id, workerOpenid: ctx.openid })
    .orderBy('createdAt', 'desc').limit(1).get()
  return L.ok(res.data.length ? { applied: true, status: res.data[0].status, id: res.data[0]._id } : { applied: false })
}

exports.mine = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = { workerOpenid: ctx.openid }
  if (ctx.data.status) w.status = ctx.data.status
  const coll = L.db().collection('applications').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  const records = res.data.map((a) => ({
    id: a._id,
    jobId: a.jobId,
    jobTitle: a.jobTitle,
    status: a.status,
    coverLetter: a.coverLetter,
    createdAt: a.createdAt
  }))
  return L.ok(L.listResult(records, total, page, pageSize))
}

exports.cancel = async (ctx) => {
  const { jobId, appId } = ctx.params
  const res = await L.db().collection('applications').doc(appId).get().catch(() => null)
  if (!res || !res.data) return L.fail('报名记录不存在', 404)
  if (res.data.workerOpenid !== ctx.openid) return L.fail('无权操作', 403)
  await L.db().collection('applications').doc(appId).update({
    data: { status: 'cancelled', updatedAt: Date.now() }
  })
  await L.db().collection('jobs').doc(jobId).update({ data: { applyCount: L.cmd().inc(-1) } })
  return L.ok({ id: appId, status: 'cancelled' })
}

exports.byJob = async (ctx) => {
  const jobId = ctx.params.id
  const jobRes = await L.db().collection('jobs').doc(jobId).get().catch(() => null)
  if (!jobRes || !jobRes.data) return L.fail('招工信息不存在', 404)
  if (jobRes.data.ownerOpenid !== ctx.openid) return L.fail('无权查看', 403)

  const res = await L.db().collection('applications')
    .where({ jobId }).orderBy('createdAt', 'desc').limit(100).get()
  return L.ok({
    records: res.data.map((a) => ({
      id: a._id,
      workerName: a.workerName,
      workerPhone: a.workerPhone,
      status: a.status,
      coverLetter: a.coverLetter,
      createdAt: a.createdAt
    })),
    total: res.data.length,
    totalPage: 1
  })
}

async function changeStatus(ctx, status) {
  const { jobId, appId } = ctx.params
  const jobRes = await L.db().collection('jobs').doc(jobId).get().catch(() => null)
  if (!jobRes || !jobRes.data) return L.fail('招工信息不存在', 404)
  if (jobRes.data.ownerOpenid !== ctx.openid) return L.fail('无权操作', 403)

  const res = await L.db().collection('applications').doc(appId).get().catch(() => null)
  if (!res || !res.data) return L.fail('报名记录不存在', 404)

  await L.db().collection('applications').doc(appId).update({
    data: { status, updatedAt: Date.now() }
  })
  await L.db().collection('notifications').add({
    data: {
      openid: res.data.workerOpenid,
      title: status === 'accepted' ? '报名已通过' : '报名未通过',
      content: '「' + jobRes.data.title + '」' + (status === 'accepted' ? '已同意你上岗，请联系老板' : '已被拒绝'),
      type: 2,
      isRead: false,
      createdAt: Date.now()
    }
  })
  return L.ok({ id: appId, status })
}

exports.accept = (ctx) => changeStatus(ctx, 'accepted')
exports.reject = (ctx) => changeStatus(ctx, 'rejected')