import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  deleteFirebaseAuthAccountServer,
  deleteUserFirestoreRecords,
  verifyFirebaseIdTokenServer,
} from "@/lib/server/firebase-admin";
import { revokeSessionToken } from "@/lib/server/session-manager";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DeleteAccountRequestBody {
  idToken?: string;
  studentId?: string;
  confirm?: boolean;
}

/**
 * Authenticated Account & Data Deletion Endpoint (Google Play & GDPR Art. 17 Compliance).
 *
 * 1. Verifies the caller's Firebase ID token (Bearer header, body, or synced `gtf_auth_token` cookie).
 * 2. Deletes user documents in Firestore (`students`, `users`, `user_progress`).
 * 3. Deletes associated rows in Supabase (when configured) and revokes active sessions.
 * 4. Deletes the Firebase Authentication account via Firebase Admin SDK (with Identity Toolkit fallback).
 * 5. Clears all session cookies.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as DeleteAccountRequestBody;
    const cookieStore = await cookies();

    const bearerHeader = req.headers.get("authorization") || "";
    const bearerToken = bearerHeader.replace(/^Bearer\s+/i, "").trim();
    const cookieAuthToken = cookieStore.get("gtf_auth_token")?.value?.trim() || "";
    const legacySessionToken =
      cookieStore.get("gtf_session")?.value?.trim() ||
      cookieStore.get("gtf_student_session")?.value?.trim() ||
      "";

    const idToken = bearerToken || (body.idToken || "").trim() || cookieAuthToken;

    if (!idToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required. Please sign in again before deleting your account.",
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

    // 1. Delete Firestore profile, student, and progress documents
    const firestoreCleanup = await deleteUserFirestoreRecords({
      uid,
      email,
      studentId: body.studentId,
      idToken,
    });

    // 2. Delete Supabase records if configured (best-effort)
    try {
      const supabase = getSupabaseServerClient();
      if (supabase && email) {
        await Promise.allSettled([
          supabase.from("students").delete().eq("email", email),
          supabase.from("unlocks").delete().eq("user_email", email),
          supabase.from("user_sessions").delete().eq("user_email", email),
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
            : authDeletion.error || "Unable to complete Firebase account deletion. Please contact ashusharma@gatewaytofuture.com.",
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

    return response;
  } catch (err) {
    console.error("[GTF Account Delete] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to process account deletion.",
      },
      { status: 500 },
    );
  }
}
