"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { BRAND } from "@/lib/config";

interface AntiPiracyPdfViewerProps {
  pdfToken?: string;
  viewerEmail: string;
  workbookTitle: string;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function AntiPiracyPdfViewer({
  pdfToken,
  viewerEmail,
  workbookTitle,
  totalPages,
  currentPage,
  onPageChange,
}: AntiPiracyPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(totalPages);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);

  // Block Ctrl+S, Ctrl+P, Cmd+S, Cmd+P inside the workbook viewer
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setScale(0.85);
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  // Load PDF document via `/api/drive/stream-pdf?token=...` into pdfjs-dist
  useEffect(() => {
    let cancelled = false;
    if (!pdfToken) {
      setLoading(false);
      return;
    }

    async function loadDocument() {
      setLoading(true);
      setRenderError(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const res = await fetch(`/api/drive/stream-pdf?token=${encodeURIComponent(pdfToken!)}`, {
          headers: { Accept: "application/pdf" },
        });
        if (!res.ok) {
          throw new Error(`Protected PDF stream returned HTTP ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: buf });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages || totalPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.warn("[gtf] PDF canvas load error:", err);
        setRenderError(err instanceof Error ? err.message : "Could not render PDF stream");
        setLoading(false);
      }
    }

    loadDocument();
    return () => {
      cancelled = true;
    };
  }, [pdfToken, totalPages]);

  // Render active page + bake anti-piracy watermark directly onto canvas pixels
  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      const doc = pdfDocRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;
      try {
        const pageNumber = Math.min(Math.max(1, currentPage), doc.numPages);
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        // Bake diagonal forensic watermark directly into the canvas bitmap
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "rgba(15, 76, 129, 0.12)";
        ctx.textAlign = "center";
        const stamp = `${BRAND.name} (${BRAND.shortName}) · Licensed to ${viewerEmail} · ${BRAND.supportEmail}`;
        for (let y = -canvas.height / 2; y <= canvas.height / 2; y += 160) {
          ctx.fillText(stamp, 0, y);
        }
        ctx.restore();
      } catch (err) {
        console.warn("[gtf] Page render warning:", err);
      }
    }
    renderPage();
    return () => {
      cancelled = true;
    };
  }, [currentPage, scale, loading, viewerEmail]);

  return (
    <div
      className="no-print relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm select-none min-w-0"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Top anti-piracy toolbar (Clean Light Portal UI · Zero download/print buttons) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/90 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 shrink-0">
            <Lock className="h-3 w-3 shrink-0" />
            <span>DRM View-Only</span>
          </span>
          <span className="font-semibold text-slate-700 truncate max-w-[160px] sm:max-w-[260px]">
            {workbookTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
            title="Vorherige Seite"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 font-mono text-xs font-semibold text-slate-800 tabular-nums">
            Seite {currentPage} / {numPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
            title="Nächste Seite"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200 hidden xs:block" />

          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, Number((s - 0.15).toFixed(2))))}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title="Verkleinern"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-11 text-center font-mono text-xs font-semibold text-slate-600 tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title="Vergrößern"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Light Paper Desk Canvas Stage */}
      <div className="relative flex min-h-[420px] sm:min-h-[540px] items-center justify-center overflow-auto bg-slate-100/90 p-3 sm:p-5">
        {loading && (
          <div className="flex flex-col items-center gap-2.5 text-xs font-medium text-slate-600">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <span>Lade geschützte GTF Arbeitsheft-Seite…</span>
          </div>
        )}

        {renderError && (
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-xs text-amber-900 shadow-xs">
            <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-amber-600" />
            <p className="font-semibold text-slate-900">Geschützte Vorschau derzeit nicht verfügbar</p>
            <p className="mt-1 text-slate-600 leading-relaxed">{renderError}</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`max-w-full rounded-xl border border-slate-200 bg-white shadow-md ${loading || renderError ? "hidden" : "block"}`}
        />

        {/* Subtle anti-capture footer metadata */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-slate-100/95 via-slate-100/70 to-transparent px-3 py-2 text-[10px] font-mono text-slate-500"
          aria-hidden="true"
        >
          <span className="truncate max-w-[65%]">GTF Anti-Piracy Stream · {viewerEmail}</span>
          <span className="shrink-0">Raw PDF download disabled</span>
        </div>
      </div>
    </div>
  );
}
