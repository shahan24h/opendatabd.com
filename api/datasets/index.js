// GET  /api/datasets  — paginated list with search + category filter
// POST /api/datasets  — submit a new dataset (auth required)
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';
import { resend, FROM, datasetSubmittedEmail } from '../../lib/resend.js';

const MAX_BYTES = 50 * 1024 * 1024;

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
    // MinIO does not require AWS checksum-mode metadata for HEAD requests.
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY,
      secretAccessKey: MINIO_SECRET_KEY,
    },
  });
}

function validHttpUrl(value) {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const {
      q = '',
      category = '',
      format = '',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, parseInt(limit));
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from('datasets')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (q) query = query.ilike('title', `%${q}%`);
    if (category) query = query.eq('category', category);
    if (format) query = query.contains('format', [format.toUpperCase()]);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      datasets: data,
      total: count,
      page: pageNum,
      limit: pageSize,
    });
  }

  if (req.method === 'POST') {
    const user = await verifyAuth(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Sign in to submit datasets.' });

    const {
      title,
      description,
      category,
      format,
      source,
      source_url,
      license,
      division,
      tags,
      object_key,
      original_filename,
      content_type,
    } = req.body ?? {};

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' });
    if (!category?.trim()) return res.status(400).json({ error: 'Category is required.' });
    if (!validHttpUrl(source_url)) {
      return res.status(400).json({ error: 'source_url must be a valid http/https URL.' });
    }

    let storedObject = null;

    if (object_key) {
      const expectedPrefix = `datasets/${user.id}/`;
      if (
        typeof object_key !== 'string' ||
        !object_key.startsWith(expectedPrefix) ||
        object_key.includes('..')
      ) {
        return res.status(400).json({ error: 'Invalid uploaded object key.' });
      }

      const client = minioClient();
      const bucket = process.env.MINIO_BUCKET;
      if (!client || !bucket) {
        return res.status(500).json({ error: 'Storage not configured.' });
      }

      try {
        const head = await client.send(new HeadObjectCommand({
          Bucket: bucket,
          Key: object_key,
        }));

        const actualSize = Number(head.ContentLength);
        if (!Number.isFinite(actualSize) || actualSize <= 0 || actualSize > MAX_BYTES) {
          return res.status(400).json({ error: 'Uploaded file exceeds the 50 MB limit.' });
        }

        storedObject = {
          object_key,
          original_filename: String(original_filename || 'dataset').slice(0, 255),
          content_type: String(head.ContentType || content_type || 'application/octet-stream').slice(0, 255),
          file_size_bytes: actualSize,
        };
      } catch (err) {
        console.error('[MinIO] uploaded object verification failed:', err.message);
        return res.status(400).json({ error: 'Uploaded file could not be verified.' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('datasets')
      .insert({
        title: title.trim(),
        description: description?.trim() ?? null,
        category: category.trim(),
        format: Array.isArray(format) ? format : format ? [format] : [],
        source: source?.trim() ?? null,
        source_url: source_url?.trim() ?? null,
        file_url: null,
        license: license?.trim() ?? 'Open Data',
        division: division?.trim() ?? null,
        tags: Array.isArray(tags) ? tags : [],
        submitted_by: user.id,
        status: 'pending',
        ...(storedObject ?? {}),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    resend.emails
      .send({
        from: FROM,
        to: user.email,
        subject: `Dataset received: "${title}"`,
        html: datasetSubmittedEmail({ name, datasetTitle: title }),
      })
      .catch(err => console.error('[resend] dataset email failed:', err.message));

    return res.status(201).json({ dataset: data });
  }

  return res.status(405).end();
}
