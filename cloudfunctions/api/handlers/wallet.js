const L = require('../lib')

function todayKey(ts = Date.now()) {
  const d = new Date(ts + 8 * 3600 * 1000)
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return d.getUTCFullYear() + '-' + m + '-' + day
}

exports.info = async (ctx) => {
  const points = ctx.user.points || 0
  const balance = ctx.user.balance || 0
  const start = new Date(todayKey() + 'T00:00:00+08:00').getTime()
  const signed = (await L.db().collection('wallet')
    .where({ openid: ctx.openid, businessType: '签到', createdAt: L.cmd().gte(start) })
    .count()).total > 0
  const contactCost = Number(await L.getConfig('contactCost', 5))
  const topCost = Number(await L.getConfig('topCost', 30))
  const refreshCost = Number(await L.getConfig('refreshCost', 5))
  const profileTaskPoints = Number(await L.getConfig('profileTaskPoints', 5))
  const blacklistQueryCost = Number(await L.getConfig('blacklistQueryCost', 0))
  return L.ok({ points, balance, signedToday: signed, contactCost, topCost, refreshCost,
    signInPoints: Number(await L.getConfig('signInPoints', 2)),
    profileTaskPoints, profileTaskRewarded: !!ctx.user.profileTaskRewarded,
    blacklistQueryCost })
}

exports.records = async (ctx) => {
  const { page, pageSize, skip } = L.pager(ctx.data)
  const w = { openid: ctx.openid }
  if (ctx.data.type) w.type = Number(ctx.data.type)
  const coll = L.db().collection('wallet').where(w)
  const total = (await coll.count()).total
  const res = await coll.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
  return L.ok(L.listResult(res.data.map((r) => ({
    id: r._id, type: r.type, amount: r.amount,
    businessType: r.businessType, remark: r.remark, createdAt: r.createdAt
  })), total, page, pageSize))
}

exports.signIn = async (ctx) => {
  const today = todayKey()
  const points = Number(await L.getConfig('signInPoints', 2))
  // 以 users.lastSignDate 做原子占位：并发只有一个请求能把日期从旧值改成今天
  const upd = await L.db().collection('users')
    .where({ _id: ctx.user._id, lastSignDate: L.cmd().neq(today) })
    .update({ data: { lastSignDate: today, points: L.cmd().inc(points) } })
  if (!upd.stats || upd.stats.updated !== 1) {
    return L.fail('今天已经签到过了', 409)
  }

  await L.db().collection('wallet').add({
    data: {
      openid: ctx.openid, type: 1, amount: points,
      businessType: '签到', businessId: '', remark: '每日签到', createdAt: Date.now()
    }
  })
  const fresh = await L.db().collection('users').doc(ctx.user._id).get().catch(() => null)
  return L.ok({ points, balance: fresh && fresh.data ? fresh.data.points : (ctx.user.points || 0) + points })
}

/**
 * 充值下单：调用云开发支付统一下单。
 * 依赖：小程序已认证、已开通微信支付、云开发控制台配置了商户号与回调云函数 pay-notify。
 */
exports.recharge = async (ctx) => {
  const amount = Number(ctx.data.amount)
  if (!amount || amount <= 0) return L.fail('充值金额不合法')
  if (amount < 1 || amount > 5000) return L.fail('单次充值需在 1-5000 元之间')

  const subMchId = await L.getConfig('paySubMchId', process.env.PAY_SUB_MCH_ID || '')
  if (!subMchId) return L.fail('微信支付未配置商户号，请先在云开发控制台完成支付配置', 503)

  const outTradeNo = 'GHQ' + Date.now() + Math.random().toString().slice(2, 6)
  const fen = Math.round(amount * 100)
  const now = Date.now()

  await L.db().collection('orders').add({
    data: {
      outTradeNo, openid: ctx.openid, amount, fen,
      status: 'pending', type: 'recharge', createdAt: now
    }
  })

  const res = await ctx.cloud.cloudPay.unifiedOrder({
    body: '管焊圈-余额充值',
    outTradeNo,
    spbillCreateIp: '127.0.0.1',
    subMchId,
    totalFee: fen,
    envId: process.env.TCB_ENV || process.env.SCF_NAMESPACE,
    functionName: 'pay-notify',
    nonceStr: Math.random().toString(36).slice(2, 12),
    tradeType: 'JSAPI'
  })

  if (res.returnCode !== 'SUCCESS' || res.resultCode !== 'SUCCESS') {
    return L.fail(res.errCodeDes || res.returnMsg || '下单失败', 502)
  }
  return L.ok({ outTradeNo, payment: res.payment, amount })
}
