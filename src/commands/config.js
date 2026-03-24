import { parseArgs } from 'node:util';
import {
  getConfigPath,
  maskSecret,
  readConfig,
  updateCredentials
} from '../lib/config-store.js';
import { CliUsageError } from '../lib/errors.js';
import { CLI_NAME } from '../lib/meta.js';

const HELP_TEXT = `Usage:
  ${CLI_NAME} config [--appid <appid>] [--appsecret <appsecret>] [--show]

Options:
  --appid <appid>            Set the WeChat AppID
  --appsecret <appsecret>    Set the WeChat AppSecret
  --show                     Show current configuration
  -h, --help                 Show help
`;

function printConfig(config) {
  const hasToken = Boolean(config.tokenCache?.accessToken);

  console.log(`config_path: ${getConfigPath()}`);
  console.log(`appid: ${config.credentials.appid || '(not set)'}`);
  console.log(`appsecret: ${config.credentials.appsecret ? maskSecret(config.credentials.appsecret) : '(not set)'}`);
  console.log(`token_cached: ${hasToken ? 'yes' : 'no'}`);

  if (config.tokenCache?.expiresAt) {
    console.log(`token_expires_at: ${config.tokenCache.expiresAt}`);
  }
}

export async function runConfigCommand(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      appid: { type: 'string' },
      appsecret: { type: 'string' },
      show: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (positionals.length > 0) {
    throw new CliUsageError('`config` does not accept positional arguments.', { hint: HELP_TEXT });
  }

  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  if (values.appid || values.appsecret) {
    const config = await updateCredentials({
      appid: values.appid,
      appsecret: values.appsecret
    });

    console.log('Configuration saved.');
    printConfig(config);
    return;
  }

  const config = await readConfig();
  printConfig(config);
}
