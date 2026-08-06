import type { RecordTimestamps } from "@/shared/lib/timestamps";
import type { RoleAccessMap } from "@/shared/config/permissions";

export type RoleId =
  | "admin"
  | "contract"
  | "weigh"
  | "finance"
  | "boss";

export type ContractType = "purchase" | "sale";
export type ContractStatus = "draft" | "active" | "fulfilling" | "completed" | "closed";
export type TicketDirection = "purchase" | "sale";
export type TicketStatus = "normal" | "void";
export type SettlementStatus = "open" | "partial" | "settled" | "void";
export type PaymentType = "receipt" | "payment";
export type PaymentCategory = "settlement" | "misc";
export type PaymentMiscKind =
  | "salary"
  | "freight"
  | "petty_cash"
  | "utilities"
  | "other_expense"
  | "other_income"
  | "deposit"
  | "other";

export interface Tenant {
  id: string;
  name: string;
  nameEn: string;
  currency: string;
  openingCash: number;
}

export interface User extends RecordTimestamps {
  id: string;
  name: string;
  email: string;
  /** 员工可分配多个角色，登录后拥有所选角色权限的并集 */
  roleIds: RoleId[];
  status: "active" | "disabled";
  /** 头像（JPEG Data URL，演示环境本地存储） */
  avatarUrl?: string;
}

export interface Customer extends RecordTimestamps {
  id: string;
  name: string;
  category: string;
  contact?: string;
}

export interface CustomerCategory extends RecordTimestamps {
  id: string;
  name: string;
}

export interface MaterialType extends RecordTimestamps {
  id: string;
  name: string;
  forPurchase: boolean;
  forSale: boolean;
  enabled: boolean;
}

export interface Contract extends RecordTimestamps {
  id: string;
  no: string;
  type: ContractType;
  customerId: string;
  customerName: string;
  status: ContractStatus;
  plannedKg: number;
  fulfilledKg: number;
  unitPriceSummary: string;
  /** 合同簽訂日期（業務日期，非系統創建時間） */
  date: string;
  /** 雙方簽字蓋章合同掃描件文件名 */
  attachmentName?: string;
  /** 掃描件預覽（演示用，僅本地會話） */
  attachmentDataUrl?: string;
}

export interface WeighTicket extends RecordTimestamps {
  id: string;
  bxNo: string;
  direction: TicketDirection;
  /** 過磅具體時間（精確到分鐘，YYYY-MM-DDTHH:mm） */
  date: string;
  customerName: string;
  plate: string;
  materialSummary: string;
  grossKg: number;
  tareKg: number;
  deductionKg: number;
  netKg: number;
  amount: number;
  contractNo: string;
  status: TicketStatus;
  /** 備註：貨櫃號、付款狀態、其他說明等 */
  remarks?: string;
}

export interface ArApItem extends RecordTimestamps {
  id: string;
  ticketBxNo: string;
  customerName: string;
  amount: number;
  settledAmount: number;
  balance: number;
  status: SettlementStatus;
  /** 往來業務日期 */
  date: string;
}

export interface PaymentRecord extends RecordTimestamps {
  id: string;
  /** 收付款業務時間（YYYY-MM-DDTHH:mm，精確到分鐘） */
  date: string;
  /** 往来核销 or 杂项收支 */
  category: PaymentCategory;
  type: PaymentType;
  method: string;
  amount: number;
  counterparty: string;
  /** 核销摘要（往来）或杂项说明 */
  allocationSummary: string;
  /** 往来核销关联的磅单 BX（category=settlement） */
  ticketBxNo?: string;
  /** 杂项类别，仅 category=misc 时使用 */
  miscKind?: PaymentMiscKind;
}

export interface RoleDef extends RecordTimestamps {
  id: string;
  name: string;
  /** 权限摘要（由 access 派生，兼容列表展示） */
  permissions: string[];
  /** 结构化功能权限（菜单 + 按钮级） */
  access: RoleAccessMap;
  enabled: boolean;
}

export interface DashboardStats {
  salesAmount: number;
  purchaseAmount: number;
  grossMargin: number;
  ticketCount: number;
  purchaseNetKg: number;
  saleNetKg: number;
  received: number;
  paid: number;
  cashBalance: number;
  arBalance: number;
  apBalance: number;
}
