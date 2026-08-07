# 过磅结算单打印实现计划

> **For agentic workers:** 按任务逐步实现；完成后同步需求文档。

**Goal:** 过磅台账多选生成採購單/銷售單，支持预览与打印。

**Architecture:** 新增 `SettlementDoc` Mock 实体；过磅列表多选生成快照；`/settlements` 列表 + 打印预览页。

**Tech Stack:** 现有 Next.js + Mock store + HTML/`window.print`

---

## 文件

| 文件 | 职责 |
| --- | --- |
| `entities/types.ts` | `SettlementDoc` 类型 |
| `entities/settlement/` | 单号、从磅单构建、校验 |
| `data/mock/store.tsx` + seed | CRUD |
| `app/(app)/weigh-tickets/page.tsx` | 多选 + 生成 |
| `app/(app)/settlements/` | 列表 + 打印预览 |
| `features/settlements/` | 打印版式组件 |
| i18n 三语 + menu/permissions | 文案与菜单 |

---

## Tasks

- [ ] Task 1: 类型 + 生成/校验纯函数
- [ ] Task 2: Store + seed（可空列表）
- [ ] Task 3: 打印版式组件 + `/settlements/[id]` 预览
- [ ] Task 4: `/settlements` 列表 + 菜单权限
- [ ] Task 5: 过磅台账多选生成
- [ ] Task 6: i18n + `需求文档` 简短说明
