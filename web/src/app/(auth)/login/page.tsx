"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_EMAIL, useAuth } from "@/features/auth/provider";
import { useI18n } from "@/shared/i18n";
import { tenant } from "@/data/mock/seed";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && user) {
      router.replace("/dashboard");
    }
  }, [ready, user, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      setError(result.message ?? t("login.failed"));
      return;
    }
    router.push("/dashboard");
  }

  if (!ready || user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        {t("app.loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-[42%] flex-col justify-between bg-primary p-10 text-white md:flex">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/15 text-sm font-bold">
            BX
          </div>
          <div className="mt-6 text-[11px] font-medium tracking-[0.18em] text-white/55">
            METAL RECYCLE SaaS
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
            {t("app.nameLine1")}
            <br />
            {t("app.nameLine2")}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            {t("app.tagline")}
          </p>
        </div>
        <div className="text-xs text-white/55">
          {t("login.tenantLabel")}
          {tenant.name}
          <br />
          {tenant.nameEn}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="ui-card w-full max-w-md p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("login.title")}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-muted">{t("login.email")}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ui-input"
                placeholder={DEMO_EMAIL}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">{t("login.password")}</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ui-input"
              />
            </label>
            {error ? (
              <p className="text-sm text-danger">{error}</p>
            ) : (
              <p className="text-xs text-muted">{t("login.demoHint")}</p>
            )}
            <button type="submit" className="ui-btn-primary h-11 w-full">
              {t("login.submit")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t("login.noAccount")}{" "}
            <Link href="/register" className="font-medium text-brand underline">
              {t("login.registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
