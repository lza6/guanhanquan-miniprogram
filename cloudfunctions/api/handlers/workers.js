const L = require('../lib')

const FIELDS = ['name', 'jobTypes', 'certificateInfo', 'workExperience', 'techDescription',
  'expectArea', 'expectSalary', 'availableTime', 'contactPhone', 'wechat', 'avatar', 'status']

function pick(d) {
  const out = {}
  FIELDS.forEach((k) => {
    if (d[k] !== undefined && d[k] !== null) out[k] = d[k]
  })
  return out
}

async function findMine(openid) {
  const res = await L.db().collection('resumes').where({ _openid: openid }).limit(1).get()
  return res.data[0] || null
}

exports.myProfile = async (ctx) => {
  const resume = await findMine(ctx.openid)
  if (!resume) {
    return L.ok({
      name: ctx.user.nickname || '',
      jobTypes: [],
      certificateInfo: '',
      workExperience: '',
      techDescription: '',
      expectArea: '',
      expectSalary: '',
      availableTime: '',
      contactPhone: ctx.user.phone || '',
      wechat: '',
      status: 0
    })
  }
  return L.ok(Object.assign({ id: resume._id }, resume))
}

exports.updateProfile = async (ctx) => {
  const resume = await findMine(ctx.openid)
  const data = pick(ctx.data || {})
  if (resume) {
    await L.db().collection('resumes').doc(resume._id).update({
      data: Object.assign(data, { updatedAt: Date.now() })
    })
    return L.ok(Object.assign({ id: resume._id }, resume, data))
  }
  const doc = Object.assign(data, {
    _openid: ctx.openid,
    status: data.status === undefined ? 0 : data.status,
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
  const add = await L.db().collection('resumes').add({ data: doc })
  return L.ok(Object.assign({ id: add._id }, doc))
}

exports.list = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const d = ctx.data
  let w = { status: 0 }
  if (d.categoryId) w.jobTypes = L.db().RegExp({ regexp: String(d.categoryId), options: 'i' })
  if (d.keyword) {
    w = L.withKeyword(w, ['name', 'techDescription', 'expectArea'], d.keyword)
  }
  const coll = L.db().collection('resumes').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('updatedAt', 'desc').skip(skip).limit(pageSize).get()
  const records = res.data.map((r) => ({
    id: r._id,
    name: r.name || '未填写',
    avatar: r.avatar || '',
    jobTypes: r.jobTypes || [],
    certificateInfo: r.certificateInfo || '',
    workExperience: r.workExperience || '',
    expectArea: r.expectArea || '',
    expectSalary: r.expectSalary || '',
    availableTime: r.availableTime || '',
    updatedAt: r.updatedAt
  }))
  return L.ok(L.listResult(records, total, page, pageSize))
}

exports.detail = async (ctx) => {
  const res = await L.db().collection('resumes').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('简历不存在', 404)
  const r = res.data
  return L.ok({
    id: r._id,
    name: r.name || '未填写',
    avatar: r.avatar || '',
    jobTypes: r.jobTypes || [],
    certificateInfo: r.certificateInfo || '',
    workExperience: r.workExperience || '',
    techDescription: r.techDescription || '',
    expectArea: r.expectArea || '',
    expectSalary: r.expectSalary || '',
    availableTime: r.availableTime || '',
    contactPhone: ctx.openid ? r.contactPhone : L.maskPhone(r.contactPhone),
    wechat: ctx.openid ? r.wechat : '',
    updatedAt: r.updatedAt
  })
}