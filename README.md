# 管焊圈小程序

面向焊工、管工、铆工、起重工等蓝领技术工人的招工找活平台。招工方发布岗位，工人浏览联系，平台审核并管理黑名单。

## 结构

```
app/                小程序端（uni-app 3 + Vue 3 + Vite）
  src/api/          接口层：云函数调用 / 本地 HTTP 双通道
  src/pages/        33 个已注册页面
  src/store/        Vuex 4
cloudfunctions/
  api/              单入口云函数，91 条路由
    handlers/       auth jobs workers applications categories social wallet blacklist admin
    test/           内存数据库 + 111 项业务验收
  pay-notify/       微信支付回调
admin/              运营后台（Vue 3 + Element Plus）
scripts/dev-api.cjs 本地 API 服务（无需云环境即可联调）
docs/               交付验收与闭环报告（唯一文档）
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
cd admin && npm install && npm run dev   # 端口被占用时自动 +1
```

默认管理员：`admin` / `dev-admin-pass`（仅本地内存库）。

## 业务验收

```bash
cd cloudfunctions/api && node test/run.js
```

当前 111 项通过 0 失败。

小程序 E2E：

```bash
cli.bat auto --project <仓库根目录> --auto-port 9420
cd e2e && node ui.cjs       # 16 项
cd e2e && node closure.cjs  # 17 项
```

## 交付状态

代码闭环完成：PDF 3.x 的 77 项功能点中 75 项闭环、2 项为明确产品取舍、0 项缺失。真实微信支付、真机绑手机、云环境部署仍需外部凭证。

逐项需求矩阵、修复对账、验证证据、部署步骤与剩余风险见：

**[docs/交付验收与缺口总表.md](docs/交付验收与缺口总表.md)**

## 云开发部署

见交付报告第七章：填 AppID 与云环境 ID → 建集合与索引 → 部署两个云函数 → 配置环境变量 → 绑定微信支付。

## 许可

MIT（源自 BXCQ/Gigplatform_front，保留原始版权声明）。