const L = require('../lib')

const FIELDS = ['name', 'jobTypes', 'certificateInfo', 'workExperience', 'techDescription',
  'expectArea', 'expectSalary', 'availableTime', 'contactPhone', 'wechat', 'avatar',
  'certificateImages', 'status']

const CONTENT_FIELDS = ['name', 'jobTypes', 'certificateInfo', 'workExperience', 'techDescription',
  'expectArea', 'expectSalary', 'availableTime', 'contactPhone', 'wechat', 'avatar', 'certificateImages']

function pick(d) {
  const out = {}
  FIELDS.forEach((k) => {
    if (d[k] !== undefined && d[k] !== null) out[k] = d[k]
  })
  return out
}

const resumePhone = (r) => r.contactPhoneEnc ? L.decryptText(r.contactPhoneEnc) : (r.contactPhone || '')
const visible = (r) => r.status === 0 && (r.reviewStatus === undefined || r.reviewStatus === 1)

async function findMine(openid) {
  const res = await L.db().collection('resumes').where({ _openid: openid }).limit(1).get()
  return res.data[0] || null
}

function shape(r, fullPhone) {
  return {
    id: r._id,
    name: r.name || '未填写',
    avatar: r.avatar || '',
    jobTypes: r.jobTypes || [],
    certificateInfo: r.certificateInfo || '',
    certificateImages: r.certificateImages || [],
    workExperience: r.workExperience || '',
    techDescription: r.techDescription || '',
    expectArea: r.expectArea || '',
    expectSalary: r.expectSalary || '',
    availableTime: r.availableTime || '',
    contactPhone: fullPhone ? resumePhone(r) : L.maskPhone(resumePhone(r)),
    wechat: fullPhone ? (r.wechat || '') : '',
    status: r.status === undefined ? 0 : r.status,
    reviewStatus: r.reviewStatus === undefined ? 1 : r.reviewStatus,
    rejectReason: r.rejectReason || '',
    updatedAt: r.updatedAt
  }
}

exports.myProfile = async (ctx) => {
  const resume = await findMine(ctx.openid)
  if (!resume) {
    return L.ok({
      name: ctx.user.nickname || '',
      jobTypes: [],
      certificateInfo: '',
      certificateImages: [],
      workExperience: '',
      techDescription: '',
      expectArea: '',
      expectSalary: '',
      availableTime: '',
      contactPhone: ctx.user.phone || '',
      wechat: '',
      status: 0,
      reviewStatus: 1,
      rejectReason: ''
    })
  }
  return L.ok(shape(resume, true))
}

exports.updateProfile = async (ctx) => {
  const resume = await findMine(ctx.openid)
  const data = pick(ctx.data || {})
  const hasContent = CONTENT_FIELDS.some((k) => data[k] !== undefined)
  if (data.contactPhone !== undefined) {
    data.contactPhoneEnc = L.encryptText(String(data.contactPhone))
    delete data.contactPhone
  }
  if (resume) {
    const patch = Object.assign({}, data, { updatedAt: Date.now() })
    if (hasContent) {
      patch.reviewStatus = 0
      patch.rejectReason = ''
    }
    await L.db().collection('resumes').doc(resume._id).update({ data: patch })
    const merged = Object.assign({}, resume, patch)
    const awarded = await awardProfileTask(ctx, merged)
    return L.ok(Object.assign(shape(merged, true), { taskAwarded: awarded }))
  }
  const doc = Object.assign({}, data, {
    _openid: ctx.openid,
    status: data.status === undefined ? 0 : data.status,
    reviewStatus: 0,
    rejectReason: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
  const add = await L.db().collection('resumes').add({ data: doc })
  const awarded = await awardProfileTask(ctx, doc)
  return L.ok(Object.assign(shape(Object.assign({ _id: add._id }, doc), true), { taskAwarded: awarded }))
}

/** 一次性任务：完善简历（姓名 + 工种 + 手机号）奖励积分 */
async function awardProfileTask(ctx, resume) {
  if (ctx.user && ctx.user.profileTaskRewarded) return 0
  if (!resume.name || !Array.isArray(resume.jobTypes) || !resume.jobTypes.length) return 0
  if (!resume.contactPhoneEnc && !resume.contactPhone) return 0
  const points = Number(await L.getConfig('profileTaskPoints', 5))
  if (!points) return 0
  await L.db().collection('users').doc(ctx.user._id).update({
    data: { points: L.cmd().inc(points), profileTaskRewarded: true, updatedAt: Date.now() }
  })
  await L.db().collection('wallet').add({
    data: {
      openid: ctx.openid, type: 1, amount: points,
      businessType: '任务', businessId: 'profile', remark: '完善简历',
      createdAt: Date.now()
    }
  })
  return points
}

exports.deleteProfile = async (ctx) => {
  const resume = await findMine(ctx.openid)
  if (!resume) return L.fail('没有可删除的简历', 404)
  await L.db().collection('resumes').doc(resume._id).update({
    data: { status: 1, deletedAt: Date.now(), updatedAt: Date.now() }
  })
  return L.ok({ deleted: true })
}

exports.list = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const d = ctx.data
  let w = { status: 0 }
  if (d.categoryId) w.jobTypes = L.db().RegExp({ regexp: String(d.categoryId), options: 'i' })
  if (d.keyword) {
    w = L.withKeyword(w, ['name', 'techDescription', 'expectArea'], d.keyword)
  }
  // 先取一页候选，再按审核状态过滤；兼容历史数据（无 reviewStatus 视为已通过）
  const res = await L.db().collection('resumes').where(w).orderBy('updatedAt', 'desc').limit(200).get()
  const rows = res.data.filter(visible)
  const total = rows.length
  const slice = rows.slice(skip, skip + pageSize)
  return L.ok(L.listResult(slice.map((r) => shape(r, false)), total, page, pageSize))
}

exports.detail = async (ctx) => {
  const res = await L.db().collection('resumes').doc(ctx.params.id).get().catch(() => null)
  if (!res || !res.data) return L.fail('简历不存在', 404)
  const r = res.data
  const isOwner = r._openid === ctx.openid
  if (!isOwner && !visible(r)) return L.fail('简历不存在或未通过审核', 404)

  let fullPhone = isOwner
  if (!isOwner && ctx.user && ctx.user.userType === 'employer') {
    const ownerRes = await L.db().collection('users').where({ _openid: r._openid }).limit(1).get()
    const owner = ownerRes.data[0]
    fullPhone = !owner || owner.showPhone !== false
  }
  return L.ok(shape(r, fullPhone))
}

exports.resumePhone = resumePhone