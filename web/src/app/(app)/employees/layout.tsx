import type { Metadata } from "next";
import { pageMetadata } from "@/shared/config/route-titles";

export const metadata: Metadata = pageMetadata("menu.employees");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
