const L = require('../lib')

const publicUser = (u) => ({
  id: u._id,
  nickname: u.nickname,
  avatar: u.avatar,
  phone: u.phone,
  userType: u.userType,
  points: u.points || 0,
  balance: u.balance || 0,
  realNameVerified: !!u.realNameVerified,
  enterpriseVerified: !!u.enterpriseVerified,
  enterprise: u.enterprise || null,
  createdAt: u.createdAt
})

exports.login = async (ctx) => {
  const user = await L.ensureUser(ctx.openid)
  if (user.status === 1) return L.fail('账号已被封禁', 403)
  await L.db().collection('users').doc(user._id).update({ data: { lastLoginAt: Date.now() } })
  return L.ok({ user: publicUser(user), openid: ctx.openid })
}

exports.register = async (ctx) => {
  const { nickname, avatar, userType } = ctx.data
  const user = await L.ensureUser(ctx.openid)
  const patch = { updatedAt: Date.now() }
  if (nickname) patch.nickname = String(nickname).slice(0, 20)
  if (avatar) patch.avatar = avatar
  if (userType === 'employer' || userType === 'worker') patch.userType = userType
  await L.db().collection('users').doc(user._id).update({ data: patch })
  return L.ok(publicUser(Object.assign(user, patch)))
}

/**
 * 绑定手机号：前端用 button open-type="getPhoneNumber" 拿到 code，
 * 服务端换号。云开发调用 openapi 需要小程序已认证。
 */
exports.bindPhone = async (ctx) => {
  const { code } = ctx.data
  if (!code) return L.fail('缺少手机号授权凭证')
  let phone = ''
  try {
    const res = await ctx.cloud.openapi.phonenumber.getPhoneNumber({ code })
    phone = res.phoneInfo && res.phoneInfo.purePhoneNumber
  } catch (e) {
    return L.fail('手机号解析失败：' + e.message)
  }
  if (!phone) return L.fail('未获取到手机号')
  await L.db().collection('users').doc(ctx.user._id).update({ data: { phone, updatedAt: Date.now() } })
  return L.ok({ phone })
}

exports.profile = async (ctx) => L.ok(publicUser(ctx.user))

exports.updateProfile = async (ctx) => {
  const allow = ['nickname', 'avatar', 'gender', 'age', 'city', 'intro']
  const patch = { updatedAt: Date.now() }
  allow.forEach((k) => {
    if (ctx.data[k] !== undefined) patch[k] = ctx.data[k]
  })
  await L.db().collection('users').doc(ctx.user._id).update({ data: patch })
  return L.ok(publicUser(Object.assign(ctx.user, patch)))
}

exports.employerProfile = async (ctx) => {
  const enterprise = ctx.user.enterprise || {}
  return L.ok({
    id: ctx.user._id,
    contactName: enterprise.contactName || ctx.user.nickname || '',
    contactPhone: ctx.user.phone || '',
    companyName: enterprise.companyName || '',
    creditCode: enterprise.creditCode || '',
    license: enterprise.license || '',
    address: enterprise.address || '',
    verified: !!ctx.user.enterpriseVerified
  })
}

exports.updateEmployerProfile = async (ctx) => {
  const d = ctx.data || {}
  const enterprise = {
    companyName: d.companyName || '',
    creditCode: d.creditCode || '',
    license: d.license || '',
    address: d.address || '',
    contactName: d.contactName || ''
  }
  await L.db().collection('users').doc(ctx.user._id).update({
    data: { enterprise, userType: 'employer', updatedAt: Date.now() }
  })
  return L.ok(enterprise)
}

/** 实名认证提交：进入待审核，管理端核验通过后置真 */
exports.submitRealName = async (ctx) => {
  const name = String((ctx.data && ctx.data.realName) || '').trim()
  const idCard = String((ctx.data && ctx.data.idCard) || '').trim()
  if (name.length < 2) return L.fail('请填写真实姓名')
  if (!/^\d{17}[\dXx]$/.test(idCard)) return L.fail('身份证号格式不正确')
  await L.db().collection('users').doc(ctx.user._id).update({
    data: {
      realName: name,
      idCardEnc: L.encryptText(idCard),
      idCardMasked: idCard.slice(0, 4) + '**********' + idCard.slice(-4),
      realNameStatus: 0,
      updatedAt: Date.now()
    }
  })
  return L.ok({ status: 0 })
}
