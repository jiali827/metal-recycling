import type { User } from "@/entities/types";

/** 兼容缺字段/脏数据，避免 toLowerCase 空指针 */
export function normalizeEmployeeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function emailsEqual(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  const left = normalizeEmployeeEmail(a);
  const right = normalizeEmployeeEmail(b);
  return Boolean(left) && left === right;
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
