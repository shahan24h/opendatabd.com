// GET    /api/datasets/:id  — fetch single dataset + increment view count
// DELETE /api/datasets/:id  — delete (owner only)
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  // ── GET ───────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Dataset not found.' });

    // Increment views without blocking the response
    supabaseAdmin
      .from('datasets')
      .update({ views: (data.views ?? 0) + 1 })
      .eq('id', id)
      .then(() => {})
      .catch(() => {});

    return res.json(data);
  }

  // ── DELETE ────────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const user = await verifyAuth(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const { data: dataset, error: fetchError } = await supabaseAdmin
      .from('datasets')
      .select('submitted_by')
      .eq('id', id)
      .single();

    if (fetchError || !dataset) return res.status(404).json({ error: 'Dataset not found.' });
    if (dataset.submitted_by !== user.id)
      return res.status(403).json({ error: 'You can only delete your own datasets.' });

    const { error } = await supabaseAdmin.from('datasets').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(204).end();
  }

  return res.status(405).end();
}
