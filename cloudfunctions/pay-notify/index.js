/**
 * 微信支付结果回调云函数。
 * 云开发控制台 → 云开发支付 → 支付回调，函数名填 pay-notify。
 */
const cloud = require('wx-server-sdk')
const L = require('../api/lib')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const outTradeNo = event.outTradeNo
  if (!outTradeNo) return { errcode: 1, errmsg: 'missing outTradeNo' }

  const db = L.db()
  const res = await db.collection('orders').where({ outTradeNo }).limit(1).get()
  if (!res.data.length) return { errcode: 1, errmsg: 'order not found' }

  const order = res.data[0]
  if (order.status === 'paid') return { errcode: 0, errmsg: 'already paid' }
  if (event.returnCode && event.returnCode !== 'SUCCESS') return { errcode: 1, errmsg: 'payment failed' }

  const totalFee = Number(event.totalFee || 0)
  if (totalFee !== order.fen) return { errcode: 1, errmsg: 'amount mismatch' }

  const now = Date.now()
  const upd = await db.collection('orders')
    .where({ _id: order._id, status: 'pending' })
    .update({
      data: { status: 'paid', paidAt: now, transactionId: event.transactionId || '', raw: event }
    })
  if (!upd.stats || upd.stats.updated !== 1) {
    // 并发回调只有一个请求能完成 pending -> paid 的状态迁移
    return { errcode: 0, errmsg: 'already paid' }
  }
  await db.collection('users').where({ _openid: order.openid }).update({
    data: { balance: L.cmd().inc(order.amount) }
  })
  await db.collection('wallet').add({
    data: {
      openid: order.openid,
      type: 3,
      amount: order.amount,
      businessType: '充值',
      businessId: outTradeNo,
      remark: '微信支付充值',
      createdAt: now
    }
  })

  return { errcode: 0, errmsg: 'ok' }
}