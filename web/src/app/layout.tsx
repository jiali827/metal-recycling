import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-mock";
import { MockStoreProvider } from "@/lib/mock-store";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { TextInputCaretEnd } from "@/components/ui/TextInputCaretEnd";
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
