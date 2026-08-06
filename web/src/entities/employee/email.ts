import type { User } from "@/entities/types";

export function normalizeEmployeeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmployeeEmailTaken(
  employees: User[],
  email: string,
  excludeId?: string,
) {
  const key = normalizeEmployeeEmail(email);
  if (!key) return false;
  return employees.some(
    (row) =>
      row.id !== excludeId &&
      normalizeEmployeeEmail(row.email) === key,
  );
}
