// GET    /api/datasets/:id  — fetch single dataset + increment view count
// DELETE /api/datasets/:id  — delete an owner's dataset and its MinIO object
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
function normalizeDoiUrl(value) {
  if (!value?.trim()) return null;

  const input = value.trim();

  if (/^10\.\d{4,9}\/\S+$/i.test(input)) {
    return `https://doi.org/${input}`;
  }

  try {
    const url = new URL(input);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return input;
    }
  } catch {
    // Invalid URL.
  }

  return null;
}
export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Dataset not found.' });
        const { data: files, error: filesError } = await supabaseAdmin
      .from('dataset_files')
      .select('id, object_key, original_filename, content_type, file_size_bytes, created_at')
      .eq('dataset_id', id)
      .order('created_at', { ascending: true });

    if (filesError) {
      return res.status(500).json({ error: filesError.message });
    }

    supabaseAdmin
      .from('datasets')
      .update({ views: (data.views ?? 0) + 1 })
      .eq('id', id)
      .then(() => {})
      .catch(() => {});

        return res.json({
      ...data,
      files: files ?? [],
    });
  }
  if (req.method === 'PATCH') {
    const user = await verifyAuth(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Sign in to update publication links.' });
    }

    const { data: dataset, error: fetchError } = await supabaseAdmin
      .from('datasets')
      .select('id, submitted_by')
      .eq('id', id)
      .single();

    if (fetchError || !dataset) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }

    if (dataset.submitted_by !== user.id) {
      return res.status(403).json({
        error: 'You can only update your own datasets.',
      });
    }

    const requestedDoiUrls = req.body?.doi_urls ?? [];

    if (!Array.isArray(requestedDoiUrls)) {
      return res.status(400).json({
        error: 'DOI and publication links must be provided as a list.',
      });
    }

    if (requestedDoiUrls.length > 20) {
      return res.status(400).json({
        error: 'A maximum of 20 DOI or publication links is allowed.',
      });
    }

    if (requestedDoiUrls.some(value =>
      typeof value !== 'string' || value.length > 2048
    )) {
      return res.status(400).json({
        error: 'Each DOI or publication link must be valid and no longer than 2,048 characters.',
      });
    }

    const normalizedDoiUrls = requestedDoiUrls.map(normalizeDoiUrl);

    if (normalizedDoiUrls.some(value => !value)) {
      return res.status(400).json({
        error: 'Enter only valid DOI or http/https publication links.',
      });
    }

    const { data: updatedDataset, error: updateError } = await supabaseAdmin
      .from('datasets')
      .update({
        doi_urls: normalizedDoiUrls,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, doi_urls, updated_at')
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({ dataset: updatedDataset });
  }

  if (req.method === 'DELETE') {
    const user = await verifyAuth(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const { data: dataset, error: fetchError } = await supabaseAdmin
      .from('datasets')
      .select('submitted_by, object_key')
      .eq('id', id)
      .single();

    if (fetchError || !dataset) return res.status(404).json({ error: 'Dataset not found.' });
    if (dataset.submitted_by !== user.id) {
      return res.status(403).json({ error: 'You can only delete your own datasets.' });
    }

    const { data: datasetFiles, error: filesFetchError } = await supabaseAdmin
      .from('dataset_files')
      .select('object_key')
      .eq('dataset_id', id);

    if (filesFetchError) {
      return res.status(500).json({ error: filesFetchError.message });
    }

    const objectKeys = [
      dataset.object_key,
      ...(datasetFiles ?? []).map(file => file.object_key),
    ].filter(Boolean);

    const uniqueObjectKeys = [...new Set(objectKeys)];

    if (uniqueObjectKeys.length > 0) {
      const client = minioClient();
      const bucket = process.env.MINIO_BUCKET;

      if (!client || !bucket) {
        return res.status(500).json({ error: 'Storage not configured.' });
      }

      try {
        await Promise.all(
          uniqueObjectKeys.map(objectKey =>
            client.send(
              new DeleteObjectCommand({
                Bucket: bucket,
                Key: objectKey,
              })
            )
          )
        );
      } catch (err) {
        console.error('[MinIO] object deletion failed:', err.message);
        return res.status(502).json({
          error: 'One or more dataset files could not be removed.',
        });
      }
    }

    const { error } = await supabaseAdmin.from('datasets').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(204).end();
  }

  return res.status(405).end();
}
