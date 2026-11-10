const L = require('../lib')

const REASONS = {
  1: '欠薪/拖薪',
  2: '放鸽子（到现场没活）',
  3: '虚假信息（待遇不符）',
  4: '态度恶劣/克扣工资',
  5: '其他违规'
}

async function salt() {
  return String(await L.getConfig('phoneSalt', process.env.PHONE_SALT || 'ghq-phone-salt'))
}

/** 登录后可查：返回被确认的标记次数、原因与最近时间，不返回举报人信息 */
exports.query = async (ctx) => {
  const phone = String(ctx.data.phone || '').replace(/\D/g, '')
  if (!/^1\d{10}$/.test(phone)) return L.fail('请输入 11 位手机号')

  const hash = L.hashPhone(phone, await salt())
  const res = await L.db().collection('blacklist')
    .where({ bossPhoneHash: hash, status: 1 })
    .orderBy('createdAt', 'desc').limit(50).get()

  const records = res.data.map((r) => ({
    reasonType: r.reasonType,
    reasonName: REASONS[r.reasonType] || '其他',
    detail: r.reasonDetail || '',
    createdAt: r.createdAt
  }))
  const counts = {}
  records.forEach((r) => { counts[r.reasonName] = (counts[r.reasonName] || 0) + 1 })

  return L.ok({
    phone: L.maskPhone(phone),
    count: records.length,
    reasons: Object.keys(counts).map((k) => ({ name: k, count: counts[k] })),
    records,
    lastAt: records.length ? records[0].createdAt : null,
    bossName: records.length ? (res.data[0].bossName || '') : ''
  })
}

/** 提交标记：进入待审核队列，人工确认后才对外展示 */
exports.submit = async (ctx) => {
  const d = ctx.data || {}
  const phone = String(d.bossPhone || '').replace(/\D/g, '')
  if (!/^1\d{10}$/.test(phone)) return L.fail('请填写老板的正确手机号')
  const reasonType = Number(d.reasonType)
  if (!REASONS[reasonType]) return L.fail('请选择标记原因')
  if (!d.reasonDetail || String(d.reasonDetail).trim().length < 10) {
    return L.fail('请补充至少 10 个字的情况说明')
  }

  const s = await salt()
  const hash = L.hashPhone(phone, s)

  const dup = await L.db().collection('blacklist')
    .where({ bossPhoneHash: hash, reporterOpenid: ctx.openid, status: L.cmd().in([0, 1]) })
    .limit(1).get()
  if (dup.data.length) return L.fail('你已提交过该号码的标记，请等待审核', 409)

  const add = await L.db().collection('blacklist').add({
    data: {
      bossPhoneHash: hash,
      bossPhoneMasked: L.maskPhone(phone),
      bossName: String(d.bossName || '').slice(0, 20),
      reporterOpenid: ctx.openid,
      reporterPhone: ctx.user.phone || '',
      reasonType,
      reasonDetail: String(d.reasonDetail).slice(0, 1000),
      evidence: Array.isArray(d.evidence) ? d.evidence.slice(0, 9) : [],
      status: 0,
      createdAt: Date.now(),
      reviewedAt: 0,
      reviewerId: ''
    }
  })
  return L.ok({ id: add._id, status: 0 })
}