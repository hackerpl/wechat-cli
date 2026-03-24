import process from 'node:process';
import { runConfigCommand } from './commands/config.js';
import { runDraftCommand } from './commands/draft.js';
import { runMaterialCommand } from './commands/material.js';
import { runTokenCommand } from './commands/token.js';
import { CliError, CliUsageError } from './lib/errors.js';
import { CLI_NAME, VERSION } from './lib/meta.js';

const MAIN_HELP = `${CLI_NAME} ${VERSION}

Usage:
  ${CLI_NAME} <command> [options]

Commands:
  config          Configure AppID and AppSecret
  token           Print the current stable access token
  material        Manage permanent materials
  draft           Add a draft from a JSON payload
  help            Show this help message

Global options:
  -h, --help      Show help
  -v, --version   Show version

Examples:
  ${CLI_NAME} config --appid wx123 --appsecret secret123
  ${CLI_NAME} token --refresh
  ${CLI_NAME} material count
  ${CLI_NAME} material add --type image --file ./cover.jpg
  ${CLI_NAME} material get --media-id MEDIA_ID --output ./downloads/item.jpg
  ${CLI_NAME} material delete --media-id MEDIA_ID
  ${CLI_NAME} draft add --file ./doc/examples/draft-news.json
`;

function isHelpFlag(value) {
  return value === '--help' || value === '-h' || value === 'help';
}

function isVersionFlag(value) {
  return value === '--version' || value === '-v' || value === 'version';
}

function printHelp() {
  console.log(MAIN_HELP);
}

function handleError(error) {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`);
    if (error.hint) {
      console.error(error.hint);
    }
    process.exitCode = error.exitCode;
    return;
  }

  console.error(error);
  process.exitCode = 1;
}

export async function run(argv = process.argv) {
  try {
    const args = argv.slice(2);

    if (args.length === 0 || isHelpFlag(args[0])) {
      printHelp();
      return;
    }

    if (args.length === 1 && isVersionFlag(args[0])) {
      console.log(VERSION);
      return;
    }

    const [command, ...rest] = args;

    switch (command) {
      case 'config':
        await runConfigCommand(rest);
        return;
      case 'token':
        await runTokenCommand(rest);
        return;
      case 'material':
        await runMaterialCommand(rest);
        return;
      case 'draft':
        await runDraftCommand(rest);
        return;
      default:
        throw new CliUsageError(`Unknown command: ${command}`, { hint: `Run \`${CLI_NAME} --help\` to see available commands.` });
    }
  } catch (error) {
    handleError(error);
  }
}
