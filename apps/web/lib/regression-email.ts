/**
 * Regression alert email — pure template rendering, no Resend I/O, so the
 * HTML/subject/text can be snapshot-tested without sending anything.
 */
export interface RegressionEmailInput {
  projectName: string;
  previousScore: number;
  newScore: number;
  newFindings: string[];
  scanUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = {
  bg: "#faf9f7",
  ink: "#2b2419",
  inkMuted: "#6b6455",
  border: "#e4ddd0",
  terracotta: "#c1653d",
  danger: "#b23b3b",
  success: "#3f7d52",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRegressionEmail(input: RegressionEmailInput): RenderedEmail {
  const { projectName, previousScore, newScore, newFindings, scanUrl } = input;
  const delta = newScore - previousScore;
  const scoreColor = delta < 0 ? BRAND.danger : BRAND.success;
  const subject = `ShipRank: ${projectName} score dropped to ${newScore} (was ${previousScore})`;

  const findingsHtml =
    newFindings.length > 0
      ? `<ul style="margin:12px 0 0;padding-left:20px;color:${BRAND.ink};font-size:14px;line-height:1.6;">
          ${newFindings.map((f) => `<li>${escapeHtml(f)}</li>`).join("\n          ")}
        </ul>`
      : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:28px 28px 0;">
          <span style="font-family:ui-monospace,monospace;font-size:12px;color:${BRAND.terracotta};letter-spacing:0.08em;text-transform:uppercase;">ShipRank Monitor</span>
          <h1 style="margin:8px 0 0;font-size:20px;color:${BRAND.ink};">${escapeHtml(projectName)} regressed</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size:32px;font-weight:600;color:${BRAND.inkMuted};">${previousScore}</td>
              <td style="font-size:18px;color:${BRAND.inkMuted};padding:0 12px;">→</td>
              <td style="font-size:32px;font-weight:600;color:${scoreColor};">${newScore}</td>
            </tr>
          </table>
        </td>
      </tr>
      ${
        newFindings.length > 0
          ? `<tr><td style="padding:0 28px;"><p style="margin:0;font-size:13px;color:${BRAND.inkMuted};text-transform:uppercase;letter-spacing:0.06em;">New findings</p>${findingsHtml}</td></tr>`
          : ""
      }
      <tr>
        <td style="padding:28px;">
          <a href="${scanUrl}" style="display:inline-block;padding:10px 20px;background:${BRAND.terracotta};color:#fff;border-radius:8px;text-decoration:none;font-size:14px;">View full scan →</a>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${projectName} regressed on ShipRank`,
    `Score: ${previousScore} -> ${newScore}`,
    newFindings.length > 0 ? `New findings:\n${newFindings.map((f) => `- ${f}`).join("\n")}` : null,
    `Full scan: ${scanUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, html, text };
}
