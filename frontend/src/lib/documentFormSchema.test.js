import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocumentSchema, editDocumentSchema, MAX_FILE_SIZE } from './documentFormSchema.js';

const valid = () => ({
  title: 'Policy', author: 'author-id', description: 'Review this policy', category: 'category-id',
  opensForReview: new Date('2026-11-18'), reviewInterval: 'quarterly', reviewPeriod: '2weeks',
  file: [{ type: 'application/pdf', size: 1024 }],
});

test('document schemas preserve create, edit, upload and custom interval validation after Zod upgrade', () => {
  assert.equal(createDocumentSchema.safeParse(valid()).success, true);
  assert.equal(createDocumentSchema.safeParse({ ...valid(), file: undefined }).success, false);
  assert.equal(editDocumentSchema.safeParse({ ...valid(), file: undefined }).success, true);
  for (const file of [[{ type: 'application/x-executable', size: 1 }], [{ type: 'application/pdf', size: MAX_FILE_SIZE + 1 }]]) {
    assert.equal(createDocumentSchema.safeParse({ ...valid(), file }).success, false);
  }
  assert.equal(createDocumentSchema.safeParse({ ...valid(), reviewInterval: 'custom' }).success, false);
  assert.equal(createDocumentSchema.safeParse({ ...valid(), reviewInterval: 'custom', reviewIntervalDays: 7 }).success, true);
  const invalidDate = createDocumentSchema.safeParse({ ...valid(), opensForReview: undefined });
  assert.equal(invalidDate.error.issues.find(issue => issue.path[0] === 'opensForReview').message, 'Opens for review date is required');
});
test('React Hook Form resolver returns field errors rather than throwing Zod errors', async () => {
  const resolve = zodResolver(createDocumentSchema);
  const options = { fields: {}, shouldUseNativeValidation: false };
  const result = await resolve({ ...valid(), title: '' }, {}, options);
  assert.equal(result.errors.title.message, 'Title is required');
  assert.deepEqual((await resolve(valid(), {}, options)).errors, {});
});
