# 小程序联调与 E2E SOP

## 一、本地跑起来（不需要 AppID / 云环境）

```bash
# 1. 本地 API（跑的是 cloudfunctions 同一套 handler + 内存数据库 + 种子数据）
node scripts/dev-api.cjs            # http://localhost:3001/api

# 2. 构建小程序（把本地 API 地址注入产物）
cd app
VITE_LOCAL_API=http://localhost:3001/api npm run build:mp-weixin

# 3. 微信开发者工具导入仓库根目录（测试号），编译预览
```

后台：

```bash
cd admin && npm run dev             # http://localhost:5174，Vite 中间件直连同一套 handler
```

## 二、真机 E2E

```bash
# 开自动化端口
cli.bat auto --project <仓库根目录> --auto-port 9420

# 跑断言 + 截图
cd e2e && node ui.cjs
```

`ui.cjs` 覆盖 16 项：首页工种、分类跳转、详情标题/薪资、搜索列表、发布页选择器、培训、保险、积分、客服 FAQ、我的求职、签到、报名、报名后状态、消息通知。

## 三、踩过的坑（按出现频率排序）

### 1. `app.wxss` 只有几百字节 → 全站样式失效

**症状**：导航栏没有背景和高度、标题贴在状态栏下、图标字体缺失、卡片没有阴影。
**判据**：`ls -la app/dist/build/mp-weixin/app.wxss`，正常应 >100KB，并包含 `.cu-bar`、`.bg-gradual-*`。
**原因**：`App.vue` 的 `<style>` 块丢了 `@import "colorui/main.css"` 等三行。
**修复**：恢复导入 + `page {}` 基础样式。

### 2. 页面路由对但整页空白

**原因**：微信开发者工具的编译缓存陈旧。
**修复**：

```bash
cli.bat cache --project <路径> --clean compile
cli.bat close --project <路径>
cli.bat open --project <路径>
```

### 3. `cli auto` 报 `RENDERER_PROJECT did not connect`

**原因**：残留的 `cli auto` 进程占着端口，越积越多。
**修复**：

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'auto-port|cli\.js.*auto' } |
  Stop-Process -Force
```

杀干净后第一次连接即成功。

### 4. 接口通了但页面没数据

| 现象 | 原因 | 修复 |
|---|---|---|
| 全部请求 `url not in domain list` | 产物 `project.config.json` 的 `urlCheck` 为 true | 在 **manifest 的 mp-weixin.setting** 里关，改根目录无效 |
| 带可选参数的查询永远查不到 | `undefined` 被序列化成字符串 `"undefined"` | `callApi` 里剔除 null/undefined/空串 |
| 页面查的是另一个空账号 | 本地存了早期随机 openid | 开发模式固定 `X-Openid: dev-openid` |

### 5. 截图接口偶发挂起

单次约 9 秒，超时阈值给到 25 秒；窗口被最小化时也会挂，先把开发者工具窗口置前。

### 6. 生产构建压缩 data 字段名

`categories` 会变成 `eO`，E2E 断言不要读 `page.data()`，改用元素选择器与路由。

### 7. 自定义组件选择器

页面级 `.job-card` 进不去组件内部，用 `page.$('job-card')`。

## 四、验收口径

| 类型 | 做法 | 判定 |
|---|---|---|
| UI 截图 | `e2e/ui.cjs` 自动截图到 `e2e/shots/` | 每个页面有图且内容与种子数据一致 |
| 真实调用 | 直接打 `http://localhost:3001/api/*` | 返回体字段、状态码、错误分支符合预期 |
| 真实 E2E | automator 点击 + 路由/元素断言 | 16 项全过 |
| 代码复审 | 静态扫描死链、假数据兜底、未引用页面 | 死链 0、无 `showExampleData` 类兜底 |

## 五、种子数据

`cloudfunctions/api/test/seed-demo.js`，覆盖 18 个集合：用户 / 岗位（跨 7 城、含经纬度）/ 简历 / 报名 / 黑名单 / 举报 / 流水 / 订单 / 通知 / 轮播 / 评价 / 培训 / 报名记录 / 保险 / 保单 / 反馈 / 配置。

开发身份固定 `dev-openid`（李师傅，60 积分 / 20 元）。