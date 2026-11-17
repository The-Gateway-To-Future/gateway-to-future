import { notFound } from "next/navigation";
import SetupClient from "./SetupClient";

export const dynamic = "force-dynamic";

/**
 * Gateway To Future (GTF) — Visual Setup Wizard Guard
 * Strictly blocked in production environments (`NODE_ENV === 'production'`)
 * to prevent exposure of system diagnostics or API configuration.
 */
export default function SetupPage() {
  if (process.env.NODE_ENV === "production") {
    // Strictly block access in production: returns HTTP 404
    notFound();
  }

  return <SetupClient />;
}
