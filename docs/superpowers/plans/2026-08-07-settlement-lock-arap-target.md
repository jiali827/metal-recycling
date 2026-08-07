# 结算单确认锁定与应收/应付目标 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans (or execute tasks sequentially). Steps use checkbox (`- [ ]`) syntax.

**Goal:** 按 `docs/superpowers/specs/2026-08-07-settlement-lock-arap-target-design.md` 落地：结算单确认锁定 → 应收/应付目标 → 往来按结算单核销。

**Architecture:** Mock store 为单一真相源；确认结算时写入 ArAp；收付款按 `settlementDocId` 汇总回写；磅单不再自动生成往来。

**Tech Stack:** Next.js / React / TypeScript / 现有 mock store + i18n

---

### Task 1: 类型与结算状态迁移

- [x] `WeighSettlementStatus` → `pending` | `confirmed`
- [x] `ArApItem` 改挂 `settlementDocId` / `settlementDocNo`（及合同字段）
- [x] `PaymentRecord` 往来增加 `settlementDocId` / `settlementDocNo`
- [x] 全库替换 `draft`/`printed` 结算语义

### Task 2: Seed 与 store 核心突变

- [x] 种子：已确认结算单 + 对应 AR/AP；去掉磅单自动往来逻辑
- [x] `confirmWeighSettlementDoc` / `unconfirmWeighSettlementDoc`
- [x] 更新结算单：已确认禁止改业务字段
- [x] `syncArApFromPayments` 按结算单汇总
- [x] 收付款 CRUD 校验方向与超额

### Task 3: 结算单 UI（确认 / 取消确认 / 锁定编辑）

- [x] 列表状态列、操作按钮
- [x] 已确认不可打开编辑弹窗（或只读）
- [x] i18n 文案

### Task 4: 应收 / 应付页与菜单

- [x] 侧栏恢复可见
- [x] 列表列改为结算单号 / 目标 / 已收付 / 余额
- [x] 详情只读策略；去掉按磅单新建

### Task 5: 收付款往来核销 UI

- [x] 选结算目标；带出只读信息
- [x] 去掉对方/合同/磅单必填
- [x] 列表列调整

### Task 6: 需求文档同步 + 冒烟

- [x] 更新结算单 / 应收 / 应付 / 收付款 / 过磅相关 PRD 要点
- [x] 规格状态改为已确认
- [x] 类型检查 / 关键路径冒烟
