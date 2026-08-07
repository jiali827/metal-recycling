# 过磅结算单打印设计：採購單 / 銷售單

| 属性 | 内容 |
| --- | --- |
| 日期 | 2026-08-07 |
| 状态 | 已确认（方案 A） |
| 关联样例 | `宝新金属回收项目资料/需审批的单/`（PO-BX、紙質採購單/銷售單） |
| 实现范围 | 过磅台账多选生成结算单、结算单列表与打印预览（**成单入口已由** `2026-08-07-settlement-create-modal-design.md` **取代：侧栏弹窗新建**） |
| 实现计划 | `docs/superpowers/plans/2026-08-07-weigh-settlement-print.md` |

---

## 1. 目标

过磅人员按客户汇总多张正常磅单，生成纸质风格的 **採購單**（采购方向）或 **銷售單**（销售方向），打印给财务线下签字审批。本期不上应收/应付增强、不线上审批流。

## 2. 非目标

- 应收/应付页改造与结算单强制绑定
- 系统内审批流 / 电子签
- 从结算单自动生成收付款核销
- 合同页打印此类单据
- OCR

## 3. 信息架构

| 入口 | 说明 |
| --- | --- |
| 过磅台账 `/weigh-tickets` | 主入口：筛选 → 多选 → 生成採購單/銷售單 |
| 结算单 `/settlements` | 列表查历史、打开预览/再打印 |

## 4. 数据模型 `SettlementDoc`

| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| no | `PO-BX-yyyyMMddNN` 或 `INV-BX-yyyyMMddNN` |
| kind | `purchase` \| `sale` |
| customerName | 客户名称 |
| docDate | 单据日期 `YYYY-MM-DD` |
| status | `draft` \| `printed` |
| ticketIds | 关联磅单 id |
| lines | 磅单快照行 |
| totalNetKg / totalAmount | 合计 |
| createdAt / updatedAt | 审计 |

**Line**：`ticketId`, `bxNo`, `date`, `plate`, `materialSummary`, `grossKg`, `deductionKg`, `netKg`, `unitPrice`, `amount`

规则：同方向、同客户、仅 `normal`；同一磅单一期不可进多张结算单；单价 = `amount/netKg`（净重为 0 则为 0）。

## 5. 交互与打印

- 过磅台账多选 → 生成 → 打开预览
- HTML 版式 + `window.print`；抬头用 `tenant`
- 打印后状态可标 `printed`

## 6. 验收

同客户多张可生成并打印；混客户/方向/作废拦截；已入单磅单不可再勾；抬头来自基础设置。
