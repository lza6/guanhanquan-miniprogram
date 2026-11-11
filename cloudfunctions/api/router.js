const L = require('./lib')
const handlers = {
  auth: require('./handlers/auth'),
  jobs: require('./handlers/jobs'),
  workers: require('./handlers/workers'),
  applications: require('./handlers/applications'),
  categories: require('./handlers/categories'),
  social: require('./handlers/social'),
  wallet: require('./handlers/wallet'),
  blacklist: require('./handlers/blacklist'),
  admin: require('./handlers/admin')
}

// [方法, 路径, 处理器, 鉴权]  鉴权：user=必须登录，admin=管理员令牌，none=公开
const ROUTES = [
  // 认证
  ['POST', '/auth/login', handlers.auth.login, 'none'],
  ['POST', '/auth/register', handlers.auth.register, 'none'],
  ['POST', '/auth/bind-phone', handlers.auth.bindPhone, 'user'],
  ['GET', '/users/profile', handlers.auth.profile, 'user'],
  ['PUT', '/users/profile', handlers.auth.updateProfile, 'user'],
  ['POST', '/users/real-name', handlers.auth.submitRealName, 'user'],

  // 招工方资料
  ['GET', '/employers/profile', handlers.auth.employerProfile, 'user'],
  ['PUT', '/employers/profile', handlers.auth.updateEmployerProfile, 'user'],

  // 工人资料
  ['GET', '/workers/profile', handlers.workers.myProfile, 'user'],
  ['PUT', '/workers/profile/update', handlers.workers.updateProfile, 'user'],
  ['GET', '/workers/list', handlers.workers.list, 'none'],
  ['GET', '/workers/detail/:id', handlers.workers.detail, 'none'],

  // 招工信息
  ['POST', '/jobs/create', handlers.jobs.create, 'user'],
  ['GET', '/jobs/list', handlers.jobs.list, 'none'],
  ['GET', '/jobs/detail/:id', handlers.jobs.detail, 'none'],
  ['GET', '/jobs/recommended/list', handlers.jobs.recommended, 'none'],
  ['GET', '/jobs/nearby/list', handlers.jobs.nearby, 'none'],
  ['GET', '/jobs/latest/list', handlers.jobs.latest, 'none'],
  ['PUT', '/jobs/update/:id', handlers.jobs.update, 'user'],
  ['DELETE', '/jobs/delete/:id', handlers.jobs.remove, 'user'],
  ['GET', '/employers/jobs/list', handlers.jobs.mine, 'user'],
  ['POST', '/jobs/contact/:id', handlers.jobs.unlockContact, 'user'],
  ['POST', '/jobs/top/:id', handlers.jobs.top, 'user'],

  // 申请
  ['POST', '/jobs/apply/:id', handlers.applications.apply, 'user'],
  ['GET', '/jobs/check-application/:id', handlers.applications.check, 'user'],
  ['GET', '/jobs/my-applications', handlers.applications.mine, 'user'],
  ['POST', '/jobs/applications/cancel/:jobId/:appId', handlers.applications.cancel, 'user'],
  ['GET', '/jobs/applicants/list/:id', handlers.applications.byJob, 'user'],
  ['POST', '/jobs/applicants/accept/:jobId/:appId', handlers.applications.accept, 'user'],
  ['POST', '/jobs/applicants/reject/:jobId/:appId', handlers.applications.reject, 'user'],

  // 分类与轮播
  ['GET', '/categories/list', handlers.categories.list, 'none'],
  ['GET', '/categories/:id', handlers.categories.detail, 'none'],
  ['GET', '/categories/jobs/list/:id', handlers.categories.jobs, 'none'],
  ['GET', '/categories/workers/list/:id', handlers.categories.workers, 'none'],
  ['GET', '/banners/list', handlers.categories.banners, 'none'],

  // 评价、通知、收藏
  ['POST', '/reviews/create', handlers.social.createReview, 'user'],
  ['GET', '/jobs/reviews/list/:id', handlers.social.jobReviews, 'none'],
  ['GET', '/workers/reviews/list/:id', handlers.social.workerReviews, 'none'],
  ['GET', '/employers/reviews/list/:id', handlers.social.employerReviews, 'none'],
  ['GET', '/notifications/list', handlers.social.notifications, 'user'],
  ['POST', '/notifications/read/:id', handlers.social.readNotification, 'user'],
  ['POST', '/notifications/read-all', handlers.social.readAllNotifications, 'user'],
  ['GET', '/favorites/list', handlers.social.favorites, 'user'],
  ['POST', '/favorites/toggle', handlers.social.toggleFavorite, 'user'],
  ['GET', '/favorites/check/:id', handlers.social.checkFavorite, 'user'],

  // 保险、培训
  ['GET', '/insurances/list', handlers.social.insurances, 'none'],
  ['POST', '/insurances/purchase/:id', handlers.social.buyInsurance, 'user'],
  ['GET', '/users/insurances/list', handlers.social.myInsurances, 'user'],
  ['GET', '/trainings/list', handlers.social.trainings, 'none'],
  ['GET', '/trainings/detail/:id', handlers.social.trainingDetail, 'none'],
  ['POST', '/trainings/enroll/:id', handlers.social.enrollTraining, 'user'],
  ['GET', '/trainings/my', handlers.social.myCourses, 'user'],

  // 钱包
  ['GET', '/wallet/info', handlers.wallet.info, 'user'],
  ['GET', '/wallet/records', handlers.wallet.records, 'user'],
  ['POST', '/wallet/sign-in', handlers.wallet.signIn, 'user'],
  ['POST', '/wallet/recharge', handlers.wallet.recharge, 'user'],

  // 黑老板与举报
  ['GET', '/blacklist/query', handlers.blacklist.query, 'user'],
  ['POST', '/blacklist/submit', handlers.blacklist.submit, 'user'],
  ['POST', '/blacklist/appeal', handlers.blacklist.appeal, 'user'],
  ['POST', '/reports/create', handlers.social.createReport, 'user'],
  ['POST', '/feedback/create', handlers.social.createFeedback, 'user'],
  ['GET', '/feedback/list', handlers.social.myFeedback, 'user'],

  // 管理后台
  ['POST', '/admin/login', handlers.admin.login, 'none'],
  ['GET', '/admin/overview', handlers.admin.overview, 'admin'],
  ['GET', '/admin/jobs', handlers.admin.jobs, 'admin'],
  ['POST', '/admin/jobs/:id/review', handlers.admin.reviewJob, 'admin'],
  ['GET', '/admin/users', handlers.admin.users, 'admin'],
  ['POST', '/admin/users/:id/status', handlers.admin.setUserStatus, 'admin'],
  ['GET', '/admin/blacklist', handlers.admin.blacklist, 'admin'],
  ['POST', '/admin/blacklist/:id/review', handlers.admin.reviewBlacklist, 'admin'],
  ['GET', '/admin/reports', handlers.admin.reports, 'admin'],
  ['POST', '/admin/reports/:id/handle', handlers.admin.handleReport, 'admin'],
  ['GET', '/admin/banners', handlers.admin.banners, 'admin'],
  ['POST', '/admin/banners', handlers.admin.saveBanner, 'admin'],
  ['DELETE', '/admin/banners/:id', handlers.admin.deleteBanner, 'admin'],
  ['GET', '/admin/finance', handlers.admin.finance, 'admin'],
  ['GET', '/admin/feedback', handlers.admin.feedback, 'admin'],
  ['POST', '/admin/feedback/:id/handle', handlers.admin.handleFeedback, 'admin']
]

function match(pattern, path) {
  const a = pattern.split('/')
  const b = path.split('/')
  if (a.length !== b.length) return null
  const params = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) {
      params[a[i].slice(1)] = decodeURIComponent(b[i])
    } else if (a[i] !== b[i]) {
      return null
    }
  }
  return params
}

async function handle(ctx) {
  try {
    let route = null
    let params = null
    for (const r of ROUTES) {
      if (r[0] !== ctx.method) continue
      const m = match(r[1], ctx.path)
      if (m) { route = r; params = m; break }
    }
    if (!route) return L.fail('接口不存在: ' + ctx.path, 404)

    const handler = route[2]
    const policy = route[3]

    if (policy === 'user') {
      if (!ctx.openid) return L.fail('请在小程序内登录', 401)
      ctx.user = await L.ensureUser(ctx.openid)
      if (ctx.user.status === 1) return L.fail('账号已被封禁', 403)
    } else if (policy === 'admin') {
      const secret = await L.getConfig('adminSecret', process.env.ADMIN_SECRET || 'ghq-admin-secret')
      const payload = L.verifyToken(ctx.token, secret)
      if (!payload) return L.fail('登录已过期，请重新登录', 401)
      ctx.admin = payload
    }

    ctx.params = params || {}
    const result = await handler(ctx)
    return result || L.ok()
  } catch (e) {
    console.error('[api error]', ctx.path, e)
    return L.fail(e && e.message ? e.message : '服务异常', 500)
  }
}

module.exports = { handle, ROUTES }