import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

export const CLI_NAME = 'wechat';
export const VERSION = packageJson.version;
