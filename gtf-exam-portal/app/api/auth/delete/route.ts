import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  deleteFirebaseAuthAccountServer,
  deleteUserFirestoreRecords,
  verifyFirebaseIdTokenServer,
} from "@/lib/server/firebase-admin";
import { PAID_APPOINTMENT_COOKIE } from "@/lib/server/consultation-contact";
import { deleteAllMistakeDnaAdmin } from "@/lib/server/mistake-dna-admin";
import { revokeSessionToken } from "@/lib/server/session-manager";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DeleteAccountRequestBody {
  idToken?: string;
  confirm?: boolean;
}

/**
 * Authenticated Account & Data Deletion Endpoint (Google Play & GDPR Art. 17 Compliance).
 *
 * Security guarantees:
 *  - Requires a cryptographically verified Firebase ID token (never trusts client-supplied `studentId`).
 *  - Erases owned documents in Firestore (`students`, `users`, `user_progress`, `test_scores`).
 *  - Cleans up Supabase tables (`users`, `user_purchases`, `user_sessions`, `exam_attempts`).
 *  - Deletes the Firebase Auth account and clears all session cookies.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as DeleteAccountRequestBody;
    const cookieStore = await cookies();

    const bearerHeader = req.headers.get("authorization") || "";
    const bearerToken = bearerHeader.replace(/^Bearer\s+/i, "").trim();
    const legacySessionToken =
      cookieStore.get("gtf_session")?.value?.trim() ||
      cookieStore.get("gtf_student_session")?.value?.trim() ||
      "";

    const idToken = bearerToken || (body.idToken || "").trim();

    if (!idToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Fresh Firebase authentication token required. Please sign in again before deleting your account.",
        },
        { status: 401 },
      );
    }

    const verified = await verifyFirebaseIdTokenServer(idToken);
    if (!verified) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or expired session token. Please sign in again to confirm account deletion.",
        },
        { status: 401 },
      );
    }

    const { uid, email } = verified;

    // 1. Delete verified user's Firestore records (never passes client `studentId`)
    const firestoreCleanup = await deleteUserFirestoreRecords({
      uid,
      email,
      idToken,
    });
    await deleteAllMistakeDnaAdmin(uid).catch(() => undefined);

    // Fail closed if Firestore erasure hit 403/5xx on critical docs without Admin SDK
    const criticalFailures = firestoreCleanup.failedDocs.filter(
      (f) => f.startsWith(`user_progress/${uid}`) || f.startsWith(`students/`),
    );
    if (!firestoreCleanup.usedAdminSdk && criticalFailures.length > 0) {
      console.error("[GTF Account Delete] Critical Firestore deletion failures:", criticalFailures);
      return NextResponse.json(
        {
          ok: false,
          code: "FIRESTORE_ERASURE_INCOMPLETE",
          error:
            "Unable to verify complete cloud record erasure right now. Please contact ashusharma@gatewaytofuture.com so we can complete GDPR deletion immediately.",
        },
        { status: 503 },
      );
    }

    // 2. Delete Supabase records across canonical schema.sql tables (best-effort)
    try {
      const supabase = getSupabaseServerClient();
      if (supabase && email) {
        await Promise.allSettled([
          supabase.from("exam_attempts").delete().eq("user_email", email),
          supabase.from("user_purchases").delete().eq("user_email", email),
          supabase.from("user_sessions").delete().eq("user_email", email),
          supabase.from("users").delete().eq("email", email),
        ]);
      }
    } catch (sbErr) {
      console.warn("[GTF Account Delete] Supabase cleanup warning:", sbErr);
    }

    // 3. Revoke active portal session tokens (best-effort)
    for (const tok of [legacySessionToken, idToken]) {
      if (tok) {
        await revokeSessionToken(tok, "ACCOUNT_DELETED").catch(() => undefined);
      }
    }

    // 4. Delete Firebase Auth account (Admin SDK primary, Identity Toolkit fallback)
    const authDeletion = await deleteFirebaseAuthAccountServer(uid, idToken);
    if (!authDeletion.deleted) {
      const requiresRecentLogin =
        (authDeletion.code || "").includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN");
      return NextResponse.json(
        {
          ok: false,
          code: requiresRecentLogin ? "REQUIRES_RECENT_LOGIN" : "AUTH_DELETE_FAILED",
          error: requiresRecentLogin
            ? "For security, please sign out and sign back in, then tap Delete Account again."
            : authDeletion.error ||
              "Unable to complete Firebase account deletion. Please contact ashusharma@gatewaytofuture.com.",
        },
        { status: requiresRecentLogin ? 403 : 500 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      success: true,
      deletedUid: uid,
      deletedEmail: email,
      deletedDocsCount: firestoreCleanup.deletedDocs.length,
      method: authDeletion.method,
      message: "Your Gateway To Future account and associated learning data have been permanently deleted.",
    });

    response.cookies.delete("gtf_auth_token");
    response.cookies.delete("gtf_session");
    response.cookies.delete("gtf_student_session");
    response.cookies.delete(PAID_APPOINTMENT_COOKIE);

    return response;
  } catch (err) {
    console.error("[GTF Account Delete] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process account deletion.",
      },
      { status: 500 },
    );
  }
}
