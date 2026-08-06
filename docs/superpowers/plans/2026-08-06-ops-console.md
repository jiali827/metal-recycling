# 运营端（平台治理）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地独立运营端应用 V1（租户代建 / 启停 / 重置主管理员密码 / 审计），并改造企业端取消自助注册、登录校验租户 `active`。

**Architecture:** 仓库改为 npm workspaces：`packages/platform-domain`（纯 TS 领域逻辑 + Vitest）、`ops/`（独立 Next.js 运营端）、`web/`（企业端改造）。两端通过约定的 `localStorage` 平台租户注册表桥接 Mock（为未来同一 Platform API 留同构数据形状）；运营账号与企业账号分域登录；视觉对齐企业端 Soft UI，不共享业务页面。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS 4、Vitest（领域单测）、localStorage Mock（暂不接真实后端）

**依据文档:**
- [运营端设计规格](../specs/2026-08-06-ops-console-design.md)
- [前端 UI 设计规范](../specs/2026-08-05-frontend-ui-design-system.md)
- [技术架构](../../architecture.md)

---

## 交付边界（本批）

**做：**
- `packages/platform-domain`：租户状态机、权限点、审计 action 常量、类型
- `ops/`：登录、租户列表/新建/详情、审计页、平台 Mock Store、分级权限
- `web/`：移除注册入口；`Tenant` 增加 `status` 等字段；登录拒绝 `suspended` 并清会话
- 两端 Mock 桥接：运营代建写入共享租户注册表后，企业端可识别主管理员登录（演示路径）
- 更新 `docs/architecture.md`、`ops/README.md`、企业端 README 中与注册相关的说明

**不做：**
- 真实后端 / 数据库 / 发信服务
- 计费、工单、代登录、跨租户业务看板、运营员工 CRUD UI
- 抽取完整共享 UI 组件库（仅对齐 token；原子组件在 `ops` 内自建精简版）

**本批锁定的规格二选一：**
- 初始密码 / 重置密码交付方式 = **创建或重置成功后，一次性向运营操作者展示临时密码**（无邮件发送）；关闭弹窗后不可再查看明文

---

## 文件结构（拟创建 / 修改）

```text
package.json                          # workspaces: ["web", "ops", "packages/*"]
packages/platform-domain/
  package.json
  tsconfig.json
  vitest.config.ts
  src/index.ts
  src/types.ts                        # PlatformUser, TenantRecord, AuditLog, …
  src/permissions.ts                  # 权限点 + 角色默认矩阵
  src/tenant-status.ts                # active ⇄ suspended 转换纯函数
  src/password-temp.ts                # 生成临时密码（可测）
  src/audit.ts                        # action 常量 + 构造脱敏条目
  src/__tests__/*.test.ts

ops/                                  # 独立 Next 应用，port 3001
  package.json
  src/app/login/page.tsx
  src/app/(ops)/layout.tsx            # 运营壳（侧栏，不复用 web 业务壳）
  src/app/(ops)/tenants/page.tsx
  src/app/(ops)/tenants/new/page.tsx
  src/app/(ops)/tenants/[id]/page.tsx
  src/app/(ops)/audit/page.tsx
  src/data/platform-store.tsx         # Mock：运营用户、租户、审计；读写共享 LS
  src/features/auth/…
  src/features/tenants/…
  src/shared/ui/…                     # 精简 PageHeader/DataTable/Modal/StatusBadge
  src/shared/theme/…                  # 从企业端复制对齐的 CSS 变量与主题色
  README.md

web/                                  # 修改
  src/entities/types.ts               # Tenant 增加 status / statusChangedAt / suspendedAt?
  src/data/mock/seed.ts               # 种子租户 active
  src/data/mock/store.tsx             # 同步共享注册表状态（可选读）
  src/features/auth/provider.tsx      # 登录校验 tenant.status；停用清会话
  src/app/(auth)/register/**          # 删除或改为 redirect /login
  src/shared/layout/Sidebar.tsx       # 去掉注册相关入口（若有）
  README.md

docs/architecture.md                  # 平台层、开户方式、双前端
docs/superpowers/specs/2026-08-05-metal-recycling-saas-design.md
                                      # 开户/平台超管表述与运营规格对齐（最小修订）
```

**共享 Mock 键（约定）：**
- `mr-platform-tenants-v1`：平台租户注册表（数组）。**必须**预置与企业种子一致的 `t-baoxin`，并在 ops 代建时追加新租户。
- `baoxin-mock-passwords`：与现网一致的 **单一 LS 键 + JSON map**（`email.toLowerCase() → 明文密码`），**不是**按邮箱分键。
- `mr-platform-employees-v1`：跨应用企业员工桥接表（至少含主管理员：`{ id, tenantId, name, email, roleIds, status }`）。ops 代建时写入；web 登录时优先/合并识别。
- `mr-platform-session-invalidate:{tenantId}`：停用时写入 ISO 时间戳；**启用时必须删除该键**。企业端规则：仅当「存在 invalidate 时间戳 **且** `invalidateAt >= sessionIssuedAt`」时强制 logout（会话须持久化 `issuedAt`）。这样启用后重新登录不会被旧标记误踢。
- 企业端会话键保持 `baoxin-mock-session`；运营端会话键 `mr-ops-session`（隔离）。

**联调桥接硬约定（Mock，解决「代建→登录→停用」）：**
1. 登录身份绑定的是**平台注册表中的 `tenantId`**，不是写死只用本地 `t-baoxin` 做停用判断。
2. 用主管理员邮箱登录时：从 `mr-platform-tenants-v1` 解析所属租户 → 校验 `status === active` → 会话/`useMockStore` 切到该 `tenantId` 的元数据（名称等）→ 员工来自桥接表或本租户 seed。
3. 停用某 `tenantId` 只影响该租户下账号；寶新与新开租户互不误伤。
4. 平台运营种子邮箱（如 `ops-admin@platform.local`）**禁止**登录企业端（见 Task 9）。

---

### Task 1: 仓库 workspaces + platform-domain 脚手架

**Files:**
- Create: `package.json`（根）
- Create: `packages/platform-domain/package.json`
- Create: `packages/platform-domain/tsconfig.json`
- Create: `packages/platform-domain/vitest.config.ts`
- Create: `packages/platform-domain/src/index.ts`

- [ ] **Step 1: 创建根 workspaces 与 domain 包清单**

根 `package.json`：

```json
{
  "name": "metal-recycling",
  "private": true,
  "workspaces": ["web", "packages/*"],
  "scripts": {
    "test:domain": "npm run test -w @mr/platform-domain",
    "dev:web": "npm run dev -w web"
  }
}
```

说明：此时**不要**把 `ops` 写入 workspaces（目录尚未创建）。Task 4 创建 `ops/` 后再加入 `"ops"` 并增加 `dev:ops` 脚本。

`packages/platform-domain/package.json`：

```json
{
  "name": "@mr/platform-domain",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

- [ ] **Step 2: 安装依赖并确认 vitest 可跑空套件**

```bash
cd /Users/mzmaid/Desktop/Digitalx/metal-recycling
npm install
npm run test:domain
```

Expected: vitest 报无测试文件或 0 tests（下一步补测试）；不得因 workspaces 解析失败退出。

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json packages/platform-domain
git commit -m "$(cat <<'EOF'
工程：引入 npm workspaces 与 platform-domain 包脚手架。

为运营端与企业端共享租户状态机、权限点等纯领域逻辑做准备，并接入 Vitest。

EOF
)"
```

---

### Task 2: 权限点与角色矩阵（TDD）

**Files:**
- Create: `packages/platform-domain/src/permissions.ts`
- Create: `packages/platform-domain/src/__tests__/permissions.test.ts`
- Modify: `packages/platform-domain/src/index.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  OPS_PERMISSIONS,
  defaultPermissionsForRole,
  can,
  type OpsRoleId,
} from "../permissions";

describe("ops permissions", () => {
  it("superadmin can create and suspend tenants", () => {
    const perms = defaultPermissionsForRole("superadmin");
    expect(can(perms, "tenant.create")).toBe(true);
    expect(can(perms, "tenant.suspend")).toBe(true);
  });

  it("operator cannot create or suspend but can reset password", () => {
    const perms = defaultPermissionsForRole("operator");
    expect(can(perms, "tenant.create")).toBe(false);
    expect(can(perms, "tenant.suspend")).toBe(false);
    expect(can(perms, "tenant.reset_admin_password")).toBe(true);
    expect(can(perms, "tenant.read")).toBe(true);
    expect(can(perms, "audit.read")).toBe(true);
  });

  it("exports stable permission ids used by the spec", () => {
    expect(OPS_PERMISSIONS).toEqual(
      expect.arrayContaining([
        "tenant.read",
        "tenant.create",
        "tenant.suspend",
        "tenant.resume",
        "tenant.reset_admin_password",
        "audit.read",
        "ops_user.manage",
      ]),
    );
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
npm run test:domain
```

Expected: FAIL（模块不存在或导出缺失）

- [ ] **Step 3: 实现 `permissions.ts`**

实现 `OpsRoleId = "superadmin" | "operator"`、`OpsPermission` 联合类型、`defaultPermissionsForRole`、`can(perms, id)`。`ops_user.manage` 仅超管拥有（预留）。

- [ ] **Step 4: 测试通过**

```bash
npm run test:domain
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/platform-domain
git commit -m "$(cat <<'EOF'
领域：实现运营端角色权限点与默认矩阵。

覆盖超管/普通运营能力边界，供运营端 UI 与后续 API 鉴权共用。

EOF
)"
```

---

### Task 3: 租户状态机与审计构造（TDD）

**Files:**
- Create: `packages/platform-domain/src/types.ts`
- Create: `packages/platform-domain/src/tenant-status.ts`
- Create: `packages/platform-domain/src/audit.ts`
- Create: `packages/platform-domain/src/password-temp.ts`
- Create: `packages/platform-domain/src/__tests__/tenant-status.test.ts`
- Create: `packages/platform-domain/src/__tests__/audit.test.ts`
- Create: `packages/platform-domain/src/__tests__/password-temp.test.ts`
- Modify: `packages/platform-domain/src/index.ts`

- [ ] **Step 1: 写失败测试（状态机）**

```ts
import { describe, expect, it } from "vitest";
import { suspendTenant, resumeTenant } from "../tenant-status";

describe("tenant status", () => {
  const base = {
    id: "t1",
    name: "寶新",
    nameEn: "BAO XIN",
    status: "active" as const,
    createdAt: "2026-08-01T00:00:00.000Z",
    statusChangedAt: "2026-08-01T00:00:00.000Z",
    suspendedAt: null as string | null,
    primaryAdmin: { name: "Admin", email: "admin@baoxin.hk" },
    opsNote: "",
  };

  it("suspends an active tenant and sets timestamps", () => {
    const at = "2026-08-06T08:00:00.000Z";
    const next = suspendTenant(base, at);
    expect(next.status).toBe("suspended");
    expect(next.suspendedAt).toBe(at);
    expect(next.statusChangedAt).toBe(at);
  });

  it("resume clears suspendedAt", () => {
    const suspended = suspendTenant(base, "2026-08-06T08:00:00.000Z");
    const at = "2026-08-06T09:00:00.000Z";
    const next = resumeTenant(suspended, at);
    expect(next.status).toBe("active");
    expect(next.suspendedAt).toBeNull();
    expect(next.statusChangedAt).toBe(at);
  });

  it("suspend is idempotent on already suspended", () => {
    const suspended = suspendTenant(base, "2026-08-06T08:00:00.000Z");
    const again = suspendTenant(suspended, "2026-08-06T10:00:00.000Z");
    expect(again.status).toBe("suspended");
    expect(again.suspendedAt).toBe("2026-08-06T08:00:00.000Z");
  });

  it("resume is idempotent on already active", () => {
    const at = "2026-08-06T11:00:00.000Z";
    const next = resumeTenant(base, at);
    expect(next.status).toBe("active");
    expect(next.suspendedAt).toBeNull();
    expect(next.statusChangedAt).toBe(base.statusChangedAt);
  });
});
```

- [ ] **Step 2: 写失败测试（审计不含密码）**

```ts
it("buildAuditEntry never includes password fields in metadata", () => {
  const entry = buildAuditEntry({
    actorId: "ops-1",
    action: "tenant.reset_admin_password",
    tenantId: "t1",
    result: "success",
    metadata: { password: "secret", adminEmail: "a@b.com" },
    createdAt: "2026-08-06T08:00:00.000Z",
  });
  expect(entry.metadata).not.toHaveProperty("password");
  expect(entry.metadata).toMatchObject({ adminEmail: "a@b.com" });
});
```

- [ ] **Step 3: 写失败测试（临时密码）**

```ts
it("generateTempPassword length is within enterprise password limits", () => {
  const p = generateTempPassword();
  expect(p.length).toBeGreaterThanOrEqual(12);
  expect(p.length).toBeLessThanOrEqual(20);
});
```

- [ ] **Step 4: 运行确认失败 → 实现 → 再跑通过**

```bash
npm run test:domain
```

实现要点：`types.ts` 含 `PlatformTenant`、`AuditAction`、`AuditEntry`；`buildAuditEntry` 删除 metadata 中 `password` / `tempPassword` / `passwordHash` 键。

- [ ] **Step 5: Commit**

```bash
git add packages/platform-domain
git commit -m "$(cat <<'EOF'
领域：实现租户启停状态机、审计脱敏与临时密码生成。

锁定 active⇄suspended 转换规则，确保审计日志不落密码明文。

EOF
)"
```

---

### Task 4: 脚手架 `ops/` Next 应用

**Files:**
- Create: `ops/`（`create-next-app` 对齐 web：TS、App Router、Tailwind、ESLint；**不**选 src 以外的实验项）
- Modify: `ops/package.json` — 依赖 `@mr/platform-domain`、`next@15`、`react@19`、`@phosphor-icons/react`；`dev` 脚本 `"next dev -p 3001"`

- [ ] **Step 1: 创建应用**

```bash
cd /Users/mzmaid/Desktop/Digitalx/metal-recycling
npx create-next-app@15.5.22 ops --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

（若交互提示，选择与 `web` 一致的选项。）

创建成功后**立刻**修订根 `package.json`：

```json
"workspaces": ["web", "ops", "packages/*"],
"scripts": {
  "test:domain": "npm run test -w @mr/platform-domain",
  "dev:web": "npm run dev -w web",
  "dev:ops": "npm run dev -w ops"
}
```

然后 `npm install`。

- [ ] **Step 2: 接入 workspace 依赖、transpilePackages，并复制主题基线**

- `ops/package.json` 增加 `"@mr/platform-domain": "*"`
- `ops/next.config.ts` **立即**设置 `transpilePackages: ["@mr/platform-domain"]`（勿等到 Task 6，否则 Task 5 引入 domain 时 `dev:ops` 易挂）
- 从 `web/src/app/globals.css` 与 `web/src/shared/config/theme.ts` **复制**必要 CSS 变量与主题工具到 `ops/src/shared/theme/`（允许复制，禁止 import `web/src/**`）
- 根布局使用运营产品名（如「金属回收 · 运营台」），勿复用企业侧栏组件文件

- [ ] **Step 3: 验证可启动**

```bash
npm install
npm run dev:ops
```

Expected: http://localhost:3001 可打开默认页

- [ ] **Step 4: Commit**

```bash
git add ops package-lock.json package.json
git commit -m "$(cat <<'EOF'
工程：新增独立运营端 Next.js 应用（端口 3001）。

与企业端分离部署与登录域，视觉 token 对齐但不共享业务页面。

EOF
)"
```

---

### Task 5: 运营端 Auth + 种子账号 + 权限门闸

**Files:**
- Create: `ops/src/data/seed.ts` — 超管 `ops-admin@platform.local` / 普通运营 `ops-user@platform.local`（演示密码写入 README）
- Create: `ops/src/features/auth/provider.tsx`
- Create: `ops/src/app/login/page.tsx`
- Create: `ops/src/app/(ops)/layout.tsx` — 未登录重定向 `/login`；侧栏仅「租户」「审计」
- Create: `ops/src/shared/auth/permissions.ts` — 包装 `can` + 当前用户角色

- [ ] **Step 1: 实现登录与会话**

- 会话键：`mr-ops-session`
- 登录成功写入 `{ id, email, name, roleId }`
- **只**查 `PlatformUser` 种子表；企业员工邮箱不能登录运营端

- [ ] **Step 2: 布局权限**

- 无 `tenant.create` 时隐藏「新建租户」；直链 `/tenants/new` 显示无权限页或 redirect
- 侧栏分组只放 V1 模块

- [ ] **Step 3: 手动验证**

```bash
npm run dev:ops
```

用超管与普通运营各登录一次，确认侧栏与新建入口差异。

- [ ] **Step 4: Commit**

```bash
git add ops
git commit -m "$(cat <<'EOF'
运营端：落地平台登录、种子账号与权限门闸。

预置超管与普通运营，按权限点控制新建租户等入口。

EOF
)"
```

**交叉约束（在 Task 9 落地）：** 运营种子邮箱不得走企业端 `demoSessionUser` 旁路登录。

---

### Task 6: Platform Mock Store（租户 + 审计 + 共享 LS）

**Files:**
- Create: `ops/src/data/platform-store.tsx`
- Create: `packages/platform-domain/src/storage-keys.ts` — 导出 `PLATFORM_TENANTS_LS_KEY`、`PLATFORM_EMPLOYEES_LS_KEY`、`ENTERPRISE_PASSWORDS_LS_KEY`（值必须为 `"baoxin-mock-passwords"`）、`sessionInvalidateKey(tenantId)`（前缀常量，避免 ops/web 硬编码漂移）
- Create: `packages/platform-domain/src/enterprise-passwords.ts` — 纯函数版 `getPasswordFromMap` / `setPasswordInMap`
- Create: `packages/platform-domain/src/seed-platform.ts` — `ensurePlatformTenantSeed()`：若 `mr-platform-tenants-v1` 为空则写入 `t-baoxin`（及约定演示字段）；**ops store 与 web bridge 启动时都调用**
- Modify: `web/src/entities/auth/password.ts` — 键名与 `emailKey` 规则改为使用 domain 常量；读写行为保持不变
- Modify: `web/next.config.ts` — `transpilePackages: ["@mr/platform-domain"]`（ops 已在 Task 4 设置）
- Modify: `web/package.json` — 依赖 `@mr/platform-domain`

- [ ] **Step 1: 领域导出存储键 + 密码 map API，并写测试**

```ts
expect(PLATFORM_TENANTS_LS_KEY).toBe("mr-platform-tenants-v1");
expect(ENTERPRISE_PASSWORDS_LS_KEY).toBe("baoxin-mock-passwords");
expect(normalizeEmailKey("A@B.com")).toBe("a@b.com");

const map = setPasswordInMap({}, "A@B.com", "TempPass123!");
expect(getPasswordFromMap(map, "a@b.com")).toBe("TempPass123!");
```

**禁止**实现「每邮箱一个 LS 键」。必须与现网 `baoxin-mock-passwords` JSON map 兼容。

`generateTempPassword` 长度落在 `PASSWORD_MIN_LENGTH`～`PASSWORD_MAX_LENGTH`（6～20，与 web 一致；建议 12～16）。

- [ ] **Step 2: 实现 `platform-store`**

API 形状（便于日后换真 API）：

- 启动时调用 `ensurePlatformTenantSeed()`（与 web 共用同一函数）：若注册表为空则写入 `t-baoxin`
- `listTenants({ q, status })` / `getTenant(id)`
- `createTenant(...)`：
  1. 生成新 `tenantId`
  2. 写入 `mr-platform-tenants-v1`
  3. 写入 `mr-platform-employees-v1` 主管理员（`roleIds: ["admin"]`）
  4. `setStoredPassword(email, tempPassword)` 写入 **同一** `baoxin-mock-passwords` map
  5. 审计 `tenant.create`
  6. 返回 `{ tenant, tempPassword }`（仅此次）
- `suspendTenant` / `resumeTenant`：domain 状态机 + 审计；**suspend** 写 `mr-platform-session-invalidate:{tenantId}=ISO`；**resume 必须 `removeItem` 该键**
- Store 的 create/suspend/resume/reset 入口用当前用户 `can(...)` 校验，无权限抛错或返回 403 形结果（对齐规格：API 与 UI 均不可用）
- `resetAdminPassword(tenantId)`：允许 suspended；审计 metadata 含 **当时** `tenant.status` 与 `adminEmail`，**不含**密码
- `listAuditLogs(filters)`

- [ ] **Step 3: domain 测试 + 手动检查 LS**

```bash
npm run test:domain
```

Application → Local Storage：`mr-platform-tenants-v1`、`baoxin-mock-passwords`（map）、`mr-platform-employees-v1`。

- [ ] **Step 4: Commit**

```bash
git add packages/platform-domain ops web/src/entities/auth/password.ts web/package.json web/next.config.ts ops/next.config.ts
git commit -m "$(cat <<'EOF'
运营端：实现平台 Mock Store，并与现网密码 map 存储对齐。

预置 t-baoxin、代建写入员工桥接表，保证跨应用联调键一致。

EOF
)"
```

---

### Task 7: 租户列表 / 新建 / 详情页

**Files:**
- Create: `ops/src/app/(ops)/tenants/page.tsx`
- Create: `ops/src/app/(ops)/tenants/new/page.tsx`
- Create: `ops/src/app/(ops)/tenants/[id]/page.tsx`
- Create: `ops/src/features/tenants/TempPasswordDialog.tsx`
- Create: `ops/src/shared/ui/{PageHeader,DataTable,FilterBar,StatusBadge,Modal,ConfirmDialog}.tsx`（精简实现，视觉对齐 web）

- [ ] **Step 1: 列表页**

- 筛选：关键词（公司名/管理员邮箱）、状态  
- 列：公司名、状态、主管理员、创建时间、状态最近变更时间  
- 行点击进详情  

- [ ] **Step 2: 新建页（仅超管）**

- 字段：中文名（必填）、英文名、管理员姓名/邮箱、备注  
- 成功后弹窗展示**一次性**临时密码 → 确认后跳转详情  
- 邮箱重复：展示错误（全局唯一，查注册表内已有 primaryAdmin.email）

- [ ] **Step 3: 详情页**

- 展示元数据  
- 超管：停用/启用（ConfirmDialog）  
- 超管+运营：重置主管理员密码 → 一次性密码弹窗  
- 无业务数据区块  

- [ ] **Step 4: 手动验收权限矩阵**

普通运营：列表/详情/重置 OK；新建与启停不可用。

- [ ] **Step 5: Commit**

```bash
git add ops
git commit -m "$(cat <<'EOF'
运营端：完成租户列表、代建与详情启停/重置密码流程。

一次性展示临时密码，审计与权限边界按规格落地。

EOF
)"
```

---

### Task 8: 审计日志页

**Files:**
- Create: `ops/src/app/(ops)/audit/page.tsx`

- [ ] **Step 1: 列表 + 筛选**

筛选：租户、action、操作人、时间范围（简化：日起止字符串即可）。  
列：时间、操作人、action、租户、结果、脱敏 metadata 摘要。

- [ ] **Step 2: 用 Task 7 产生的操作验证四条 action 均出现**

`tenant.create` / `suspend` / `resume` / `reset_admin_password`

- [ ] **Step 3: Commit**

```bash
git add ops
git commit -m "$(cat <<'EOF'
运营端：增加审计日志查询页。

支持按租户、操作类型与操作人追溯治理动作。

EOF
)"
```

---

### Task 9: 企业端 — 取消注册 + 租户状态门禁 + 联调桥接

**Files:**
- Modify: `web/src/entities/types.ts` — `Tenant` 增加 `status`, `statusChangedAt`, `suspendedAt?`
- Modify: `web/src/data/mock/seed.ts` — 寶新 `status: "active"`；与平台注册表 `t-baoxin` 对齐
- Create: `web/src/data/platform-bridge.ts` — 读注册表/员工桥接/invalidate；**模块加载或 AuthProvider mount 时调用 `ensurePlatformTenantSeed()`**，保证仅跑 web、清空 LS 后未开 ops 时寶新仍可登录
- Modify: `web/src/data/mock/store.tsx` — 支持按桥接切换当前 `tenant` 元数据；合并桥接员工到可登录用户集
- Modify: `web/src/features/auth/provider.tsx` — 见下方门禁规则
- Modify: `web/src/app/(auth)/register/page.tsx` — `redirect("/login")`（以清 CTA/链接/README 为主，不必大删 i18n 键）
- Modify: 登录页 — 去掉「去注册」链接
- Modify: `web/README.md` — 开户走运营端；联调步骤
- Modify: `web/next.config.ts` — `transpilePackages`（若 Task 6 未做）

- [ ] **Step 1: 扩展 Tenant 类型与种子**

- [ ] **Step 2: 登录门禁与租户绑定（按邮箱解析平台租户）**

```ts
// 1) 拒绝运营平台账号
if (isPlatformOpsEmail(trimmed)) {
  return { ok: false, message: /* 请使用运营端登录 */ };
}

// 2) 禁止未知邮箱走 demoSessionUser 旁路（至少：非 DEMO_EMAIL 且不在员工/桥接表 → 失败）
//    DEMO_EMAIL 仅绑定 t-baoxin 且 t-baoxin 为 active 时可用

// 3) 解析平台租户
const platformTenant =
  findPlatformTenantByAdminEmail(trimmed) ??
  findPlatformTenantByEmployeeEmail(trimmed) ??
  findPlatformTenantById(localTenantIdForMatchedEmployee);

if (!platformTenant || platformTenant.status === "suspended") {
  return { ok: false, message: /* 租户不存在或已停用 */ };
}

// 4) 校验 baoxin-mock-passwords map 中的密码
// 5) persist 会话用户，并把 mock store 的 tenant 切到 platformTenant.id
```

会话 `useEffect`：当前 `tenantId` 在注册表中变为 `suspended`，**或** invalidate 时间戳存在且 `>= session.issuedAt` → 立即 `logout()`。  
登录成功时在会话中写入 `issuedAt`（ISO）。密码校验保留 `resolveAccountPassword` / `DEMO_DEFAULT_PASSWORD`，避免寶新种子 map 无条目时登不上。

- [ ] **Step 3: 移除注册可达路径**

`/register` → `/login`；登录页无注册 CTA。

- [ ] **Step 4: 联调演示路径（必须按此验收）**

1. 同浏览器：`npm run dev:ops` + `npm run dev:web`  
2. 超管代建**新**租户（非寶新）→ 复制临时密码  
3. 企业端用该主管理员邮箱+临时密码登录 → 侧栏/顶栏公司名为**新租户**（不是误进寶新）  
4. ops **只停用该新租户** → 该会话退出；寶新 `demo@baoxin.hk` 仍可登录  
5. 停用 `t-baoxin` → demo 无法登录；新租户（若仍 active）不受影响  
6. 启用后对应租户恢复可登  
7. 用 `ops-admin@platform.local` 尝试企业端登录 → **失败**

- [ ] **Step 5: Commit**

```bash
git add web
git commit -m "$(cat <<'EOF'
企业端：取消自助注册，并按平台租户注册表做登录与停用门禁。

按邮箱绑定租户上下文；拒绝运营账号登录；保障代建联调路径可验收。

EOF
)"
```

---

### Task 10: 文档对齐与自检

**Files:**
- Create: `ops/README.md`
- Modify: `docs/architecture.md` — 平台层改为独立运营端；开户改为代建；双前端端口
- Modify: `docs/superpowers/specs/2026-08-05-metal-recycling-saas-design.md` — §2.1 / §4 / 决策表中「自助注册」改为指向运营端规格
- Modify: 本计划顶部勾选进度（可选）

- [ ] **Step 1: 写 `ops/README.md`**

含：启动命令、演示账号、与企业端联调步骤、端口 3001。

- [ ] **Step 2: 修订 architecture 与 SaaS 规格开户表述**

- [ ] **Step 3: 跑领域测试 + 两端 build**

```bash
npm run test:domain
npm run build -w ops
npm run build -w web
```

Expected: 全部成功

- [ ] **Step 4: Commit**

```bash
git add ops/README.md docs
git commit -m "$(cat <<'EOF'
文档：对齐运营端落地后的开户方式与双前端架构说明。

同步修订架构文档与 SaaS 规格中自助注册相关表述。

EOF
)"
```

---

## 验收对照（规格 §1.3）

| # | 标准 | 验证方式 |
|---|------|----------|
| 1 | 代建 + 企业登录；无自助注册 | Task 9 联调 |
| 2 | 停用禁登 + 会话失效；可启用 | Task 9 联调 |
| 3 | 普通运营权限边界 | Task 5–7 手动 |
| 4 | 无业务数据暴露 | 代码审查 ops 路由无业务实体 |
| 5 | 审计可追溯 | Task 8；含停用态重置且 metadata 含当时 status |
| 6 | 独立应用与登录；风格对齐不共享业务页 | Task 4–5 结构 |
| 7 | 运营账号不可登企业端；企业账号不可登运营端 | Task 5 + Task 9 Step 4.7 |

---

## 风险与注意

- **无真实后端时的桥接脆弱性**：依赖**同一浏览器** localStorage；换浏览器/隐私模式无法共享——README 写明，后端就绪后删除 LS 桥接。  
- **两端 `next.config` 必须**设置 `transpilePackages: ['@mr/platform-domain']`，否则 build 易挂。  
- **不要**把 `web/src/features/**` 业务页拷进 ops。  
- **密码长度**：临时密码必须通过企业端 `validatePasswordFormat`（6～20、无空白）。  
