const L = require('../lib')

const statusOf = (verified, status) => {
  if (status !== undefined && status !== null) return status
  return verified ? 1 : -1
}

const publicUser = (u) => ({
  id: u._id,
  nickname: u.nickname,
  avatar: u.avatar,
  phone: u.phone,
  userType: u.userType,
  points: u.points || 0,
  balance: u.balance || 0,
  realName: u.realName ? String(u.realName).charAt(0) + '**' : '',
  realNameStatus: statusOf(!!u.realNameVerified, u.realNameStatus),
  realNameVerified: !!u.realNameVerified,
  realNameRejectReason: u.realNameRejectReason || '',
  enterprise: u.enterprise || null,
  enterpriseStatus: statusOf(!!u.enterpriseVerified, u.enterpriseStatus),
  enterpriseVerified: !!u.enterpriseVerified,
  enterpriseRejectReason: u.enterpriseRejectReason || '',
  showPhone: u.showPhone !== false,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt || 0
})

exports.publicUser = publicUser

exports.login = async (ctx) => {
  const user = await L.ensureUser(ctx.openid)
  if (user.status === 1) return L.fail('账号已被封禁', 403)
  await L.db().collection('users').doc(user._id).update({ data: { lastLoginAt: Date.now() } })
  return L.ok({ user: publicUser(Object.assign(user, { lastLoginAt: Date.now() })), openid: ctx.openid })
}

exports.register = async (ctx) => {
  const { nickname, avatar, userType } = ctx.data
  const user = await L.ensureUser(ctx.openid)
  const patch = { updatedAt: Date.now(), lastLoginAt: Date.now() }
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

exports.profile = async (ctx) => {
  const now = Date.now()
  await L.db().collection('users').doc(ctx.user._id).update({ data: { lastLoginAt: now } })
  return L.ok(publicUser(Object.assign(ctx.user, { lastLoginAt: now })))
}

exports.updateProfile = async (ctx) => {
  const allow = ['nickname', 'avatar', 'gender', 'age', 'city', 'intro', 'showPhone']
  const patch = { updatedAt: Date.now() }
  allow.forEach((k) => {
    if (ctx.data[k] !== undefined) patch[k] = ctx.data[k]
  })
  if (patch.showPhone !== undefined) patch.showPhone = !!patch.showPhone
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
    enterpriseStatus: statusOf(!!ctx.user.enterpriseVerified, ctx.user.enterpriseStatus),
    rejectReason: ctx.user.enterpriseRejectReason || '',
    verified: !!ctx.user.enterpriseVerified,
    points: ctx.user.points || 0,
    balance: ctx.user.balance || 0
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
    data: {
      enterprise,
      userType: 'employer',
      enterpriseStatus: 0,
      enterpriseVerified: false,
      enterpriseRejectReason: '',
      updatedAt: Date.now()
    }
  })
  return L.ok(Object.assign({}, enterprise, { status: 0 }))
}

/** 实名认证提交：进入待审核，管理端核验通过后置真 */
exports.submitRealName = async (ctx) => {
  if (ctx.user.realNameVerified) return L.fail('已通过实名认证，无需重复提交')
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
      realNameVerified: false,
      realNameRejectReason: '',
      updatedAt: Date.now()
    }
  })
  return L.ok({ status: 0 })
}

/** 账号注销：软删除并禁止后续登录；保留历史数据用于审计 */
exports.deleteAccount = async (ctx) => {
  await L.db().collection('users').doc(ctx.user._id).update({
    data: {
      status: 1,
      deletedAt: Date.now(),
      phone: '',
      nickname: '已注销用户',
      avatar: '',
      updatedAt: Date.now()
    }
  })
  return L.ok({ deleted: true })
}