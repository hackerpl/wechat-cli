import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { getConfigPath, readConfig, updateCredentials, cacheToken, getCachedToken } from '../src/lib/config-store.js';

test('config store writes credentials and caches token', async () => {
  const originalXdg = process.env.XDG_CONFIG_HOME;
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'wechat-cli-'));
  process.env.XDG_CONFIG_HOME = tempRoot;

  try {
    await updateCredentials({ appid: 'wx-demo', appsecret: 'secret-demo' });
    const config = await readConfig();

    assert.equal(config.credentials.appid, 'wx-demo');
    assert.equal(config.credentials.appsecret, 'secret-demo');
    assert.match(getConfigPath(), new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    await cacheToken({ accessToken: 'token-demo', expiresIn: 7200 });
    const updated = await readConfig();
    const cached = getCachedToken(updated);

    assert.ok(cached);
    assert.equal(cached.accessToken, 'token-demo');
  } finally {
    if (originalXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdg;
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
});
