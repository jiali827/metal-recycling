import type { RecordTimestamps } from "@/shared/lib/timestamps";
import type { RoleAccessMap } from "@/shared/config/permissions";

export type RoleId =
  | "admin"
  | "contract"
  | "weigh"
  | "finance"
  | "boss";

/** @deprecated 合同已拆为采购/销售两套实体；仅作方向/追溯视图兼容 */
export type ContractType = "purchase" | "sale";
export type PurchaseContractStatus = "draft" | "active" | "closed";
export type SaleContractStatus = "draft" | "active" | "completed" | "closed";

/** 采购合同有效性（由有效期相对今天自动派生，只读） */
export type PurchaseValidity = "in_force" | "expired" | "no_expiry";

/** 销售合同履约情况（由关联磅单与约量/容差自动派生，只读） */
export type SaleFulfillmentPhase = "none" | "in_progress" | "ready" | "over";

/** @deprecated 使用 PurchaseContractStatus / SaleContractStatus */
export type ContractStatus = SaleContractStatus | PurchaseContractStatus;
export type PurchasePriceMode = "ex_yard" | "collect" | "other";
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
  /**
   * 公司缩写（大写字母/数字），用于采购合同编号等：`Q-{abbr}-{年}-{流水}`
   */
  abbr: string;
  currency: string;
  openingCash: number;
  /** 公司 Logo（正方形 JPEG Data URL，演示环境本地存储） */
  logoUrl?: string;
  /** 中文地址（打印单据等） */
  address: string;
  /** 英文地址（打印单据等） */
  addressEn: string;
  /** 联系电话，可多条 */
  phones: string[];
  /** 联系人 */
  contactPerson: string;
  /** 公司对外邮箱 */
  email: string;
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
  /** 客户业务编号，如 C-00001 */
  customerNo: string;
  name: string;
  category: string;
  contactName?: string;
  phone?: string;
  email?: string;
  /** 地盘 / 工地名称 */
  siteName?: string;
  address?: string;
  /** 开票抬头 */
  invoiceTitle?: string;
  /** 税号 */
  taxNo?: string;
  remarks?: string;
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

export interface ProjectType extends RecordTimestamps {
  id: string;
  name: string;
  enabled: boolean;
}

export interface PurchaseContractLine {
  id: string;
  materialTypeId?: string;
  materialName: string;
  priceMode: PurchasePriceMode;
  unitPrice: number;
  lineRemark?: string;
}

export interface PurchaseContract extends RecordTimestamps {
  id: string;
  no: string;
  customerId: string;
  customerName: string;
  contactName?: string;
  project?: string;
  status: PurchaseContractStatus;
  /** 报价/签订日期 */
  quotedOn: string;
  validUntil?: string;
  currency: string;
  lines: PurchaseContractLine[];
  remarks?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
}

export interface SaleContractLine {
  id: string;
  materialTypeId?: string;
  materialName: string;
  /** 约量，内部存 KG */
  plannedQty: number;
  qtyUnit: "kg";
  /** 单价：每吨 */
  unitPrice: number;
  lineAmount?: number;
  /** 已履约 KG，由关联磅单累计 */
  fulfilledQty: number;
  lineRemark?: string;
}

export interface SaleContract extends RecordTimestamps {
  id: string;
  no: string;
  customerId: string;
  customerName: string;
  status: SaleContractStatus;
  signedOn: string;
  paymentTerms?: string;
  fulfillBy?: string;
  /** 容差 %；空=不按容差提示 */
  tolerancePercent?: number;
  currency: string;
  totalAmount?: number;
  priceTerms?: string;
  origin?: string;
  destination?: string;
  packingSummary?: string;
  bankAccountSummary?: string;
  lines: SaleContractLine[];
  remarks?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
}

/**
 * 项目全景等追溯视图用的统一合同投影（非持久化模型）。
 */
export interface ContractTraceItem extends RecordTimestamps {
  id: string;
  no: string;
  type: ContractType;
  customerId: string;
  customerName: string;
  status: string;
  plannedKg: number;
  fulfilledKg: number;
  unitPriceSummary: string;
  date: string;
  attachmentName?: string;
}

/** @deprecated 使用 PurchaseContract / SaleContract */
export type Contract = ContractTraceItem;

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
  /** 弱关联：合同编号文本（采购常用；销售也可冗余） */
  contractNo: string;
  /** 销售合同结构化关联（可选） */
  saleContractId?: string;
  saleContractLineId?: string;
  status: TicketStatus;
  /** 備註：貨櫃號、付款狀態、其他說明等 */
  remarks?: string;
}

/** 过磅汇总结算单（採購單 / 銷售單），供财务线下审批 */
export type WeighSettlementKind = "purchase" | "sale";
/** pending=待确认可编辑；confirmed=已确认锁定并作为应收/应付目标 */
export type WeighSettlementStatus = "pending" | "confirmed";

export interface WeighSettlementLine {
  ticketId: string;
  bxNo: string;
  /** 过磅日期 YYYY-MM-DD */
  date: string;
  plate: string;
  materialSummary: string;
  grossKg: number;
  deductionKg: number;
  netKg: number;
  unitPrice: number;
  amount: number;
}

export interface WeighSettlementDoc extends RecordTimestamps {
  id: string;
  no: string;
  kind: WeighSettlementKind;
  customerName: string;
  /** 采购=采购合同 id；销售=销售合同 id */
  contractId: string;
  contractNo: string;
  docDate: string;
  status: WeighSettlementStatus;
  ticketIds: string[];
  lines: WeighSettlementLine[];
  totalNetKg: number;
  totalAmount: number;
  /** 财务确认时间（YYYY-MM-DDTHH:mm） */
  confirmedAt?: string;
  /** 确认人（演示环境写当前用户名） */
  confirmedBy?: string;
  /** 财务签字扫描件备份（可选，演示环境存 Data URL） */
  attachmentName?: string;
  attachmentDataUrl?: string;
}

/** 应收/应付目标：一对一挂已确认结算单 */
export interface ArApItem extends RecordTimestamps {
  id: string;
  settlementDocId: string;
  settlementDocNo: string;
  customerName: string;
  contractId?: string;
  contractNo?: string;
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
  /** 往来核销关联的结算单（category=settlement） */
  settlementDocId?: string;
  settlementDocNo?: string;
  /** 冗余：合同编号（由结算目标带出） */
  contractNo?: string;
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
