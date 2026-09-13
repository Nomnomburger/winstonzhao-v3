'use client';

import ScrollerShell from "@/components/scroller/ScrollerShell";
import type { ProjectSummary } from "../../sanity/lib/projects";

export default function ClientLayout({
  children,
  projects,
}: {
  children: React.ReactNode;
  projects: ProjectSummary[];
}) {
  return (
    <>
      <ScrollerShell projects={projects} />
      {children}
    </>
  );
}
