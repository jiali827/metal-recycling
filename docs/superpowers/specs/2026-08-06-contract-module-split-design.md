# 合同管理拆分设计：采购合同 / 销售合同

| 属性 | 内容 |
| --- | --- |
| 日期 | 2026-08-06 |
| 状态 | 已确认（方案 A） |
| 关联 PRD | `需求文档/合同管理.md`（改造后需同步） |
| 实现范围 | `web/` 合同列表/弹窗、类型、Mock、过磅关联（销售按行） |
| 样例依据 | `宝新金属回收项目资料/采购合同/`、`销售合同/` |

---

## 1. 背景与目标

### 1.1 背景

真实单据中：

- **采购侧**多为己方统一版式的报价单（`Q-YK-*` Quotation），字段稳定：客户、货类、单价、计价方式、有效期；常无表内约量、无总价（Rate only）。
- **销售侧**由客户出具，版式异构（英文 Sales Contract、中英对照、客户「採購合同」等），共性为：编号、买方、货类、约量±容差、单价/总价、付款与履约时限；细则（质量罚则等）差异大。

当前系统用单一 `Contract` +「约重 + 单价摘要」抹平两边差异，无法支撑销售按行履约，也强迫采购走约重进度。

### 1.2 目标

1. 合同管理拆成 **采购合同** 与 **销售合同** 两套模型与表单（字段完全分开）。
2. 采购：价格/货类约定，**不算约重履约**。
3. 销售：多行明细 + **按行累计已履约**；过磅 **可选** 关联到合同行。
4. 导航保持一个菜单入口，页内 Tab 切换。

### 1.3 非目标（一期）

- OCR 自动识别填表
- 质量/杂质/尺寸罚则规则引擎
- 定金/分期与收付款自动核销（付款条件仅文本摘要）
- 采购合同强制或结构化绑定过磅
- 将采购菜单改名为「报价」（对外统一称「采购合同」）

---

## 2. 信息架构

| 项 | 约定 |
| --- | --- |
| 菜单 | 单一「合同管理」→ `/contracts` |
| 页内 Tab | **采购合同** \| **销售合同**；记住上次停留 Tab（如 `localStorage`） |
| 新建 | 位于当前 Tab，直接打开对应新建表单，**不再**先选采购/销售类型 |
| 列表 | 两套列定义与筛选；分页/空态/删除确认可复用公共壳 |
| 详情/编辑 | 两套弹窗（或同壳不同表单分区），禁止混用字段 |

路由 `/contracts/new`、`/contracts/[id]` 若保留，按实体类型重定向到列表 + 打开对应弹窗；不单独做两套完整页路由（一期延续弹窗模式）。

---

## 3. 架构：方案 A（两套实体）

```
ContractManagementPage
├── Tab: Purchase
│   ├── PurchaseContractList
│   ├── PurchaseContractCreateModal
│   └── PurchaseContractDetailModal
└── Tab: Sale
    ├── SaleContractList
    ├── SaleContractCreateModal
    └── SaleContractDetailModal

WeighTicket (销售可选)
└── saleContractId? + saleContractLineId?
    → 累计到 SaleContractLine.fulfilledQty
```

- **Mock/API**：可同资源前缀、不同 DTO；前端类型禁止再用共用的「约重 + 单价摘要」作为唯一价格载体。
- **废止**：单一 `Contract.type` 决定同一套表单字段的模式。
- **兼容**：历史仅有 `contractNo` 字符串的磅单，销售侧可先只展示、不强制回填行；新关联必须选到行。

---

## 4. 数据模型

### 4.1 采购合同 `PurchaseContract`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 系统 | 主键 |
| no | string | 是 | 业务编号（如 `Q-YK-2026-002`） |
| customerId / customerName | string | 是 | 对方客户 |
| contactName | string? | 否 | 联系人（Attention） |
| project | string? | 否 | 项目（如「廢料回收」） |
| status | enum | 是 | 见 §5.1 |
| quotedOn | string | 是 | 报价/签订日期 YYYY-MM-DD |
| validUntil | string? | 否 | 有效期至 |
| currency | string | 是 | 默认 `HKD` |
| lines | PurchaseContractLine[] | ≥1 | 明细 |
| remarks | string? | 否 | 条款备注 |
| attachmentName / attachmentDataUrl | string? | 否 | 扫描件（演示） |
| createdAt / updatedAt | string | 系统 | 审计 |

**`PurchaseContractLine`**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 系统 | 行主键 |
| materialTypeId | string? | 否 | 关联货类主数据；可空则用名称 |
| materialName | string | 是 | 展示名（如「工字鋼」「ELS/工字」） |
| priceMode | enum | 是 | `ex_yard` 到场价 \| `collect` 派车价 \| `other` 其他 |
| unitPrice | number | 是 | 单价 |
| lineRemark | string? | 否 | 行备注 |

**明确不包含**：`plannedKg`、`fulfilledKg`、合同总价强制字段。

### 4.2 销售合同 `SaleContract`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 系统 | 主键 |
| no | string | 是 | 业务编号 |
| customerId / customerName | string | 是 | 买方客户 |
| status | enum | 是 | 见 §5.2 |
| signedOn | string | 是 | 签订日期 YYYY-MM-DD |
| paymentTerms | string? | 否 | 付款条件摘要 |
| fulfillBy | string? | 否 | 履约/装运截止日 |
| tolerancePercent | number? | 否 | 容差 %，建议默认 `10`；空=不提示容差 |
| currency | string | 是 | 默认 `HKD` |
| totalAmount | number? | 否 | 合同总价；可手填或由明细汇总 |
| priceTerms | string? | 否 | 价格条款（如 Ex Yard） |
| origin | string? | 否 | 装运地/产地 |
| destination | string? | 否 | 目的地 |
| packingSummary | string? | 否 | 包装摘要 |
| bankAccountSummary | string? | 否 | 收款账户摘要（一期文本即可） |
| lines | SaleContractLine[] | ≥1 | 明细 |
| remarks | string? | 否 | 长条款/罚则等放备注 |
| attachmentName / attachmentDataUrl | string? | 否 | 扫描件 |
| createdAt / updatedAt | string | 系统 | 审计 |

**`SaleContractLine`**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 系统 | 行主键 |
| materialTypeId | string? | 否 | 关联货类主数据 |
| materialName | string | 是 | 品名 |
| plannedQty | number | 是 | 约量 |
| qtyUnit | enum | 是 | 一期建议统一内部用 `kg` 存储；UI 可按吨录入（×1000） |
| unitPrice | number | 是 | 单价（相对 qtyUnit 或相对「每吨」需在实现计划中固定一种口径） |
| lineAmount | number? | 否 | 行金额，可算 |
| fulfilledQty | number | 系统 | 已履约量，只读，由关联磅单累计；初始 0 |
| lineRemark | string? | 否 | 行备注 |

**单位口径（一期固定）**：

- 存储：`plannedQty` / `fulfilledQty` 均为 **KG**。
- 录入：销售约量 UI 可用「吨」，保存时 ×1000；列表可按吨展示。
- 单价：与样例一致按 **每吨** 展示与录入；行金额 ≈ `(plannedQty/1000) * unitPrice`。

### 4.3 过磅 `WeighTicket` 扩展（销售）

| 字段 | 说明 |
| --- | --- |
| saleContractId? | 可选，关联销售合同 |
| saleContractLineId? | 可选；若填合同则一期 **要求** 同时选行（新数据） |
| contractNo | 保留作兼容/展示冗余；新保存时可由合同 `no` 回填 |

采购：**不**新增采购合同外键；不要求绑定。过磅仍可把采购合同编号填入既有 `contractNo` 文本字段（弱关联/检索用），无行级外键、不累计履约。

### 4.4 删除与改行约束（销售）

| 场景 | 规则 |
| --- | --- |
| 删除销售合同 | 若存在关联该合同的磅单：一期 **禁止删除**（或先提示解除关联）；无关联则可删 |
| 删除明细行 | 若存在 `saleContractLineId` 指向该行的磅单：**禁止删行**；需先改磅单关联或仅允许停用（一期不做软删则直接禁止） |
| 修改行约量/货类 | 允许；已履约只读不变；改约量后进度与提示按新约量重算 |
| 编辑/删除磅单 | 按该票净重对原行做差额回滚或全量按关联重算 `fulfilledQty`（实现计划二选一写死，推荐全量重算） |

---

## 5. 状态机

### 5.1 采购合同

`draft` 草稿 → `active` 有效 → `expired` 已过期 \| `closed` 已关闭

- 流转以手工为主。
- `validUntil` 早于今天时，列表可视觉提示「已过期」；是否自动把状态改为 `expired` 一期 **不强制**（可仅提示）。

### 5.2 销售合同

`draft` 草稿 → `active` 生效 → `fulfilling` 履约中 → `completed` 已完成 \| `closed` 已关闭

- 可选规则：从「生效」起，出现首笔关联到任一行的正常磅单时 → 自动改为 `fulfilling`。
- `completed`：**手工**为主；当各行均满足「可完成」条件时 **提示** 可完成，不自动关单。
  - **可完成（有容差 t%）**：该行 `fulfilledQty ≥ plannedQty × (1 − t/100)`（达到下沿即提示，不要求进入整段容差带）。
  - **可完成（无容差）**：该行 `fulfilledQty ≥ plannedQty`。
- 超约量：当 `fulfilledQty > plannedQty × (1 + t/100)`（无容差则 `> plannedQty`）时保存磅单 **提示**，不阻断。

---

## 6. 页面与交互规格

### 6.1 采购 Tab · 列表

| 列 | 说明 |
| --- | --- |
| 编号 | 加粗 |
| 对方 | 客户名 |
| 货类摘要 | 由明细拼接，如「工字鋼；ELS」 |
| 单价摘要 | 由明细拼接，如「到场 $2,050」 |
| 有效期 | validUntil，可空 |
| 状态 | 徽章 |
| 日期 | quotedOn |
| 附件 | 有/无或文件名 |
| 操作 | 详情、删除 |

筛选：关键词（编号/客户/货类/单价摘要）、状态。

### 6.2 销售 Tab · 列表

| 列 | 说明 |
| --- | --- |
| 编号 | 加粗 |
| 对方 | 买方 |
| 货类摘要 | 明细拼接 |
| 约量 | 合计 plannedQty（展示吨或 KG，与全站一致） |
| 已履约 | 合计 fulfilledQty |
| 进度 | 合计已履约/合计约量 % |
| 总价 | totalAmount 或明细汇总 |
| 截止日 | fulfillBy |
| 状态 | 徽章 |
| 日期 | signedOn |
| 操作 | 详情、删除 |

筛选：关键词、状态。

### 6.3 表单

- **采购新建/详情**：头信息 + 可增删明细行 + 备注 + 附件；无约重/已履约控件。
- **销售新建/详情**：头信息 + 可增删明细行（约量、单价、只读已履约）+ 可选物流/账户字段 + 备注 + 附件。
- 明细至少一行；删除至 0 行时禁止保存。

### 6.4 过磅侧（销售）

- 可选「关联销售合同」：先选合同（建议仅 `active` / `fulfilling`），再选明细行。
- 保存后按该票 `netKg` 计入对应行 `fulfilledQty`（编辑/删除磅单时需重算或差额调整——实现计划中写清）。
- 未关联：行为与现网一致，不影响合同进度。

---

## 7. 履约计算规则（销售）

1. 仅统计关联了 `saleContractLineId` 且磅单状态为正常（与现网「正常」态一致）的净重。
2. 行进度 = `fulfilledQty / plannedQty`；合同进度 = `Σfulfilled / Σplanned`。
3. 容差：下沿用于「可完成」提示，上沿用于「超约量」提示（口径见 §5.2）；`tolerancePercent` 为空则上下沿均退化为 `plannedQty`。
4. 采购合同不参与上述计算。

---

## 8. 与现有产物关系

| 产物 | 动作 |
| --- | --- |
| `web/src/entities/types.ts` 中 `Contract` | 拆为 `PurchaseContract` / `SaleContract`（或等价命名）及各自 Line |
| `ContractModals` / contracts 页 | 按 Tab 拆分或分支为两套表单 |
| Mock 数据 | 分别提供采购/销售样例；销售含多行 |
| `需求文档/合同管理.md` | 实现前后同步为 v2 结构（采购/销售分章） |
| 一期总 PRD 合同章节 | 实现时对照更新差异说明 |

---

## 9. 验收要点（设计层）

1. 合同管理仅一菜单；Tab 可切换采购/销售，新建不二次选类型。
2. 采购表单无约重/已履约；可维护多行单价与计价方式、有效期、附件。
3. 销售表单可维护多行约量与单价；详情只读展示行已履约与合同进度。
4. 过磅可选关联到销售合同行；关联后行与合同合计已履约变化正确；超约量仅提示。
5. 采购过磅无强制合同行绑定。
6. 长条款/罚则仅备注或附件，无规则引擎。

---

## 10. 已确认产品决策摘要

| 决策 | 结论 |
| --- | --- |
| 入口 | 单菜单 + 采购/销售 Tab |
| 命名 | 对外「采购合同」（即便样例为 Quotation） |
| 实现结构 | 方案 A：两套实体 |
| 采购履约 | 不算约重履约；过磅不强制绑 |
| 销售履约 | 中等：有约量与已履约；过磅可选关联 |
| 明细 | 采购与销售均支持多行 |
| 履约粒度 | 销售按明细行累计 |
| 定金/分期核销 | 一期不做 |
| OCR / 罚则引擎 | 一期不做 |
