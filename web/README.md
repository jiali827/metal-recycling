# 金屬回收管理系統 · 前端（一期）

Next.js App Router + TypeScript + Tailwind。按 **features / entities / data / shared** 分层，便于长期维护与后端接入。

系统级技术架构（现状 + 目标演进）见仓库根目录：[docs/architecture.md](../docs/architecture.md)。

产品规则与接口意图（Mock 阶段补强）：

- [业务规则总表](../docs/prd-supplements/业务规则总表.md)
- [数据交互与接口需求](../docs/prd-supplements/数据交互与接口需求.md)
- [Mock 阶段完成检查表](../docs/prd-supplements/Mock阶段完成检查表.md)

## 启动

```bash
cd web
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) → 登录页。

演示账号：`demo@baoxin.hk` / `demo1234`

## 目录结构

```text
src/
├── app/                 # 路由壳（页面尽量薄）
│   ├── (auth)/          # 登录 / 注册
│   └── (app)/           # 业务页 + AppShell layout
├── features/            # 按业务域组织的 UI（弹窗、视图、hooks）
│   ├── contracts/
│   ├── weigh-tickets/
│   ├── payments/
│   ├── settlements/
│   ├── customers/
│   ├── dashboard/
│   └── …
├── entities/            # 领域类型与纯业务规则（无 UI）
│   ├── types.ts
│   ├── contract/
│   ├── settlement/
│   ├── payment/
│   └── …
├── data/                # 数据访问
│   ├── mock/            # 当前 Mock store + 种子数据
│   └── client/          # 真实 API client 预留骨架
└── shared/              # 跨域共享
    ├── ui/              # 通用组件与表单控件
    ├── layout/          # AppShell / Sidebar
    ├── config/          # 菜单、权限、主题
    ├── i18n/            # 繁/简/英
    ├── lib/             # format / date / currency …
    └── providers/
```

### 分层约定

| 层 | 职责 | 依赖方向 |
|----|------|----------|
| `app/` | 路由与页面组装 | → features / shared |
| `features/` | 业务 UI | → entities / data / shared |
| `entities/` | 领域模型与纯函数规则 | → shared（工具） |
| `data/` | Mock 或 API | → entities |
| `shared/` | 通用能力 | 不依赖 features |

## 技术说明

- 认证：`features/auth/provider`（localStorage Mock）
- 业务状态：`data/mock/store`（接 API 后替换为 `data/client`）
- 菜单：`shared/config/menu.ts`
- 权限矩阵：`shared/config/permissions.ts`

## 下一批

真实 API、角色菜单过滤、审计与作废核销规则完善。
