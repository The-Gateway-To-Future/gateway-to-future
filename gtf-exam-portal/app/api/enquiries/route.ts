import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, whatsapp, track, productSlug, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Candidate name is required." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required." }, { status: 400 });
    }
    if (!whatsapp || typeof whatsapp !== "string" || !whatsapp.trim()) {
      return NextResponse.json({ error: "WhatsApp contact number is required." }, { status: 400 });
    }
    if (!track || typeof track !== "string" || !track.trim()) {
      return NextResponse.json({ error: "Division / Track is required." }, { status: 400 });
    }

    const newEnquiry: CohortEnquiry = {
      id: `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      track: track.trim(),
      productSlug: productSlug ? String(productSlug).trim() : null,
      notes: notes ? String(notes).trim() : null,
      status: "pending",
      compliance: "Jobcenter-safe (no financial transaction)",
      createdAt: new Date().toISOString(),
    };

    // 1. Log to /data/enquiries.json
    const existing = await readEnquiries();
    existing.unshift(newEnquiry);
    await writeEnquiries(existing);

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

    return NextResponse.json({
      success: true,
      message: "Access request received. Academic advisor will contact you on WhatsApp.",
      enquiry: newEnquiry,
    });
  } catch (err) {
    console.error("[enquiries] Internal error:", err);
    return NextResponse.json({ error: "Failed to record enquiry." }, { status: 500 });
  }
}

export async function GET() {
  const enquiries = await readEnquiries();
  return NextResponse.json({ count: enquiries.length, enquiries });
}
