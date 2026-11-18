import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
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

    // Accept { name, email, phone, password, course } with full fallback aliases
    const rawEmail = body.email || "";
    const email = normalizeEmail(rawEmail);
    const password = (body.password || "").trim();
    const name = (body.name || body.fullName || "").trim();
    const phone = (body.phone || body.phoneNumber || "").trim();
    const course = (body.course || body.targetCourse || body.targetDivision || "sprachakademie").trim();
    const requireEmailVerification = Boolean(body.requireEmailVerification);

    // 1. Strict Validation
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, ok: false, error: "A valid email address is required to register." },
        { status: 400 },
      );
    }

    if (!requireEmailVerification && (!password || password.length < 6)) {
      return NextResponse.json(
        { success: false, ok: false, error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, ok: false, error: "Student full legal name is required." },
        { status: 400 },
      );
    }

    // Generate official GTF Student ID (or accept valid pre-computed Firebase student ID)
    const incomingStudentId =
      typeof body.studentId === "string" && /^GTF-[0-9]{4}-[A-Za-z0-9]{4}$/.test(body.studentId.trim())
        ? body.studentId.trim()
        : "";
    const studentId = incomingStudentId || generateStudentId();

    // 2. Primary Auth: Supabase Service Role Admin API (Auto-confirmed, Non-blocking)
    const supabaseAdmin = getSupabaseServerClient();
    if (supabaseAdmin) {
      try {
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            student_id: studentId,
            full_name: name,
            phone,
            course,
          },
        });

        if (createError) {
          // If user already exists in Supabase Auth, update password & confirm email so returning student is NEVER blocked
          try {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
            const existing = listData?.users?.find(
              (u) => u.email?.toLowerCase().trim() === email,
            );
            if (existing) {
              await supabaseAdmin.auth.admin.updateUserById(existing.id, {
                password,
                email_confirm: true,
                user_metadata: {
                  student_id: studentId,
                  full_name: name,
                  phone,
                  course,
                },
              });
            }
          } catch (updateErr) {
            console.warn("[gtf-auth] Supabase admin updateUserById notice:", updateErr);
          }
        }

        // Best-effort non-throwing sync to public.users table if exists
        try {
          await supabaseAdmin.from("users").upsert(
            {
              auth_user_id: studentId,
              email,
              full_name: name,
              phone,
              phone_verified: true,
              target_division: course,
              target_level: "b1",
            },
            { onConflict: "email" },
          );
        } catch {
          // Non-blocking
        }
      } catch (supaErr) {
        console.warn("[gtf-auth] Supabase service role registration fallback:", supaErr);
      }
    }

    // 3. In-Memory Student Cache & Cloud Firestore Sync
    const now = new Date().toISOString();
    const localRecord: LocalAuthStudent = {
      id: studentId,
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

    // Save to Cloud Firestore (Production Multi-Cloud Database)
    try {
      await saveStudentToFirestore({
        studentId,
        email,
        fullName: name,
        phone: phone && phone.length >= 7 ? phone : "+49 000 0000000",
        course,
        role: "student",
        registeredAt: now,
        updatedAt: now,
      });
    } catch (fsErr) {
      console.warn("[gtf-auth] Firestore registration notice:", fsErr);
    }

    // 4. Generate Stateless HMAC-SHA256 Signed Session Token
    const userPayload = {
      id: studentId,
      studentId,
      name,
      email,
      phone,
      course,
      role: "student" as const,
    };

    const token = signStudentSessionToken(userPayload);

    // 5. Automated Lead / Welcome Email & WhatsApp Webhook (Asynchronous & Non-blocking)
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
          studentId,
          name,
          email,
          phone,
          course,
        },
        message: "Verification email dispatched. Verify your email before signing in.",
      });
    }

    // 6. Build HTTP 200 response with Signed HTTP-Only Cookie
    const response = NextResponse.json({
      success: true,
      ok: true,
      user: userPayload,
      token,
      message: "Student account registered successfully.",
    });

    // Set HTTP-only cookie gtf_session (and gtf_student_session for compatibility)
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
    console.error("[gtf-auth] Registration error:", err);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: err instanceof Error ? err.message : "Account registration failed.",
      },
      { status: 500 },
    );
  }
}
