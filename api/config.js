// Public config endpoint — returns only safe-to-expose values.
// Used by js/auth.js to initialise the browser Supabase client.
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Cache for 1 hour — these values rarely change
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  res.json({
    supabaseUrl:    process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    appUrl:          process.env.APP_URL ?? 'https://opendatabd.com',
  });
}
