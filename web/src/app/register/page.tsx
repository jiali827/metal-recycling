"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-mock";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !name.trim() || !email.trim() || !password) {
      setError(t("register.incomplete"));
      return;
    }
    const result = login(email, password, { name: name.trim() });
    if (!result.ok) {
      setError(result.message ?? t("register.failed"));
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="ui-card w-full max-w-lg p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("register.title")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("register.subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">{t("register.company")}</span>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="ui-input"
              placeholder={t("register.companyPlaceholder")}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("register.companyEn")}</span>
            <input className="ui-input" placeholder="Company Name EN" />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("register.adminName")}</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ui-input"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("register.email")}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ui-input"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("register.password")}</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui-input"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="submit" className="ui-btn-primary h-11 w-full">
            {t("register.submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t("register.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-brand underline">
            {t("register.loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
