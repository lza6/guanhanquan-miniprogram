/**
 * 编译后把 cloudfunctions 拷进小程序产物，并把 project.config.json 指向它，
 * 否则微信开发者工具看不到云函数目录。
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const src = path.resolve(root, '..', 'cloudfunctions')
const mode = process.argv[2] || (fs.existsSync(path.resolve(root, 'dist', 'build', 'mp-weixin')) ? 'build' : 'dev')
const dist = path.resolve(root, 'dist', mode, 'mp-weixin')

if (!fs.existsSync(dist)) {
  console.error('找不到产物目录：' + dist)
  process.exit(1)
}

// 只拷贝源码，剔除 node_modules 与测试
const target = path.join(dist, 'cloudfunctions')
fs.rmSync(target, { recursive: true, force: true })
fs.mkdirSync(target, { recursive: true })

for (const fn of fs.readdirSync(src)) {
  const from = path.join(src, fn)
  if (!fs.statSync(from).isDirectory()) continue
  copyDir(from, path.join(target, fn))
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const name of fs.readdirSync(from)) {
    if (name === 'node_modules' || name === 'test') continue
    const f = path.join(from, name)
    const t = path.join(to, name)
    if (fs.statSync(f).isDirectory()) copyDir(f, t)
    else fs.copyFileSync(f, t)
  }
}

const cfgPath = path.join(dist, 'project.config.json')
if (fs.existsSync(cfgPath)) {
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  cfg.cloudfunctionRoot = 'cloudfunctions/'
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
}

console.log('云函数已拷入产物：' + target)