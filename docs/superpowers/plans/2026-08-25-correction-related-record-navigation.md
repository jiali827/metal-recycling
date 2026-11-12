# 纠错关联记录导航 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在纠错删除弹窗中跳转到四类关联业务记录的已筛选列表，保留目标页原有操作。

**Architecture:** 在 `features/correction` 中添加纯深链映射函数；弹窗调用它决定哪些影响动作可点击并生成目标 URL。四个列表页读取对应查询参数，将它们作为独立编号筛选条件初始化，不改变既有的本地筛选及操作入口。

**Tech Stack:** Next.js App Router、React 19、TypeScript、Vitest、Tailwind CSS。

---

### Task 1: 建立纠错动作深链映射

**Files:**
- Create: `web/src/features/correction/related-record-link.ts`
- Create: `web/src/features/correction/related-record-link.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { correctionRelatedRecordLink } from "./related-record-link";

describe("correction related record links", () => {
  test("maps each supported action to its filtered list route", () => {
    expect(correctionRelatedRecordLink({ action: "void_ticket", objectType: "weigh-ticket", objectId: "wt-1", label: "BX1001", previousStatus: "normal", nextStatus: "void" })).toEqual({ href: "/weigh-tickets?bxNo=1001", label: "BX1001" });
    expect(correctionRelatedRecordLink({ action: "revoke_contract", objectType: "sale-contract", objectId: "sc-1", label: "S-1", previousStatus: "active", nextStatus: "void" })).toEqual({ href: "/contracts?tab=sale&contractNo=S-1", label: "S-1" });
    expect(correctionRelatedRecordLink({ action: "revoke_settlement", objectType: "settlement-doc", objectId: "ws-1", label: "JS-1", previousStatus: "confirmed", nextStatus: "void" })).toEqual({ href: "/settlement-docs?docNo=JS-1", label: "JS-1" });
    expect(correctionRelatedRecordLink({ action: "reverse_payment", objectType: "payment", objectId: "p-1", label: "SK-1", previousStatus: "active", nextStatus: "reversed" })).toEqual({ href: "/payments?paymentNo=SK-1", label: "SK-1" });
  });

  test("does not create links for receivables or payables", () => {
    expect(correctionRelatedRecordLink({ action: "void_arap", objectType: "receivable", objectId: "ar-1", label: "JS-1", previousStatus: "open", nextStatus: "void" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm test -- src/features/correction/related-record-link.test.ts`

Expected: FAIL because `related-record-link.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { CorrectionAction } from "@/entities/correction/reverse";

export function correctionRelatedRecordLink(action: CorrectionAction) {
  if (action.action === "void_ticket") {
    return { href: `/weigh-tickets?bxNo=${encodeURIComponent(action.label.replace(/^BX/i, ""))}`, label: action.label };
  }
  if (action.action === "revoke_contract") {
    const tab = action.objectType === "purchase-contract" ? "purchase" : "sale";
    return { href: `/contracts?tab=${tab}&contractNo=${encodeURIComponent(action.label)}`, label: action.label };
  }
  if (action.action === "revoke_settlement") return { href: `/settlement-docs?docNo=${encodeURIComponent(action.label)}`, label: action.label };
  if (action.action === "reverse_payment") return { href: `/payments?paymentNo=${encodeURIComponent(action.label)}`, label: action.label };
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm test -- src/features/correction/related-record-link.test.ts`

Expected: PASS with 2 tests.

### Task 2: 将纠错弹窗关联记录接入深链

**Files:**
- Modify: `web/src/features/correction/components/CorrectionDeleteModal.tsx`

- [ ] **Step 1: Render only supported rows as full-width controls**

Import `useRouter`, `CaretRight` and `correctionRelatedRecordLink`. Derive `relatedRecords` from `impact.actions`, filter `null`, then replace the existing action list with a button per record. The button calls `router.push(record.href)` and `close()`, has `w-full`, a hover state, and a right-aligned `<CaretRight size={16} />`; retain the action description beside the label.

- [ ] **Step 2: Preserve empty state and non-clickable AR/AP behavior**

Use `relatedRecords.length` for the empty state. Do not render `void_arap` or `restore_arap` in this list; the existing impact summary remains unchanged.

### Task 3: Hydrate target-list number filters from URLs

**Files:**
- Modify: `web/src/app/(app)/weigh-tickets/page.tsx`
- Modify: `web/src/app/(app)/contracts/page.tsx`
- Modify: `web/src/app/(app)/settlement-docs/page.tsx`
- Modify: `web/src/app/(app)/payments/page.tsx`

- [ ] **Step 1: Add per-page query parameter readers**

Import `useSearchParams` in each client page. Initialize `bxNo`, `contractNo`, `docNo` and `paymentNo` filter state from `searchParams.get(...) ?? ""`. In contracts, initialize `tab` from `searchParams.get("tab")` only when it is `purchase` or `sale`, falling back to the current local-storage default.

- [ ] **Step 2: Make each route parameter an explicit list filter**

Compare the values against their canonical fields: `String(row.bxNo)`, contract `row.no`, settlement `row.no`, and `row.paymentNo`. Preserve all existing filter conditions and controls. Add a compact visible filter input for bx number and payment number where a specific field does not already exist.

- [ ] **Step 3: Retain current business actions**

Do not change row-action permission checks, correction modal invocation, or detail navigation. A filtered record must still expose its existing void/revoke/reverse path according to its status and permission.

### Task 4: Verify the feature

**Files:**
- Test: `web/src/features/correction/related-record-link.test.ts`

- [ ] **Step 1: Run focused regression tests**

Run: `cd web && npm test -- src/features/correction/related-record-link.test.ts src/entities/correction/reverse.test.ts`

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run: `cd web && npm run lint && npm run build`

Expected: both commands exit 0.

- [ ] **Step 3: Inspect the diff**

Run: `git diff -- web/src/features/correction web/src/app/'(app)'/weigh-tickets/page.tsx web/src/app/'(app)'/contracts/page.tsx web/src/app/'(app)'/settlement-docs/page.tsx web/src/app/'(app)'/payments/page.tsx`

Expected: only the confirmed deep-link UI and list-filter changes are present; no changes to unrelated user work.
