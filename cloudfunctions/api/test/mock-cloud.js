/**
 * 本地内存版云开发 SDK，用于在没有云环境的情况下跑通业务逻辑。
 * 只实现 handlers 用到的子集：where/orderBy/skip/limit/get/count/add/doc/update/remove
 * 以及 command 的 inc/gte/lte/in/neq/and 与 RegExp。
 */
const Module = require('module')

const store = new Map()
let currentOpenid = ''

const coll = (name) => {
  if (!store.has(name)) store.set(name, [])
  return store.get(name)
}

let seq = 0
const newId = () => 'doc' + (++seq).toString().padStart(4, '0')

/* ---------- command ---------- */
function cmp(op, v) {
  const o = { __cmp: [op, v] }
  o.and = (other) => ({ __cmds: [o, other] })
  return o
}
const command = {
  inc: (v) => ({ __updateInc: v }),
  gte: (v) => cmp('gte', v),
  lte: (v) => cmp('lte', v),
  gt: (v) => cmp('gt', v),
  lt: (v) => cmp('lt', v),
  neq: (v) => cmp('neq', v),
  eq: (v) => cmp('eq', v),
  in: (v) => cmp('in', v),
  and: (...args) => ({ __cmds: args.length === 1 && Array.isArray(args[0]) ? args[0] : args }),
  or: (...args) => ({ __or: args.length === 1 && Array.isArray(args[0]) ? args[0] : args })
}

function matchValue(docVal, cond) {
  if (cond && cond.__cmds) return cond.__cmds.every((c) => matchValue(docVal, c))
  if (cond && cond.__cmp) {
    const [op, v] = cond.__cmp
    if (op === 'gte') return docVal >= v
    if (op === 'lte') return docVal <= v
    if (op === 'gt') return docVal > v
    if (op === 'lt') return docVal < v
    if (op === 'neq') return docVal !== v
    if (op === 'eq') return docVal === v
    if (op === 'in') return Array.isArray(v) && v.indexOf(docVal) >= 0
    return false
  }
  if (cond && cond.__regexp) {
    const re = new RegExp(cond.__regexp.regexp, cond.__regexp.options || '')
    return re.test(String(docVal == null ? '' : docVal))
  }
  return docVal === cond
}

function matchDoc(doc, where) {
  if (!where) return true
  if (where.__cmds) return where.__cmds.every((c) => matchDoc(doc, c))
  if (where.__or) return where.__or.some((c) => matchDoc(doc, c))
  return Object.keys(where).every((key) => {
    if (key === '$or') {
      return where.$or.some((sub) => matchDoc(doc, sub))
    }
    return matchValue(doc[key], where[key])
  })
}

/* ---------- query ---------- */
class Query {
  constructor(name, where) {
    this.name = name
    this._where = where || {}
    this._order = []
    this._skip = 0
    this._limit = Infinity
  }
  where(w) { this._where = w || {}; return this }
  orderBy(field, dir) { this._order.push([field, dir]); return this }
  skip(n) { this._skip = n; return this }
  limit(n) { this._limit = n; return this }
  _rows() {
    let rows = coll(this.name).filter((d) => matchDoc(d, this._where))
    for (let i = this._order.length - 1; i >= 0; i--) {
      const [field, dir] = this._order[i]
      rows.sort((a, b) => {
        const x = a[field], y = b[field]
        if (x === y) return 0
        const r = x > y ? 1 : -1
        return dir === 'desc' ? -r : r
      })
    }
    return rows
  }
  async get() {
    const rows = this._rows().slice(this._skip, this._skip + this._limit)
    return { data: rows.map((r) => Object.assign({}, r)) }
  }
  async count() { return { total: this._rows().length } }
  async update({ data }) {
    const rows = this._rows()
    rows.forEach((doc) => applyUpdate(doc, data))
    return { stats: { updated: rows.length } }
  }
  async remove() {
    const rows = this._rows()
    const arr = coll(this.name)
    rows.forEach((doc) => {
      const i = arr.indexOf(doc)
      if (i >= 0) arr.splice(i, 1)
    })
    return { stats: { removed: rows.length } }
  }
}

function applyUpdate(doc, patch) {
  Object.keys(patch).forEach((k) => {
    const v = patch[k]
    if (v && v.__updateInc !== undefined) {
      doc[k] = (doc[k] || 0) + v.__updateInc
    } else {
      doc[k] = v
    }
  })
}

class Collection extends Query {
  constructor(name) { super(name, {}) }
  doc(id) {
    const arr = coll(this.name)
    const self = this
    return {
      async get() {
        const d = arr.find((x) => x._id === id)
        if (!d) throw new Error('document not found: ' + id)
        return { data: Object.assign({}, d) }
      },
      async update({ data }) {
        const d = arr.find((x) => x._id === id)
        if (!d) throw new Error('document not found: ' + id)
        applyUpdate(d, data)
        return { stats: { updated: 1 } }
      },
      async remove() {
        const i = arr.findIndex((x) => x._id === id)
        if (i >= 0) arr.splice(i, 1)
        return { stats: { removed: i >= 0 ? 1 : 0 } }
      },
      async set({ data }) {
        const i = arr.findIndex((x) => x._id === id)
        const doc = Object.assign({ _id: id }, data)
        if (i >= 0) arr[i] = doc
        else arr.push(doc)
        return { stats: { updated: 1 } }
      }
    }
  }
  async add({ data }) {
    const doc = Object.assign({ _id: newId() }, data)
    coll(this.name).push(doc)
    return { _id: doc._id }
  }
}

const database = () => ({
  collection: (name) => new Collection(name),
  command,
  RegExp: ({ regexp, options }) => ({ __regexp: { regexp, options } })
})

const fakeSdk = {
  init() {},
  DYNAMIC_CURRENT_ENV: 'mock-env',
  database,
  getWXContext: () => ({ OPENID: currentOpenid, APPID: 'wxtest', UNIONID: '' }),
  openapi: {
    phonenumber: {
      async getPhoneNumber() { return { phoneInfo: { purePhoneNumber: '13800000000' } } }
    }
  },
  cloudPay: {
    async unifiedOrder(payload) {
      return {
        returnCode: 'SUCCESS',
        resultCode: 'SUCCESS',
        payment: { orderId: payload.outTradeNo, nonceStr: payload.nonceStr }
      }
    }
  }
}

const original = Module._load
Module._load = function (request) {
  if (request === 'wx-server-sdk') return fakeSdk
  return original.apply(this, arguments)
}


/** 本地演示数据，仅在开发环境调用 */
function seedDemo() {
  if (coll('users').length) return
  const now = Date.now()
  const day = 86400000
  const u = (id, openid, nick, type, points, balance) => ({
    _id: id, _openid: openid, nickname: nick, phone: '', avatar: '', userType: type,
    points, balance, status: 0, realNameVerified: false, enterpriseVerified: type === 'employer',
    createdAt: now - day * 3, lastLoginAt: now
  })
  coll('users').push(
    u('u1', 'emp_demo', '沈阳张工', 'employer', 120, 50),
    u('u2', 'w_demo1', '焊工老李', 'worker', 8, 0),
    u('u3', 'w_demo2', '管工小王', 'worker', 15, 0)
  )

  const j = (id, title, salary, area, status, top, created) => ({
    _id: id, ownerOpenid: 'emp_demo', employerName: '沈阳张工', employerVerified: true,
    title, categoryId: title === '焊工' ? 'hanjie' : 'guandao', salary, salaryUnit: 1,
    workArea: area, duration: '工期到年底', certificateReq: '双证', ageLimit: '55 岁以下',
    techReq: '能包口', accommodation: '管吃住', payType: 1, contactName: '张',
    contactPhoneEnc: '', isTop: top, isUrgent: status === 0, status,
    viewCount: 12, applyCount: 1, createdAt: created, updatedAt: created,
    expireAt: created + day * 7, rejectReason: ''
  })
  coll('jobs').push(
    j('j1', '管工', 550, '新疆乌鲁木齐', 1, true, now - day * 2),
    j('j2', '焊工', 600, '安徽工地', 0, false, now - 3600000),
    j('j3', '普工', 260, '沈阳苏家屯', 1, false, now - day)
  )

  coll('blacklist').push({
    _id: 'b1', bossPhoneHash: 'h1', bossPhoneMasked: '139****1111', bossName: '刘某',
    reporterOpenid: 'w_demo1', reporterPhone: '', reasonType: 1,
    reasonDetail: '干完活三个月不给工资，电话不接微信拉黑', evidence: [],
    status: 0, createdAt: now - 3600000, reviewedAt: 0, reviewerId: ''
  })

  coll('reports').push({
    _id: 'r1', reporterOpenid: 'w_demo2', jobId: 'j3', bossPhone: '13900002222',
    reportType: 1, reason: '日薪和描述不一致，到现场压价', evidence: [], status: 0, createdAt: now - 7200000
  })

  coll('wallet').push(
    { _id: 'w1', openid: 'emp_demo', type: 3, amount: 50, businessType: '充值', businessId: 'o1', remark: '微信支付充值', createdAt: now - day },
    { _id: 'w2', openid: 'emp_demo', type: 2, amount: -30, businessType: '置顶', businessId: 'j1', remark: '管工', createdAt: now - day * 2 }
  )

  coll('orders').push({ _id: 'o1', outTradeNo: 'GHQ1', openid: 'emp_demo', amount: 50, fen: 5000, status: 'paid', createdAt: now - day })

  coll('banners').push({
    _id: 'bn1', imageUrl: 'https://img.yzcdn.cn/vant/cat.jpeg', link: '', title: '春季招工',
    sort: 1, enabled: true, createdAt: now - day * 5
  })
}

module.exports = {
  fakeSdk,
  setOpenid(openid) { currentOpenid = openid },
  reset() { store.clear(); seq = 0; currentOpenid = '' },
  dump(name) { return coll(name).map((d) => Object.assign({}, d)) },
  seedDemo
}