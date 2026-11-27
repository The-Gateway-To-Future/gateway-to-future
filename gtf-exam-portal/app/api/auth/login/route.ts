import { NextResponse } from "next/server";
import { firebaseConfig } from "@/lib/firebase";
import { getSupabaseServerClient } from "@/lib/supabase";
import { GTF_LEGACY_SESSION_COOKIE, GTF_SESSION_COOKIE } from "@/lib/server/auth-edge";
import {
  getLocalStudent,
  normalizeEmail,
  signStudentSessionToken,
  verifyPassword,
} from "@/lib/server/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOTSTRAP_ADMIN_EMAILS = new Set([
  "ashusharma@gatewaytofuture.com",
  "skour8786@gmail.com",
]);

async function lookupFirebaseAccountByIdToken(idToken: string): Promise<{
  ok: boolean;
  localId?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
}> {
  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const lookupData = (await lookupRes.json().catch(() => null)) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
      displayName?: string;
    }>;
  } | null;

  const fbUser = lookupData?.users?.[0];
  if (!lookupRes.ok || !fbUser?.localId) {
    return { ok: false };
  }
  return {
    ok: true,
    localId: fbUser.localId,
    email: fbUser.email,
    emailVerified: Boolean(fbUser.emailVerified),
    displayName: fbUser.displayName,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email || "";
    const email = normalizeEmail(rawEmail);
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const firebaseIdToken =
      typeof body.firebaseIdToken === "string" ? body.firebaseIdToken.trim() : "";
    const rememberMe = body.rememberMe !== false;

    if (!email || (!password && !firebaseIdToken)) {
      return NextResponse.json(
        { success: false, ok: false, error: "Email and credentials are required." },
        { status: 400 },
      );
    }

    if (!firebaseIdToken && password.length < 6) {
      return NextResponse.json(
        { success: false, ok: false, error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    let authenticated = false;
    let firebaseUid = "";
    let studentId = "";
    let name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : email.split("@")[0];
    let phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : "";
    let course = "sprachakademie";

    // 0. Primary: Cryptographically Verified Firebase Identity Token
    if (firebaseIdToken) {
      try {
        const fbUser = await lookupFirebaseAccountByIdToken(firebaseIdToken);
        if (!fbUser.ok || !fbUser.localId) {
          return NextResponse.json(
            {
              success: false,
              ok: false,
              error: "Invalid or expired authentication token. Please sign in again.",
            },
            { status: 401 },
          );
        }

        if (normalizeEmail(fbUser.email || "") !== email) {
          return NextResponse.json(
            { success: false, ok: false, error: "Token email mismatch." },
            { status: 401 },
          );
        }

        if (!fbUser.emailVerified) {
          return NextResponse.json(
            {
              success: false,
              ok: false,
              code: "EMAIL_NOT_VERIFIED",
              error: "Please verify your email address before accessing the GTF Portal.",
            },
            { status: 403 },
          );
        }

        authenticated = true;
        firebaseUid = fbUser.localId;
        studentId = `GTF-2026-${fbUser.localId.slice(-4).toUpperCase()}`;
        name = fbUser.displayName || name;

        const localStudent = await getLocalStudent(email);
        if (localStudent) {
          studentId = localStudent.studentId || localStudent.id || studentId;
          name = localStudent.name || name;
          phone = localStudent.phone || phone;
          course = localStudent.course || course;
        }
      } catch (fbLookupErr) {
        console.warn("[GTF Login] Firebase Identity Toolkit lookup failed:", fbLookupErr);
        return NextResponse.json(
          {
            success: false,
            ok: false,
            error: "Unable to verify Firebase session token.",
          },
          { status: 503 },
        );
      }
    }

    // 1. Secondary Auth: Supabase Auth Verification (for pre-migration accounts)
    const supabaseAdmin = !authenticated ? getSupabaseServerClient() : null;
    if (supabaseAdmin) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });

        if (!authError && authData?.user) {
          if (!authData.user.email_confirmed_at) {
            return NextResponse.json(
              {
                success: false,
                ok: false,
                code: "EMAIL_NOT_VERIFIED",
                error: "Please verify your email address before signing in.",
              },
              { status: 403 },
            );
          }
          authenticated = true;
          firebaseUid = authData.user.id;
          studentId = authData.user.id;
          const meta = authData.user.user_metadata || {};
          name = meta.full_name || meta.name || name;
          phone = meta.phone || phone;
          course = meta.course || meta.targetCourse || meta.targetDivision || course;

          try {
            const { data: profile } = await supabaseAdmin
              .from("users")
              .select("full_name, phone, target_division")
              .eq("email", email)
              .maybeSingle();
            if (profile) {
              name = profile.full_name || name;
              phone = profile.phone || phone;
              course = profile.target_division || course;
            }
          } catch {
            // Non-blocking
          }
        }
      } catch (err) {
        console.warn("[gtf-auth] Supabase signInWithPassword fallback notice:", err);
      }
    }

    // 1b. Server-side Firebase IdentityToolkit Password Verification (strictly enforces emailVerified)
    if (!authenticated && !firebaseIdToken && password) {
      try {
        const fbSignInRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
            signal: AbortSignal.timeout(8000),
          },
        );
        const fbSignInData = (await fbSignInRes.json().catch(() => null)) as {
          localId?: string;
          idToken?: string;
          displayName?: string;
        } | null;

        if (fbSignInRes.ok && fbSignInData?.localId && fbSignInData?.idToken) {
          const verifiedLookup = await lookupFirebaseAccountByIdToken(fbSignInData.idToken);
          if (!verifiedLookup.ok || !verifiedLookup.emailVerified) {
            return NextResponse.json(
              {
                success: false,
                ok: false,
                code: "EMAIL_NOT_VERIFIED",
                error: "Please verify your email address before accessing the GTF Portal.",
              },
              { status: 403 },
            );
          }

          authenticated = true;
          firebaseUid = fbSignInData.localId;
          studentId = `GTF-2026-${fbSignInData.localId.slice(-4).toUpperCase()}`;
          name = fbSignInData.displayName || verifiedLookup.displayName || name;
        }
      } catch (fbSignInErr) {
        console.warn("[gtf-auth] Firebase signInWithPassword fallback notice:", fbSignInErr);
      }
    }

    // 2. Local In-Memory Fallback (development only)
    if (!authenticated && process.env.NODE_ENV !== "production") {
      const localStudent = await getLocalStudent(email);
      if (localStudent && verifyPassword(password, localStudent.passwordHash)) {
        authenticated = true;
        firebaseUid = localStudent.uid || localStudent.id;
        studentId = localStudent.studentId || localStudent.id;
        name = localStudent.name || name;
        phone = localStudent.phone || phone;
        course = localStudent.course || course;
      }
    }

    // 3. Reject invalid credentials
    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "Invalid email or password. Please check your credentials or register a new account.",
        },
        { status: 401 },
      );
    }

    // 4. Generate Stateless HMAC-SHA256 Signed Session Token
    const canonicalUid = firebaseUid || studentId;
    const studentIdentifier = studentId.startsWith("GTF-")
      ? studentId
      : `GTF-2026-${canonicalUid.slice(-4).toUpperCase()}`;
    const role: "student" | "admin" = BOOTSTRAP_ADMIN_EMAILS.has(email) ? "admin" : "student";

    const userPayload = {
      id: canonicalUid,
      uid: canonicalUid,
      studentId: studentIdentifier,
      name,
      email,
      phone,
      course,
      role,
    };

    const ttlDays = rememberMe ? 30 : 1;
    const token = signStudentSessionToken(userPayload, ttlDays);
    const maxAgeSeconds = 60 * 60 * 24 * ttlDays;

    // 5. Build HTTP 200 response with Signed HttpOnly Cookie
    const response = NextResponse.json({
      success: true,
      ok: true,
      user: userPayload,
      message: "Authenticated successfully.",
    });

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: maxAgeSeconds,
    };

    response.cookies.set(GTF_SESSION_COOKIE, token, cookieOpts);
    response.cookies.set(GTF_LEGACY_SESSION_COOKIE, token, cookieOpts);
    // Purge legacy non-HttpOnly cookie so tokens are never readable by JS
    response.cookies.delete("gtf_auth_token");

    return response;
  } catch (err) {
    console.error("[gtf-auth] Login error:", err);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "Authentication failed.",
      },
      { status: 500 },
    );
  }
}
