# 管焊圈小程序

面向焊工、管工、铆工、起重工等蓝领技术工人的招工找活平台。招工方发布岗位，工人浏览联系，平台审核并管理黑名单。

## 结构

```
app/                小程序端（uni-app 3 + Vue 3 + Vite）
  src/api/          接口层：云函数调用 / 本地 HTTP 双通道
  src/pages/        27 个页面
  src/store/        Vuex 4
cloudfunctions/
  api/              单入口云函数，内部 60 条路由
    handlers/       auth jobs workers applications categories social wallet blacklist admin
    test/           内存数据库 + 42 项业务验收
  pay-notify/       微信支付回调
admin/              运营后台（Vue 3 + Element Plus）
scripts/dev-api.cjs 本地 API 服务（无需云环境即可联调）
docs/               接口文档、部署说明、改造清单、验收矩阵
```

## 本地开发（没有 AppID 也能跑）

```bash
# 1. 起本地 API（跑的是云函数同一套 handler + 内存数据库，自带演示数据）
node scripts/dev-api.cjs          # http://localhost:3001/api

# 2. 编译小程序（注入本地 API 地址）
cd app && npm install
VITE_LOCAL_API=http://localhost:3001/api npm run build:mp-weixin

# 3. 微信开发者工具导入仓库根目录（测试号即可），编译预览
```

运营后台：

```bash
cd admin && npm install && npm run dev   # http://localhost:5174，Vite 中间件直连同一套 handler
```

默认管理员：`admin` / `dev-admin-pass`（仅本地内存库）。

## 云开发部署

见 [docs/部署说明.md](docs/部署说明.md)：填 AppID 与云环境 ID → 建 20 个集合 → 部署两个云函数 → 配置环境变量 → 绑定微信支付。

## 业务验收

```bash
cd cloudfunctions/api && node test/run.js
```

覆盖发布→审核→列表→详情→积分解锁→报名→录用→黑名单→置顶→收藏→越权拦截，当前 42 项全过。

## 当前进度

| 模块 | 状态 |
|---|---|
| 小程序框架（Vue3 + Vite） | 完成，编译通过 |
| 云函数后端 | 完成，路由覆盖全部契约 |
| 微信支付下单与回调 | 完成（需商户号后联调） |
| 运营后台 | 完成，浏览器实测通过 |
| 详情页 / 黑老板查询 / 举报 / 微信登录 | 完成 |
| 首页筛选维度、发布页行业字段 | 进行中 |
| 12 个页面的假数据替换 | 待做 |

详见 [docs/验收矩阵.md](docs/验收矩阵.md)。

## 许可

MIT（源自 BXCQ/Gigplatform_front，保留原始版权声明）。