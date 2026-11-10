// 云开发环境配置。留空表示使用微信开发者工具里选定的默认环境。
export const CLOUD_ENV = ''

// 云函数名（单入口 + 路由）
export const API_FUNCTION = 'api'

// 接口超时（毫秒）
export const API_TIMEOUT = 15000
// 本地联调地址：构建时通过环境变量注入，正常发布构建为空
export const DEV_API_BASE = import.meta.env.VITE_LOCAL_API || ''
