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
        const stamp = `${BRAND.name} (${BRAND.shortName}) · Licensed to ${viewerEmail} · ${BRAND.supportPhone}`;
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
      className="no-print relative flex flex-col rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-card select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Top anti-piracy toolbar (Zero download/print buttons) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/90 px-4 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-300">
            <Lock className="h-3 w-3" />
            DRM View-Only
          </span>
          <span className="font-medium text-slate-300 truncate max-w-[240px]">
            {workbookTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            title="Vorherige Seite"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 font-mono text-xs font-semibold">
            Seite {currentPage} / {numPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="rounded-lg bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            title="Nächste Seite"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="mx-1 h-4 w-px bg-slate-800" />

          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.85, Number((s - 0.15).toFixed(2))))}
            className="rounded-lg bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
            title="Verkleinern"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-mono text-xs text-slate-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
            className="rounded-lg bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
            title="Vergrößern"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas stage */}
      <div className="relative flex min-h-[540px] items-center justify-center overflow-auto bg-slate-900/95 p-4">
        {loading && (
          <div className="flex flex-col items-center gap-2 text-xs text-slate-300">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gtf-gold border-t-transparent" />
            <span>Streaming encrypted GTF workbook page…</span>
          </div>
        )}

        {renderError && (
          <div className="max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs text-amber-200">
            <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-amber-400" />
            <p className="font-semibold">Protected PDF Stream Notice</p>
            <p className="mt-1 text-slate-300">{renderError}</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`max-w-full rounded-lg bg-white shadow-2xl ${loading || renderError ? "hidden" : "block"}`}
        />

        {/* Transparent anti-capture shield overlay */}
        <div
          className="pointer-events-none absolute inset-0 flex items-end justify-between p-3 text-[10px] font-mono text-slate-400/70"
          aria-hidden="true"
        >
          <span>GTF Anti-Piracy Stream · {viewerEmail}</span>
          <span>Raw PDF download disabled</span>
        </div>
      </div>
    </div>
  );
}
