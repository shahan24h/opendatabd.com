// GET  /api/datasets  — paginated list with search + category filter
// POST /api/datasets  — submit a new dataset (auth required)
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { supabaseAdmin, verifyAuth } from '../../lib/supabase.js';
import { resend, FROM, datasetSubmittedEmail } from '../../lib/resend.js';

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;

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

async function headObjectWithRetry(client, input) {
  const delays = [0, 250, 750];

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) {
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }

    try {
      return await client.send(new HeadObjectCommand(input));
    } catch (err) {
      if (attempt === delays.length - 1) throw err;
    }
  }
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
      files,
      object_key,
      original_filename,
      content_type,
    } = req.body ?? {};

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' });
    if (!category?.trim()) return res.status(400).json({ error: 'Category is required.' });
    if (!validHttpUrl(source_url)) {
      return res.status(400).json({ error: 'source_url must be a valid http/https URL.' });
    }

    const requestedFiles = Array.isArray(files)
      ? files
      : object_key
        ? [{
            object_key,
            original_filename,
            content_type,
          }]
        : [];

    if (requestedFiles.length > MAX_FILES) {
      return res.status(400).json({
        error: `A maximum of ${MAX_FILES} files is allowed per submission.`,
      });
    }

    const storedFiles = [];
    const seenObjectKeys = new Set();

    if (requestedFiles.length > 0) {
      const client = minioClient();
      const bucket = process.env.MINIO_BUCKET;

      if (!client || !bucket) {
        return res.status(500).json({ error: 'Storage not configured.' });
      }

      const expectedPrefix = `datasets/${user.id}/`;
      let totalBytes = 0;

      for (const requestedFile of requestedFiles) {
        const requestedObjectKey =
          requestedFile?.object_key ?? requestedFile?.objectKey;

        const requestedOriginalFilename =
          requestedFile?.original_filename ??
          requestedFile?.originalFilename ??
          'dataset';

        const requestedContentType =
          requestedFile?.content_type ??
          requestedFile?.contentType ??
          'application/octet-stream';

        if (
          typeof requestedObjectKey !== 'string' ||
          !requestedObjectKey.startsWith(expectedPrefix) ||
          requestedObjectKey.includes('..') ||
          seenObjectKeys.has(requestedObjectKey)
        ) {
          return res.status(400).json({
            error: 'One or more uploaded object keys are invalid.',
          });
        }

        seenObjectKeys.add(requestedObjectKey);

        try {
          const head = await headObjectWithRetry(client, {
            Bucket: bucket,
            Key: requestedObjectKey,
          });

          const actualSize = Number(head.ContentLength);

          if (
            !Number.isFinite(actualSize) ||
            actualSize <= 0 ||
            actualSize > MAX_BYTES
          ) {
            return res.status(400).json({
              error: `Each uploaded file must be no larger than ${MAX_BYTES / 1024 / 1024} MB.`,
            });
          }

          totalBytes += actualSize;

          if (totalBytes > MAX_TOTAL_BYTES) {
            return res.status(400).json({
              error: `The combined upload must be no larger than ${MAX_TOTAL_BYTES / 1024 / 1024} MB.`,
            });
          }

          storedFiles.push({
            object_key: requestedObjectKey,
            original_filename: String(requestedOriginalFilename).slice(0, 255),
            content_type: String(
              head.ContentType ||
              requestedContentType ||
              'application/octet-stream'
            ).slice(0, 255),
            file_size_bytes: actualSize,
          });
        } catch (err) {
          console.error(
            '[MinIO] uploaded object verification failed:',
            err.message
          );

          return res.status(400).json({
            error: `Uploaded file "${String(requestedOriginalFilename).slice(0, 100)}" could not be verified.`,
          });
        }
      }
    }

    const storedObject = storedFiles[0] ?? null;

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
        if (storedFiles.length > 0) {
      const fileRows = storedFiles.map(file => ({
        dataset_id: data.id,
        uploaded_by: user.id,
        object_key: file.object_key,
        original_filename: file.original_filename,
        content_type: file.content_type,
        file_size_bytes: file.file_size_bytes,
      }));

      const { error: filesError } = await supabaseAdmin
        .from('dataset_files')
        .insert(fileRows);

      if (filesError) {
        console.error(
          '[Supabase] dataset file metadata insert failed:',
          filesError.message
        );

        await supabaseAdmin
          .from('datasets')
          .delete()
          .eq('id', data.id);

        return res.status(500).json({
          error: 'Dataset file information could not be saved.',
        });
      }
    }

    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    resend.emails
      .send({
        from: FROM,
        to: user.email,
        subject: `Dataset received: "${title}"`,
        html: datasetSubmittedEmail({ name, datasetTitle: title }),
      })
      .catch(err => console.error('[resend] dataset email failed:', err.message));

    return res.status(201).json({
      dataset: data,
      files: storedFiles,
    });
  }

  return res.status(405).end();
}