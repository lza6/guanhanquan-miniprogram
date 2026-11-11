/**
 * 释放被占用的 Chrome 调试实例（MCP 专用 profile）。
 * 用法：node scripts/chrome-mcp-reset.cjs
 */
const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PROFILE = path.join(os.homedir(), '.cache', 'chrome-devtools-mcp', 'chrome-profile')

let killed = 0
try {
  const out = execSync(
    `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*chrome-devtools-mcp*' } | Select-Object -ExpandProperty ProcessId"`,
    { encoding: 'utf8' }
  )
  const pids = out.split(/\s+/).filter(Boolean)
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
      killed++
    } catch (e) {}
  }
} catch (e) {}

// 清理单例锁，避免下次启动报 "already running"
for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
  const p = path.join(PROFILE, f)
  try { fs.rmSync(p, { force: true }) } catch (e) {}
}

console.log('已终止 Chrome 进程:', killed)
console.log('profile:', PROFILE)
