import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/provider";
import { MockStoreProvider } from "@/data/mock/store";
import { I18nProvider } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/shared/config/theme";
import { ConfirmProvider } from "@/shared/ui/ConfirmDialog";
import { TextInputCaretEnd } from "@/shared/ui/TextInputCaretEnd";
import { DocumentTitle } from "@/shared/layout/DocumentTitle";
import {
  buildDocumentTitleBootScript,
  rootDocumentTitleMetadata,
} from "@/shared/config/route-titles";
import "./globals.css";

export const metadata: Metadata = {
  title: rootDocumentTitleMetadata(),
  description: "寶新建築材料有限公司 · 金屬回收管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildDocumentTitleBootScript() }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <TextInputCaretEnd />
        <ThemeProvider>
          <I18nProvider>
            <DocumentTitle />
            <MockStoreProvider>
              <AuthProvider>
                <ConfirmProvider>{children}</ConfirmProvider>
              </AuthProvider>
            </MockStoreProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
