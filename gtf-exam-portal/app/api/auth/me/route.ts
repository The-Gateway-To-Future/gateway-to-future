import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyStudentSessionToken } from "@/lib/server/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const cookieToken =
      cookieStore.get("gtf_session")?.value || cookieStore.get("gtf_student_session")?.value;

    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");

    const token = cookieToken || bearerToken || queryToken;

    if (!token) {
      return NextResponse.json({ authenticated: false, success: false }, { status: 401 });
    }

    const payload = verifyStudentSessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { authenticated: false, success: false, error: "Session expired or invalid." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      success: true,
      user: {
        id: payload.id,
        studentId: payload.studentId || (payload.id?.startsWith("GTF-") ? payload.id : `GTF-2026-${payload.id.slice(-4).toUpperCase()}`),
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        course: payload.course || "sprachakademie",
        role: payload.role || "student",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { authenticated: false, success: false, error: "Authentication verification failed." },
      { status: 500 },
    );
  }
}
