import { parseArgs } from 'node:util';
import { getAccessToken } from '../lib/auth.js';
import { buildDraftPayloadFromOptions, hasDraftOptionInput, normalizeDraftPayload } from '../lib/draft-payload.js';
import { readJsonInput, readTextInput } from '../lib/files.js';
import { CliUsageError } from '../lib/errors.js';
import { CLI_NAME } from '../lib/meta.js';
import { addDraft } from '../lib/wechat-api.js';

const MAIN_HELP_TEXT = `Usage:
  ${CLI_NAME} draft add news [options]
  ${CLI_NAME} draft add newspic [options]
  ${CLI_NAME} draft add --file <path|-> [--json] [--dry-run]

Commands:
  add news       Create a \`news\` draft from CLI flags
  add newspic    Create a \`newspic\` draft from CLI flags
  add --file     Send a draft payload from a JSON file or stdin

Run:
  ${CLI_NAME} draft add news --help
  ${CLI_NAME} draft add newspic --help
`;

const ADD_HELP_TEXT = `Usage:
  ${CLI_NAME} draft add news [options]
  ${CLI_NAME} draft add newspic [options]
  ${CLI_NAME} draft add --file <path|-> [--json] [--dry-run]

Notes:
  Pass \`--file -\` to read JSON from stdin.
  The file mode accepts:
    1. A full request payload: { "articles": [...] }
    2. An articles array: [ ... ]
    3. A single article object: { ... }
  For parameter mode, prefer explicit subcommands: \`news\` and \`newspic\`.
`;

const NEWS_HELP_TEXT = `Usage:
  ${CLI_NAME} draft add news --title <title> (--content <text> | --content-file <path|->) --thumb-media-id <mediaId> [options]

Options:
  --title <title>
  --content <text>
  --content-file <path|->
  --thumb-media-id <mediaId>
  --author <author>
  --digest <digest>
  --content-source-url <url>
  --need-open-comment <0|1>
  --only-fans-can-comment <0|1>
  --pic-crop-235-1 <x1_y1_x2_y2>
  --pic-crop-1-1 <x1_y1_x2_y2>
  --dry-run
  --json
  -h, --help

Example:
  ${CLI_NAME} draft add news --title "带摘要图文" --content-file ./doc/examples/draft-news-content.html --thumb-media-id MEDIA_ID --author "wechat-cli" --digest "摘要"
`;

const NEWSPIC_HELP_TEXT = `Usage:
  ${CLI_NAME} draft add newspic --title <title> (--content <text> | --content-file <path|->) --image-media-id <mediaId> [--image-media-id <mediaId>] [options]

Options:
  --title <title>
  --content <text>
  --content-file <path|->
  --image-media-id <mediaId>           Repeatable
  --cover-crop <ratio,x1,y1,x2,y2>     Repeatable
  --need-open-comment <0|1>
  --only-fans-can-comment <0|1>
  --dry-run
  --json
  -h, --help

Example:
  ${CLI_NAME} draft add newspic --title "图片消息" --content "纯文本正文" --image-media-id IMAGE_1 --image-media-id IMAGE_2
`;

function isHelpFlag(value) {
  return value === '--help' || value === '-h' || value === 'help';
}

async function executeDraftAdd(normalizedPayload, { dryRun, json }) {
  if (dryRun) {
    console.log(JSON.stringify(normalizedPayload, null, 2));
    return;
  }

  const { accessToken } = await getAccessToken();
  const data = await addDraft(accessToken, normalizedPayload);

  if (json) {
    console.log(JSON.stringify({
      request: normalizedPayload,
      response: data
    }, null, 2));
    return;
  }

  console.log(`media_id: ${data.media_id}`);
}

async function buildContent(values, helpText) {
  if (values.content && values['content-file']) {
    throw new CliUsageError('Use either `--content` or `--content-file`, not both.', { hint: helpText });
  }

  return values.content ?? (values['content-file'] ? await readTextInput(values['content-file']) : undefined);
}

async function runNewsAdd(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      title: { type: 'string' },
      content: { type: 'string' },
      'content-file': { type: 'string' },
      'thumb-media-id': { type: 'string' },
      author: { type: 'string' },
      digest: { type: 'string' },
      'content-source-url': { type: 'string' },
      'need-open-comment': { type: 'string' },
      'only-fans-can-comment': { type: 'string' },
      'pic-crop-235-1': { type: 'string' },
      'pic-crop-1-1': { type: 'string' },
      'dry-run': { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (values.help) {
    console.log(NEWS_HELP_TEXT);
    return;
  }

  if (positionals.length > 0) {
    throw new CliUsageError('`draft add news` does not accept positional arguments.', { hint: NEWS_HELP_TEXT });
  }

  const normalizedPayload = buildDraftPayloadFromOptions({
    type: 'news',
    title: values.title,
    content: await buildContent(values, NEWS_HELP_TEXT),
    author: values.author,
    digest: values.digest,
    contentSourceUrl: values['content-source-url'],
    thumbMediaId: values['thumb-media-id'],
    needOpenComment: values['need-open-comment'],
    onlyFansCanComment: values['only-fans-can-comment'],
    picCrop2351: values['pic-crop-235-1'],
    picCrop11: values['pic-crop-1-1']
  });

  await executeDraftAdd(normalizedPayload, {
    dryRun: values['dry-run'],
    json: values.json
  });
}

async function runNewspicAdd(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      title: { type: 'string' },
      content: { type: 'string' },
      'content-file': { type: 'string' },
      'image-media-id': { type: 'string', multiple: true },
      'cover-crop': { type: 'string', multiple: true },
      'need-open-comment': { type: 'string' },
      'only-fans-can-comment': { type: 'string' },
      'dry-run': { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (values.help) {
    console.log(NEWSPIC_HELP_TEXT);
    return;
  }

  if (positionals.length > 0) {
    throw new CliUsageError('`draft add newspic` does not accept positional arguments.', { hint: NEWSPIC_HELP_TEXT });
  }

  const normalizedPayload = buildDraftPayloadFromOptions({
    type: 'newspic',
    title: values.title,
    content: await buildContent(values, NEWSPIC_HELP_TEXT),
    imageMediaIds: values['image-media-id'],
    coverCrops: values['cover-crop'],
    needOpenComment: values['need-open-comment'],
    onlyFansCanComment: values['only-fans-can-comment']
  });

  await executeDraftAdd(normalizedPayload, {
    dryRun: values['dry-run'],
    json: values.json
  });
}

async function runLegacyOrFileAdd(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      file: { type: 'string' },
      type: { type: 'string' },
      title: { type: 'string' },
      content: { type: 'string' },
      'content-file': { type: 'string' },
      author: { type: 'string' },
      digest: { type: 'string' },
      'content-source-url': { type: 'string' },
      'thumb-media-id': { type: 'string' },
      'need-open-comment': { type: 'string' },
      'only-fans-can-comment': { type: 'string' },
      'pic-crop-235-1': { type: 'string' },
      'pic-crop-1-1': { type: 'string' },
      'image-media-id': { type: 'string', multiple: true },
      'cover-crop': { type: 'string', multiple: true },
      'dry-run': { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (values.help) {
    console.log(ADD_HELP_TEXT);
    return;
  }

  const file = values.file || positionals[0];

  if (positionals.length > 1) {
    throw new CliUsageError('Too many positional arguments for `draft add`.', { hint: ADD_HELP_TEXT });
  }

  const optionInput = {
    type: values.type,
    title: values.title,
    content: values.content,
    author: values.author,
    digest: values.digest,
    contentSourceUrl: values['content-source-url'],
    thumbMediaId: values['thumb-media-id'],
    needOpenComment: values['need-open-comment'],
    onlyFansCanComment: values['only-fans-can-comment'],
    picCrop2351: values['pic-crop-235-1'],
    picCrop11: values['pic-crop-1-1'],
    imageMediaIds: values['image-media-id'],
    coverCrops: values['cover-crop']
  };
  const usingOptionInput = hasDraftOptionInput(optionInput) || Boolean(values['content-file']);

  if (file && usingOptionInput) {
    throw new CliUsageError('Use either `--file` or parameter mode, not both.', { hint: ADD_HELP_TEXT });
  }

  if (!file && !usingOptionInput) {
    throw new CliUsageError('Provide either `--file` or parameter mode options for `draft add`.', { hint: ADD_HELP_TEXT });
  }

  let normalizedPayload;
  if (file) {
    const payload = await readJsonInput(file);
    normalizedPayload = normalizeDraftPayload(payload);
  } else {
    normalizedPayload = buildDraftPayloadFromOptions({
      ...optionInput,
      content: await buildContent(values, ADD_HELP_TEXT)
    });
  }

  await executeDraftAdd(normalizedPayload, {
    dryRun: values['dry-run'],
    json: values.json
  });
}

async function runAdd(args) {
  const [mode, ...rest] = args;

  if (!mode || isHelpFlag(mode)) {
    console.log(ADD_HELP_TEXT);
    return;
  }

  if (mode === 'news') {
    await runNewsAdd(rest);
    return;
  }

  if (mode === 'newspic') {
    await runNewspicAdd(rest);
    return;
  }

  await runLegacyOrFileAdd(args);
}

export async function runDraftCommand(args) {
  const [subcommand, ...rest] = args;

  if (!subcommand || isHelpFlag(subcommand)) {
    console.log(MAIN_HELP_TEXT);
    return;
  }

  switch (subcommand) {
    case 'add':
      await runAdd(rest);
      return;
    default:
      throw new CliUsageError(`Unknown draft subcommand: ${subcommand}`, { hint: MAIN_HELP_TEXT });
  }
}
