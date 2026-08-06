"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const DashboardView = dynamic(() => import("./DashboardView"), {
  loading: () => <PageSkeleton />,
  ssr: false,
});

export default function DashboardPage() {
  return <DashboardView />;
}
