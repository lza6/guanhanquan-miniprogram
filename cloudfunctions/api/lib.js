const crypto = require('crypto')

let _db = null
function db() {
  if (!_db) _db = require('wx-server-sdk').database()
  return _db
}
function cmd() {
  return db().command
}

const ok = (data = null, message = 'ok') => ({ success: true, code: 0, message, data })
const fail = (message = '请求失败', code = 400) => ({ success: false, code, message, data: null })

function parseHttpEvent(event) {
  let data = {}
  if (event.body) {
    try {
      data = JSON.parse(event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body)
    } catch (e) {
      data = {}
    }
  }
  if (event.queryStringParameters) {
    data = Object.assign({}, event.queryStringParameters, data)
  }
  // HTTP 访问服务会带上自定义路径前缀（如 /api），从 /admin 处截断即可
  let path = event.path || (event.requestContext && event.requestContext.path) || '/'
  const idx = path.indexOf('/admin')
  if (idx > 0) path = path.slice(idx)
  const headers = event.headers || {}
  const auth = headers.authorization || headers.Authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  return {
    path,
    method: (event.httpMethod || 'GET').toUpperCase(),
    data,
    token
  }
}

/** 分页参数归一化：page 从 1 开始，pageSize 上限 50 */
function pager(data) {
  const page = Math.max(1, parseInt(data.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(data.pageSize, 10) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

/** 统一列表返回体，页面按 { records, total, totalPage } 解构 */
function listResult(records, total, page, pageSize) {
  return {
    records,
    total,
    page,
    pageSize,
    totalPage: Math.max(1, Math.ceil(total / pageSize))
  }
}

function hashPhone(phone, salt) {
  return crypto.createHash('sha256').update(String(phone) + '|' + salt).digest('hex')
}

function maskPhone(phone) {
  const s = String(phone || '')
  return s.length === 11 ? s.slice(0, 3) + '****' + s.slice(7) : s
}

function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return body + '.' + sig
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null
  const [body, sig] = token.split('.')
  const expect = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (sig !== expect) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch (e) {
    return null
  }
}

function signTokenLong(payload, secret) {
  return signToken(payload, secret)
}

/** 读取配置项，缺失时返回默认值 */
async function getConfig(key, fallback) {
  try {
    const res = await db().collection('configs').where({ key }).limit(1).get()
    if (res.data.length) return res.data[0].value
  } catch (e) {
    // 集合不存在时走默认值
  }
  return fallback
}

async function setConfig(key, value) {
  const res = await db().collection('configs').where({ key }).limit(1).get()
  if (res.data.length) {
    await db().collection('configs').doc(res.data[0]._id).update({ data: { value, updatedAt: Date.now() } })
  } else {
    await db().collection('configs').add({ data: { key, value, updatedAt: Date.now() } })
  }
}

/** 按 openid 取用户，不存在则创建 */
async function ensureUser(openid) {
  if (!openid) return null
  const res = await db().collection('users').where({ _openid: openid }).limit(1).get()
  if (res.data.length) return res.data[0]
  const now = Date.now()
  const user = {
    _openid: openid,
    nickname: '',
    avatar: '',
    phone: '',
    userType: 'worker',
    points: 0,
    balance: 0,
    status: 0,
    realNameVerified: false,
    enterpriseVerified: false,
    createdAt: now,
    lastLoginAt: now
  }
  const add = await db().collection('users').add({ data: user })
  user._id = add._id
  return user
}


/** 联系方式加密存储：AES-256-GCM，密钥取自环境变量 CONTACT_KEY */
function contactKey() {
  return crypto.createHash('sha256').update(process.env.CONTACT_KEY || 'ghq-contact-key').digest()
}
function encryptText(text) {
  if (!text) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', contactKey(), iv)
  const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}
function decryptText(payload) {
  if (!payload) return ''
  try {
    const buf = Buffer.from(payload, 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', contactKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch (e) {
    return ''
  }
}


/**
 * 多字段关键词检索。云数据库不支持 Mongo 的 $or，
 * 必须用 command.or / command.and 组合。
 */
function withKeyword(base, fields, keyword) {
  if (!keyword) return base
  const kw = db().RegExp({ regexp: String(keyword), options: 'i' })
  const or = cmd().or(fields.map((f) => ({ [f]: kw })))
  return Object.keys(base).length ? cmd().and([base, or]) : or
}

module.exports = {
  db, cmd, ok, fail, parseHttpEvent,
  pager, listResult,
  hashPhone, maskPhone,
  signToken, signTokenLong, verifyToken,
  getConfig, setConfig, ensureUser,
  encryptText, decryptText, withKeyword
}