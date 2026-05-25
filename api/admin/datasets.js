// GET /api/admin/datasets — all datasets with submitter info + stats
// Admin only (role = 'admin' in profiles table)
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';

async function isAdmin(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user)                   return res.status(401).json({ error: 'Unauthorized' });
  if (!await isAdmin(user.id)) return res.status(403).json({ error: 'Admin access required' });

  const { status } = req.query;

  // Fetch datasets
  let query = supabaseAdmin
    .from('datasets')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data: datasets, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Enrich with submitter profile (email + name)
  const userIds = [...new Set(datasets.map(d => d.submitted_by).filter(Boolean))];
  let profileMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);
    profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  }

  const enriched = datasets.map(d => ({
    ...d,
    submitter: profileMap[d.submitted_by] ?? null,
  }));

  // Counts for all statuses (ignoring current filter)
  const { data: all } = await supabaseAdmin.from('datasets').select('status');
  const stats = {
    pending:  all?.filter(d => d.status === 'pending').length  ?? 0,
    active:   all?.filter(d => d.status === 'active').length   ?? 0,
    rejected: all?.filter(d => d.status === 'rejected').length ?? 0,
  };

  return res.json({ datasets: enriched, stats });
}
