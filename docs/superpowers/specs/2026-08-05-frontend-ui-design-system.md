# 金属回收管理系统 · 前端 UI 设计规范

**日期：** 2026-08-05（基于当前 `web/` 实现提炼）  
**状态：** 与代码同步（活文档）  
**代码源：** [`web/src/app/globals.css`](../../../web/src/app/globals.css)、[`web/src/lib/theme.ts`](../../../web/src/lib/theme.ts)、[`web/src/components/ui/`](../../../web/src/components/ui/)  
**产品规格：** [业务设计规格](./2026-08-05-metal-recycling-saas-design.md)

---

## 1. 设计定位

| 维度 | 约定 |
|------|------|
| 产品类型 | B2B 后台 / 作业系统（过磅、合同、往来、资金） |
| 视觉风格 | Soft UI：浅灰画布、白卡片、轻阴影、靛紫品牌强调 |
| 信息密度 | 数据密度优先；列表紧凑、字号清晰，便于扫表 |
| 默认品牌色 | Indigo `#6366F1`（**非**衍界紫 `#6828F3`） |
| 语言 | 繁体中文 / 简体中文 / English 三语切换；磅单关键字段可带英文副标 |
| 字体 | Noto Sans TC（Google Fonts），回退 PingFang TC / Microsoft JhengHei |

**刻意避免：** 紫渐变营销风、奶油衬线杂志风、深色模式默认、多层重阴影、全圆角胶囊堆叠、emoji 装饰。

---

## 2. 设计 Token

所有颜色与尺寸以 CSS 变量定义于 `:root`，经 Tailwind `@theme inline` 映射为工具类（如 `bg-brand`、`text-muted`、`rounded-[var(--radius-card)]` 等）。

### 2.1 画布与文本

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--background` | `#f4f6f9` | 页面画布 |
| `--foreground` | `#0f172a` | 主文字 |
| `--card` | `#ffffff` | 卡片 / 侧栏 / 浮层底 |
| `--muted` | `#64748b` | 次要文字、标签、侧栏默认 |
| `--border` | `#e2e8f0` | 默认描边 |
| `--border-strong` | `#cbd5e1` | 控件 hover 描边 |
| `--chip` | `#f1f5f9` | 表头底、只读底、次按钮 hover |

### 2.2 品牌与语义色

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--primary` / `--brand` / `--accent` | `#6366f1` | 主按钮、焦点、选中、链接强调 |
| `--primary-hover` | `#4f46e5` | 主按钮 hover |
| `--brand-soft` | `#eef2ff` | 侧栏激活底、软强调底 |
| `--accent-hot` | `#f97316` | 热点 Tag（实心橙） |
| `--success` | `#059669` | 成功 / 收款等 |
| `--warning` | `#d97706` | 警告 |
| `--danger` | `#dc2626` | 危险 / 删除 / 错误 |
| `--info` | `#4f46e5` | 信息态（与品牌同系） |

主题色切换会同步改写：`--primary`、`--primary-hover`、`--brand`、`--brand-soft`、`--accent`、`--info`、`--sidebar-active`、`--focus-border`、`--focus-ring`、`--option-selected-bg`、`--tag-info-*`。

### 2.3 侧栏

| Token | 默认值 |
|-------|--------|
| `--sidebar` | `#ffffff` |
| `--sidebar-text` | `#64748b` |
| `--sidebar-active` | `#eef2ff`（随主题联动） |

### 2.4 圆角与阴影

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-card` | `12px` | 卡片、浮层面板、弹窗 |
| `--radius-control` | `8px` | 按钮、输入框、Select 触发器 |
| `--radius-pill` | `999px` | Tag / 状态徽章 |
| `--shadow-card` | `0 4px 16px rgb(15 23 42 / 0.05)` | 页面卡片 |
| `--shadow-panel` | `0 8px 24px …, 0 2px 6px …` | 下拉 / 菜单浮层 |

### 2.5 控件尺寸与焦点

| Token | 值 | 用途 |
|-------|-----|------|
| `--control-height-sm` | `36px`（2.25rem） | FilterBar、小尺寸控件 |
| `--control-height-md` | `40px`（2.5rem） | 表单默认 |
| `--focus-border` | 品牌色 | 聚焦描边 |
| `--focus-ring` | `0 0 0 3px` 品牌 18% 透明 | 焦点环 |
| `--option-hover-bg` | `#f1f5f9` | 选项 hover |
| `--option-selected-bg` | `#eef2ff` | 选项选中（随主题） |

### 2.6 Tag 色板

每种 tone 含 `bg` / `ink` / `border`：

| Tone | 语义 |
|------|------|
| `default` | 中性 |
| `success` | 成功、在职、收款 |
| `warning` | 警告、付款方向等 |
| `danger` | 危险、作废、停用 |
| `info` | 信息、角色标签（随主题） |
| `accent` | 橙色强调 |
| `muted` | 弱化 |
| `hot` | 实心橙白字（特殊强调） |

---

## 3. 主题色

- **存储键：** `bx-theme-color`（localStorage）
- **默认：** `#6366f1`
- **入口：** 侧栏 Logo 旁色板按钮（`ThemeColorPicker`）
- **预设：** 靛紫 / 蓝 / 青绿 / 绿 / 橙 / 玫红 / 紫罗兰 / 石板灰；支持自定义 hex
- **防闪：** `layout.tsx` 注入 `THEME_BOOT_SCRIPT`，在 React hydrate 前写入 CSS 变量

实现：[`web/src/lib/theme.ts`](../../../web/src/lib/theme.ts)、[`web/src/lib/theme-provider.tsx`](../../../web/src/lib/theme-provider.tsx)

---

## 4. 布局与信息架构

### 4.1 应用壳

```text
┌──────────┬─────────────────────────────┐
│ Sidebar  │  main (overflow-y-auto)     │
│ 240px    │  padding 24px (p-6)         │
│ 白底+右边│                             │
│ 框       │  PageHeader + 内容区        │
│          │                             │
│ 底部用户 │                             │
│ 菜单     │                             │
└──────────┴─────────────────────────────┘
```

- 全高：`h-dvh`，侧栏固定，主区滚动
- 未登录：居中「加载中」后跳转 `/login`
- 图标库：`@phosphor-icons/react`（regular / fill 按激活态）

### 4.2 侧栏菜单分组

| 分组 | 模块 |
|------|------|
| 业务 | 首页总览、项目全景、合同管理、过磅台账、应收账、应付账、收付款 |
| 主数据 | 客户、货类 |
| 系统 | 员工、角色权限、基础设置 |

侧栏头：BX 方标 + 产品名 + 租户名 + 主题色选择器。  
底部：用户头像首字、姓名、邮箱；弹出语言切换 / 修改资料 / 修改密码 / 退出。

### 4.3 列表页标准结构

1. `PageHeader`（标题或面包屑 + 右侧主操作）
2. 可选 `FilterBar`（关键词、类型、状态、日期等）
3. `DataTable`（默认分页 10 条，行点击进详情弹窗）
4. 实体 `*CreateModal` / `*DetailModal`（懒加载）

### 4.4 登录 / 注册

独立全屏页（无侧栏），品牌与表单居中；演示提示与租户标签走 i18n。

---

## 5. 组件规范

### 5.1 组件目录

| 路径 | 内容 |
|------|------|
| `components/ui/` | 页面级：PageHeader、DataTable、FilterBar、Modal、ConfirmDialog、StatCard、StatusBadge、PageSkeleton、CrudUi |
| `components/ui/forms/` | Select、DatePicker、Checkbox、Radio、Switch、Tag、FormField |
| `components/layout/` | AppShell、Sidebar、ThemeColorPicker、RoutePrefetch |
| `components/entity/` | 各业务创建/详情弹窗 |

### 5.2 按钮（CSS class）

| Class | 规格 |
|-------|------|
| `.ui-btn-primary` | 高 36px（`--control-height-sm`），圆角 8，品牌底白字；与 secondary/danger **同高同边框盒**；hover 加深；active `scale(0.98)` |
| `.ui-btn-secondary` | 同高 36px，白底边框，muted 字；hover chip 底 |
| `.ui-btn-danger` | 同高 36px，危险红底白字；确认删除等 |

统一字号 `0.875rem`、字重 medium（主/危险）。

### 5.3 表单

- **标签：** `.ui-form-label` — 14px / medium / muted；必填星号危险色
- **提示 / 错误：** 12px；错误用 `--danger`
- **输入：** `.ui-input` — 高 40（表单）/ 36（`is-sm`）；白底、1px 边框、圆角 8
- **状态：** hover 加深边框；focus 品牌边+环；disabled/readonly chip 底；`is-error` / `is-warning`
- **触发器：** `.ui-control-trigger` — Select / DatePicker 共用外观，与 input 对齐
- **浮层：** `.ui-panel` + `.ui-panel-option`（hover / selected）

**本阶段范围：** 单选 Select（无搜索/多选）、完整 DatePicker（无 TimePicker）、Checkbox / Radio / Switch、Tag。Toast 未做。

### 5.4 Checkbox / Radio / Switch

| 控件 | 规格 |
|------|------|
| Checkbox | 16×16，圆角 4；勾选品牌底 + 白勾 |
| Radio | 圆形、2px 边；选中 3px 品牌环、白心 |
| Switch | 轨道 40×22；开品牌、关 slate；拇指白圆阴影 |

### 5.5 Tag / StatusBadge

- 视觉统一为 `.ui-tag`（pill）
- `StatusBadge` 为业务封装，tone 映射到 Tag tone
- 字号 12px、medium；可选圆点 `.ui-tag-dot`

### 5.6 DataTable

- 外层 `.ui-card`（可 `embedded` 去边框阴影）
- 表头：`bg-chip`、12px semibold muted、`px-4 py-3`
- 行：14px；hover 可选；空态居中 muted
- 分页：底部条，显示总数与区间；上一页/下一页

### 5.7 Modal

- 尺寸：`md` max-w-lg / `lg` max-w-2xl / `xl` max-w-3xl
- 结构：标题栏 + 可滚动正文 + 可选 footer（取消次按钮 + 保存主按钮）
- 分隔：标题区与正文、正文与按钮区**不使用分隔线**；按钮区**不使用独立背景色**（与卡片同色）
- 行为：Esc 关闭、焦点陷阱、打开锁 body 滚动、关闭还原焦点
- 动效：backdrop fade-in 0.15s；卡片 scale-in 0.18s（尊重 `prefers-reduced-motion`）

### 5.8 ConfirmDialog

- 全局 `ConfirmProvider`
- 危险确认用 `.ui-btn-danger`
- 删除文案走 i18n `common.deleteConfirm`

### 5.9 PageHeader / StatCard / FilterBar

- **PageHeader：** 标题 `text-xl font-semibold`，或面包屑 `/` 分隔；右侧 `actions`
- **StatCard：** 指标卡，可选涨跌百分比（绿升红降）
- **FilterBar：** 横向筛选项；控件统一 `is-sm` 高度

### 5.10 DatePicker

- 面板宽 280px；星期行 + 日格子
- 今日：品牌色加粗；选中：品牌底白字
- 导航按钮 28px 圆角 6

---

## 6. 文案与国际化

| 项 | 约定 |
|----|------|
| 存储键 | `bx-locale`（见 `LOCALE_STORAGE_KEY`） |
| 语言 | `zh-Hant`（默认）/ `zh-Hans` / `en` |
| 调用 | `useI18n().t("namespace.key")` |
| 文案目录 | `web/src/lib/i18n/messages/{zh-Hant,zh-Hans,en}.ts` |
| 类型 | `MessageDict` 强制三语键齐全 |

**规则：**

1. 界面铬（按钮、标题、表头、校验、空态、占位）必须走 i18n，禁止硬编码繁体。
2. 内置角色名 / 权限摘要用 `localizeRoleName` / `localizeRolePermissions` 显示。
3. 收付方式存值可与繁体种子一致（如「現金」），**展示标签**必须用 `form.method*`。
4. Mock 业务主数据（公司法定名、客户名、人员名）可保留原文；不视为 UI 文案缺陷。

---

## 7. 动效

| 场景 | 规范 |
|------|------|
| 主/危险按钮 active | `scale(0.98)` |
| 边框 / 背景过渡 | 约 `0.15s ease` |
| Select 箭头 | 展开旋转 180° |
| Modal | fade + scale（见 §5.7） |
| 主题切换 | 即时改 CSS 变量，无整页闪白（boot script） |

不引入大面积装饰动画；减少动效用媒体查询关闭。

---

## 8. 无障碍与交互底线

- 可聚焦控件具备可见 focus ring（`--focus-ring`）
- Modal：Esc、焦点陷阱、恢复焦点
- 图标按钮提供 `aria-label` / `title`（主题色、关闭等）
- 表单错误态同时改边框与辅助文字色，不只依赖颜色

---

## 9. 实现约定（给开发）

1. **优先用已有 class / 组件**，勿再引入原生 `<select>` / `type="date"` 做业务表单。
2. **改品牌色只走主题系统**，勿在业务组件写死 `#6366f1`（除默认常量）。
3. **新文案三语同步**，先改 `types.ts` 再填三个 messages 文件。
4. **列表 + 弹窗** 为当前 CRUD 主路径；独立 `/new`、`/[id]` 路由多为兼容占位。
5. **源文件真相：** Token 与组件样式以 `globals.css` 为准；本文档为规范摘要，冲突时以代码为准并回写本文档。

---

## 10. 版本记录

| 日期 | 变更 |
|------|------|
| 2026-08-05 | 初版：从 Soft UI tokens、表单控件、主题色、三语、AppShell 现状提炼 |
