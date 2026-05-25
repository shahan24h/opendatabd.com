// PATCH /api/admin/datasets/:id — update dataset status
// Admin only
import { supabaseAdmin, verifyAuth } from '../../../lib/supabase.js';

async function isAdmin(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}

const VALID_STATUSES = ['active', 'pending', 'rejected'];

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user)                   return res.status(401).json({ error: 'Unauthorized' });
  if (!await isAdmin(user.id)) return res.status(403).json({ error: 'Admin access required' });

  const { id } = req.query;
  const { status } = req.body ?? {};

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin
    .from('datasets')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ dataset: data });
}
