import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { GTF_LEGACY_SESSION_COOKIE, GTF_SESSION_COOKIE } from "@/lib/server/auth-edge";
import { verifyFirebaseIdTokenServer } from "@/lib/server/firebase-admin";
import {
  getLocalStudent,
  hashPassword,
  normalizeEmail,
  saveLocalStudent,
  signStudentSessionToken,
  triggerStudentWelcomeWebhook,
  type LocalAuthStudent,
} from "@/lib/server/student-auth";
import {
  generateStudentId,
  saveStudentToFirestore,
} from "@/lib/server/firestore-student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawEmail = body.email || "";
    const email = normalizeEmail(rawEmail);
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const name = (body.name || body.fullName || "").trim();
    const phone = (body.phone || body.phoneNumber || "").trim();
    const course = (
      body.course ||
      body.targetCourse ||
      body.targetDivision ||
      "sprachakademie"
    ).trim();
    const requireEmailVerification = Boolean(body.requireEmailVerification);
    const firebaseIdToken =
      typeof body.firebaseIdToken === "string" ? body.firebaseIdToken.trim() : "";

    // 1. Strict Validation
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, ok: false, error: "A valid email address is required to register." },
        { status: 400 },
      );
    }

    if (!name || name.length > 100) {
      return NextResponse.json(
        { success: false, ok: false, error: "Student full legal name is required." },
        { status: 400 },
      );
    }

    // 2. Firebase Post-Signup Profile Sync Path (caller MUST prove ownership of the newly created Firebase UID)
    let verifiedUid = "";
    if (requireEmailVerification) {
      if (!firebaseIdToken) {
        return NextResponse.json(
          {
            success: false,
            ok: false,
            error: "Verified Firebase registration token is required.",
          },
          { status: 401 },
        );
      }

      const verifiedFb = await verifyFirebaseIdTokenServer(firebaseIdToken);
      if (!verifiedFb || normalizeEmail(verifiedFb.email) !== email) {
        return NextResponse.json(
          {
            success: false,
            ok: false,
            error: "Invalid registration token or email mismatch.",
          },
          { status: 401 },
        );
      }

      verifiedUid = verifiedFb.uid;
    } else {
      // Non-Firebase fallback registration: strictly requires a strong password & MUST NOT overwrite existing users
      if (!password || password.length < 6) {
        return NextResponse.json(
          { success: false, ok: false, error: "Password must be at least 6 characters." },
          { status: 400 },
        );
      }
      const existingLocal = await getLocalStudent(email);
      if (existingLocal) {
        return NextResponse.json(
          {
            success: false,
            ok: false,
            code: "EMAIL_ALREADY_EXISTS",
            error: "An account with this email already exists. Please sign in or reset your password.",
          },
          { status: 409 },
        );
      }
    }

    const derivedFromUid = verifiedUid
      ? `GTF-2026-${verifiedUid.slice(-4).toUpperCase()}`
      : "";
    const studentId = derivedFromUid || generateStudentId();
    const canonicalUid = verifiedUid || studentId;

    // 3. Optional Supabase Mirror (NEVER overwrite existing users' passwords!)
    const supabaseAdmin = getSupabaseServerClient();
    if (supabaseAdmin && !requireEmailVerification) {
      try {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: {
            student_id: studentId,
            full_name: name,
            phone,
            course,
          },
        });

        if (createError) {
          const msg = (createError.message || "").toLowerCase();
          if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
            return NextResponse.json(
              {
                success: false,
                ok: false,
                code: "EMAIL_ALREADY_EXISTS",
                error: "An account with this email already exists. Please sign in or reset your password.",
              },
              { status: 409 },
            );
          }
        } else if (created?.user?.id) {
          try {
            await supabaseAdmin.from("users").upsert(
              {
                auth_user_id: created.user.id,
                email,
                full_name: name,
                phone,
                phone_verified: false,
                target_division: course,
                target_level: "b1",
              },
              { onConflict: "email" },
            );
          } catch {
            // Non-blocking
          }
        }
      } catch (supaErr) {
        console.warn("[gtf-auth] Supabase service role registration fallback:", supaErr);
      }
    }

    // 4. Local dev cache + Cloud Firestore sync (using verified Firebase token when available)
    const now = new Date().toISOString();
    if (!requireEmailVerification && password) {
      const localRecord: LocalAuthStudent = {
        id: canonicalUid,
        uid: canonicalUid,
        studentId,
        name,
        email,
        phone,
        course,
        role: "student",
        passwordHash: hashPassword(password),
        createdAt: now,
        updatedAt: now,
      };
      await saveLocalStudent(localRecord);
    }

    try {
      await saveStudentToFirestore(
        {
          studentId,
          email,
          fullName: name,
          phone: phone && phone.length >= 7 ? phone : "+49 000 0000000",
          course,
          role: "student",
          registeredAt: now,
          updatedAt: now,
        },
        firebaseIdToken || undefined,
      );
    } catch (fsErr) {
      console.warn("[gtf-auth] Firestore registration notice:", fsErr);
    }

    // 5. Single Deduplicated Server-Side Welcome Webhook
    triggerStudentWelcomeWebhook({
      studentId,
      name,
      email,
      phone,
      course,
    });

    if (requireEmailVerification) {
      return NextResponse.json({
        success: true,
        ok: true,
        verificationRequired: true,
        user: {
          id: canonicalUid,
          uid: canonicalUid,
          studentId,
          name,
          email,
          phone,
          course,
        },
        message: "Verification email dispatched. Verify your email before signing in.",
      });
    }

    // Only issue immediate session in local non-production fallback mode
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({
        success: true,
        ok: true,
        verificationRequired: true,
        user: {
          id: canonicalUid,
          uid: canonicalUid,
          studentId,
          name,
          email,
          phone,
          course,
        },
        message: "Account created. Please verify your email before signing in.",
      });
    }

    const userPayload = {
      id: canonicalUid,
      uid: canonicalUid,
      studentId,
      name,
      email,
      phone,
      course,
      role: "student" as const,
    };

    const token = signStudentSessionToken(userPayload);
    const response = NextResponse.json({
      success: true,
      ok: true,
      user: userPayload,
      message: "Student account registered successfully.",
    });

    const cookieOpts = {
      httpOnly: true,
      secure: false,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    };
    response.cookies.set(GTF_SESSION_COOKIE, token, cookieOpts);
    response.cookies.set(GTF_LEGACY_SESSION_COOKIE, token, cookieOpts);

    return response;
  } catch (err) {
    console.error("[gtf-auth] Registration error:", err);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "Account registration failed.",
      },
      { status: 500 },
    );
  }
}
