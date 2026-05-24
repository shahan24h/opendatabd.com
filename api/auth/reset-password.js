// Triggers Supabase's built-in password reset email.
// Supabase sends the magic reset link; we don't need Resend for this flow.
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.APP_URL ?? 'https://opendatabd.com'}/reset-password`,
  });

  if (error) return res.status(400).json({ error: error.message });

  // Always return 200 — don't leak whether an email exists in our system
  return res.status(200).json({ message: 'If that email is registered, a reset link is on its way.' });
}
