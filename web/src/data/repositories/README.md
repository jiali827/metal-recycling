# data/repositories

统一数据访问边界骨架，便于日后把 Mock 换成 HTTP，而不改页面交互。

## 现状（请仔细读）

- `types.ts`：Repository 接口（**采购/销售合同已分拆**，对齐 `MockStore`）
- `mock.ts`：`createMockRepositories(store)` 适配器
- **页面仍直接 `useMockStore()`**，尚未 Provider 注入 Repository
- 本层是「可接线」骨架，不是已切换完成的数据层；接后端前不要半替换页面调用

## 切换到 API 时

1. 实现 `createHttpRepositories(apiClient)`（放在 `data/repositories/http.ts`）
2. 在 Provider 注入 `AppRepositories`
3. features 只依赖接口，不依赖 MockStore 细节

参见：`docs/prd-supplements/数据交互与接口需求.md`
