/**
 * 全局尺寸：ColorUI 的自定义导航栏依赖 StatusBar / CustomBar。
 * Vue3 没有 Vue.prototype，改由 main.js 注入到 globalProperties。
 */
export function getSystemMetrics() {
  const info = uni.getSystemInfoSync()
  const StatusBar = info.statusBarHeight || 0
  let CustomBar = StatusBar + 45

  // #ifdef MP-WEIXIN
  const menu = uni.getMenuButtonBoundingClientRect
    ? uni.getMenuButtonBoundingClientRect()
    : null
  if (menu) {
    CustomBar = menu.bottom + menu.top - StatusBar
  }
  // #endif

  // #ifdef APP-PLUS
  CustomBar = info.platform === 'android' ? StatusBar + 50 : StatusBar + 45
  // #endif

  return { StatusBar, CustomBar }
}