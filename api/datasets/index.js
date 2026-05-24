// GET  /api/datasets  — paginated list with search + category filter
// POST /api/datasets  — submit a new dataset (auth required)
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';
import { resend, FROM, datasetSubmittedEmail } from '../../lib/resend.js';

export default async function handler(req, res) {

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const {
      q        = '',
      category = '',
      format   = '',
      page     = '1',
      limit    = '20',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, parseInt(limit));
    const from     = (pageNum - 1) * pageSize;
    const to       = from + pageSize - 1;

    let query = supabaseAdmin
      .from('datasets')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (q)        query = query.ilike('title', `%${q}%`);
    if (category) query = query.eq('category', category);
    if (format)   query = query.contains('format', [format.toUpperCase()]);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      datasets: data,
      total:    count,
      page:     pageNum,
      limit:    pageSize,
    });
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const user = await verifyAuth(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Sign in to submit datasets.' });

    const { title, description, category, format, source, source_url, license, tags } =
      req.body ?? {};

    if (!title?.trim())    return res.status(400).json({ error: 'Title is required.' });
    if (!category?.trim()) return res.status(400).json({ error: 'Category is required.' });

    const { data, error } = await supabaseAdmin
      .from('datasets')
      .insert({
        title:        title.trim(),
        description:  description?.trim() ?? null,
        category:     category.trim(),
        format:       Array.isArray(format) ? format : format ? [format] : [],
        source:       source?.trim()      ?? null,
        source_url:   source_url?.trim()  ?? null,
        license:      license?.trim()     ?? 'Open Data',
        tags:         Array.isArray(tags) ? tags : [],
        submitted_by: user.id,
        status:       'pending',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Confirmation email (non-blocking)
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    resend.emails
      .send({
        from,
        to:      user.email,
        subject: `Dataset received: "${title}"`,
        html:    datasetSubmittedEmail({ name, datasetTitle: title }),
      })
      .catch(err => console.error('[resend] dataset email failed:', err.message));

    return res.status(201).json({ dataset: data });
  }

  return res.status(405).end();
}
