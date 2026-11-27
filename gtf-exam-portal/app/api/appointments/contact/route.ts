import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/server/auth-session";
import { getPaidUnlockedProductSlugs } from "@/lib/server/catalog";
import {
  CONSULTATION_ELIGIBLE_SLUGS,
  getDirectDeskContact,
  PAID_APPOINTMENT_COOKIE,
  verifyPaidAppointmentToken,
} from "@/lib/server/consultation-contact";

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

    const session = await getVerifiedSession(req);
    if (session?.email) {
      const paidSlugs = await getPaidUnlockedProductSlugs(session.email, session.uid);
      const hasPaidConsultationAccess = Array.from(CONSULTATION_ELIGIBLE_SLUGS).some((slug) =>
        paidSlugs.has(slug),
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
