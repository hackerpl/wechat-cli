import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { CliError } from './errors.js';

export async function promptForCredentials(existing = {}) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new CliError('Missing AppID/AppSecret and no interactive terminal is available.', {
      hint: 'Run `wechat config --appid <AppID> --appsecret <AppSecret>` first.'
    });
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const appid = (await rl.question(`AppID${existing.appid ? ` [${existing.appid}]` : ''}: `)).trim() || existing.appid || '';
    const appsecret = (await rl.question(`AppSecret${existing.appsecret ? ' [stored value]' : ''}: `)).trim() || existing.appsecret || '';

    if (!appid || !appsecret) {
      throw new CliError('Both AppID and AppSecret are required.');
    }

    return { appid, appsecret };
  } finally {
    rl.close();
  }
}
