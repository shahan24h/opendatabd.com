// POST /api/upload/presign
// Returns a short-lived presigned PUT URL for direct browser → R2 upload.
// The browser uploads directly to R2 (bypasses Vercel's 4.5 MB body limit).
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }              from '@aws-sdk/s3-request-presigner';
import { verifyAuth }                from '../../lib/supabase.js';
import { randomUUID }                from 'crypto';

// Allowed MIME types → file extension
const ALLOWED = {
  // Tabular / structured data
  'text/csv':                                                                       'csv',
  'text/tab-separated-values':                                                      'tsv',
  'application/json':                                                               'json',
  'application/geo+json':                                                           'geojson',
  'application/xml':                                                                'xml',
  'text/xml':                                                                       'xml',
  'text/plain':                                                                     'txt',
  // Spreadsheets
  'application/vnd.ms-excel':                                                       'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':             'xlsx',
  'application/vnd.oasis.opendocument.spreadsheet':                                'ods',
  // Documents
  'application/pdf':                                                                'pdf',
  'application/msword':                                                             'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':       'docx',
  'application/vnd.oasis.opendocument.text':                                       'odt',
  // Statistical packages
  'application/x-stata-dta':                                                       'dta',
  'application/x-spss-sav':                                                        'sav',
  'application/x-r-data':                                                          'rds',
  // Archives (e.g. shapefiles, multi-file datasets)
  'application/zip':                                                                'zip',
  'application/x-zip-compressed':                                                  'zip',
  // Generic binary — resolved via extension fallback below
  'application/octet-stream':                                                       null,
};

// Extension fallback when browser sends application/octet-stream
const EXT_MAP = {
  // Tabular
  csv:     'text/csv',
  tsv:     'text/tab-separated-values',
  json:    'application/json',
  geojson: 'application/geo+json',
  xml:     'application/xml',
  txt:     'text/plain',
  // Spreadsheets
  xls:     'application/vnd.ms-excel',
  xlsx:    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ods:     'application/vnd.oasis.opendocument.spreadsheet',
  // Documents
  pdf:     'application/pdf',
  doc:     'application/msword',
  docx:    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt:     'application/vnd.oasis.opendocument.text',
  // Statistical
  dta:     'application/x-stata-dta',
  sav:     'application/x-spss-sav',
  rds:     'application/x-r-data',
  rdata:   'application/x-r-data',
  // Archives
  zip:     'application/zip',
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Sign in to upload files.' });

  let { contentType, size, filename } = req.body ?? {};

  // Resolve MIME type from file extension if browser sends octet-stream
  if ((!contentType || !ALLOWED[contentType] || ALLOWED[contentType] === null) && filename) {
    const ext = filename.split('.').pop().toLowerCase();
    contentType = EXT_MAP[ext] ?? contentType;
  }

  if (!contentType || !ALLOWED[contentType]) {
    return res.status(400).json({
      error: 'File type not supported. Allowed: CSV, TSV, JSON, XLS, XLSX, ODS, PDF, DOC, DOCX, ODT, GeoJSON, XML, TXT, DTA, SAV, RDS, ZIP',
    });
  }
  if (!size || Number(size) > MAX_BYTES) {
    return res.status(400).json({ error: 'File too large. Maximum 50 MB.' });
  }

  // Validate R2 config is present
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error('[R2] Missing environment variables');
    return res.status(500).json({ error: 'Storage not configured. Contact the administrator.' });
  }

  try {
    const r2 = new S3Client({
      region:   'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const ext     = ALLOWED[contentType];
    const key     = `datasets/${randomUUID()}.${ext}`;
    const command = new PutObjectCommand({
      Bucket:         process.env.R2_BUCKET,
      Key:            key,
      ContentType:    contentType,
      ContentLength:  Number(size),   // enforces the declared size on the presigned PUT
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return res.json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error('[R2] presign failed:', err.message);
    return res.status(500).json({ error: 'Failed to generate upload URL. Try again.' });
  }
}
