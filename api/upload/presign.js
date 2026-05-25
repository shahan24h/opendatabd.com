// POST /api/upload/presign
// Returns a short-lived presigned PUT URL for direct browser → R2 upload.
// The browser uploads directly to R2 (bypasses Vercel's 4.5 MB body limit).
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }              from '@aws-sdk/s3-request-presigner';
import { verifyAuth }                from '../../lib/supabase.js';
import { randomUUID }                from 'crypto';

const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Allowed MIME types → file extension
const ALLOWED = {
  'text/csv':                                                              'csv',
  'application/json':                                                      'json',
  'application/vnd.ms-excel':                                              'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':    'xlsx',
  'application/pdf':                                                       'pdf',
  'application/geo+json':                                                  'geojson',
  'application/xml':                                                       'xml',
  'text/xml':                                                              'xml',
  'text/plain':                                                            'txt',
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Sign in to upload files.' });

  const { contentType, size } = req.body ?? {};

  if (!contentType || !ALLOWED[contentType]) {
    return res.status(400).json({
      error: 'File type not supported. Allowed: CSV, JSON, XLS, XLSX, PDF, GeoJSON, XML',
    });
  }
  if (!size || Number(size) > MAX_BYTES) {
    return res.status(400).json({ error: 'File too large. Maximum 50 MB.' });
  }

  const ext  = ALLOWED[contentType];
  const key  = `datasets/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET,
    Key:         key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 min
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return res.json({ uploadUrl, publicUrl });
}
