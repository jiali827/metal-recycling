---
name: 前端界面首批
overview: 用 Next.js + TypeScript + Tailwind 搭建正式前端工程，Mock 数据驱动；第一批铺齐全模块菜单与列表页（详情/表单后补），覆盖一期首批业务壳。
todos:
  - id: scaffold
    content: 初始化 web/：Next.js + TS + Tailwind + 基础 UI 组件与设计 token
    status: in_progress
  - id: mock-shell
    content: Mock 数据 + 角色登录 + AppShell 侧栏菜单显隐
    status: pending
  - id: auth-dashboard
    content: 登录/注册页 + 首页经营与资金总览
    status: pending
  - id: list-pages
    content: 铺齐合同/过磅/往来/收付/客户/货类/员工/角色/设置列表页
    status: pending
  - id: verify-docs
    content: 本地自检角色切换；补充 README 与计划文档副本
    status: pending
isProject: false
---

# 金属回收系统前端界面首批实现计划

> **For agentic workers:** 按任务逐步实现；详情/表单不在本批范围。

**Goal:** 落地可运行的正式前端工程，用 Mock 数据展示一期全部模块的**菜单导航 + 列表页 + 首页总览**，便于后续接后端与补表单。

**Architecture:** Next.js App Router 单仓前端；本地 Mock 层模拟多租户与角色；布局按角色显示侧栏菜单；各业务域先做列表与筛选，详情/新建/编辑路由可占位跳转或暂缓。

**Tech Stack:** Next.js 15（App Router）+ TypeScript + Tailwind CSS + 本地 JSON/TS Mock（暂不接真实 API）

**依据文档:**
- [一期需求文档](docs/金属回收管理系统-一期项目需求文档.md)
- [设计规格](docs/superpowers/specs/2026-08-05-metal-recycling-saas-design.md)
- [前端 UI 设计规范](docs/superpowers/specs/2026-08-05-frontend-ui-design-system.md)

---

## 交付边界（本批）

**做：**
- 工程脚手架与设计 token（工业风、繁体为主、关键字段英文）
- 登录页（Mock 切换角色演示）
- 注册开户页（静态/Mock 提交成功提示）
- 应用壳：顶栏（租户名/用户/角色）+ 侧栏全模块菜单
- 首页总览：经营概览 + 资金概览（Mock 数字）
- 全模块**列表页**（表格、筛选、分页示意、状态标签）

**不做（下一批）：**
- 合同/磅单/收付款的完整新建与编辑表单
- 真实后端、鉴权、数据库
- 打印套打、串口读磅

---

## 页面与路由

```text
/login                          登录（可选角色）
/register                       注册开户
/(app)/dashboard                首页总览
/(app)/contracts                合同列表
/(app)/weigh-tickets            过磅台账列表
/(app)/receivables              应收列表
/(app)/payables                 应付列表
/(app)/payments                 收付款列表
/(app)/customers                客户列表
/(app)/material-types           货类列表
/(app)/employees                员工列表
/(app)/roles                    角色权限（列表/说明）
/(app)/settings/cash            期初现金与基础设置摘要
```

侧栏菜单按 Mock 当前角色显隐（五类角色权限矩阵与需求文档一致）。

---

## 目录结构（拟创建）

```text
apps/web/   或   web/     （仓库根下新建前端目录，选用 web/）
  package.json
  src/app/...
  src/components/layout/{AppShell,Sidebar,Topbar}.tsx
  src/components/ui/{DataTable,StatCard,StatusBadge,PageHeader}.tsx
  src/lib/mock/{users,contracts,weighTickets,finance,masters}.ts
  src/lib/auth-mock.ts
  src/lib/i18n/labels.ts      # 繁中+英文字段标签
```

---

## 视觉方向

> **现行规范（以代码为准）：** [UI 设计规范](../specs/2026-08-05-frontend-ui-design-system.md)

- B2B Soft UI：浅灰画布 + 白卡片；品牌默认靛紫 `#6366F1`（可侧栏切换主题色）
- 列表密一些、字号清晰，适合过磅/财务扫表
- 标签：采购/销售、合同状态、作废、已核销等用 Tag tone 区分
- 文案：繁/简/英三语；表头可带英文（如 總重 Gross / 皮重 Tare）
- 避免：紫渐变营销风、奶油衬线风、默认深色模式

---

## 实现任务

### Task 1: 脚手架与基础 UI

- 在 `web/` 初始化 Next.js + TS + Tailwind
- 配置全局样式变量、字体（非 Inter 默认堆；选清晰无衬线如 Noto Sans TC / Source Sans）
- 实现 `DataTable`、`StatCard`、`StatusBadge`、`PageHeader` 基础组件

### Task 2: Mock 数据与角色壳

- 编写 Mock：寶新租户、五类用户、合同/磅单/往来/客户/货类样例（可参考 2026-07-23 现场数据形态）
- `auth-mock`：登录写入当前用户；侧栏按角色过滤菜单
- 实现 `AppShell`（顶栏 + 侧栏 + 内容区）

### Task 3: 登录 / 注册 / 首页

- `/login`：账号或一键选角色进入
- `/register`：公司注册表单 UI（Mock 提交）
- `/dashboard`：经营指标卡 + 资金指标卡 + 近日过磅摘要表

### Task 4: 业务列表页铺齐

每个列表含：标题、筛选条（日期/客户/状态/关键词）、表格、空态、分页示意

| 路由 | 关键列 |
|------|--------|
| 合同 | 单号、类型、对方、状态、约重、已履约、单价摘要 |
| 过磅 | BX、方向、客户、车牌、货类、净重、金额、合同、状态 |
| 应收/应付 | 关联磅单、客户、金额、已核销、余额、状态 |
| 收付款 | 日期、类型、方式、金额、对方、核销摘要 |
| 客户 | 名称、分类、联系方式 |
| 货类 | 名称、采购/销售可用、启用状态 |
| 员工 | 姓名、角色、状态 |
| 角色 | 角色名、权限摘要 |
| 设置 | 期初现金、币种 HKD 展示 |

### Task 5: 联调自检与文档

- `npm run dev` 可本地打开全菜单
- 切换角色验证菜单显隐
- 在 `docs/superpowers/plans/` 保留本计划副本（与 Cursor 计划对齐）
- README：如何启动、Mock 角色说明

---

## 验收标准

- 本地启动后可登录并浏览全部侧栏模块列表页
- 首页经营 + 资金区块有 Mock 数据
- 至少用「过磅人员 / 财务 / 老板」三种角色验证菜单差异
- 详情/表单未做不阻塞本批验收
