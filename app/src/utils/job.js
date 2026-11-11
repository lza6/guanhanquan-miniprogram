export const SALARY_UNITS = {
  1: '元/天',
  2: '元/小时',
  3: '元/月',
  4: '面议'
}

export const PAY_TYPES = { 1: '压一付一', 2: '月结', 3: '完工结算', 4: '公司直发', 5: '面议' }
export const ACCOMMODATION = { 1: '管吃住', 2: '管住不管吃', 3: '不管吃住', 4: '面议' }
export const TRAVEL = { 1: '报销往返', 2: '报销单程', 3: '不报销', 4: '面议' }

export function salaryText(job) {
  if (!job) return ''
  const unit = Number(job.salaryUnit || 1)
  if (unit === 4) return '面议'
  const amount = job.salary === undefined || job.salary === null || job.salary === '' ? '面议' : job.salary
  return amount === '面议' ? '面议' : amount + (SALARY_UNITS[unit] || '元/天')
}

export function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const hour = 3600 * 1000
  if (diff < hour) return '刚刚'
  if (diff < 24 * hour) return Math.floor(diff / hour) + ' 小时前'
  if (diff < 7 * 24 * hour) return Math.floor(diff / (24 * hour)) + ' 天前'
  const d = new Date(ts)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日'
}
