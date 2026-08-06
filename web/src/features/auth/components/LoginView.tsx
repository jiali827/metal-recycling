"use client";

import Image from "next/image";
import {
  LoginFormFields,
  LoginLayoutSwitcher,
  LoginLoadingScreen,
  useLoginPage,
} from "@/features/auth/components/login-shared";

/** 全幅氛围图 + 浮层登录卡（当前默认登录页） */
export function LoginView() {
  const {
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
  } = useLoginPage();

  if (!ready || user) {
    return <LoginLoadingScreen label={t("app.loading")} />;
  }

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-slate-950">
      <Image
        src="/auth/login-harbor.jpg"
        alt="Metal recycling yard beside Hong Kong harbor dock"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* 中性深色遮罩，保证文字与表单可读 */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/65 to-slate-950/55"
        aria-hidden
      />

      <LoginLayoutSwitcher active="overlay" tone="dark" />

      <div className="relative z-10 flex min-h-[100dvh] w-full flex-col lg:flex-row">
        <section
          className={`flex flex-1 flex-col justify-between px-6 pb-4 pt-8 sm:px-10 sm:pt-10 lg:max-w-[52%] lg:px-14 lg:pb-10 lg:pt-14 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/55">
              {t("login.brandKicker")}
            </p>
            <h1 className="mt-3 max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              {t("app.nameLine1")}
              <br />
              {t("app.nameLine2")}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
              {t("app.tagline")}
            </p>
          </div>

          <div className="mt-10 hidden text-xs leading-relaxed text-white/50 lg:block">
            {tenant.name}
            <br />
            {tenant.nameEn}
          </div>
        </section>

        <section className="flex flex-1 items-end justify-center px-4 pb-8 sm:px-6 sm:pb-10 lg:items-center lg:justify-end lg:pr-24 xl:pr-32 lg:pb-0">
          <div
            className={`w-full max-w-[420px] transition-all duration-700 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              entered
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <div className="ui-card border-white/70 bg-white/95 p-7 shadow-[0_24px_64px_rgba(2,6,23,0.35)] backdrop-blur-md sm:p-8">
              <LoginFormFields
                email={email}
                password={password}
                showPassword={showPassword}
                error={error}
                t={t}
                onEmailChange={(value) => {
                  setEmail(value);
                  if (error) setError("");
                }}
                onPasswordChange={(value) => {
                  setPassword(value);
                  if (error) setError("");
                }}
                onTogglePassword={() => setShowPassword((v) => !v)}
                onSubmit={handleSubmit}
              />
            </div>

            <p className="mt-4 text-center text-xs text-white/55 lg:hidden">
              {tenant.name}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
