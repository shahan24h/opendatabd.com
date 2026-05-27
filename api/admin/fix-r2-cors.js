// POST /api/admin/fix-r2-cors
// One-time endpoint: sets CORS on the R2 bucket so browsers can PUT files.
// Admin-only. Safe to leave in place — it just reads/writes bucket metadata.
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';

async function isAdmin(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'admin';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user)                   return res.status(401).json({ error: 'Unauthorized' });
  if (!await isAdmin(user.id)) return res.status(403).json({ error: 'Admin only' });

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    return res.status(500).json({ error: 'R2 env vars not configured' });
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  const CORS_RULES = [{
    AllowedOrigins: ['https://www.opendatabd.com', 'https://opendatabd.com'],
    AllowedMethods: ['PUT', 'GET', 'HEAD'],
    AllowedHeaders: ['Content-Type', 'Content-Length'],
    ExposeHeaders:  ['ETag'],
    MaxAgeSeconds:  3600,
  }];

  // Read current state
  let before = null;
  try {
    const { CORSRules } = await r2.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
    before = CORSRules;
  } catch { /* no existing rules */ }

  // Apply
  await r2.send(new PutBucketCorsCommand({
    Bucket: R2_BUCKET,
    CORSConfiguration: { CORSRules: CORS_RULES },
  }));

  return res.json({ ok: true, bucket: R2_BUCKET, before, after: CORS_RULES });
}
