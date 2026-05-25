// GET /api/download/:id
// Increments the download counter then redirects to the file (R2) or source URL.
// This keeps download counts accurate regardless of where the file lives.
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;

  const { data: dataset, error } = await supabaseAdmin
    .from('datasets')
    .select('id, title, file_url, source_url, status, downloads')
    .eq('id', id)
    .single();

  if (error || !dataset || dataset.status !== 'active') {
    return res.status(404).json({ error: 'Dataset not found.' });
  }

  const url = dataset.file_url || dataset.source_url;
  if (!url) {
    return res.status(404).json({ error: 'No file available for this dataset.' });
  }

  // Increment downloads (non-blocking — don't hold up the redirect)
  supabaseAdmin
    .from('datasets')
    .update({ downloads: (dataset.downloads ?? 0) + 1 })
    .eq('id', id)
    .then(() => {})
    .catch(() => {});

  // Redirect user to the actual file
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, url);
}
