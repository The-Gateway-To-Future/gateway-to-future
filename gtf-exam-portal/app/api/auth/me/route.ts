import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getVerifiedSession(req);
    if (!session) {
      return NextResponse.json(
        { authenticated: false, success: false, error: "Session expired or invalid." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      success: true,
      user: {
        id: session.id,
        uid: session.uid,
        studentId: session.studentId,
        name: session.name,
        email: session.email,
        phone: session.phone,
        course: session.course || "sprachakademie",
        role: session.role,
      },
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, success: false, error: "Authentication verification failed." },
      { status: 500 },
    );
  }
}
