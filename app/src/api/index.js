import { callApi, uploadToCloud } from './cloud'

const get = (url, data) => callApi(url, 'GET', data)
const post = (url, data) => callApi(url, 'POST', data)
const put = (url, data) => callApi(url, 'PUT', data)
const del = (url, data) => callApi(url, 'DELETE', data)

export default {
	// 认证
	login: (data) => post('/auth/login', data),
	register: (data) => post('/auth/register', data),
	getUserProfile: () => get('/users/profile'),
	updateUserProfile: (data) => put('/users/profile', data),
	submitRealName: (data) => post('/users/real-name', data),
	sendSmsCode: (phone) => post('/auth/sms-code/send', { phone }),
	verifySmsCode: (phone, code) => post('/auth/sms-code/verify', { phone, code }),
	bindPhone: (code) => post('/auth/bind-phone', { code }),

	// 招工方
	getEmployerProfile: () => get('/employers/profile'),
	updateEmployerProfile: (data) => put('/employers/profile', data),
	publishJob: (data) => post('/jobs/create', data),
	getEmployerJobs: (params) => get('/employers/jobs/list', params),
	getEmployerJobDetail: (jobId) => get(`/jobs/detail/${jobId}`),
	updateJob: (jobId, data) => put(`/jobs/update/${jobId}`, data),
	deleteJob: (jobId) => del(`/jobs/delete/${jobId}`),
	getApplicantsForJob: (jobId) => get(`/jobs/applicants/list/${jobId}`),
	acceptJobApplicant: (jobId, applicantId) => post(`/jobs/applicants/accept/${jobId}/${applicantId}`),
	rejectJobApplicant: (jobId, applicantId) => post(`/jobs/applicants/reject/${jobId}/${applicantId}`),

	// 工人
	getWorkerProfile: () => get('/workers/profile'),
	updateWorkerProfile: (data) => put('/workers/profile/update', data),
	getWorkerApplications: (params) => get('/jobs/my-applications', params),
	applyForJob: (jobId, data) => post(`/jobs/apply/${jobId}`, data),
	cancelJobApplication: (jobId, applicationId) => post(`/jobs/applications/cancel/${jobId}/${applicationId}`),
	checkJobApplication: (jobId) => get(`/jobs/check-application/${jobId}`),

	// 职位
	getJobList: (params) => get('/jobs/list', params),
	getJobDetail: (jobId) => get(`/jobs/detail/${jobId}`),
	getRecommendedJobs: (params) => get('/jobs/recommended/list', params),
	getNearbyJobs: (params) => get('/jobs/nearby/list', params),
	getLatestJobs: (params) => get('/jobs/latest/list', params),

	// 工人列表
	getWorkerList: (params) => get('/workers/list', params),
	getWorkerDetail: (workerId) => get(`/workers/detail/${workerId}`),

	// 分类
	getCategories: () => get('/categories/list'),
	getCategoryById: (id) => get(`/categories/${id}`),
	getJobsByCategory: (categoryId, params) => get(`/categories/jobs/list/${categoryId}`, params),
	getWorkersByCategory: (categoryId, params) => get(`/categories/workers/list/${categoryId}`, params),

	// 评价
	submitReview: (data) => post('/reviews/create', data),
	getReviewsForJob: (jobId) => get(`/jobs/reviews/list/${jobId}`),
	getReviewsForWorker: (workerId) => get(`/workers/reviews/list/${workerId}`),
	getReviewsForEmployer: (employerId) => get(`/employers/reviews/list/${employerId}`),

	// 通知
	getNotifications: (params) => get('/notifications/list', params),
	markNotificationAsRead: (id) => post(`/notifications/read/${id}`),
	markAllNotificationsAsRead: () => post('/notifications/read-all'),

	// 轮播
	getBanners: () => get('/banners/list'),

	// 保险
	getInsuranceList: () => get('/insurances/list'),
	buyInsurance: (id, data) => post(`/insurances/purchase/${id}`, data),
	getUserInsurances: () => get('/users/insurances/list'),

	// 培训
	getTrainingList: (params) => get('/trainings/list', params),
	getTrainingDetail: (id) => get(`/trainings/detail/${id}`),
	getMyCourses: () => get('/trainings/my'),
	enrollTraining: (id) => post(`/trainings/enroll/${id}`),

	// 收藏
	getFavorites: (params) => get('/favorites/list', params),
	toggleFavorite: (jobId) => post('/favorites/toggle', { jobId }),
	checkFavorite: (jobId) => get(`/favorites/check/${jobId}`),

	// 黑老板
	queryBlacklist: (phone) => get('/blacklist/query', { phone }),
	submitBlacklist: (data) => post('/blacklist/submit', data),
	submitAppeal: (data) => post('/blacklist/appeal', data),

	// 举报
	submitReport: (data) => post('/reports/create', data),

	// 积分 / 余额 / 联系方式解锁
	getWallet: () => get('/wallet/info'),
	getWalletRecords: (params) => get('/wallet/records', params),
	unlockContact: (jobId) => post(`/jobs/contact/${jobId}`),
	recharge: (data) => post('/wallet/recharge', data),
	signIn: () => post('/wallet/sign-in'),

	submitFeedback: (data) => post('/feedback/create', data),
	getMyFeedback: () => get('/feedback/list'),

	// 上传
	uploadFile: (filePath, dir) => uploadToCloud(filePath, dir)
}