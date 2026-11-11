const L = require('../lib')

// 冷启动默认工种，后台可在 categories 集合覆盖
const DEFAULT_CATEGORIES = [
  { key: 'guandao', name: '管工', description: '配管、组对', icon: '', sort: 1 },
  { key: 'hanjie', name: '焊工', description: '手工焊、氩电焊', icon: '', sort: 2 },
  { key: 'pugong', name: '普工', description: '辅助施工', icon: '', sort: 3 },
  { key: 'maogong', name: '铆工', description: '钢结构组立', icon: '', sort: 4 },
  { key: 'qizhong', name: '起重工', description: '吊装、指挥', icon: '', sort: 5 },
  { key: 'diangong', name: '电工', description: '现场电气', icon: '', sort: 6 },
  { key: 'jishuyuan', name: '技术员', description: '施工技术管理', icon: '', sort: 7 }
]

async function loadCategories() {
  try {
    const res = await L.db().collection('categories').orderBy('sort', 'asc').limit(50).get()
    if (res.data.length) {
      return res.data.map((c) => ({
        id: c._id,
        key: c.key,
        name: c.name,
        description: c.description || '',
        icon: c.icon || '',
        sort: c.sort || 0
      }))
    }
  } catch (e) {
    // 集合尚未创建时走默认值
  }
  return DEFAULT_CATEGORIES.map((c, i) => Object.assign({ id: c.key }, c, { sort: i + 1 }))
}

exports.list = async () => {
  const list = await loadCategories()
  const coll = L.db().collection('jobs')
  const withCount = []
  const now = Date.now()
  for (const c of list) {
    const total = (await coll.where({
      status: 1,
      categoryId: c.id,
      expireAt: L.cmd().gt(now)
    }).count()).total
    withCount.push(Object.assign({}, c, { jobCount: total }))
  }
  return L.ok(withCount)
}

exports.detail = async (ctx) => {
  const list = await loadCategories()
  const found = list.find((c) => String(c.id) === String(ctx.params.id) || c.key === ctx.params.id)
  return found ? L.ok(found) : L.fail('分类不存在', 404)
}

exports.jobs = async (ctx) => {
  const page = Math.max(1, parseInt(ctx.data.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(ctx.data.pageSize, 10) || 20))
  const now = Date.now()
  const w = { status: 1, categoryId: ctx.params.id, expireAt: L.cmd().gt(now) }
  if (ctx.data.keyword) {
    w.title = L.db().RegExp({ regexp: String(ctx.data.keyword), options: 'i' })
  }
  if (ctx.data.city) w.workArea = L.db().RegExp({ regexp: String(ctx.data.city), options: 'i' })
  if (ctx.data.minSalary && ctx.data.maxSalary) {
    w.salary = L.cmd().gte(Number(ctx.data.minSalary)).and(L.cmd().lte(Number(ctx.data.maxSalary)))
  } else if (ctx.data.minSalary) {
    w.salary = L.cmd().gte(Number(ctx.data.minSalary))
  } else if (ctx.data.maxSalary) {
    w.salary = L.cmd().lte(Number(ctx.data.maxSalary))
  }
  const coll = L.db().collection('jobs').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('isTop', 'desc').orderBy('priorityAt', 'desc')
    .skip((page - 1) * pageSize).limit(pageSize).get()
  const records = res.data.map((j) => ({
    id: j._id,
    title: j.title,
    salary: j.salary,
    salaryUnit: j.salaryUnit || 1,
    workArea: j.workArea,
    duration: j.duration,
    isTop: !!j.isTop && Number(j.topExpireAt || 0) > now,
    isUrgent: !!j.isUrgent,
    employerName: j.employerName || '',
    employerVerified: !!j.employerVerified,
    createdAt: j.createdAt
  }))
  return L.ok(L.listResult(records, total, page, pageSize))
}

exports.workers = async (ctx) => {
  const page = Math.max(1, parseInt(ctx.data.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(ctx.data.pageSize, 10) || 20))
  const list = await loadCategories()
  const found = list.find((c) => String(c.id) === String(ctx.params.id) || c.key === ctx.params.id)
  const key = found ? found.name : ctx.params.id
  const w = { status: 0, reviewStatus: 1, jobTypes: L.db().RegExp({ regexp: String(key), options: 'i' }) }
  const coll = L.db().collection('resumes').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('updatedAt', 'desc').skip((page - 1) * pageSize).limit(pageSize).get()
  const records = res.data.map((r) => ({
    id: r._id,
    name: r.name || '未填写',
    avatar: r.avatar || '',
    jobTypes: r.jobTypes || [],
    certificateInfo: r.certificateInfo || '',
    workExperience: r.workExperience || '',
    expectArea: r.expectArea || '',
    expectSalary: r.expectSalary || ''
  }))
  return L.ok(L.listResult(records, total, page, pageSize))
}

exports.banners = async () => {
  try {
    const res = await L.db().collection('banners')
      .where({ enabled: true }).orderBy('sort', 'asc').limit(10).get()
    return L.ok(res.data.map((b) => ({
      id: b._id,
      imageUrl: b.imageUrl,
      link: b.link || '',
      title: b.title || ''
    })))
  } catch (e) {
    return L.ok([])
  }
}