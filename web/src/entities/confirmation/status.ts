export function confirmContractStatus(status: string): "active" | null {
  return status === "draft" ? "active" : null;
}

export function confirmTicketStatus(status: string): "normal" | null {
  return status === "pending" ? "normal" : null;
}

export function confirmPaymentStatus(status: string): "confirmed" | null {
  return status === "pending" ? "confirmed" : null;
}
