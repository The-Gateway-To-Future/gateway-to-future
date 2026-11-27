import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEALTH_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "healthy",
      service: "gtf-exam-portal",
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: HEALTH_HEADERS,
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: HEALTH_HEADERS,
  });
}
