"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  normalizeStoredUser,
  roleIdsEqual,
  userHasEnabledRole,
} from "@/entities/employee/roles";
import { emailsEqual } from "@/entities/employee/email";
import { getActiveMessages } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import {
  getStoredPassword,
  resolveAccountPassword,
  setStoredPassword,
  validatePasswordFormat,
} from "@/entities/auth/password";
import { nowISO } from "@/shared/lib/timestamps";
import type { RoleDef, Tenant, User } from "@/entities/types";

const STORAGE_KEY = "baoxin-mock-session";

/** 特殊入口账号：首次可用任意密码登录 */
export const DEMO_EMAIL = "demo@baoxin.hk";

interface AuthContextValue {
  user: User | null;
  tenant: Tenant;
  ready: boolean;
  login: (
    email: string,
    password: string,
    options?: { name?: string },
  ) => { ok: boolean; message?: string };
  logout: () => void;
  updateProfile: (patch: {
    name?: string;
    avatarUrl?: string | null;
  }) => { ok: boolean; message?: string };
  changePassword: (
    currentPassword: string,
    nextPassword: string,
  ) => { ok: boolean; message?: string };
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRoleLoginAllowed(role: RoleDef | undefined) {
  return Boolean(role?.enabled);
}

function isUserLoginAllowed(user: User, roles: RoleDef[]) {
  if (user.status === "disabled") return false;
  return userHasEnabledRole(user, roles);
}

function demoSessionUser(email: string, name: string | undefined): User {
  const m = getActiveMessages();
  const now = nowISO();
  return {
    id: "u-demo",
    name: name ?? m.auth.defaultUserName,
    email,
    roleIds: ["admin"],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { employees, roles, updateEmployee, tenant } = useMockStore();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeStoredUser(JSON.parse(raw));
        if (parsed) setUser(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: User) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;

    const matched = employees.find(
      (e) => e.id === user.id || emailsEqual(e.email, user.email),
    );

    if (matched) {
      if (!isUserLoginAllowed(matched, roles)) {
        logout();
        return;
      }
      if (
        matched.name !== user.name ||
        matched.email !== user.email ||
        !roleIdsEqual(matched.roleIds, user.roleIds) ||
        matched.status !== user.status ||
        matched.avatarUrl !== user.avatarUrl
      ) {
        persist(matched);
      }
      return;
    }

    if (user.id === "u-demo" && !isRoleLoginAllowed(roles.find((r) => r.id === "admin"))) {
      logout();
    }
  }, [ready, user, employees, roles, logout, persist]);

  const login = useCallback(
    (email: string, password: string, options?: { name?: string }) => {
      const m = getActiveMessages();
      const trimmed = email.trim();
      if (!trimmed) {
        return { ok: false, message: m.login.emailRequired };
      }
      if (!password) {
        return { ok: false, message: m.login.passwordRequired };
      }

      const stored = getStoredPassword(trimmed);
      if (stored !== null && password !== stored) {
        return { ok: false, message: m.login.passwordIncorrect };
      }

      const matched = employees.find((u) =>
        emailsEqual(u.email, trimmed),
      );
      if (matched) {
        if (matched.status === "disabled") {
          return { ok: false, message: m.login.userDisabled };
        }
        if (!userHasEnabledRole(matched, roles)) {
          return { ok: false, message: m.login.roleDisabled };
        }
        setStoredPassword(matched.email, password);
        persist(matched);
        return { ok: true };
      }

      /** 仅 demo@ 允许未登记邮箱以管理员身份进入；其它未登记邮箱拒绝 */
      if (trimmed.toLowerCase() !== DEMO_EMAIL.toLowerCase()) {
        return { ok: false, message: m.login.passwordIncorrect };
      }

      const demoUser = demoSessionUser(trimmed, options?.name);
      if (!isUserLoginAllowed(demoUser, roles)) {
        return { ok: false, message: m.login.roleDisabled };
      }
      setStoredPassword(demoUser.email, password);
      persist(demoUser);
      return { ok: true };
    },
    [employees, roles, persist],
  );

  const updateProfile = useCallback(
    (patch: { name?: string; avatarUrl?: string | null }) => {
      const m = getActiveMessages();
      if (!user) return { ok: false, message: m.settings.notLoggedIn };
      const name = patch.name?.trim();
      if (name !== undefined && !name) {
        return { ok: false, message: m.settings.nameRequired };
      }

      const next: User = {
        ...user,
        ...(name !== undefined ? { name } : {}),
      };
      if (patch.avatarUrl !== undefined) {
        if (patch.avatarUrl === null || patch.avatarUrl === "") {
          delete next.avatarUrl;
        } else {
          next.avatarUrl = patch.avatarUrl;
        }
      }

      persist(next);

      const matched = employees.find(
        (e) => e.id === user.id || emailsEqual(e.email, user.email),
      );
      if (matched) {
        const employeePatch: Partial<User> = {};
        if (name !== undefined) employeePatch.name = next.name;
        if (patch.avatarUrl !== undefined) {
          employeePatch.avatarUrl = next.avatarUrl;
        }
        if (Object.keys(employeePatch).length > 0) {
          updateEmployee(matched.id, employeePatch);
        }
      }

      return { ok: true };
    },
    [employees, persist, updateEmployee, user],
  );

  const changePassword = useCallback(
    (currentPassword: string, nextPassword: string) => {
      const m = getActiveMessages();
      if (!user) return { ok: false, message: m.settings.notLoggedIn };
      if (!currentPassword) {
        return { ok: false, message: m.settings.currentPasswordRequired };
      }
      if (currentPassword !== resolveAccountPassword(user.email)) {
        return { ok: false, message: m.settings.passwordIncorrect };
      }
      const formatErr = validatePasswordFormat(nextPassword);
      if (formatErr === "empty") {
        return { ok: false, message: m.settings.newPasswordRequired };
      }
      if (formatErr === "length") {
        return { ok: false, message: m.settings.passwordLength };
      }
      if (formatErr === "charset") {
        return { ok: false, message: m.settings.passwordCharset };
      }
      setStoredPassword(user.email, nextPassword);
      return { ok: true };
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      tenant,
      ready,
      login,
      logout,
      updateProfile,
      changePassword,
    }),
    [user, tenant, ready, login, logout, updateProfile, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
