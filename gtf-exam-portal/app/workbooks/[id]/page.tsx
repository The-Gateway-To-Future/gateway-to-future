"use client";

import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { FocusedWorkbookWorkspace } from "@/components/FocusedWorkbookWorkspace";
import type { WorkbookClientView } from "@/lib/types";

export default function WorkbookReaderPage() {
  const params = useParams<{ id: string }>();
  const workbookId = params?.id || "gtf-b1-grammatik-booster";
  const [loadedWb, setLoadedWb] = useState<WorkbookClientView | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-28 md:pb-12 light-study">
      <Navbar />

      <BreadcrumbHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Workbooks", href: "/academy" },
          { label: loadedWb?.title || workbookId },
        ]}
        eyebrow={
          loadedWb
            ? `LEVEL ${loadedWb.level.toUpperCase()} · DIGITAL WORKBOOK`
            : "DIGITAL WORKBOOK"
        }
        title={loadedWb?.title || "Digital Workbook"}
        subtitle={
          loadedWb?.subtitle ||
          "Protected GTF workbook streaming with interactive answer-sheet grading."
        }
        theme="grammar"
        backHref="/dashboard"
        backLabel="Hub"
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 light-study">
        <Suspense fallback={<p className="text-sm text-slate-500 py-4">Loading Workspace...</p>}>
          <FocusedWorkbookWorkspace
            workbookId={workbookId}
            onWorkbookLoaded={setLoadedWb}
          />
        </Suspense>
      </main>

      <BottomNavigationBar />
      
    </div>
  );
}
