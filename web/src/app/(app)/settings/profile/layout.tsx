import type { Metadata } from "next";
import { pageMetadata } from "@/shared/config/route-titles";

export const metadata: Metadata = pageMetadata("settings.profileTitle");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
