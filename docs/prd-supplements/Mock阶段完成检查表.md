# Mock 阶段完成检查表（四 / 五 / 六）

| 项目 | 说明 |
|------|------|
| 日期 | 2026-08-06 |
| 关联计划 | [2026-08-06-mock-phase-optimization.md](../superpowers/plans/2026-08-06-mock-phase-optimization.md) |

## 已完成

- [x] 业务规则总表（状态机 / 计算 / 联动 / 权限 / 口径；含 §11 子代理补强裁定）
- [x] 数据交互与接口需求（入参出参副作用错误码；作废/冲销/BX 手录等）
- [x] 菜单权限过滤启用 + 多角色并集
- [x] 登录落地到首个有权限路由
- [x] 无权限路由 Guard；零菜单权限登出防死循环
- [x] 列表新建/删除按钮按权限显隐
- [x] 列表页详情弹窗 `readOnly={!canEdit}`
- [x] 项目全景 `ContractTracePanel` 详情 Tab 全只读（无新建/编辑/删除；查看弹窗固定 `readOnly`）
- [x] 员工详情只读时隐藏并拦截「重置密码」
- [x] 客户分类编辑 `readOnly` + 控件禁用
- [x] 角色权限矩阵 `disabled={readOnly}`；基础设置表单 `fieldset disabled`
- [x] 未登记邮箱不可再冒充 admin（仅 `demo@baoxin.hk` 特殊入口）
- [x] Repository 接口骨架对齐 purchase/sale 分拆 + README 标明未接线
- [x] 核心纯规则 vitest（settlement / netKg / mergeAccess）
- [x] 清理 public 脚手架 SVG 与根目录重复 preview

## 已知延后 / 残余缺口

- [ ] 部分大详情表单（合同/磅单/收付等）仍以藏保存 + submit 拦截为主，未逐控件 `disabled`（fieldset 未全覆盖）
- [ ] HTTP `data/client` 真实实现
- [ ] 全量页面改为只走 Repository（Provider 注入）
- [ ] 服务端分页 / 真实附件上传
- [ ] 磅单「删除」全面改为作废流程
- [ ] 大弹窗文件拆分（ContractModals 等）
- [ ] 运营端 `ops/` 应用

## 验证命令

```bash
cd web
npm test
npm run build
```

## 权限手测建议

| 账号 | 期望 |
|------|------|
| demo@baoxin.hk | 全模块（admin） |
| contract@baoxin.hk | 合同+主数据只读；无首页；全景不可新建磅单/收付 |
| weigh@baoxin.hk | 过磅+主数据只读 |
| finance@baoxin.hk | 首页/收付款/设置；全景不可改合同 |
| boss@baoxin.hk | 多模块只读；详情不可保存；不可重置密码；全景无新建删除 |
| 任意未登记邮箱 | 登录失败（不可冒充 admin） |
