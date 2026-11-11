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
  RegExp: ({ regexp, options }) => ({ __regexp: { regexp, options } }),
  startTransaction: async () => {
    const snapshot = new Map()
    for (const [k, arr] of store) snapshot.set(k, JSON.parse(JSON.stringify(arr)))
    return {
      collection: (name) => new Collection(name),
      async commit() {},
      async rollback() {
        store.clear()
        for (const [k, arr] of snapshot) store.set(k, arr)
      }
    }
  }
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
  async getTempFileURL({ fileList }) {
    return { fileList: (fileList || []).map((id) => ({ fileID: id, tempFileURL: id })) }
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


function seedDemo() {
  if (coll('users').length) return
  require('./seed-demo.js')(coll, require('../lib'))
}

module.exports = {
  fakeSdk,
  setOpenid(openid) { currentOpenid = openid },
  reset() { store.clear(); seq = 0; currentOpenid = '' },
  dump(name) { return coll(name).map((d) => Object.assign({}, d)) },
  seedDemo
}