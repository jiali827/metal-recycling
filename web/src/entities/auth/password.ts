/** 修改密码：6～20 位，数字/字母/符号，不强制组合；禁止空白 */

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 20;

/** ASCII 可打印字符（不含空格） */
const PASSWORD_CHARSET = /^[\x21-\x7E]+$/;

export type PasswordFormatError = "empty" | "length" | "charset";

export function validatePasswordFormat(
  password: string,
): PasswordFormatError | null {
  if (!password) return "empty";
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return "length";
  }
  if (!PASSWORD_CHARSET.test(password)) return "charset";
  return null;
}

const PASSWORD_STORAGE_KEY = "baoxin-mock-passwords";

/** 演示默认密码（与登录页预填一致） */
export const DEMO_DEFAULT_PASSWORD = "demo1234";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  window.localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(map));
}

function emailKey(email: string) {
  return email.trim().toLowerCase();
}

export function getStoredPassword(email: string): string | null {
  const key = emailKey(email);
  if (!key) return null;
  const value = readMap()[key];
  return typeof value === "string" ? value : null;
}

/** 已保存密码，否则演示默认密码 */
export function resolveAccountPassword(email: string): string {
  return getStoredPassword(email) ?? DEMO_DEFAULT_PASSWORD;
}

export function setStoredPassword(email: string, password: string) {
  const key = emailKey(email);
  if (!key) return;
  const map = readMap();
  map[key] = password;
  writeMap(map);
}

/** 新建员工：初始密码与登录账号（邮箱）相同 */
export function initializeAccountPassword(email: string) {
  const account = email.trim();
  if (!account) return;
  setStoredPassword(account, account);
}

/** 管理员重置密码为与账号（邮箱）相同 */
export function resetPasswordToAccount(email: string) {
  initializeAccountPassword(email);
}
