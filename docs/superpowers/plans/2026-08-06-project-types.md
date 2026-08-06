# 项目类型主数据 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「项目类型」主数据维护页，并将采购合同「项目」改为从启用项中可搜索下拉选择（存名称快照）。

**Architecture:** 对齐货物类型（`material-types`）的列表 + 新建/详情弹窗 + Mock CRUD 模式，但实体仅含 `name` + `enabled`。采购合同继续使用 `project?: string`；下拉 value/label 均为名称；删除主数据不改写合同。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、现有 Mock store / i18n / 权限矩阵；无独立单测基建，以 `tsc --noEmit` + 手动验收为主。

**依据规格:** [docs/superpowers/specs/2026-08-06-project-types-design.md](../specs/2026-08-06-project-types-design.md)

---

## File Structure

| 文件 | 职责 |
| --- | --- |
| `web/src/entities/types.ts` | 新增 `ProjectType` 接口 |
| `web/src/data/mock/seed.ts` | 种子项目类型（至少「廢料回收」） |
| `web/src/data/mock/store.tsx` | `projectTypes` 状态与 CRUD |
| `web/src/shared/config/menu.ts` | 菜单项 `/project-types` |
| `web/src/shared/layout/Sidebar.tsx` | 图标映射（新增 `folders`） |
| `web/src/shared/config/permissions.ts` | `ModuleId` / 模块定义 / 内置角色权限 |
| `web/src/shared/i18n/types.ts` + `messages/{zh-Hans,zh-Hant,en}.ts` | 文案 |
| `web/src/app/(app)/project-types/layout.tsx` | 页面 metadata |
| `web/src/app/(app)/project-types/page.tsx` | 列表页 |
| `web/src/features/project-types/components/ProjectTypeModals.tsx` | 新建 + 详情弹窗 |
| `web/src/features/lazy-modals.tsx` | 懒加载导出 |
| `web/src/features/contracts/components/ContractModals.tsx` | 采购「项目」改下拉 |
| `需求文档/项目类型.md` | 新建短 PRD |
| `需求文档/合同管理.md` | 项目字段改为主数据下拉说明 |

---

### Task 1: 类型 + Mock 种子与 Store CRUD

**Files:**
- Modify: `web/src/entities/types.ts`（在 `MaterialType` 附近）
- Modify: `web/src/data/mock/seed.ts`
- Modify: `web/src/data/mock/store.tsx`

- [ ] **Step 1: 新增 `ProjectType` 类型**

在 `MaterialType` 后增加：

```ts
export interface ProjectType extends RecordTimestamps {
  id: string;
  name: string;
  enabled: boolean;
}
```

- [ ] **Step 2: 种子数据**

在 `seed.ts` 增加（名称须与现有采购合同 `project: "廢料回收"` 一致）：

```ts
const seedProjectTypes: Omit<ProjectType, keyof RecordTimestamps>[] = [
  { id: "pt1", name: "廢料回收", enabled: true },
];
// 与 materialTypes 同写法：withSeed 需传入种子日期第二参，例如：
export const projectTypes: ProjectType[] = withSeed(seedProjectTypes, "2026-06-25");
```

Import `ProjectType` 到 seed 的 type import 列表。

- [ ] **Step 3: Store CRUD**

对齐 `materialTypes`：

- import `projectTypes as seedProjectTypes`
- state: `const [projectTypes, setProjectTypes] = useState(seedProjectTypes)`
- `addProjectType` / `updateProjectType` / `removeProjectType`（`uid("pt")`，`stampOnCreate` / `stampOnUpdate`）
- 暴露到 context value 与 dependency 列表

`removeProjectType`：**不**扫描采购合同，直接按 id 过滤删除。

- [ ] **Step 4: 类型检查**

Run: `cd web && npx tsc --noEmit`

Expected: 可能因后续未接线而仍通过（仅类型/store 增加字段）；若有报错则修复。

- [ ] **Step 5: Commit**

```bash
git add web/src/entities/types.ts web/src/data/mock/seed.ts web/src/data/mock/store.tsx
git commit -m "$(cat <<'EOF'
功能：新增项目类型实体与 Mock CRUD。

为采购合同「项目」主数据化做数据层准备，种子含「廢料回收」。

EOF
)"
```

---

### Task 2: 菜单、权限、i18n

**Files:**
- Modify: `web/src/shared/config/menu.ts`
- Modify: `web/src/shared/layout/Sidebar.tsx`
- Modify: `web/src/shared/config/permissions.ts`
- Modify: `web/src/shared/i18n/types.ts`
- Modify: `web/src/shared/i18n/messages/zh-Hans.ts`
- Modify: `web/src/shared/i18n/messages/zh-Hant.ts`
- Modify: `web/src/shared/i18n/messages/en.ts`

- [ ] **Step 1: 菜单项**

在 `menu.ts` 的 `MenuIconKey` 增加 `"folders"`。

在 `material-types` 条目后插入：

```ts
{ href: "/project-types", labelKey: "menu.projectTypes", icon: "folders", group: "master", moduleId: "projectTypes" },
```

- [ ] **Step 2: Sidebar 图标**

```ts
import { Folders, ... } from "@phosphor-icons/react";
// iconMap:
folders: Folders,
```

- [ ] **Step 3: 权限矩阵**

`ModuleId` 增加 `"projectTypes"`。

`PermissionModuleDef.menuLabelKey` 联合类型增加 `"menu.projectTypes"`。

`PERMISSION_MODULES` 在 `materialTypes` 后增加：

```ts
{
  id: "projectTypes",
  group: "master",
  menuHref: "/project-types",
  menuLabelKey: "menu.projectTypes",
  actions: ["view", "create", "edit", "delete"],
},
```

`BUILTIN_ROLE_ACCESS`：凡有 `materialTypes` 的角色，按同级复制 `projectTypes` 一行（admin write；contract/weigh/boss read；finance 无则可不加）。

- [ ] **Step 4: i18n**

`types.ts`：

- `menu.projectTypes: string`
- 新增块：

```ts
projectTypes: {
  title: string;
  description: string;
  new: string;
};
```

- `form` 中如需：`projectDetail: string`、`keywordProject: string`（或复用 `common.name` + 页内 placeholder）

三语文案示例（简体）：

| key | 文案 |
| --- | --- |
| `menu.projectTypes` | 项目类型 |
| `projectTypes.title` | 项目类型 |
| `projectTypes.description` | 项目类型主数据 |
| `projectTypes.new` | 新建项目类型 |
| `form.projectDetail` | 项目类型详情 |
| `form.keywordProject` | 项目类型名称 |

繁体 / 英文做对应翻译。

若角色权限 UI 有模块说明文案字典，同步补一条 `projectTypes`（搜 `materialTypes` / `material:` 相关 permissions 文案）。

- [ ] **Step 5: 类型检查 + Commit**

Run: `cd web && npx tsc --noEmit`

```bash
git add web/src/shared/config/menu.ts web/src/shared/layout/Sidebar.tsx \
  web/src/shared/config/permissions.ts web/src/shared/i18n/
git commit -m "$(cat <<'EOF'
功能：注册项目类型菜单、权限与多语言文案。

主数据分组新增入口，权限矩阵对齐货物类型读写策略。

EOF
)"
```

---

### Task 3: 项目类型列表页 + 弹窗

**Files:**
- Create: `web/src/app/(app)/project-types/layout.tsx`
- Create: `web/src/app/(app)/project-types/page.tsx`
- Create: `web/src/features/project-types/components/ProjectTypeModals.tsx`
- Modify: `web/src/features/lazy-modals.tsx`

- [ ] **Step 1: layout**

复制 `material-types/layout.tsx`，改为 `pageMetadata("menu.projectTypes")`。

- [ ] **Step 2: 弹窗组件**

以 `MaterialTypeModals.tsx` 为模板，删掉 `forPurchase` / `forSale`：

- `ProjectTypeCreateModal`：默认 `enabled = true`（规格）；字段仅名称 + 启用 Switch
- `ProjectTypeDetailModal`：标题 `t("form.projectDetail")`；保存后 `t("common.saved")`，不自动关闭

- [ ] **Step 3: lazy-modals**

对齐 MaterialType 的 `dynamic(...)` 导出 `ProjectTypeCreateModal` / `ProjectTypeDetailModal`。

- [ ] **Step 4: 列表页**

以 `material-types/page.tsx` 为模板，简化为：

- 筛选：关键词、启用状态（无采购/销售分段）
- 列：名称、启用状态、审计列、操作
- CRUD：`projectTypes` / `removeProjectType`；新建/详情弹窗

- [ ] **Step 5: 手动冒烟**

Run: `cd web && npm run dev`（若已在跑则刷新）

验收：侧栏「项目类型」→ 可见种子「廢料回收」→ 新建一条 → 编辑停用 → 删除确认可删。

- [ ] **Step 6: Commit**

```bash
git add web/src/app/\(app\)/project-types/ \
  web/src/features/project-types/ \
  web/src/features/lazy-modals.tsx
git commit -m "$(cat <<'EOF'
功能：实现项目类型维护列表与新建/详情弹窗。

对齐货物类型交互壳，字段仅名称与启用状态。

EOF
)"
```

---

### Task 4: 采购合同「项目」改为可搜索下拉

**Files:**
- Modify: `web/src/features/contracts/components/ContractModals.tsx`

- [ ] **Step 1: 读取 store**

在 `PurchaseContractCreateModal` / `PurchaseContractDetailModal` 中从 `useMockStore()` 取出 `projectTypes`。

- [ ] **Step 2: 构建选项 helper（可写在组件内）**

```ts
function buildProjectOptions(
  projectTypes: { name: string; enabled: boolean }[],
  current?: string,
) {
  const opts = projectTypes
    .filter((p) => p.enabled)
    .map((p) => ({ value: p.name, label: p.name }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: current });
  }
  // 选填：允许清空
  return [{ value: "", label: "—" }, ...opts];
}
```

（空选项 label 若有 i18n 通用「无」则用之，否则用 `—`。）

- [ ] **Step 3: 替换输入框**

将两处：

```tsx
<input className={inputClass} value={project} onChange={(e) => setProject(e.target.value)} />
```

改为：

```tsx
<SearchableSelect
  value={project}
  onChange={setProject}
  options={buildProjectOptions(projectTypes, project)}
/>
```

保存逻辑保持 `project: project || undefined`。

- [ ] **Step 4: 手动验收**

1. 打开采购合同编辑：项目为可搜索下拉，默认可见「廢料回收」
2. 停用该项目类型后，**新建**合同下拉不再出现；**已选该名称的旧合同**编辑时仍能看到并保存
3. 删除项目类型后，旧合同详情仍显示原项目名称
4. 销售合同无项目字段

- [ ] **Step 5: Commit**

```bash
git add web/src/features/contracts/components/ContractModals.tsx
git commit -m "$(cat <<'EOF'
功能：采购合同项目改为项目类型下拉选择。

仅展示启用项，保留历史名称快照兜底，支持清空。

EOF
)"
```

---

### Task 5: 需求文档同步 + 总验收

**Files:**
- Create: `需求文档/项目类型.md`
- Modify: `需求文档/合同管理.md`

- [ ] **Step 1: 写 `需求文档/项目类型.md`**

参照 `需求文档/货物类型.md` 精简版：背景、功能清单、菜单权限、筛选列表、弹窗字段、删除策略 B、验收标准；注明无采购/销售适用标志。

- [ ] **Step 2: 更新合同管理 PRD**

在采购表单「项目」处改为：可选，可搜索下拉，数据源为启用中的项目类型；存名称快照；关联 `需求文档/项目类型.md` 与设计规格。版本号 bump（如 v2.1.0 → v2.2.0），更新日期。

- [ ] **Step 3: 全量类型检查**

Run: `cd web && npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add 需求文档/项目类型.md 需求文档/合同管理.md
git commit -m "$(cat <<'EOF'
文档：补充项目类型 PRD 并同步合同管理需求。

明确项目为可选主数据下拉及删除后名称快照行为。

EOF
)"
```

---

## 验收对照（规格 §10）

| # | 标准 | 对应 Task |
| --- | --- | --- |
| 1 | 主数据菜单可 CRUD 名称与启用 | Task 2–3 |
| 2 | 停用后不出现在新建可选列表（历史兜底除外） | Task 4 |
| 3 | 采购项目为可搜索下拉且选填 | Task 4 |
| 4 | 删除主数据后合同仍显示原名称 | Task 1 + 4 |
| 5 | 销售无项目；无多余一期不做能力 | Task 4–5 |

---

## 执行说明

- 每 Task 结束再进入下一 Task；Commit 信息用中文详尽说明（遵循仓库约定）。
- 勿引入 `projectId`；勿给销售合同加项目字段。
- 新建项目类型默认 **启用**（与规格一致；勿照搬货物类型新建默认停用）。
