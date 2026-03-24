export class CliError extends Error {
  constructor(message, { exitCode = 1, hint, cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

export class CliUsageError extends CliError {
  constructor(message, options = {}) {
    super(message, { ...options, exitCode: 2 });
  }
}

export class WechatApiError extends CliError {
  constructor(message, code, payload) {
    super(`WeChat API error ${code}: ${message}`);
    this.code = code;
    this.payload = payload;
  }
}
