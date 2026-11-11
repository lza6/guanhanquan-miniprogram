import axios from 'axios'

const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api', timeout: 15000 })

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('ghq_admin_token')
  if (token) cfg.headers.Authorization = 'Bearer ' + token
  return cfg
})

http.interceptors.response.use(
  (res) => {
    const body = res.data
    if (!body || body.success !== true) {
      return Promise.reject(new Error((body && body.message) || '请求失败'))
    }
    return body.data
  },
  (err) => Promise.reject(new Error(err.message || '网络异常'))
)

export const api = {
  login: (data) => http.post('/admin/login', data),
  overview: () => http.get('/admin/overview'),

  jobs: (params) => http.get('/admin/jobs', { params }),
  reviewJob: (id, data) => http.post(`/admin/jobs/${id}/review`, data),

  users: (params) => http.get('/admin/users', { params }),
  userDetail: (id) => http.get(`/admin/users/${id}`),
  setUserStatus: (id, status) => http.post(`/admin/users/${id}/status`, { status }),

  verifications: (params) => http.get('/admin/verifications', { params }),
  reviewVerification: (id, data) => http.post(`/admin/verifications/${id}/review`, data),

  resumes: (params) => http.get('/admin/resumes', { params }),
  reviewResume: (id, data) => http.post(`/admin/resumes/${id}/review`, data),

  blacklist: (params) => http.get('/admin/blacklist', { params }),
  reviewBlacklist: (id, pass) => http.post(`/admin/blacklist/${id}/review`, { pass }),

  reports: (params) => http.get('/admin/reports', { params }),
  handleReport: (id, data) => http.post(`/admin/reports/${id}/handle`, data),

  announcements: () => http.get('/admin/announcements'),
  saveAnnouncement: (data) => http.post('/admin/announcements', data),
  deleteAnnouncement: (id) => http.delete(`/admin/announcements/${id}`),

  banners: () => http.get('/admin/banners'),
  saveBanner: (data) => http.post('/admin/banners', data),
  deleteBanner: (id) => http.delete(`/admin/banners/${id}`),

  finance: (params) => http.get('/admin/finance', { params }),

  feedback: (params) => http.get('/admin/feedback', { params }),
  handleFeedback: (id, data) => http.post(`/admin/feedback/${id}/handle`, data)
}

export default api