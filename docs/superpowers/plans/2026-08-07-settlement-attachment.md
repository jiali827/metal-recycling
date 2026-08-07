# 结算单签字附件 Implementation Plan

> **For agentic workers:** 按任务顺序实现；步骤用 checkbox 跟踪。

**Goal:** 结算单列表增加「附件」列，支持上传/下载/替换/删除签字备份（单文件、不预览）。

**Architecture:** 复用合同字段 `attachmentName` + `attachmentDataUrl`；列表列内隐藏 file input + Data URL 写入 Mock store。

**Tech Stack:** Next.js、Phosphor icons、现有 ConfirmDialog / i18n

---

### Task 1: 类型 + i18n

- [ ] `WeighSettlementDoc` 增加可选附件字段
- [ ] 结算单相关文案（附件、上传、下载、替换、删除、超限）

### Task 2: 附件列组件

- [ ] `SettlementAttachmentCell.tsx`：上传/下载/替换/删除，stopPropagation，10MB 限制

### Task 3: 列表接入 + 规格状态

- [ ] `settlement-docs/page.tsx` 插入附件列
- [ ] 规格文档状态改为已确认
- [ ] 同步 `需求文档/结算单.md` 一小段
