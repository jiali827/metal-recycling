# 结算单弹窗新建实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 侧栏恢复结算单；用弹窗按「类型 → 单合同 → 未结算磅单」新建採購單/銷售單，确认后进入预览打印；去掉过磅台账多选生成。

**Architecture:** 扩展 `WeighSettlementDoc` 合同锚点与 `settlement-doc` 纯函数（可选合同/可结算磅单过滤 + 成单校验）；新建 `SettlementDocCreateModal`；列表页挂「新建」；过磅台账卸下批量生成；打印页沿用。

**Tech Stack:** Next.js App Router、现有 Mock store、Modal/Select/DateRangePicker/ConfirmDialog、vitest、三语 i18n

**Spec:** `docs/superpowers/specs/2026-08-07-settlement-create-modal-design.md`

---

## 文件结构

| 文件 | 职责 |
| --- | --- |
| `web/src/entities/types.ts` | `WeighSettlementDoc` 增加 `contractId`、`contractNo` |
| `web/src/entities/settlement-doc/eligible.ts` | 可结算磅单 / 可选合同过滤 |
| `web/src/entities/settlement-doc/build.ts` | 成单校验增加同合同；写入合同锚点 |
| `web/src/entities/settlement-doc/eligible.test.ts` | 过滤与校验单测 |
| `web/src/entities/settlement-doc/index.ts` | 导出 |
| `web/src/features/settlement-docs/components/SettlementDocCreateModal.tsx` | 新建弹窗 |
| `web/src/features/lazy-modals.tsx` | dynamic 导出弹窗 |
| `web/src/app/(app)/settlement-docs/page.tsx` | 新建入口、合同列 |
| `web/src/app/(app)/weigh-tickets/page.tsx` | 移除多选生成；页头仅跳转列表 |
| `web/src/shared/config/menu.ts` | 恢复侧栏结算单 |
| i18n 三语 + `types.ts` | 弹窗文案 |
| `需求文档/结算单.md` | 同步入口与规则 |

---

### Task 1: 类型 + 可结算过滤 + 成单校验（TDD）

**Files:**
- Modify: `web/src/entities/types.ts`
- Create: `web/src/entities/settlement-doc/eligible.ts`
- Modify: `web/src/entities/settlement-doc/build.ts`
- Create: `web/src/entities/settlement-doc/eligible.test.ts`
- Modify: `web/src/entities/settlement-doc/index.ts`

- [ ] **Step 1: 扩展 `WeighSettlementDoc`**

```ts
export interface WeighSettlementDoc extends RecordTimestamps {
  id: string;
  no: string;
  kind: WeighSettlementKind;
  customerName: string;
  /** 采购=采购合同 id；销售=销售合同 id */
  contractId: string;
  contractNo: string;
  docDate: string;
  status: WeighSettlementStatus;
  ticketIds: string[];
  lines: WeighSettlementLine[];
  totalNetKg: number;
  totalAmount: number;
}
```

- [ ] **Step 2: 写失败单测（先写测试）**

在 `eligible.test.ts` 覆盖：

1. 无合同 / `contractNo === "-"` 的采购磅单不可结算  
2. 无 `saleContractId` 的销售磅单不可结算  
3. 已在 `usedTicketIds` 或 `void` 的不可结算  
4. 可选合同 = 该方向下至少 1 张可结算磅单的合同  
5. `buildSettlementDocInput`：跨合同 → 失败；同合同成功且 `input.contractId/contractNo` 有值  

- [ ] **Step 3: 跑测确认失败**

Run: `cd web && npm test -- src/entities/settlement-doc/eligible.test.ts`

Expected: FAIL（模块/断言未实现）

- [ ] **Step 4: 实现 `eligible.ts`**

```ts
// 签名示意
export function isTicketLinkedToContract(ticket: WeighTicket, kind: WeighSettlementKind): boolean;
export function ticketMatchesContract(
  ticket: WeighTicket,
  kind: WeighSettlementKind,
  contract: { id: string; no: string },
): boolean;
export function listEligibleTickets(opts: {
  tickets: WeighTicket[];
  kind: WeighSettlementKind;
  contract: { id: string; no: string };
  usedTicketIds: Set<string>;
  dateStart?: string;
  dateEnd?: string;
}): WeighTicket[];
export function listEligibleContracts(opts: {
  kind: WeighSettlementKind;
  purchaseContracts: PurchaseContract[];
  saleContracts: SaleContract[];
  tickets: WeighTicket[];
  usedTicketIds: Set<string>;
}): { id: string; no: string; customerName: string }[];
```

采购匹配：`direction==="purchase"` 且 `ticket.contractNo === contract.no`。  
销售匹配：`direction==="sale"` 且 `ticket.saleContractId === contract.id`。

- [ ] **Step 5: 改 `buildSettlementDocInput`**

- 增加参数 `contract: { id: string; no: string; customerName: string }`（必填）  
- 新错误码：`mixed_contract` | `unlinked_ticket` | `kind_mismatch`（按需）；客户与合同对方不一致时用现有 `mixed_customer` 或明确校验 `ticket.customerName` vs `contract.customerName`  
- 校验每张磅单 `ticketMatchesContract`；通过后写入 `contractId`/`contractNo`  
- 保留原 empty / void / already_used / mixed_direction / mixed_customer  

- [ ] **Step 5b: 解除过磅台账对旧签名的依赖（避免半损坏）**

在同一 Task 内：从 `weigh-tickets/page.tsx` **先移除** `handleGenerate` / `buildSettlementDocInput` 调用与多选生成 UI（完整清理也可放到 Task 4 复核，但 **本步必须让 `tsc` 与页面不再调用旧签名**）。页头「结算单」跳转列表可一并留下。

- [ ] **Step 6: 跑测通过**

Run: `cd web && npm test -- src/entities/settlement-doc && npx tsc --noEmit`

Expected: tests PASS；源码 tsc 无错

- [ ] **Step 7: Commit（若用户要求提交再执行）**

```bash
git add web/src/entities/types.ts web/src/entities/settlement-doc
git commit -m "$(cat <<'EOF'
feat(结算单): 增加合同锚点与可结算磅单/合同过滤逻辑

EOF
)"
```

---

### Task 2: 新建弹窗 UI

**Files:**
- Create: `web/src/features/settlement-docs/components/SettlementDocCreateModal.tsx`
- Modify: `web/src/features/lazy-modals.tsx`

- [ ] **Step 1: 实现 `SettlementDocCreateModal`**

Props: `open`, `onClose`, `onCreated?: (id: string) => void`

依赖：`useMockStore`（tickets / purchaseContracts / saleContracts / weighSettlementDocs / addWeighSettlementDoc）、`useConfirm`、`SegmentedControl`/`Select`/`SearchableSelect`/`DatePicker`/`DateRangePicker`、Modal `size="xl"` 或 `"2xl"`。

状态：`kind`、`contractId`、`dateStart/dateEnd`、`selectedIds`、`docDate`（默认 `todayISO()`）。

行为：

- 切换 `kind` → 清空合同与选中磅单  
- 切换 `contractId` 或改过磅日期区间 → 清空 `selectedIds`（避免确认时带上旧集）  
- 合同 options 来自 `listEligibleContracts`；选项文案：`{no} · {customerName}`  
- 磅单表列：BX、过磅时间、车牌、货类、净重、金额；来自 `listEligibleTickets`；checkbox + **全选当前列表**  
- **空态**：未选合同 → `t("settlementDocs.pickContractFirst")`；已选合同但无候选 → `t("settlementDocs.eligibleEmpty")`  
- **确认前本地校验**（统一 `confirm({ alert: true })`）：未选合同、未勾选磅单；再调用 `buildSettlementDocInput`；失败同样 alert（映射含 `mixed_contract` / `unlinked_ticket` / `kind_mismatch` 等新错误码）  
- 汇总：张数 / `formatKg` / `formatMoney`  
- 成功：`addWeighSettlementDoc` → `onCreated(id)` → `onClose`  

本 Task 同步改三语 i18n + `types.ts`（`new`、`createTitle`、`pickContract`、`pickContractFirst`、`pickTickets`、`selectAllEligible`、`eligibleEmpty`、`errMixedContract`、`errNoContract`、`errNoTickets`、`colContractNo` 等）。

- [ ] **Step 2: lazy-modals 导出**

```ts
export const SettlementDocCreateModal = dynamic(
  () =>
    import("@/features/settlement-docs/components/SettlementDocCreateModal").then((m) => ({
      default: m.SettlementDocCreateModal,
    })),
  { ssr: false },
);
```

- [ ] **Step 3: 手动点检**（实现后由执行者在浏览器确认弹窗可开关）

- [ ] **Step 4: Commit（若用户要求）**

---

### Task 3: 列表接入 + 侧栏菜单 + 合同列

**Files:**
- Modify: `web/src/shared/config/menu.ts`
- Modify: `web/src/app/(app)/settlement-docs/page.tsx`
- Modify: i18n `zh-Hans.ts` / `zh-Hant.ts` / `en.ts` / `types.ts`

- [ ] **Step 1: 恢复菜单项**

取消注释：

```ts
{ href: "/settlement-docs", labelKey: "menu.settlementDocs", icon: "receipt", group: "main", moduleId: "weighTickets" },
```

- [ ] **Step 2: 列表页**

- `PageHeader` actions：`canCreate` 时 `PrimaryButton` 打开 `SettlementDocCreateModal`；保留「去过磅台账」次按钮或与新建并排  
- `onCreated` → `router.push(/settlement-docs/${id})`  
- 列在「单号」后或客户前增加 `contractNo`（空则 `—`）  
- 筛选可保留现有单号/客户/日期/状态/类型  

- [ ] **Step 3: i18n**

列表/菜单若仍缺文案在此补齐；弹窗文案优先在 Task 2 完成。

- [ ] **Step 4: Commit（若用户要求）**

---

### Task 4: 过磅台账复核（多选生成应已在 Task 1 移除）

**Files:**
- Modify: `web/src/app/(app)/weigh-tickets/page.tsx`（若 Task 1 已删净可仅复核）

- [ ] **Step 1: 确认无残留**

无多选列、无批量条、无 `buildSettlementDocInput`；页头「结算单」→ `/settlement-docs`；筛选保留。

- [ ] **Step 2: 浏览器确认过磅页无多选生成**

- [ ] **Step 3: Commit（若用户要求）**

---

### Task 5: 文档同步 + 总验收

**Files:**
- Modify: `需求文档/结算单.md`
- Modify（可选脚注）: `docs/superpowers/specs/2026-08-07-weigh-settlement-print-design.md` 入口说明指向新规格

- [ ] **Step 1: 更新 PRD**

版本升到 v1.2.0：侧栏入口、弹窗成单、单合同、无合同不可结、去掉台账多选；保留打印与删除规则。

- [ ] **Step 2: 跑测与类型检查**

```bash
cd web && npm test -- src/entities/settlement-doc && npx tsc --noEmit
```

Expected: tests PASS；tsc 无项目源码错误（可忽略损坏的 `.next/types`）

- [ ] **Step 3: 手工验收（对照规格 §9）**

1. 侧栏可见结算单  
2. 新建弹窗：类型 → 合同 → 部分/全选磅单 → 确认进预览可打印  
3. 无合同磅单不出现；不可跨合同  
4. 删除结算单后磅单可再选  
5. 过磅台账无法多选生成  

- [ ] **Step 4: Commit（若用户要求）**

---

## 执行备注

- 提交：仅在用户明确要求 `git commit` 时执行各 Task 的 Commit 步。  
- 打印版式组件 **不改**。  
- Mock seed 若已有无 `contractId` 的结算单：列表显示 `—`；新建必须带锚点。
