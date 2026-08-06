# 金屬回收管理系統 · 前端（一期首批）

Next.js App Router + TypeScript + Tailwind，Mock 數據驅動的業務殼：登入/註冊後展示**全部模塊**列表與首頁總覽。角色菜單過濾後續由管理員配置，本期不做。

## 啟動

```bash
cd web
npm install
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000) → 進入**登入頁**。

## 登入 / 註冊

- `/login`：電郵 + 密碼（演示：任意非空即可）
- `/register`：註冊開戶後直接進入系統
- 登入後側欄可見全部業務頁；頂欄「退出登入」返回登入頁

預填演示帳號：`demo@baoxin.hk` / `demo1234`

## 路由一覽

- `/login` `/register`
- `/dashboard` 經營 + 資金總覽
- `/contracts` `/weigh-tickets`
- `/receivables` `/payables` `/payments`
- `/customers` `/material-types`
- `/employees` `/roles`
- `/settings/cash`

## 技術說明

- 認證：`localStorage` Mock（`src/lib/auth-mock.tsx`）
- 菜單：`src/lib/menu.ts`（全量展示，暫不按角色過濾）
- 數據：`src/lib/mock/data.ts`

## 操作說明

各業務列表均支持：
- **新建**：右上角按鈕進入表單
- **詳情**：行內「詳情」
- **刪除**：行內或詳情頁刪除（確認框；Mock 僅當前會話生效）

基礎設置頁可編輯公司名與期初現金。

## 下一批

真實 API、角色權限配置與菜單過濾、審計與作廢核銷規則。
