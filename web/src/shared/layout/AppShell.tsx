"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import { useI18n } from "@/shared/i18n";
import { RoutePrefetch } from "./RoutePrefetch";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        {t("app.loading")}
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <RoutePrefetch />
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-6">
        {children}
      </main>
    </div>
  );
}
