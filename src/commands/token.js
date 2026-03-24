import { parseArgs } from 'node:util';
import { getAccessToken } from '../lib/auth.js';
import { CliUsageError } from '../lib/errors.js';
import { CLI_NAME } from '../lib/meta.js';

const HELP_TEXT = `Usage:
  ${CLI_NAME} token [--refresh] [--json]

Options:
  --refresh      Force-refresh the stable access token
  --json         Print the full token payload as JSON
  -h, --help     Show help
`;

export async function runTokenCommand(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      refresh: { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  if (positionals.length > 0) {
    throw new CliUsageError('`token` does not accept positional arguments.', { hint: HELP_TEXT });
  }

  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  const result = await getAccessToken({ forceRefresh: values.refresh });

  if (values.json) {
    console.log(JSON.stringify({
      access_token: result.accessToken,
      expires_in: result.expiresIn,
      expires_at: result.expiresAt,
      source: result.source
    }, null, 2));
    return;
  }

  console.log(`access_token: ${result.accessToken}`);
  console.log(`source: ${result.source}`);
  if (result.expiresAt) {
    console.log(`expires_at: ${result.expiresAt}`);
  }
}
