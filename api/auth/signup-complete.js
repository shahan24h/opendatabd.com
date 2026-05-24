// Called by the browser immediately after a successful supabase.auth.signUp().
// Verifies the user's JWT then sends a welcome email via Resend.
import { verifyAuth }                       from '../../lib/supabase.js';
import { resend, FROM, welcomeEmail }       from '../../lib/resend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { fullName } = req.body ?? {};
  const name = fullName?.trim() || user.email.split('@')[0];

  try {
    await resend.emails.send({
      from:    FROM,
      to:      user.email,
      subject: 'Welcome to OpenDataBD',
      html:    welcomeEmail({ name }),
    });
  } catch (err) {
    // Email failure is non-fatal — log and continue
    console.error('[resend] welcome email failed:', err.message);
  }

  return res.status(200).json({ ok: true });
}
