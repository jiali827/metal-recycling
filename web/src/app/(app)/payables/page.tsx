"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 应付账已并入结算单；保留路由做兼容跳转 */
export default function PayablesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settlement-docs");
  }, [router]);

  return null;
}
