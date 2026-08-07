"use client";

import Image from "next/image";
import {
  LoginFormFields,
  LoginLoadingScreen,
  useLoginPage,
} from "@/features/auth/components/login-shared";

/** 左右分栏登录：左侧实景图 + 品牌文案，右侧浅色底登录表单（默认登录页） */
export function LoginSplitView() {
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
    <div className="relative flex min-h-[100dvh] bg-background">
      {/* 左侧：图片面板 */}
      <aside className="relative hidden w-[48%] min-w-[360px] max-w-[640px] overflow-hidden lg:block xl:w-[52%]">
        <Image
          src="/auth/login-harbor.jpg"
          alt="Metal recycling yard beside Hong Kong harbor dock"
          fill
          priority
          sizes="52vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-slate-950/25"
          aria-hidden
        />

        <div
          className={`relative z-10 flex h-full flex-col justify-between p-10 xl:p-14 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/55">
              {t("login.brandKicker")}
            </p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-white xl:text-5xl">
              {t("app.nameLine1")}
              <br />
              {t("app.nameLine2")}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              {t("app.tagline")}
            </p>
          </div>

          <div className="text-xs leading-relaxed text-white/55">
            {tenant.name}
            <br />
            {tenant.nameEn}
          </div>
        </div>
      </aside>

      {/* 右侧：登录表单 */}
      <main className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div
          className={`mx-auto w-full max-w-[400px] transition-all duration-700 delay-75 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {/* 小屏无左侧图时补品牌 */}
          <div className="mb-8 lg:hidden">
            <p className="text-[11px] font-medium tracking-[0.2em] text-muted">
              {t("login.brandKicker")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {t("app.nameLine1")}
              <span className="mx-1">·</span>
              {t("app.nameLine2")}
            </h1>
          </div>

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

          <p className="mt-8 text-xs leading-relaxed text-muted lg:hidden">
            {tenant.name}
            <br />
            {tenant.nameEn}
          </p>
        </div>
      </main>
    </div>
  );
}
