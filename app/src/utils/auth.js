const USER_KEY = 'ghq_user'
const TYPE_KEY = 'userType'

export function getUser() {
  try {
    return uni.getStorageSync(USER_KEY) || null
  } catch (e) {
    return null
  }
}

export function setUser(user) {
  if (!user) return clearAuth()
  try {
    uni.setStorageSync(USER_KEY, user)
    if (user.userType) uni.setStorageSync(TYPE_KEY, user.userType)
  } catch (e) {}
}

export function clearAuth() {
  try {
    uni.removeStorageSync(USER_KEY)
    uni.removeStorageSync(TYPE_KEY)
    uni.removeStorageSync('token')
    uni.removeStorageSync('ghq_employer')
  } catch (e) {}
}

export function isLoggedIn() {
  const u = getUser()
  return !!(u && u.id)
}

export function getUserType() {
  try {
    return uni.getStorageSync(TYPE_KEY) || ''
  } catch (e) {
    return ''
  }
}

export function setUserType(type) {
  try {
    uni.setStorageSync(TYPE_KEY, type)
  } catch (e) {}
}
