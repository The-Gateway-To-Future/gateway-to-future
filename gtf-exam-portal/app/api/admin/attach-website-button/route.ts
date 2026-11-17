import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getWebsitePaths(): { indexPath: string; backupPath: string } {
  const rootDir = path.resolve(process.cwd(), "..");
  return {
    indexPath: path.join(rootDir, "index.html"),
    backupPath: path.join(rootDir, "index.backup.html"),
  };
}

const SNIPPET_TO_INJECT = `
<!-- ================================================================= -->
<!-- GTF SAFE FLOATING BADGE (Option B - Auto-Attached)                -->
<!-- 100% Shadow DOM isolated - zero impact on site styles/scripts      -->
<!-- ================================================================= -->
<gtf-floating-portal-badge></gtf-floating-portal-badge>
<script>
  (function () {
    if (customElements.get('gtf-floating-portal-badge')) return;
    class GtfFloatingPortalBadge extends HTMLElement {
      connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.innerHTML = \`
          <style>
            :host {
              position: fixed;
              bottom: 24px;
              right: 24px;
              z-index: 999999;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .gtf-float-card {
              display: flex;
              align-items: center;
              gap: 12px;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              border: 1.5px solid #e0a96d;
              border-radius: 9999px;
              padding: 10px 18px 10px 14px;
              color: #ffffff;
              text-decoration: none;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(224, 169, 109, 0.3);
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .gtf-float-card:hover {
              transform: translateY(-3px) scale(1.03);
              box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6), 0 0 25px rgba(224, 169, 109, 0.55);
              border-color: #f6d365;
            }
            .gtf-pulse-dot {
              width: 10px;
              height: 10px;
              background-color: #10b981;
              border-radius: 50%;
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
              animation: gtf-pulse 1.8s infinite;
            }
            @keyframes gtf-pulse {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            .gtf-text-block {
              display: flex;
              flex-direction: column;
              text-align: left;
            }
            .gtf-title {
              font-size: 13px;
              font-weight: 800;
              color: #ffffff;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .gtf-subtitle {
              font-size: 11px;
              color: #94a3b8;
              font-weight: 500;
            }
            .gtf-arrow {
              font-size: 16px;
              font-weight: 800;
              color: #e0a96d;
              margin-left: 2px;
              transition: transform 0.2s ease;
            }
            .gtf-float-card:hover .gtf-arrow {
              transform: translateX(3px);
              color: #f6d365;
            }
          </style>
          <a href="https://app.gatewaytofuture.com" class="gtf-float-card" target="_blank" rel="noopener noreferrer">
            <div class="gtf-pulse-dot"></div>
            <div class="gtf-text-block">
              <div class="gtf-title">
                <span>Take A2/B1 Mock Test &amp; Oral Quiz</span>
              </div>
              <div class="gtf-subtitle">Goethe &amp; telc AI Exam Simulator</div>
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

export async function GET() {
  const { indexPath, backupPath } = getWebsitePaths();
  try {
    let indexHtml = "";
    let backupExists = false;
    let isAttached = false;

    try {
      indexHtml = await fs.readFile(indexPath, "utf8");
      isAttached = indexHtml.includes("<gtf-floating-portal-badge");
    } catch {
      // index.html missing
    }

    try {
      await fs.access(backupPath);
      backupExists = true;
    } catch {
      backupExists = false;
    }

    return NextResponse.json({
      ok: true,
      indexPath,
      backupPath,
      backupExists,
      isAttached,
      websiteHtmlLength: indexHtml.length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { indexPath, backupPath } = getWebsitePaths();

  try {
    const body = (await req.json()) as { action?: "attach" | "restore" };
    const action = body.action || "attach";

    if (action === "attach") {
      const original = await fs.readFile(indexPath, "utf8");

      // 1. Always create the backup first
      await fs.writeFile(backupPath, original, "utf8");

      // 2. Check if already attached
      if (original.includes("<gtf-floating-portal-badge")) {
        return NextResponse.json({
          ok: true,
          message: "Floating button is already attached to index.html. Backup confirmed at index.backup.html.",
          backupPath,
          isAttached: true,
        });
      }

      // 3. Inject cleanly right before </body>
      let updated = "";
      if (original.includes("</body>")) {
        updated = original.replace("</body>", `${SNIPPET_TO_INJECT}\n</body>`);
      } else {
        updated = `${original}\n${SNIPPET_TO_INJECT}`;
      }

      await fs.writeFile(indexPath, updated, "utf8");

      return NextResponse.json({
        ok: true,
        message: "Successfully attached floating launch button to index.html! Backup created at index.backup.html.",
        backupPath,
        isAttached: true,
      });
    }

    if (action === "restore") {
      try {
        const backupContent = await fs.readFile(backupPath, "utf8");
        await fs.writeFile(indexPath, backupContent, "utf8");
        return NextResponse.json({
          ok: true,
          message: "Successfully restored original index.html from index.backup.html.",
          isAttached: false,
        });
      } catch {
        return NextResponse.json(
          { ok: false, error: "No index.backup.html found to restore from." },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
