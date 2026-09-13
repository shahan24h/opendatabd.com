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

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Dataset not found.' });

    supabaseAdmin
      .from('datasets')
      .update({ views: (data.views ?? 0) + 1 })
      .eq('id', id)
      .then(() => {})
      .catch(() => {});

    return res.json(data);
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

    if (dataset.object_key) {
      const client = minioClient();
      const bucket = process.env.MINIO_BUCKET;
      if (!client || !bucket) {
        return res.status(500).json({ error: 'Storage not configured.' });
      }

      try {
        await client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: dataset.object_key,
        }));
      } catch (err) {
        console.error('[MinIO] object deletion failed:', err.message);
        return res.status(502).json({ error: 'Dataset file could not be removed.' });
      }
    }

    const { error } = await supabaseAdmin.from('datasets').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(204).end();
  }

  return res.status(405).end();
}
