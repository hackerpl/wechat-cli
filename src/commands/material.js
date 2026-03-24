import { parseArgs } from 'node:util';
import {
  ensureParentDirectory,
  inferMaterialOutputPath,
  writeBinaryFile
} from '../lib/files.js';
import { getAccessToken } from '../lib/auth.js';
import { CliUsageError } from '../lib/errors.js';
import { CLI_NAME } from '../lib/meta.js';
import {
  deletePermanentMaterial,
  getMaterialCount,
  getPermanentMaterial,
  uploadPermanentMaterial
} from '../lib/wechat-api.js';

const HELP_TEXT = `Usage:
  ${CLI_NAME} material <subcommand> [options]

Subcommands:
  count                         Show permanent material counts
  add     --type <type> --file <path> [--title <title>] [--introduction <text>]
  get     --media-id <mediaId> [--output <path>] [--json]
  delete  --media-id <mediaId>

Examples:
  ${CLI_NAME} material count
  ${CLI_NAME} material add --type image --file ./cover.jpg
  ${CLI_NAME} material add --type video --file ./intro.mp4 --title "Demo" --introduction "Short intro"
  ${CLI_NAME} material get --media-id MEDIA_ID
  ${CLI_NAME} material delete --media-id MEDIA_ID
`;

const MATERIAL_TYPES = new Set(['image', 'voice', 'video', 'thumb']);

function requireMediaId(values, positionals, helpText) {
  const mediaId = values['media-id'] || positionals[0];

  if (!mediaId) {
    throw new CliUsageError('Missing required `--media-id`.', { hint: helpText });
  }

  return mediaId;
}

async function runCount(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (positionals.length > 0) {
    throw new CliUsageError('`material count` does not accept positional arguments.', { hint: HELP_TEXT });
  }

  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  const { accessToken } = await getAccessToken();
  const data = await getMaterialCount(accessToken);

  if (values.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`image_count: ${data.image_count}`);
  console.log(`voice_count: ${data.voice_count}`);
  console.log(`video_count: ${data.video_count}`);
  console.log(`news_count: ${data.news_count}`);
}

async function runAdd(args) {
  const helpText = `Usage:
  ${CLI_NAME} material add --type <image|voice|video|thumb> --file <path> [--title <title>] [--introduction <text>] [--json]
`;

  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      type: { type: 'string' },
      file: { type: 'string' },
      title: { type: 'string' },
      introduction: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (values.help) {
    console.log(helpText);
    return;
  }

  if (positionals.length > 0) {
    throw new CliUsageError('`material add` does not accept positional arguments.', { hint: helpText });
  }

  if (!values.type || !values.file) {
    throw new CliUsageError('`material add` requires both `--type` and `--file`.', { hint: helpText });
  }

  if (!MATERIAL_TYPES.has(values.type)) {
    throw new CliUsageError(`Unsupported material type: ${values.type}`, { hint: 'Supported values are image, voice, video, thumb.' });
  }

  if (values.type === 'video' && (!values.title || !values.introduction)) {
    throw new CliUsageError('Video uploads require both `--title` and `--introduction`.', { hint: helpText });
  }

  const { accessToken } = await getAccessToken();
  const data = await uploadPermanentMaterial(accessToken, {
    type: values.type,
    filePath: values.file,
    title: values.title,
    introduction: values.introduction
  });

  if (values.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`media_id: ${data.media_id}`);
  if (data.url) {
    console.log(`url: ${data.url}`);
  }
}

async function runGet(args) {
  const helpText = `Usage:
  ${CLI_NAME} material get --media-id <mediaId> [--output <path>] [--json]
`;

  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      'media-id': { type: 'string' },
      output: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (values.help) {
    console.log(helpText);
    return;
  }

  const mediaId = requireMediaId(values, positionals, helpText);
  const { accessToken } = await getAccessToken();
  const result = await getPermanentMaterial(accessToken, mediaId);

  if (result.kind === 'json') {
    console.log(JSON.stringify(result.data, null, 2));
    return;
  }

  const outputPath = inferMaterialOutputPath({
    mediaId,
    output: values.output,
    contentType: result.contentType,
    contentDisposition: result.contentDisposition
  });

  await ensureParentDirectory(outputPath);
  await writeBinaryFile(outputPath, result.buffer);

  if (values.json) {
    console.log(JSON.stringify({
      media_id: mediaId,
      output: outputPath,
      content_type: result.contentType
    }, null, 2));
    return;
  }

  console.log(`saved_to: ${outputPath}`);
  console.log(`content_type: ${result.contentType}`);
}

async function runDelete(args) {
  const helpText = `Usage:
  ${CLI_NAME} material delete --media-id <mediaId> [--json]
`;

  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      'media-id': { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (values.help) {
    console.log(helpText);
    return;
  }

  const mediaId = requireMediaId(values, positionals, helpText);
  const { accessToken } = await getAccessToken();
  const data = await deletePermanentMaterial(accessToken, mediaId);

  if (values.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`deleted: ${mediaId}`);
}

export async function runMaterialCommand(args) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    console.log(HELP_TEXT);
    return;
  }

  switch (subcommand) {
    case 'count':
      await runCount(rest);
      return;
    case 'add':
      await runAdd(rest);
      return;
    case 'get':
      await runGet(rest);
      return;
    case 'delete':
      await runDelete(rest);
      return;
    default:
      throw new CliUsageError(`Unknown material subcommand: ${subcommand}`, { hint: HELP_TEXT });
  }
}
