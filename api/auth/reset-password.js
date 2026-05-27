// Generates a Supabase recovery link (admin API — no email sent by Supabase)
// then delivers it through Resend so we bypass Supabase's low email rate-limits.
import { supabaseAdmin }                 from '../../lib/supabase.js';
import { resend, FROM, APP_URL,
         passwordResetEmail }            from '../../lib/resend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  // Generate the magic reset link without sending any email
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${APP_URL}/reset-password` },
  });

  if (error) {
    // Log for debugging but don't expose to client (don't leak account existence)
    console.error('[reset-password] generateLink error:', error.message);
  } else if (data?.properties?.action_link) {
    await resend.emails.send({
      from:    FROM,
      to:      email,
      subject: 'Reset your OpenDataBD password',
      html:    passwordResetEmail({ resetUrl: data.properties.action_link }),
    });
  }

  // Always 200 — never reveal whether the email is registered
  return res.status(200).json({
    message: 'If that email is registered, a reset link is on its way.',
  });
}
