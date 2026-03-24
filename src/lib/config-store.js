import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function getBaseConfigDir() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return process.env.APPDATA;
  }

  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

export function getConfigPath() {
  return path.join(getBaseConfigDir(), 'wechat-cli', 'config.json');
}

function normalizeConfig(input = {}) {
  const credentials = input.credentials ?? {};
  const tokenCache = input.tokenCache ?? null;

  return {
    credentials: {
      appid: credentials.appid ?? '',
      appsecret: credentials.appsecret ?? ''
    },
    tokenCache: tokenCache ? {
      accessToken: tokenCache.accessToken ?? '',
      expiresAt: tokenCache.expiresAt ?? '',
      expiresIn: tokenCache.expiresIn ?? 0,
      fetchedAt: tokenCache.fetchedAt ?? ''
    } : null
  };
}

export async function readConfig() {
  try {
    const raw = await readFile(getConfigPath(), 'utf8');
    return normalizeConfig(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return normalizeConfig();
    }

    throw error;
  }
}

export async function writeConfig(config) {
  const filePath = getConfigPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(normalizeConfig(config), null, 2)}\n`, 'utf8');
}

export function hasCredentials(config) {
  return Boolean(config.credentials.appid && config.credentials.appsecret);
}

export function maskSecret(value) {
  if (!value) {
    return '';
  }

  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
}

export function getCachedToken(config) {
  if (!config.tokenCache?.accessToken || !config.tokenCache?.expiresAt) {
    return null;
  }

  const expiresAtMs = Date.parse(config.tokenCache.expiresAt);

  if (!Number.isFinite(expiresAtMs)) {
    return null;
  }

  const refreshBufferMs = 5 * 60 * 1000;
  if (Date.now() >= expiresAtMs - refreshBufferMs) {
    return null;
  }

  return {
    accessToken: config.tokenCache.accessToken,
    expiresAt: config.tokenCache.expiresAt,
    expiresIn: Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
  };
}

export async function updateCredentials({ appid, appsecret }) {
  const config = await readConfig();
  const nextConfig = {
    ...config,
    credentials: {
      appid: appid ?? config.credentials.appid,
      appsecret: appsecret ?? config.credentials.appsecret
    }
  };

  if (appid || appsecret) {
    nextConfig.tokenCache = null;
  }

  await writeConfig(nextConfig);
  return nextConfig;
}

export async function cacheToken({ accessToken, expiresIn }) {
  const config = await readConfig();
  const now = new Date();
  config.tokenCache = {
    accessToken,
    expiresIn,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiresIn * 1000).toISOString()
  };
  await writeConfig(config);
  return config.tokenCache;
}
