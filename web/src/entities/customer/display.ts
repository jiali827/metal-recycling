import type { Customer } from "@/entities/types";

/** 列表/追溯等场景的联系人摘要：姓名 + 电话 */
export function formatCustomerContactSummary(customer: Pick<Customer, "contactName" | "phone" | "email">): string {
  const parts: string[] = [];
  if (customer.contactName?.trim()) parts.push(customer.contactName.trim());
  if (customer.phone?.trim()) parts.push(customer.phone.trim());
  if (parts.length > 0) return parts.join(" · ");
  if (customer.email?.trim()) return customer.email.trim();
  return "";
}

export function customerKeywordBlob(customer: Customer): string {
  return [
    customer.customerNo,
    customer.name,
    customer.category,
    customer.contactName,
    customer.phone,
    customer.email,
    customer.siteName,
    customer.address,
    customer.invoiceTitle,
    customer.taxNo,
    customer.remarks,
  ]
    .filter(Boolean)
    .join(" ");
}
