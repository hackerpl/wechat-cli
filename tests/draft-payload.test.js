import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDraftPayloadFromOptions, normalizeDraftPayload } from '../src/lib/draft-payload.js';
import { CliUsageError } from '../src/lib/errors.js';

test('normalizes a single news article object into draft payload', () => {
  const payload = normalizeDraftPayload({
    title: 'Title',
    content: '<p>Hello</p>',
    thumb_media_id: 'thumb-id'
  });

  assert.deepEqual(payload, {
    articles: [
      {
        article_type: 'news',
        title: 'Title',
        content: '<p>Hello</p>',
        thumb_media_id: 'thumb-id'
      }
    ]
  });
});

test('normalizes a newspic article and preserves image list', () => {
  const payload = normalizeDraftPayload({
    article_type: 'newspic',
    title: 'Pic',
    content: 'content',
    image_info: {
      image_list: [
        { image_media_id: 'image-1' }
      ]
    }
  });

  assert.deepEqual(payload, {
    articles: [
      {
        article_type: 'newspic',
        title: 'Pic',
        content: 'content',
        image_info: {
          image_list: [
            { image_media_id: 'image-1' }
          ]
        }
      }
    ]
  });
});

test('rejects invalid news article without thumb_media_id', () => {
  assert.throws(
    () => normalizeDraftPayload({
      title: 'Title',
      content: '<p>Hello</p>'
    }),
    CliUsageError
  );
});

test('builds a news draft payload from CLI-style options', () => {
  const payload = buildDraftPayloadFromOptions({
    title: 'News title',
    content: '<p>Hello</p>',
    thumbMediaId: 'thumb-id',
    author: 'Author',
    digest: 'Digest',
    contentSourceUrl: 'https://example.com/source',
    needOpenComment: '1',
    onlyFansCanComment: '0',
    picCrop2351: '0.1945_0_1_0.5236',
    picCrop11: '0.1_0_0.9_1'
  });

  assert.deepEqual(payload, {
    articles: [
      {
        article_type: 'news',
        title: 'News title',
        author: 'Author',
        digest: 'Digest',
        content: '<p>Hello</p>',
        content_source_url: 'https://example.com/source',
        thumb_media_id: 'thumb-id',
        need_open_comment: 1,
        only_fans_can_comment: 0,
        pic_crop_235_1: '0.1945_0_1_0.5236',
        pic_crop_1_1: '0.1_0_0.9_1'
      }
    ]
  });
});

test('builds a newspic draft payload from CLI-style options', () => {
  const payload = buildDraftPayloadFromOptions({
    type: 'newspic',
    title: 'Pic title',
    content: 'plain text',
    imageMediaIds: ['img-1', 'img-2'],
    coverCrops: ['1_1,0.1,0,0.9,1']
  });

  assert.deepEqual(payload, {
    articles: [
      {
        article_type: 'newspic',
        title: 'Pic title',
        content: 'plain text',
        image_info: {
          image_list: [
            { image_media_id: 'img-1' },
            { image_media_id: 'img-2' }
          ]
        },
        cover_info: {
          crop_percent_list: [
            {
              ratio: '1_1',
              x1: '0.1',
              y1: '0',
              x2: '0.9',
              y2: '1'
            }
          ]
        }
      }
    ]
  });
});

test('rejects news-only options when building a newspic draft from options', () => {
  assert.throws(
    () => buildDraftPayloadFromOptions({
      type: 'newspic',
      title: 'Pic title',
      content: 'plain text',
      thumbMediaId: 'thumb-id',
      imageMediaIds: ['img-1']
    }),
    CliUsageError
  );
});
