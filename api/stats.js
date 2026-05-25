// GET /api/stats — live counts for the homepage stats bar and category grid
// Public, cached 60s at the CDN edge.
import { supabaseAdmin } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Run all queries in parallel
  const [
    { count: totalDatasets },
    { data: categoryRows },
    { data: contributorRows },
    { data: downloadRows },
  ] = await Promise.all([
    supabaseAdmin
      .from('datasets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),

    supabaseAdmin
      .from('datasets')
      .select('category')
      .eq('status', 'active'),

    supabaseAdmin
      .from('datasets')
      .select('submitted_by')
      .eq('status', 'active'),

    supabaseAdmin
      .from('datasets')
      .select('downloads')
      .eq('status', 'active'),
  ]);

  // Category counts  { "Health": 3, "Economy & Finance": 1, … }
  const categoryCounts = {};
  categoryRows?.forEach(({ category }) => {
    if (category) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  });

  // Unique contributors
  const totalContributors = new Set(
    contributorRows?.map(d => d.submitted_by).filter(Boolean)
  ).size;

  // Total downloads across all active datasets
  const totalDownloads = downloadRows?.reduce((sum, d) => sum + (d.downloads ?? 0), 0) ?? 0;

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  return res.json({
    totalDatasets:    totalDatasets    ?? 0,
    totalContributors,
    totalDownloads,
    categoryCounts,
  });
}
