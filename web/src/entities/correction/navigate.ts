import type {
  PaymentRecord,
  PurchaseContract,
  SaleContract,
  WeighSettlementDoc,
  WeighTicket,
} from "@/entities/types";
import type { CorrectionAction } from "./reverse";

export type LinkedNav = {
  /** 目标业务列表页路由 */
  route: string;
  /** 写入目标页筛选状态的查询参数名 */
  queryParam: string;
  /** 精确筛选值（业务单号） */
  filterValue: string;
};

export type LinkedNavData = {
  weighTickets: WeighTicket[];
  purchaseContracts: PurchaseContract[];
  saleContracts: SaleContract[];
  weighSettlementDocs: WeighSettlementDoc[];
  payments: PaymentRecord[];
};

/**
 * 根据纠错关联动作推导「点击进入对应业务列表页并自动填充筛选」的导航信息。
 * 过磅单 / 合同 / 结算单 / 收付款单为可点击的横向关联记录；
 * 应收 / 应付（void_arap / restore_arap）仅作为影响范围统计，返回 null。
 */
export function buildLinkedNav(action: CorrectionAction, data: LinkedNavData): LinkedNav | null {
  switch (action.objectType) {
    case "weigh-ticket": {
      const row = data.weighTickets.find((r) => r.id === action.objectId);
      if (!row) return null;
      return { route: "/weigh-tickets", queryParam: "bxNo", filterValue: row.bxNo };
    }
    case "purchase-contract":
    case "sale-contract": {
      const row = [...data.purchaseContracts, ...data.saleContracts].find((r) => r.id === action.objectId);
      if (!row) return null;
      return { route: "/contracts", queryParam: "contractNo", filterValue: row.no };
    }
    case "settlement-doc": {
      const row = data.weighSettlementDocs.find((r) => r.id === action.objectId);
      if (!row) return null;
      return { route: "/settlement-docs", queryParam: "docNo", filterValue: row.no };
    }
    case "payment": {
      const row = data.payments.find((r) => r.id === action.objectId);
      if (!row) return null;
      return { route: "/payments", queryParam: "paymentNo", filterValue: row.paymentNo ?? row.id };
    }
    default:
      return null;
  }
}
