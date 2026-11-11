import { createRouter, createWebHashHistory } from 'vue-router'
import Login from './views/Login.vue'
import Layout from './views/Layout.vue'
import Overview from './views/Overview.vue'
import Jobs from './views/Jobs.vue'
import Users from './views/Users.vue'
import Blacklist from './views/Blacklist.vue'
import Reports from './views/Reports.vue'
import Banners from './views/Banners.vue'
import Finance from './views/Finance.vue'
import Feedback from './views/Feedback.vue'
import Verifications from './views/Verifications.vue'
import Resumes from './views/Resumes.vue'
import Announcements from './views/Announcements.vue'

const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  {
    path: '/',
    component: Layout,
    children: [
      { path: '', redirect: '/overview' },
      { path: 'overview', component: Overview, meta: { title: '运营概览' } },
      { path: 'jobs', component: Jobs, meta: { title: '招工审核' } },
      { path: 'verifications', component: Verifications, meta: { title: '认证审核' } },
      { path: 'resumes', component: Resumes, meta: { title: '简历审核' } },
      { path: 'users', component: Users, meta: { title: '用户管理' } },
      { path: 'blacklist', component: Blacklist, meta: { title: '黑老板库' } },
      { path: 'reports', component: Reports, meta: { title: '举报处理' } },
      { path: 'banners', component: Banners, meta: { title: '轮播图' } },
      { path: 'announcements', component: Announcements, meta: { title: '公告管理' } },
      { path: 'finance', component: Finance, meta: { title: '财务流水' } },
      { path: 'feedback', component: Feedback, meta: { title: '客服反馈' } }
    ]
  }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const token = localStorage.getItem('ghq_admin_token')
  if (!to.meta.public && !token) return '/login'
  if (to.path === '/login' && token) return '/overview'
  return true
})

export default router