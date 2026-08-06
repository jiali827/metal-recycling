"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/shared/ui/PageSkeleton";

const DashboardView = dynamic(
  () => import("@/features/dashboard/components/DashboardView"),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  },
);

export default function DashboardPage() {
  return <DashboardView />;
}
