import { NextResponse } from "next/server";
import { firebaseConfig } from "@/lib/firebase";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  getLocalStudent,
  normalizeEmail,
  signStudentSessionToken,
  verifyPassword,
} from "@/lib/server/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email || "";
    const email = normalizeEmail(rawEmail);
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const firebaseIdToken =
      typeof body.firebaseIdToken === "string" ? body.firebaseIdToken.trim() : "";
    const firebaseUid = typeof body.firebaseUid === "string" ? body.firebaseUid.trim() : "";

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
    let studentId = "";
    let name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : email.split("@")[0];
    let phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : "";
    let course = "sprachakademie";

    // 0. Firebase Verified Identity Lookup (Primary for verified Firebase Auth sessions)
    if (firebaseIdToken) {
      try {
        const lookupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: firebaseIdToken }),
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
        if (!lookupRes.ok || !fbUser) {
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
        studentId = fbUser.localId || firebaseUid || "";
        name = fbUser.displayName || name;

        const localStudent = await getLocalStudent(email);
        if (localStudent) {
          studentId = localStudent.id || studentId;
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

    // 1. Secondary Auth: Supabase Auth Verification (when not already authenticated via Firebase)
    const supabaseAdmin = !authenticated ? getSupabaseServerClient() : null;
    if (supabaseAdmin) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });

        if (!authError && authData?.user) {
          authenticated = true;
          studentId = authData.user.id;
          const meta = authData.user.user_metadata || {};
          name = meta.full_name || meta.name || name;
          phone = meta.phone || phone;
          course = meta.course || meta.targetCourse || meta.targetDivision || course;

          // Check profile in public.users if exists
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

    // 1b. Server-side Firebase IdentityToolkit Password Verification
    if (!authenticated && !firebaseIdToken && password) {
      try {
        const fbSignInRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
          },
        );
        const fbSignInData = (await fbSignInRes.json().catch(() => null)) as {
          localId?: string;
          displayName?: string;
        } | null;
        if (fbSignInRes.ok && fbSignInData?.localId) {
          authenticated = true;
          studentId = fbSignInData.localId;
          name = fbSignInData.displayName || name;
        }
      } catch (fbSignInErr) {
        console.warn("[gtf-auth] Firebase signInWithPassword fallback notice:", fbSignInErr);
      }
    }

    // 2. Local In-Memory Fallback
    if (!authenticated) {
      const localStudent = await getLocalStudent(email);
      if (localStudent && verifyPassword(password, localStudent.passwordHash)) {
        authenticated = true;
        studentId = localStudent.id;
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
    const studentIdentifier = studentId.startsWith("GTF-") ? studentId : `GTF-2026-${studentId.slice(-4).toUpperCase()}`;
    const userPayload = {
      id: studentId,
      studentId: studentIdentifier,
      name,
      email,
      phone,
      course,
      role: "student" as const,
    };

    const token = signStudentSessionToken(userPayload);

    // 5. Build HTTP 200 response with Signed HTTP-Only Cookie
    const response = NextResponse.json({
      success: true,
      ok: true,
      user: userPayload,
      token,
      message: "Authenticated successfully.",
    });

    // Set HTTP-only cookie gtf_session (and gtf_student_session)
    response.cookies.set("gtf_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set("gtf_student_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    console.error("[gtf-auth] Login error:", err);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: err instanceof Error ? err.message : "Authentication failed.",
      },
      { status: 500 },
    );
  }
}
