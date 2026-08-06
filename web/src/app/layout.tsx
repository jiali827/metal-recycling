import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/provider";
import { MockStoreProvider } from "@/data/mock/store";
import { I18nProvider } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/shared/config/theme";
import { ConfirmProvider } from "@/shared/ui/ConfirmDialog";
import { TextInputCaretEnd } from "@/shared/ui/TextInputCaretEnd";
import "./globals.css";

export const metadata: Metadata = {
  title: "金屬回收管理系統",
  description: "寶新金屬回收 · 多租戶 SaaS 前端（一期首批 Mock）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <TextInputCaretEnd />
        <ThemeProvider>
          <I18nProvider>
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
