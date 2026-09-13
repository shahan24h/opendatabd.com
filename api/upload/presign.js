// POST /api/upload/presign
// Returns a short-lived presigned PUT URL for direct browser -> MinIO upload.
// The browser uploads directly to MinIO and bypasses Vercel's request-body limit.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyAuth } from '../../lib/supabase.js';
import { randomUUID } from 'crypto';

const ALLOWED = {
  'text/csv': 'csv',
  'text/tab-separated-values': 'tsv',
  'application/json': 'json',
  'application/geo+json': 'geojson',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/plain': 'txt',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/x-stata-dta': 'dta',
  'application/x-spss-sav': 'sav',
  'application/x-r-data': 'rds',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/octet-stream': null,
};

const EXT_MAP = {
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  geojson: 'application/geo+json',
  xml: 'application/xml',
  txt: 'text/plain',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  dta: 'application/x-stata-dta',
  sav: 'application/x-spss-sav',
  rds: 'application/x-r-data',
  rdata: 'application/x-r-data',
  zip: 'application/zip',
};

const MAX_BYTES = 50 * 1024 * 1024;

function storageConfig() {
  const {
    MINIO_ENDPOINT,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    MINIO_BUCKET,
  } = process.env;

  if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY || !MINIO_BUCKET) {
    return null;
  }

  return { MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Sign in to upload files.' });

  let { contentType, size, filename } = req.body ?? {};
  const numericSize = Number(size);

  if ((!contentType || !ALLOWED[contentType] || ALLOWED[contentType] === null) && filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    contentType = EXT_MAP[ext] ?? contentType;
  }

  if (!contentType || !ALLOWED[contentType]) {
    return res.status(400).json({
      error: 'File type not supported. Allowed: CSV, TSV, JSON, XLS, XLSX, ODS, PDF, DOC, DOCX, ODT, GeoJSON, XML, TXT, DTA, SAV, RDS, ZIP',
    });
  }

  if (!Number.isFinite(numericSize) || numericSize <= 0 || numericSize > MAX_BYTES) {
    return res.status(400).json({ error: 'File too large. Maximum 50 MB.' });
  }

  const config = storageConfig();
  if (!config) {
    console.error('[MinIO] Missing environment variables');
    return res.status(500).json({ error: 'Storage not configured. Contact the administrator.' });
  }

  try {
    const client = new S3Client({
      region: 'us-east-1',
      endpoint: config.MINIO_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.MINIO_ACCESS_KEY,
        secretAccessKey: config.MINIO_SECRET_KEY,
      },
    });

    const ext = ALLOWED[contentType];
    const objectKey = `datasets/${user.id}/${randomUUID()}.${ext}`;
    const command = new PutObjectCommand({
      Bucket: config.MINIO_BUCKET,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return res.json({
      uploadUrl,
      objectKey,
      originalFilename: String(filename || `dataset.${ext}`).slice(0, 255),
      contentType,
      size: numericSize,
    });
  } catch (err) {
    console.error('[MinIO] presign failed:', err.message);
    return res.status(500).json({ error: 'Failed to generate upload URL. Try again.' });
  }
}
