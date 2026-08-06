"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";
import { buildDocumentTitle } from "@/shared/config/route-titles";
import { useI18n } from "@/shared/i18n";

export function DocumentTitle() {
  const pathname = usePathname();
  const { locale } = useI18n();

  const title = useMemo(
    () => buildDocumentTitle(locale, pathname),
    [locale, pathname],
  );

  useLayoutEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
