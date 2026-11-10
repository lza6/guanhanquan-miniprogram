/**
 * 微信开发者工具 MCP 客户端（stdio JSON-RPC）。
 *   node scripts/wdt-mcp.cjs list
 *   node scripts/wdt-mcp.cjs call <toolName> '<jsonArgs>'
 */
const { spawn } = require('child_process')
const path = require('path')

const CMD = 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\wechatide.cmd'
const TOKEN = process.env.WDT_TOKEN || '5o5yNEzVlpDZ5ZuxXl489MtPVBL7kKmh'

const [, , action, toolName, rawArgs] = process.argv

const child = spawn('cmd.exe', ['/c', CMD, 'mcp', `--token=${TOKEN}`], {
  cwd: path.dirname(CMD),
  windowsHide: true
})

let buffer = ''
let nextId = 1
const pending = new Map()

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8')
  let idx
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.error) process.stderr.write('[rpc-error] ' + JSON.stringify(msg) + '\n')
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      }
    } catch (e) {
      process.stderr.write('[non-json] ' + line + '\n')
    }
  }
})

child.stderr.on('data', (d) => process.stderr.write(d.toString()))

function send(method, params) {
  const id = nextId++
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params: params || {} }) + '\n')
  return new Promise((resolve, reject) => {
    pending.set(id, resolve)
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error('timeout: ' + method))
      }
    }, 120000)
  })
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params: params || {} }) + '\n')
}

;(async () => {
  try {
    const init = await send('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'ghq-audit', version: '1.0.0' }
    })
    notify('notifications/initialized')

    if (action === 'list') {
      const tools = await send('tools/list')
      const list = (tools.result && tools.result.tools) || []
      console.log('server:', JSON.stringify(init.result || init.error || {}))
      console.log('工具数量:', list.length)
      list.forEach((t) => console.log('-', t.name, '::', (t.description || '').slice(0, 90)))
    } else if (action === 'call') {
      const args = rawArgs ? JSON.parse(rawArgs) : {}
      const res = await send('tools/call', { name: toolName, arguments: args })
      console.log(JSON.stringify(res.result || res.error, null, 2))
    }
  } catch (e) {
    console.error('ERR', e.message)
  } finally {
    child.kill()
    setTimeout(() => process.exit(0), 300)
  }
})()