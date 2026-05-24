import { createClient } from '@supabase/supabase-js';

// ── Server-only admin client (uses service role key) ──────────────────────────
// Never import this in browser code.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ── Verify a user's Bearer JWT from the Authorization header ──────────────────
// Returns the Supabase user object, or null if invalid / missing.
export async function verifyAuth(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
