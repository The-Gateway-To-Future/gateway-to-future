import { promises as fs } from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response(
      JSON.stringify({ error: "Disabled in production." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!verifyAdminRequest(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  const { searchParams } = new URL(req.url);
  const showPill = searchParams.get("pill") !== "false";
  const showFloating = searchParams.get("floating") !== "false";

  const rootDir = path.resolve(process.cwd(), "..");
  const indexPath = path.join(rootDir, "index.html");
  const stylesPath = path.join(rootDir, "styles.css");

  try {
    let html = await fs.readFile(indexPath, "utf8");

    // Inline styles.css into head so it renders perfectly without 404
    try {
      const stylesCss = await fs.readFile(stylesPath, "utf8");
      html = html.replace(
        '<link rel="stylesheet" href="styles.css">',
        `<style>\n${stylesCss}\n</style>`,
      );
    } catch {
      // ignore
    }

    // Option A Header Toggle Pill Web Component
    const pillSnippet = `
      <gtf-header-portal-toggle style="margin-left: 14px;"></gtf-header-portal-toggle>
      <script>
        (function () {
          if (customElements.get('gtf-header-portal-toggle')) return;
          class GtfHeaderPortalToggle extends HTMLElement {
            connectedCallback() {
              const shadow = this.attachShadow({ mode: 'open' });
              shadow.innerHTML = \`
                <style>
                  :host { display: inline-flex; align-items: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                  .gtf-pill {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: linear-gradient(135deg, #0b2545 0%, #134074 100%);
                    color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700;
                    padding: 7px 15px; border-radius: 9999px; border: 1.5px solid #e0a96d;
                    box-shadow: 0 4px 14px rgba(224, 169, 109, 0.35); transition: all 0.25s ease; cursor: pointer;
                  }
                  .gtf-pill:hover { transform: translateY(-1.5px); background: linear-gradient(135deg, #134074 0%, #1d4ed8 100%); border-color: #f6d365; }
                  .gtf-badge { background: #e0a96d; color: #0b132b; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; }
                </style>
                <a href="https://app.gatewaytofuture.com" class="gtf-pill" target="_blank" rel="noopener noreferrer">
                  <span>🇩🇪</span>
                  <span>Practice Portal & Mock Tests</span>
                  <span class="gtf-badge">A1–B2</span>
                </a>
              \`;
            }
          }
          customElements.define('gtf-header-portal-toggle', GtfHeaderPortalToggle);
        })();
      </script>
    `;

    // Option B Floating Bottom-Right Badge Web Component
    const floatingSnippet = `
      <gtf-floating-portal-badge></gtf-floating-portal-badge>
      <script>
        (function () {
          if (customElements.get('gtf-floating-portal-badge')) return;
          class GtfFloatingPortalBadge extends HTMLElement {
            connectedCallback() {
              const shadow = this.attachShadow({ mode: 'open' });
              shadow.innerHTML = \`
                <style>
                  :host { position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                  .gtf-float-card {
                    display: flex; align-items: center; gap: 12px;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    border: 1.5px solid #e0a96d; border-radius: 9999px;
                    padding: 10px 18px 10px 14px; color: #ffffff; text-decoration: none;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(224, 169, 109, 0.35);
                    cursor: pointer; transition: all 0.3s ease;
                  }
                  .gtf-float-card:hover { transform: translateY(-3px) scale(1.03); border-color: #f6d365; }
                  .gtf-pulse-dot { width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
                  .gtf-text-block { display: flex; flex-direction: column; text-align: left; }
                  .gtf-title { font-size: 13px; font-weight: 800; color: #ffffff; }
                  .gtf-subtitle { font-size: 11px; color: #94a3b8; }
                  .gtf-arrow { font-size: 16px; font-weight: 800; color: #e0a96d; }
                </style>
                <a href="https://app.gatewaytofuture.com" class="gtf-float-card" target="_blank" rel="noopener noreferrer">
                  <div class="gtf-pulse-dot"></div>
                  <div class="gtf-text-block">
                    <div class="gtf-title">Take A2/B1 Mock Test & Oral Quiz</div>
                    <div class="gtf-subtitle">Goethe & telc AI Exam Simulator</div>
                  </div>
                  <span class="gtf-arrow">→</span>
                </a>
              \`;
            }
          }
          customElements.define('gtf-floating-portal-badge', GtfFloatingPortalBadge);
        })();
      </script>
    `;

    if (showPill && html.includes("</nav>")) {
      html = html.replace("</nav>", `${pillSnippet}\n</nav>`);
    }

    if (showFloating && html.includes("</body>")) {
      html = html.replace("</body>", `${floatingSnippet}\n</body>`);
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return new Response(`<h1>Failed to load website preview</h1><p>${err}</p>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
