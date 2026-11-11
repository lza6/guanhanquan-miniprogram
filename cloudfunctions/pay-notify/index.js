/**
 * 微信支付结果回调云函数。
 * 云开发控制台 → 云开发支付 → 支付回调，函数名填 pay-notify。
 * 订单状态、用户余额、流水三件事放在同一事务里，避免中途崩溃造成漏账。
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
  if (Number(event.totalFee || 0) !== order.fen) return { errcode: 1, errmsg: 'amount mismatch' }

  const userRes = await db.collection('users').where({ _openid: order.openid }).limit(1).get()
  if (!userRes.data.length) return { errcode: 1, errmsg: 'user not found' }
  const user = userRes.data[0]

  const now = Date.now()
  let tx
  try {
    tx = await db.startTransaction()
    const txOrder = await tx.collection('orders').doc(order._id).get()
    if (txOrder.data.status === 'paid') {
      await tx.rollback()
      return { errcode: 0, errmsg: 'already paid' }
    }
    const txUser = await tx.collection('users').doc(user._id).get()
    if (Number(event.totalFee || 0) !== Number(txOrder.data.fen)) {
      await tx.rollback()
      return { errcode: 1, errmsg: 'amount mismatch' }
    }
    await tx.collection('orders').doc(order._id).update({
      data: { status: 'paid', paidAt: now, transactionId: event.transactionId || '', raw: event }
    })
    await tx.collection('users').doc(user._id).update({
      data: { balance: (Number(txUser.data.balance) || 0) + Number(order.amount) }
    })
    await tx.collection('wallet').add({
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
    await tx.commit()
    return { errcode: 0, errmsg: 'ok' }
  } catch (e) {
    try { if (tx) await tx.rollback() } catch (e2) {}
    return { errcode: 1, errmsg: e.message || 'transaction failed' }
  }
}
