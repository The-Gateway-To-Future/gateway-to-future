import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { timingSafeEqual } from "crypto";
import { getAllProducts } from "./catalog";
import { getSupabaseServerClient } from "../supabase";
import type { Level, Product, ProductType } from "../types";

const RUNTIME_ROOT = Reflect.apply(process.cwd, process, []) as string;
const LOCAL_STORE_DIR = path.join(RUNTIME_ROOT, ".local-store");
const CUSTOM_PRODUCTS_FILE = path.join(LOCAL_STORE_DIR, "custom-products.json");
const STUDENTS_FILE = path.join(LOCAL_STORE_DIR, "students.json");
const DRIVE_SYNC_LOG_FILE = path.join(LOCAL_STORE_DIR, "drive-sync-log.json");

export interface StudentRecord {
  email: string;
  fullName: string;
  phone: string;
  targetLevel: Level;
  createdAt: string;
}

export interface N8nNotificationPayload {
  student_name: string;
  email: string;
  whatsapp_phone: string;
  product_title: string;
  product_slug?: string;
  access_link: string;
  payment_provider?: string;
  payment_reference?: string;
  currency?: string;
  amount_paid?: number;
}

export function getExpectedAdminPassword(): string {
  const configured = (process.env.ADMIN_SECRET_PASSWORD || "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return "gtf-berlin-founder-2026";
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyAdminRequest(req: Request, bodyPassword?: string): boolean {
  const expected = getExpectedAdminPassword();
  if (!expected) return false;

  // Never accept secrets in URL query parameters (leaks into access logs and Referer headers)
  const headerPwd =
    req.headers.get("x-admin-password") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    bodyPassword ||
    "";

  if (!headerPwd) return false;
  return safeEqual(headerPwd.trim(), expected);
}

/**
 * Triggers the outgoing n8n WhatsApp & Master CRM webhook whenever a pack is unlocked
 * via Razorpay, Stripe, /api/webhooks/unlock-pack, or Founder Admin Manual Unlock.
 */
export async function triggerN8nWhatsAppWebhook(
  payload: N8nNotificationPayload,
): Promise<{ triggered: boolean; status?: number; error?: string }> {
  const webhookUrl = (process.env.N8N_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return { triggered: false, error: "N8N_WEBHOOK_URL is not configured in .env.local" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GTF-Source": "gtf-exam-portal",
      },
      body: JSON.stringify({
        student_name: payload.student_name,
        email: payload.email,
        whatsapp_phone: payload.whatsapp_phone,
        product_title: payload.product_title,
        product_slug: payload.product_slug,
        access_link: payload.access_link,
        payment_provider: payload.payment_provider || "gtf-checkout",
        payment_reference: payload.payment_reference || `GTF-${Date.now()}`,
        currency: payload.currency || "INR",
        amount_paid: payload.amount_paid ?? 0,
        triggered_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(6000),
    });
    return { triggered: res.ok, status: res.status };
  } catch (err) {
    return {
      triggered: false,
      error: err instanceof Error ? err.message : "n8n webhook unreachable",
    };
  }
}

export async function readCustomProducts(): Promise<Product[]> {
  try {
    const raw = await fs.readFile(CUSTOM_PRODUCTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomProduct(product: Product & { drivePath?: string }): Promise<{
  persistedTo: "supabase" | "local-store";
}> {
  await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
  const existing = await readCustomProducts();
  const filtered = existing.filter((p) => p.slug !== product.slug);
  filtered.unshift(product);
  await fs.writeFile(CUSTOM_PRODUCTS_FILE, JSON.stringify(filtered, null, 2), "utf8");

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { error } = await supabase.from("products").upsert(
        {
          division_id: product.divisionId || "sprachakademie",
          slug: product.slug,
          title: product.title,
          description: product.description,
          product_type: product.type as ProductType,
          cefr_level: product.level || null,
          track: product.track || null,
          resource_id: product.resourceId,
          drive_path: product.drivePath || null,
          price_eur: product.priceEur,
          price_inr: product.priceInr,
          is_free: product.isFree,
          active: true,
        },
        { onConflict: "slug" },
      );
      if (!error) {
        return { persistedTo: "supabase" };
      }
    } catch (err) {
      console.warn("[gtf] Supabase custom product upsert fallback:", err);
    }
  }

  return { persistedTo: "local-store" };
}

export async function getAllMergedProducts(): Promise<Product[]> {
  const base = getAllProducts();
  const custom = await readCustomProducts();
  const bySlug = new Map<string, Product>();
  for (const item of custom) {
    bySlug.set(item.slug, {
      ...item,
      divisionId: item.divisionId || "sprachakademie",
    });
  }
  for (const item of base) {
    if (!bySlug.has(item.slug)) {
      bySlug.set(item.slug, item);
    }
  }
  return Array.from(bySlug.values());
}

const DEFAULT_SEED_STUDENTS: StudentRecord[] = [
  {
    email: "demo@gatewaytofuture.com",
    fullName: "Rahul Verma (Demo Student)",
    phone: "+91 98765 43210",
    targetLevel: "b1",
    createdAt: "2026-11-01T10:00:00.000Z",
  },
  {
    email: "priya.sharma@gatewaytofuture.com",
    fullName: "Priya Sharma (B2 Pflege Track)",
    phone: "+91 98111 22334",
    targetLevel: "b2",
    createdAt: "2026-11-04T14:30:00.000Z",
  },
  {
    email: "aman.singh@gatewaytofuture.com",
    fullName: "Aman Deep Singh (Berlin Ausbildung)",
    phone: "+91 97170 55667",
    targetLevel: "b1",
    createdAt: "2026-11-06T09:15:00.000Z",
  },
];

export async function readLocalStudents(): Promise<StudentRecord[]> {
  try {
    const raw = await fs.readFile(STUDENTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_SEED_STUDENTS;
}

export async function upsertLocalStudent(student: {
  email: string;
  fullName?: string;
  phone?: string;
  targetLevel?: Level;
}): Promise<StudentRecord> {
  const cleanEmail = student.email.toLowerCase().trim();
  const list = await readLocalStudents();
  const idx = list.findIndex((s) => s.email.toLowerCase() === cleanEmail);
  const existing = idx >= 0 ? list[idx] : null;

  const updated: StudentRecord = {
    email: cleanEmail,
    fullName: student.fullName?.trim() || existing?.fullName || cleanEmail.split("@")[0],
    phone: student.phone?.trim() || existing?.phone || "+91 98000 00000",
    targetLevel: student.targetLevel || existing?.targetLevel || "b1",
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }

  try {
    await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
    await fs.writeFile(STUDENTS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch {
    try {
      await fs.writeFile(path.join(os.tmpdir(), "gtf_students.json"), JSON.stringify(list, null, 2), "utf8");
    } catch {
      // serverless memory fallback
    }
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("users").upsert(
        {
          email: cleanEmail,
          full_name: updated.fullName,
          phone: updated.phone,
          target_level: updated.targetLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    } catch {
      // ignore offline
    }
  }

  return updated;
}

export async function readDriveSyncMap(): Promise<Record<string, { syncedAt: string; drivePath: string; status: string }>> {
  try {
    const raw = await fs.readFile(DRIVE_SYNC_LOG_FILE, "utf8");
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export async function recordDriveSync(
  filename: string,
  info: { syncedAt: string; drivePath: string; status: string },
): Promise<void> {
  const map = await readDriveSyncMap();
  map[filename] = info;
  await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
  await fs.writeFile(DRIVE_SYNC_LOG_FILE, JSON.stringify(map, null, 2), "utf8");
}
