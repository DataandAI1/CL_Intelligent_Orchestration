import { ProviderId } from './types';

export class LlmError extends Error {
  constructor(
    message: string,
    public provider: ProviderId,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export class LlmAuthError extends LlmError {
  constructor(message: string, provider: ProviderId, cause?: unknown) {
    super(message, provider, cause);
    this.name = 'LlmAuthError';
  }
}

export class LlmConnectionError extends LlmError {
  constructor(message: string, provider: ProviderId, cause?: unknown) {
    super(message, provider, cause);
    this.name = 'LlmConnectionError';
  }
}

export class LlmParseError extends LlmError {
  constructor(message: string, provider: ProviderId, cause?: unknown) {
    super(message, provider, cause);
    this.name = 'LlmParseError';
  }
}
