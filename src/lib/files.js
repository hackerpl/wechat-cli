import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { CliError } from './errors.js';

const CONTENT_TYPE_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/bmp', '.bmp'],
  ['audio/mpeg', '.mp3'],
  ['audio/wav', '.wav'],
  ['audio/x-wav', '.wav'],
  ['audio/amr', '.amr'],
  ['application/octet-stream', '']
]);

export async function ensureParentDirectory(filePath) {
  await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
}

export async function writeBinaryFile(filePath, buffer) {
  await writeFile(filePath, buffer);
}

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

export async function readTextInput(inputPath) {
  return inputPath === '-'
    ? readStdin()
    : readFile(path.resolve(inputPath), 'utf8');
}

export async function readJsonInput(inputPath) {
  const raw = await readTextInput(inputPath);

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new CliError(`Invalid JSON payload in ${inputPath}.`, { cause: error });
  }
}

function fileNameFromDisposition(contentDisposition) {
  if (!contentDisposition) {
    return null;
  }

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
  return match ? decodeURIComponent(match[1]) : null;
}

function inferExtension(contentType) {
  const normalized = (contentType || '').split(';', 1)[0].trim().toLowerCase();
  return CONTENT_TYPE_EXTENSIONS.get(normalized) || '';
}

export function inferMaterialOutputPath({ mediaId, output, contentType, contentDisposition }) {
  if (output) {
    return path.resolve(output);
  }

  const dispositionName = fileNameFromDisposition(contentDisposition);
  if (dispositionName) {
    return path.resolve(dispositionName);
  }

  const extension = inferExtension(contentType);
  return path.resolve(`${mediaId}${extension}`);
}
