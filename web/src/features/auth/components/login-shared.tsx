"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { DEMO_EMAIL, useAuth } from "@/features/auth/provider";
import { emailsEqual } from "@/entities/employee/email";
import { useI18n } from "@/shared/i18n";
import type { MessageKey } from "@/shared/i18n/types";
import { useMockStore } from "@/data/mock/store";
import { getDefaultAppPathForUser } from "@/shared/config/menu-permissions";

/** 登录页共用：会话恢复、表单状态与提交 */
export function useLoginPage() {
  const { login, logout, user, ready, tenant } = useAuth();
  const { roles, employees } = useMockStore();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    const landing = getDefaultAppPathForUser(user, roles);
    if (landing === "/login") {
      logout();
      setError(t("permissions.noMenuAccess"));
      return;
    }
    router.replace(landing);
  }, [ready, user, roles, router, logout, t]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setEntered(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      setError(result.message ?? t("login.failed"));
      return;
    }
    const trimmed = email.trim().toLowerCase();
    const matched = employees.find((u) => emailsEqual(u.email, trimmed));
    const landingUser =
      matched ??
      (trimmed === DEMO_EMAIL.toLowerCase()
        ? { roleIds: ["admin"] as const }
        : null);
    if (!landingUser) {
      setError(t("login.passwordIncorrect"));
      return;
    }
    router.push(getDefaultAppPathForUser(landingUser, roles));
  }

  return {
    t,
    tenant,
    ready,
    user,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    setError,
    entered,
    handleSubmit,
  };
}

export function LoginFormFields({
  email,
  password,
  showPassword,
  error,
  t,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: {
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  t: (key: MessageKey) => string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("login.title")}
      </h2>
      <p className="mt-2 text-sm text-muted">{t("login.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="text-muted">{t("login.email")}</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="ui-input bg-white"
            placeholder={t("login.emailPlaceholder")}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("login.password")}</span>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="ui-input mt-0 bg-white pr-11"
              placeholder={t("login.passwordPlaceholder")}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-foreground"
              onClick={onTogglePassword}
              aria-label={
                showPassword ? t("login.hidePassword") : t("login.showPassword")
              }
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeSlash size={18} weight="regular" />
              ) : (
                <Eye size={18} weight="regular" />
              )}
            </button>
          </div>
        </label>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="ui-btn-primary h-11 w-full text-[15px]">
          {t("login.submit")}
        </button>
      </form>
    </>
  );
}

export function LoginLoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-sm text-white/70">
      {label}
    </div>
  );
}
