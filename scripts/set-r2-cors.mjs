// One-time script: configure CORS on the R2 bucket so browsers can PUT
// files directly from opendatabd.com.
// Run: node --env-file=.env.local scripts/set-r2-cors.mjs
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
} = process.env;

const missing = ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET']
  .filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  console.error('Run: node --env-file=.env.local scripts/set-r2-cors.mjs');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const CORS_RULES = [{
  AllowedOrigins: [
    'https://www.opendatabd.com',
    'https://opendatabd.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  AllowedMethods: ['PUT', 'GET', 'HEAD'],
  AllowedHeaders: ['Content-Type', 'Content-Length'],
  ExposeHeaders:  ['ETag'],
  MaxAgeSeconds:  3600,
}];

// Show existing config
try {
  const existing = await r2.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
  console.log('Current CORS rules:', JSON.stringify(existing.CORSRules, null, 2));
} catch (e) {
  console.log('No existing CORS rules:', e.Code ?? e.message);
}

// Apply
await r2.send(new PutBucketCorsCommand({
  Bucket: R2_BUCKET,
  CORSConfiguration: { CORSRules: CORS_RULES },
}));

console.log('\n✓ CORS configured on bucket:', R2_BUCKET);
console.log('  Origins :', CORS_RULES[0].AllowedOrigins.join(', '));
console.log('  Methods :', CORS_RULES[0].AllowedMethods.join(', '));
console.log('  Headers :', CORS_RULES[0].AllowedHeaders.join(', '));
