"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 应收应付进度已并入结算单列表；保留路由做兼容跳转 */
export default function ReceivablesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settlement-docs");
  }, [router]);

  return null;
}
