import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM    = process.env.RESEND_FROM ?? 'OpenDataBD <noreply@opendatabd.com>';
export const APP_URL = process.env.APP_URL     ?? 'https://opendatabd.com';

// ── Shared layout wrapper ─────────────────────────────────────────────────────
function layout(body) {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>OpenDataBD</title>
</head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e3e5;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#131b2e;padding:28px 40px;">
            <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
              OpenData<span style="color:#ba0035;">BD</span>
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:40px;">${body}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f2f4f6;padding:18px 40px;border-top:1px solid #e0e3e5;">
            <p style="font-size:12px;color:#76777d;margin:0;line-height:1.6;">
              © 2025 OpenDataBD · Empowering Bangladesh through transparency<br>
              <a href="${APP_URL}" style="color:#76777d;">opendatabd.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Welcome email ─────────────────────────────────────────────────────────────
export function welcomeEmail({ name }) {
  return layout(/* html */`
    <h1 style="font-size:24px;font-weight:700;color:#191c1e;margin:0 0 12px;">
      Welcome, ${name}! 👋
    </h1>
    <p style="font-size:15px;color:#45464d;line-height:1.7;margin:0 0 24px;">
      You're now part of Bangladesh's open data community. Explore thousands of public
      datasets or contribute your own research to help drive civic transparency.
    </p>
    <a href="${APP_URL}"
      style="display:inline-block;background:#ba0035;color:#ffffff;font-weight:600;
             font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">
      Explore Datasets →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e0e3e5;">
    <p style="font-size:13px;color:#76777d;margin:0;">
      Questions? Reply to this email or visit our
      <a href="${APP_URL}" style="color:#ba0035;">Help Center</a>.
    </p>
  `);
}

// ── Dataset submitted confirmation ────────────────────────────────────────────
export function datasetSubmittedEmail({ name, datasetTitle }) {
  return layout(/* html */`
    <h1 style="font-size:24px;font-weight:700;color:#191c1e;margin:0 0 12px;">
      Dataset received ✓
    </h1>
    <p style="font-size:15px;color:#45464d;line-height:1.7;margin:0 0 8px;">
      Hi ${name},
    </p>
    <p style="font-size:15px;color:#45464d;line-height:1.7;margin:0 0 24px;">
      Your dataset <strong style="color:#191c1e;">"${datasetTitle}"</strong> has been submitted
      and is pending review. We'll notify you once it's published to the catalog.
    </p>
    <a href="${APP_URL}/submit"
      style="display:inline-block;background:#ba0035;color:#ffffff;font-weight:600;
             font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">
      Submit Another →
    </a>
  `);
}
