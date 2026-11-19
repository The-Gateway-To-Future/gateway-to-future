import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface CohortEnquiry {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  track: string;
  productSlug?: string | null;
  notes?: string | null;
  status: "pending" | "contacted" | "enrolled";
  compliance: string;
  createdAt: string;
}

const ALLOWED_ORIGINS = new Set([
  "https://gatewaytofuture.com",
  "https://www.gatewaytofuture.com",
  "https://app.gatewaytofuture.com",
]);

function buildCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = (req.headers.get("origin") || "").trim();
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://gatewaytofuture.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Password",
    Vary: "Origin",
  };
}

const CANDIDATE_FILE_PATHS = [
  path.join(process.cwd(), "data", "enquiries.json"),
  path.join(process.cwd(), "..", "data", "enquiries.json"),
];

async function readEnquiries(): Promise<CohortEnquiry[]> {
  for (const fp of CANDIDATE_FILE_PATHS) {
    if (fsSync.existsSync(fp)) {
      try {
        const raw = await fs.readFile(fp, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        console.warn(`[enquiries] Error parsing ${fp}:`, err);
      }
    }
  }
  return [];
}

async function writeEnquiries(enquiries: CohortEnquiry[]): Promise<void> {
  const jsonStr = JSON.stringify(enquiries, null, 2);
  for (const fp of CANDIDATE_FILE_PATHS) {
    try {
      await fs.mkdir(path.dirname(fp), { recursive: true });
      await fs.writeFile(fp, jsonStr, "utf-8");
    } catch (err) {
      console.warn(`[enquiries] Failed to write to ${fp}:`, err);
    }
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = buildCorsHeaders(req);
  try {
    const body = (await req.json()) as {
      name?: unknown;
      fullName?: unknown;
      email?: unknown;
      whatsapp?: unknown;
      phone?: unknown;
      track?: unknown;
      targetCourse?: unknown;
      productSlug?: unknown;
      notes?: unknown;
      message?: unknown;
    };

    const resolvedName = typeof body.name === "string"
      ? body.name
      : typeof body.fullName === "string"
        ? body.fullName
        : "";
    const resolvedEmail = typeof body.email === "string" ? body.email : "";
    const resolvedWhatsapp = typeof body.whatsapp === "string"
      ? body.whatsapp
      : typeof body.phone === "string"
        ? body.phone
        : "";
    const resolvedTrack = typeof body.track === "string"
      ? body.track
      : typeof body.targetCourse === "string"
        ? body.targetCourse
        : "";
    const resolvedNotes = typeof body.notes === "string"
      ? body.notes
      : typeof body.message === "string"
        ? body.message
        : null;

    if (!resolvedName.trim()) {
      return NextResponse.json(
        { error: "Candidate name is required." },
        { status: 400, headers: corsHeaders },
      );
    }
    if (!resolvedEmail.trim() || !resolvedEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400, headers: corsHeaders },
      );
    }
    if (!resolvedWhatsapp.trim()) {
      return NextResponse.json(
        { error: "WhatsApp / phone contact number is required." },
        { status: 400, headers: corsHeaders },
      );
    }
    if (!resolvedTrack.trim()) {
      return NextResponse.json(
        { error: "Division / Track is required." },
        { status: 400, headers: corsHeaders },
      );
    }

    const newEnquiry: CohortEnquiry = {
      id: `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: resolvedName.trim(),
      email: resolvedEmail.trim().toLowerCase(),
      whatsapp: resolvedWhatsapp.trim(),
      track: resolvedTrack.trim(),
      productSlug: body.productSlug ? String(body.productSlug).trim() : null,
      notes: resolvedNotes ? resolvedNotes.trim() : null,
      status: "pending",
      compliance: "Jobcenter-safe (no financial transaction)",
      createdAt: new Date().toISOString(),
    };

    // 1. Log to /data/enquiries.json (best-effort; serverless filesystems may be read-only)
    try {
      const existing = await readEnquiries();
      existing.unshift(newEnquiry);
      await writeEnquiries(existing);
    } catch {
      // Non-blocking on read-only serverless environments
    }

    // 2. Log to Supabase if configured (graceful fallback)
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from("enquiries").insert({
          id: newEnquiry.id,
          name: newEnquiry.name,
          email: newEnquiry.email,
          whatsapp_phone: newEnquiry.whatsapp,
          track: newEnquiry.track,
          product_slug: newEnquiry.productSlug,
          status: newEnquiry.status,
          metadata: { compliance: "jobcenter_safe", notes: newEnquiry.notes },
          created_at: newEnquiry.createdAt,
        });
      }
    } catch (supabaseErr) {
      console.warn("[enquiries] Supabase logging fallback:", supabaseErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Access request received. Academic advisor will contact you on WhatsApp.",
        enquiry: newEnquiry,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("[enquiries] Internal error:", err);
    return NextResponse.json(
      { error: "Failed to record enquiry." },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required to access candidate enquiries." },
      { status: 401 },
    );
  }

  const enquiries = await readEnquiries();
  return NextResponse.json({ count: enquiries.length, enquiries });
}
