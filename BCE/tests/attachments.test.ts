import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadFiles } from '../src/lib/attachments.ts';

test('creates a missing storage bucket before retrying the upload', async () => {
  const events: string[] = [];

  const supabase = {
    storage: {
      async getBucket(bucketName: string) {
        events.push(`get:${bucketName}`);
        if (events.filter((event) => event.startsWith('create:')).length === 0) {
          return { error: { message: 'Bucket not found' } };
        }
        return { data: { id: bucketName } };
      },
      from(bucketName: string) {
        events.push(`from:${bucketName}`);
        return {
          async upload(filePath: string) {
            events.push(`upload:${filePath}`);
            if (events.filter((event) => event.startsWith('upload:')).length === 1) {
              return { error: { message: 'Bucket not found' } };
            }
            return {};
          },
          getPublicUrl(filePath: string) {
            return { data: { publicUrl: `https://example.com/${filePath}` } };
          },
        };
      },
      async createBucket(bucketName: string) {
        events.push(`create:${bucketName}`);
        return { data: {} };
      },
    },
  };

  const file = new File(['hello'], 'example.png', { type: 'image/png' });
  const result = await uploadFiles({
    files: [file],
    supabase: supabase as any,
    bucketName: 'attachments',
    ensureBucket: true,
  } as any);

  assert.equal(result.errors.length, 0);
  assert.equal(result.urls.length, 1);
  assert.ok(events.includes('create:attachments'));
});
