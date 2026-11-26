import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUnlockedProductSlugs } from "@/lib/server/catalog";
import {
  CONSULTATION_ELIGIBLE_SLUGS,
  getDirectDeskContact,
  PAID_APPOINTMENT_COOKIE,
  verifyPaidAppointmentToken,
} from "@/lib/server/consultation-contact";
import { verifyStudentSessionToken } from "@/lib/server/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const paidCookie = cookieStore.get(PAID_APPOINTMENT_COOKIE)?.value;
    const verifiedBooking = verifyPaidAppointmentToken(paidCookie);

    if (verifiedBooking) {
      return NextResponse.json({
        unlocked: true,
        source: "paid_appointment",
        bookingRef: verifiedBooking.bookingRef,
        appointment: {
          email: verifiedBooking.email,
          fullName: verifiedBooking.fullName || "GTF Candidate",
          pathway: verifiedBooking.pathway || "Germany Pathway Advisory",
          preferredSlot: verifiedBooking.preferredSlot || "Scheduled Berlin/IST Slot",
          paidAt: verifiedBooking.paidAt,
        },
        contact: getDirectDeskContact(),
      });
    }

    const sessionCookie =
      cookieStore.get("gtf_session")?.value || cookieStore.get("gtf_student_session")?.value;
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const session = verifyStudentSessionToken(sessionCookie || bearerToken);

    if (session?.email && process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE !== "true") {
      const unlockedSlugs = await getUnlockedProductSlugs(session.email);
      const hasPaidConsultationAccess = Array.from(CONSULTATION_ELIGIBLE_SLUGS).some((slug) =>
        unlockedSlugs.has(slug),
      );

      if (hasPaidConsultationAccess) {
        return NextResponse.json({
          unlocked: true,
          source: "verified_entitlement",
          bookingRef: "GTF-PRO-VERIFIED",
          appointment: {
            email: session.email,
            fullName: session.name || "GTF Candidate",
            pathway: "Verified GTF Paid Member",
            preferredSlot: "Priority Advisory Access",
          },
          contact: getDirectDeskContact(),
        });
      }
    }

    return NextResponse.json({
      unlocked: false,
      contact: null,
      message:
        "Direct phone and WhatsApp contact details are disclosed only after paid appointment booking and payment confirmation.",
    });
  } catch (err) {
    console.error("[GTF Appointment Contact Gate] Error:", err);
    return NextResponse.json({
      unlocked: false,
      contact: null,
      message:
        "Direct phone and WhatsApp contact details are disclosed only after paid appointment booking and payment confirmation.",
    });
  }
}
