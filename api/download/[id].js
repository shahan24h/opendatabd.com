// GET /api/download/:id
// Auth required — verifies JWT, increments download counter,
// returns { url, filename } so the client can download with a proper title.
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Auth gate
  const user = await verifyAuth(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Sign in to download datasets.' });

  const { id } = req.query;

  const { data: dataset, error } = await supabaseAdmin
    .from('datasets')
    .select('id, title, file_url, source_url, status, downloads, format')
    .eq('id', id)
    .single();

  if (error || !dataset || dataset.status !== 'active') {
    return res.status(404).json({ error: 'Dataset not found.' });
  }

  const url = dataset.file_url || dataset.source_url;
  if (!url) return res.status(404).json({ error: 'No file available for this dataset.' });

  // Build slug filename from dataset title
  const slug = (dataset.title || 'dataset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);

  // Get extension from file_url (UUID-based) or from format field
  let ext = 'csv';
  if (dataset.file_url) {
    ext = dataset.file_url.split('.').pop().split('?')[0].toLowerCase() || 'csv';
  } else {
    const fmt = Array.isArray(dataset.format) ? dataset.format[0] : dataset.format;
    ext = (fmt || 'csv').toLowerCase();
  }

  const filename = `${slug}.${ext}`;

  // Increment downloads (non-blocking)
  supabaseAdmin
    .from('datasets')
    .update({ downloads: (dataset.downloads ?? 0) + 1 })
    .eq('id', id)
    .then(() => {})
    .catch(() => {});

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    url,
    filename,
    isHosted: !!dataset.file_url,
  });
}
