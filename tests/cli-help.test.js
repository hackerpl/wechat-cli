import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = '/home/hackerpl/projects/wechat-cli';

test('top-level help renders successfully', () => {
  const result = spawnSync('node', ['bin/wechat.js', '--help'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /material/);
  assert.match(result.stdout, /draft/);
});

test('material help renders successfully', () => {
  const result = spawnSync('node', ['bin/wechat.js', 'material', '--help'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /material add/);
  assert.match(result.stdout, /material delete/);
});

test('draft help shows rich parameter options', () => {
  const result = spawnSync('node', ['bin/wechat.js', 'draft', '--help'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /draft add news/);
  assert.match(result.stdout, /draft add newspic/);
});

test('draft news help shows rich parameter options', () => {
  const result = spawnSync('node', ['bin/wechat.js', 'draft', 'add', 'news', '--help'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /--author <author>/);
  assert.match(result.stdout, /--content-file <path\|->/);
  assert.match(result.stdout, /--need-open-comment <0\|1>/);
});

test('draft add news dry-run builds a rich news payload from CLI options', () => {
  const result = spawnSync('node', [
    'bin/wechat.js',
    'draft',
    'add',
    'news',
    '--title', '示例草稿标题',
    '--content', '<p>这里填写正文内容。</p>',
    '--thumb-media-id', 'THUMB_MEDIA_ID',
    '--author', 'wechat-cli',
    '--digest', '这是摘要',
    '--content-source-url', 'https://example.com/original-article',
    '--need-open-comment', '1',
    '--only-fans-can-comment', '1',
    '--pic-crop-235-1', '0.1945_0_1_0.5236',
    '--pic-crop-1-1', '0.1_0_0.9_1',
    '--dry-run'
  ], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /"author": "wechat-cli"/);
  assert.match(result.stdout, /"digest": "这是摘要"/);
  assert.match(result.stdout, /"need_open_comment": 1/);
  assert.match(result.stdout, /"pic_crop_235_1": "0.1945_0_1_0.5236"/);
});

test('draft add newspic dry-run builds a newspic payload from CLI options', () => {
  const result = spawnSync('node', [
    'bin/wechat.js',
    'draft',
    'add',
    'newspic',
    '--title', '图片消息标题',
    '--content', '这里只支持纯文本和部分特殊标签。',
    '--image-media-id', 'IMAGE_MEDIA_ID_1',
    '--image-media-id', 'IMAGE_MEDIA_ID_2',
    '--cover-crop', '1_1,0.166454,0,0.833545,1',
    '--dry-run'
  ], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /"article_type": "newspic"/);
  assert.match(result.stdout, /"image_media_id": "IMAGE_MEDIA_ID_1"/);
  assert.match(result.stdout, /"ratio": "1_1"/);
});
