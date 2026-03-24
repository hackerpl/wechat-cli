import { cacheToken, getCachedToken, hasCredentials, readConfig, updateCredentials } from './config-store.js';
import { promptForCredentials } from './prompt.js';
import { fetchStableAccessToken } from './wechat-api.js';

async function ensureCredentials() {
  const config = await readConfig();

  if (hasCredentials(config)) {
    return config.credentials;
  }

  const credentials = await promptForCredentials(config.credentials);
  await updateCredentials(credentials);
  return credentials;
}

export async function getAccessToken({ forceRefresh = false } = {}) {
  const config = await readConfig();

  if (!forceRefresh) {
    const cached = getCachedToken(config);
    if (cached) {
      return {
        accessToken: cached.accessToken,
        expiresAt: cached.expiresAt,
        expiresIn: cached.expiresIn,
        source: 'cache'
      };
    }
  }

  const credentials = hasCredentials(config) ? config.credentials : await ensureCredentials();
  const tokenPayload = await fetchStableAccessToken({
    appid: credentials.appid,
    appsecret: credentials.appsecret,
    forceRefresh
  });

  const tokenCache = await cacheToken({
    accessToken: tokenPayload.access_token,
    expiresIn: tokenPayload.expires_in
  });

  return {
    accessToken: tokenPayload.access_token,
    expiresAt: tokenCache.expiresAt,
    expiresIn: tokenPayload.expires_in,
    source: 'remote'
  };
}
