"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { menuItems } from "@/lib/menu";

const EXTRA_ROUTES = ["/settings/cash"];

/**
 * 生產環境預取常用路由，減少首次點擊等待。
 * 開發環境跳過：next dev 會在 prefetch 時同步編譯所有頁面，反而拖慢切換。
 */
export function RoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const routes = [...menuItems.map((item) => item.href), ...EXTRA_ROUTES];
    for (const href of routes) {
      router.prefetch(href);
    }
  }, [router]);

  return null;
}
