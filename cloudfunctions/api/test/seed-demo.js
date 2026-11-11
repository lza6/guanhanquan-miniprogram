/**
 * 本地演示数据：覆盖全部业务集合，供本地联调与自动验收使用。
 * 由 mock-cloud.js 的 seedDemo() 调用，仅在开发环境生效。
 */
module.exports = function seed(coll, L) {
  const now = Date.now()
  const DAY = 86400000
  const enc = (p) => L.encryptText(p)

  coll('users').push(
    { _id: 'u1', _openid: 'dev-openid', nickname: '李师傅', phone: '13800001111', avatar: '', userType: 'worker',
      points: 60, balance: 20, status: 0, realNameVerified: true, enterpriseVerified: false,
      createdAt: now - DAY * 20, lastLoginAt: now },
    { _id: 'u2', _openid: 'emp_demo', nickname: '张工', phone: '13900002222', avatar: '', userType: 'employer',
      points: 120, balance: 50, status: 0, realNameVerified: true, enterpriseVerified: true,
      enterprise: { companyName: '沈阳中建安装工程处', creditCode: '91210100MA0Y000000', license: '', address: '沈阳市苏家屯区', contactName: '张工' },
      createdAt: now - DAY * 30, lastLoginAt: now },
    { _id: 'u3', _openid: 'emp2', nickname: '王老板', phone: '13700003333', avatar: '', userType: 'employer',
      points: 30, balance: 0, status: 0, realNameVerified: false, enterpriseVerified: false,
      createdAt: now - DAY * 5, lastLoginAt: now },
    { _id: 'u4', _openid: 'w_demo2', nickname: '焊工老赵', phone: '13600004444', avatar: '', userType: 'worker',
      points: 8, balance: 0, status: 0, realNameVerified: false, enterpriseVerified: false,
      createdAt: now - DAY * 8, lastLoginAt: now }
  )

  const jobs = [
    ['j1', 'emp_demo', '管工', 'guandao', 550, '新疆乌鲁木齐', '乌鲁木齐米东区石化项目', 43.8, 87.6, 1, true, false, 0.2],
    ['j2', 'emp_demo', '焊工', 'hanjie', 600, '安徽合肥', '合肥新桥机场扩建', 31.8, 117.2, 1, false, true, 1],
    ['j3', 'emp2', '普工', 'pugong', 260, '沈阳苏家屯', '苏家屯钢结构厂', 41.66, 123.34, 1, false, false, 1],
    ['j4', 'emp2', '铆工', 'maogong', 580, '辽宁大连', '大连船舶重工', 38.9, 121.6, 1, true, false, 3],
    ['j5', 'emp_demo', '起重工', 'qizhong', 520, '吉林长春', '长春一汽厂区吊装', 43.9, 125.3, 0, false, true, 1],
    ['j6', 'emp2', '电工', 'diangong', 480, '天津滨海', '滨海新区石化检修', 39.1, 117.2, 1, false, false, 2],
    ['j7', 'emp_demo', '技术员', 'jishuyuan', 800, '山东青岛', '青岛港管道项目', 36.1, 120.4, 4, false, false, 1],
    ['j8', 'emp2', '焊工', 'hanjie', 620, '沈阳铁西', '铁西装备制造园', 41.79, 123.31, 0, false, false, 1]
  ]

  jobs.forEach(([id, owner, title, cat, salary, area, addr, lat, lng, status, top, urgent, daysAgo]) => {
    coll('jobs').push({
      _id: id,
      ownerOpenid: owner,
      employerName: owner === 'emp_demo' ? '沈阳中建安装工程处' : '王老板',
      employerVerified: owner === 'emp_demo',
      title,
      categoryId: cat,
      jobType: title,
      salary,
      salaryUnit: 1,
      workArea: area,
      workAddress: addr,
      duration: '工期到年底',
      certificateReq: title === '焊工' ? '双证' : '无证均可',
      ageLimit: '55 岁以下',
      techReq: title === '焊工' ? '能包口，焊缝探伤' : '能吃苦',
      otherReq: '事多的不要，不服从管理的不要',
      payType: 1,
      accommodation: 1,
      travelReimburse: 1,
      otherBenefits: '干满三个月报销路费',
      contactName: '张',
      contactPhoneEnc: enc('1390000' + id.slice(1).padStart(4, '0')),
      wechatSame: true,
      isTop: top,
      isUrgent: urgent,
      topExpireAt: top ? now + DAY * 5 : 0,
      status,
      rejectReason: status === 4 ? '联系方式缺失' : '',
      viewCount: 20 + daysAgo * 7,
      applyCount: daysAgo,
      latitude: lat,
      longitude: lng,
      createdAt: now - DAY * daysAgo,
      updatedAt: now - DAY * daysAgo,
      expireAt: now + DAY * (8 - daysAgo)
    })
  })

  coll('resumes').push(
    { _id: 'r1', _openid: 'dev-openid', name: '李师傅', avatar: '', jobTypes: ['焊工', '管工'],
      certificateInfo: '双证焊工证', workExperience: '8 年', techDescription: '擅长氩电焊、不锈钢管道',
      expectArea: '东北三省', expectSalary: '600-700/天', availableTime: '随时到岗',
      contactPhone: '13800001111', wechat: '', status: 0, createdAt: now - DAY * 10, updatedAt: now - DAY },
    { _id: 'r2', _openid: 'w_demo2', name: '焊工老赵', avatar: '', jobTypes: ['焊工'],
      certificateInfo: '单证', workExperience: '5 年', techDescription: '手工焊、二保焊',
      expectArea: '辽宁', expectSalary: '550/天', availableTime: '一周内',
      contactPhone: '13600004444', wechat: '', status: 0, createdAt: now - DAY * 6, updatedAt: now - DAY * 2 }
  )

  coll('applications').push(
    { _id: 'a1', jobId: 'j1', jobTitle: '管工', employerOpenid: 'emp_demo', workerOpenid: 'dev-openid',
      workerName: '李师傅', workerPhone: '13800001111', coverLetter: '10 年管工经验', status: 'pending',
      createdAt: now - 3600000, updatedAt: now - 3600000 },
    { _id: 'a2', jobId: 'j4', jobTitle: '铆工', employerOpenid: 'emp2', workerOpenid: 'w_demo2',
      workerName: '焊工老赵', workerPhone: '13600004444', coverLetter: '', status: 'accepted',
      createdAt: now - DAY * 2, updatedAt: now - DAY }
  )

  coll('blacklist').push(
    { _id: 'b1', bossPhoneHash: 'seed-pending-hash', bossPhoneMasked: '135****6666', bossName: '刘某',
      reporterOpenid: 'dev-openid', reporterPhone: '13800001111', reasonType: 1,
      reasonDetail: '干完活三个月不给工资，电话不接微信拉黑', evidence: [],
      status: 0, createdAt: now - 3600000, reviewedAt: 0, reviewerId: '' }
  )

  coll('reports').push(
    { _id: 'rp1', reporterOpenid: 'dev-openid', jobId: 'j3', bossPhone: '13700003333',
      reportType: 1, reason: '日薪与描述不符，到现场压价', evidence: [], status: 0, createdAt: now - 7200000 }
  )

  coll('wallet').push(
    { _id: 'w1', openid: 'dev-openid', type: 1, amount: 2, businessType: '签到', businessId: '', remark: '每日签到', createdAt: now - DAY },
    { _id: 'w2', openid: 'dev-openid', type: 2, amount: -5, businessType: '查看联系方式', businessId: 'j2', remark: '焊工', createdAt: now - 3600000 },
    { _id: 'w3', openid: 'emp_demo', type: 3, amount: 50, businessType: '充值', businessId: 'o1', remark: '微信支付充值', createdAt: now - DAY * 2 },
    { _id: 'w4', openid: 'emp_demo', type: 2, amount: -30, businessType: '置顶', businessId: 'j1', remark: '管工', createdAt: now - DAY * 2 }
  )

  coll('orders').push(
    { _id: 'o1', outTradeNo: 'GHQ20260101', openid: 'emp_demo', amount: 50, fen: 5000,
      status: 'paid', createdAt: now - DAY * 2, paidAt: now - DAY * 2 }
  )

  coll('notifications').push(
    { _id: 'n1', openid: 'dev-openid', title: '报名已通过', content: '「铆工」已同意你上岗，请联系老板', type: 2, isRead: false, createdAt: now - DAY },
    { _id: 'n2', openid: 'emp_demo', title: '收到新的报名', content: '李师傅 报名了「管工」', type: 2, isRead: true, createdAt: now - 3600000 }
  )

  coll('banners').push(
    { _id: 'bn1', imageUrl: '', link: '', title: '春季招工专场', sort: 1, enabled: true, createdAt: now - DAY * 5 },
    { _id: 'bn2', imageUrl: '', link: '', title: '焊工持证上岗，日薪 600 起', sort: 2, enabled: true, createdAt: now - DAY * 3 }
  )

  coll('reviews').push(
    { _id: 'rv1', fromOpenid: 'dev-openid', fromName: '李师傅', toOpenid: 'emp_demo', jobId: 'j1',
      rating: 5, content: '老板爽快，工资按时发', createdAt: now - DAY * 3 }
  )

  coll('trainings').push(
    { _id: 't1', title: '氩弧焊入门到精通', cover: '/static/img/default/shili.png', price: 0,
      type: 'skill', teacher: '王工', intro: '零基础学氩弧焊，含实操', enabled: true },
    { _id: 't2', title: '焊工安全操作规程', cover: '', price: 0, type: 'safety',
      teacher: '安监处', intro: '上岗前必修', enabled: true }
  )

  coll('training_enrolls').push(
    { _id: 'te1', openid: 'dev-openid', trainingId: 't1', createdAt: now - DAY * 4 }
  )

  coll('insurances').push(
    { _id: 'i1', name: '意外伤害险（30 天）', price: 30, coverage: '10 万意外医疗', intro: '工地意外保障', enabled: true },
    { _id: 'i2', name: '意外伤害险（90 天）', price: 80, coverage: '30 万意外医疗', intro: '长期工地保障', enabled: true }
  )

  coll('user_insurances').push(
    { _id: 'ui1', openid: 'dev-openid', insuranceId: 'i1', name: '意外伤害险（30 天）', price: 30, createdAt: now - DAY * 6 }
  )

  coll('feedback').push(
    { _id: 'f1', openid: 'dev-openid', type: 1, content: '希望增加按区县筛选', contact: '', images: [], status: 0, createdAt: now - DAY * 2 }
  )

  coll('configs').push(
    { _id: 'c1', key: 'contactCost', value: 5, updatedAt: now },
    { _id: 'c2', key: 'topCost', value: 30, updatedAt: now },
    { _id: 'c3', key: 'signInPoints', value: 2, updatedAt: now }
  )
}