// GET /api/download/:id
// Auth required. Returns a short-lived signed MinIO URL for hosted files,
// or the original source URL for legacy/external datasets.
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';

function minioClient() {
  const {
    MINIO_ENDPOINT,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
  } = process.env;

  if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) return null;

  return new S3Client({
    region: 'us-east-1',
    endpoint: MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY,
      secretAccessKey: MINIO_SECRET_KEY,
    },
  });
}

function safeFilename(value) {
  return String(value || 'dataset')
    .replace(/[\r\n"\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._ -]+/g, '-')
    .slice(0, 180);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = await verifyAuth(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Sign in to download datasets.' });

  const { id, file_id } = req.query;
  const { data: dataset, error } = await supabaseAdmin
    .from('datasets')
    .select('id, title, file_url, source_url, object_key, original_filename, status, downloads, format')
    .eq('id', id)
    .single();

  if (error || !dataset || dataset.status !== 'active') {
    return res.status(404).json({ error: 'Dataset not found.' });
  }
    let hostedFile = null;

  if (file_id) {
    const { data: requestedFile, error: requestedFileError } =
      await supabaseAdmin
        .from('dataset_files')
        .select('id, object_key, original_filename, content_type, file_size_bytes')
        .eq('id', file_id)
        .eq('dataset_id', id)
        .maybeSingle();

    if (requestedFileError || !requestedFile) {
      return res.status(404).json({
        error: 'Dataset file not found.',
      });
    }

    hostedFile = requestedFile;
  } else {
    const { data: firstFile, error: firstFileError } =
      await supabaseAdmin
        .from('dataset_files')
        .select('id, object_key, original_filename, content_type, file_size_bytes')
        .eq('dataset_id', id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (firstFileError) {
      return res.status(500).json({
        error: firstFileError.message,
      });
    }

    hostedFile = firstFile;
  }

  let url;
  let filename;
  let isHosted = false;

    const hostedObjectKey = hostedFile?.object_key || dataset.object_key;
  const hostedFilename =
    hostedFile?.original_filename ||
    dataset.original_filename ||
    dataset.title;

  if (hostedObjectKey) {
    const client = minioClient();
    const bucket = process.env.MINIO_BUCKET;
    if (!client || !bucket) {
      return res.status(500).json({ error: 'Storage not configured.' });
    }

        filename = safeFilename(hostedFilename);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: hostedObjectKey,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });
    url = await getSignedUrl(client, command, { expiresIn: 300 });
    isHosted = true;
  } else {
    url = dataset.file_url || dataset.source_url;
    if (!url) return res.status(404).json({ error: 'No file available for this dataset.' });

    const slug = (dataset.title || 'dataset')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);

    let ext = 'csv';
    if (dataset.file_url) {
      ext = dataset.file_url.split('.').pop().split('?')[0].toLowerCase() || 'csv';
    } else {
      const fmt = Array.isArray(dataset.format) ? dataset.format[0] : dataset.format;
      ext = (fmt || 'csv').toLowerCase();
    }
    filename = `${slug}.${ext}`;
  }

  supabaseAdmin
    .from('datasets')
    .update({ downloads: (dataset.downloads ?? 0) + 1 })
    .eq('id', id)
    .then(() => {})
    .catch(() => {});

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ url, filename, isHosted });
}
