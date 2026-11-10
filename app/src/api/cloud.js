import { CLOUD_ENV, API_FUNCTION, API_TIMEOUT, DEV_API_BASE } from '../config'


/** 去掉 undefined / null / 空串，避免被序列化成 "undefined" 传给后端 */
function prune(data) {
  if (!data || typeof data !== 'object') return {}
  const out = {}
  Object.keys(data).forEach((k) => {
    const v = data[k]
    if (v !== undefined && v !== null && v !== '') out[k] = v
  })
  return out
}

let inited = false

export function initCloud() {
  if (inited) return
  // #ifdef MP-WEIXIN
  if (!wx.cloud) {
    throw new Error('当前基础库不支持云开发，请在微信开发者工具中开启云开发并升级基础库')
  }
  wx.cloud.init(CLOUD_ENV ? { env: CLOUD_ENV, traceUser: true } : { traceUser: true })
  inited = true
  // #endif
}

/**
 * 调用云函数。返回完整响应体 { success, data, message }，与页面层既有写法保持一致。
 */

/** 统一失败处理：401 引导登录，其余弹提示 */
function handleFailure(body) {
  if (body && body.code === 401) {
    uni.showModal({
      title: '需要登录',
      content: '登录后才能联系老板、报名和收藏',
      confirmText: '去登录',
      success(res) {
        if (res.confirm) uni.navigateTo({ url: '/pages/login/login' })
      }
    })
    return
  }
  uni.showToast({ title: (body && body.message) || '请求失败', icon: 'none' })
}

function devRequest(path, method, data) {
  // 本地联调固定身份，便于命中种子数据
  const openid = uni.getStorageSync('ghq_dev_openid') || 'dev-openid'
  if (!uni.getStorageSync('ghq_dev_openid')) uni.setStorageSync('ghq_dev_openid', openid)
  return new Promise((resolve, reject) => {
    uni.request({
      url: DEV_API_BASE + path,
      method,
      data,
      timeout: API_TIMEOUT,
      header: { 'Content-Type': 'application/json', 'X-Openid': openid },
      success(res) {
        const body = res.data
        if (body && (body.success || body.code === 0)) {
          resolve(body)
        } else {
          handleFailure(body)
          reject(body)
        }
      },
      fail(err) {
        uni.showToast({ title: '本地服务未启动或不可达', icon: 'none' })
        reject(err)
      }
    })
  })
}

export function callApi(path, method = 'GET', data = {}) {
  data = prune(data)
  if (DEV_API_BASE) return devRequest(path, method, data)
  initCloud()
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.cloud.callFunction({
      name: API_FUNCTION,
      data: { path, method, data },
      success(res) {
        const body = res.result
        if (body && (body.success || body.code === 0 || body.code === 200)) {
          resolve(body)
        } else {
          handleFailure(body)
          reject(body)
        }
      },
      fail(err) {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(err)
      }
    })
    // #endif

    // #ifndef MP-WEIXIN
    reject(new Error('云函数仅支持微信小程序端调用'))
    // #endif
  })
}

/**
 * 上传文件到云存储，返回 fileID。
 */
export function uploadToCloud(filePath, dir = 'upload') {
  if (DEV_API_BASE) {
    // 本地联调没有云存储，直接用临时路径占位，便于走通界面
    return Promise.resolve(filePath)
  }
  initCloud()
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    const ext = (filePath.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0]
    const cloudPath = `${dir}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success(res) {
        resolve(res.fileID)
      },
      fail(err) {
        uni.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      }
    })
    // #endif

    // #ifndef MP-WEIXIN
    reject(new Error('云存储仅支持微信小程序端调用'))
    // #endif
  })
}