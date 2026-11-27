import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { firebaseConfig } from "@/lib/firebase";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { getFirebaseAdminFirestore } from "@/lib/server/firebase-admin";
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

const RUNTIME_ROOT = Reflect.apply(process.cwd, process, []) as string;
const CANDIDATE_FILE_PATHS = [
  path.join(RUNTIME_ROOT, "data", "enquiries.json"),
  path.join(RUNTIME_ROOT, "..", "data", "enquiries.json"),
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
    } catch {
      // Non-blocking on read-only serverless filesystems
    }
  }
}

/**
 * Persists enquiry to Cloud Firestore `leads/{id}` (satisfies `isValidLeadSchema` in `firestore.rules`)
 * so leads are NEVER silently dropped on Vercel serverless deployments.
 */
async function persistLeadToFirestore(enquiry: CohortEnquiry): Promise<boolean> {
  const safePhone = enquiry.whatsapp.replace(/[^+\d\s-]/g, "").trim();
  const validPhone =
    safePhone.length >= 7 && safePhone.length <= 25 ? safePhone : "+49 000 0000000";
  const targetCourse = `${enquiry.track}${enquiry.productSlug ? ` (${enquiry.productSlug})` : ""}`
    .trim()
    .slice(0, 100);

  // 1. Prefer Firebase Admin SDK when configured
  try {
    const adminDb = await getFirebaseAdminFirestore();
    if (adminDb) {
      await adminDb.collection("leads").doc(enquiry.id).set({
        fullName: enquiry.name.slice(0, 100),
        email: enquiry.email.slice(0, 100),
        phone: validPhone,
        targetCourse: targetCourse.length >= 2 ? targetCourse : "German Academy",
        source: "portal_enquiry",
        createdAt: new Date(enquiry.createdAt),
      });
      return true;
    }
  } catch (err) {
    console.warn("[enquiries] Firestore Admin lead write fallback to REST:", err);
  }

  // 2. Fallback to Firestore REST API (matches public `leads` create rule + strict schema)
  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
    const url = `${baseUrl}/leads?documentId=${encodeURIComponent(enquiry.id)}&key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-User-Project": firebaseConfig.projectId,
      },
      body: JSON.stringify({
        fields: {
          fullName: { stringValue: enquiry.name.slice(0, 100) },
          email: { stringValue: enquiry.email.slice(0, 100) },
          phone: { stringValue: validPhone },
          targetCourse: {
            stringValue: targetCourse.length >= 2 ? targetCourse : "German Academy",
          },
          source: { stringValue: "portal_enquiry" },
          createdAt: { timestampValue: enquiry.createdAt },
        },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) return true;
    console.warn(`[enquiries] Firestore REST lead write returned HTTP ${res.status}`);
  } catch (err) {
    console.warn("[enquiries] Firestore REST lead write failed:", err);
  }

  return false;
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

    const resolvedName =
      typeof body.name === "string"
        ? body.name
        : typeof body.fullName === "string"
          ? body.fullName
          : "";
    const resolvedEmail = typeof body.email === "string" ? body.email : "";
    const resolvedWhatsapp =
      typeof body.whatsapp === "string"
        ? body.whatsapp
        : typeof body.phone === "string"
          ? body.phone
          : "";
    const resolvedTrack =
      typeof body.track === "string"
        ? body.track
        : typeof body.targetCourse === "string"
          ? body.targetCourse
          : "";
    const resolvedNotes =
      typeof body.notes === "string"
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

    // 1. Primary durable cloud storage: Cloud Firestore `leads` collection
    const savedToFirestore = await persistLeadToFirestore(newEnquiry);

    // 2. Local JSON mirror (dev convenience; non-blocking on Vercel read-only FS)
    try {
      const existing = await readEnquiries();
      existing.unshift(newEnquiry);
      await writeEnquiries(existing);
    } catch {
      // ignore
    }

    // 3. Optional Supabase mirror if configured
    let savedToSupabase = false;
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { error } = await supabase.from("enquiries").insert({
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
        if (!error) savedToSupabase = true;
      }
    } catch (supabaseErr) {
      console.warn("[enquiries] Supabase logging fallback:", supabaseErr);
    }

    return NextResponse.json(
      {
        success: true,
        persistedTo: savedToFirestore
          ? "firestore"
          : savedToSupabase
            ? "supabase"
            : "local",
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

  // Also include durable Cloud Firestore `leads` when Admin SDK is available
  try {
    const adminDb = await getFirebaseAdminFirestore();
    if (adminDb) {
      const snap = await adminDb
        .collection("leads")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();
      const seen = new Set(enquiries.map((e) => e.id));
      for (const docSnap of snap.docs) {
        if (seen.has(docSnap.id)) continue;
        const d = docSnap.data();
        enquiries.push({
          id: docSnap.id,
          name: String(d.fullName || ""),
          email: String(d.email || ""),
          whatsapp: String(d.phone || ""),
          track: String(d.targetCourse || ""),
          status: "pending",
          compliance: "Firestore Lead",
          createdAt:
            d.createdAt && typeof d.createdAt.toDate === "function"
              ? d.createdAt.toDate().toISOString()
              : new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("[enquiries] Admin Firestore leads read notice:", err);
  }

  return NextResponse.json({ count: enquiries.length, enquiries });
}
