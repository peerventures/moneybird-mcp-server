export class MoneybirdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneybirdError';
  }
}

export class MoneybirdValidationError extends MoneybirdError {
  response?: any;

  constructor(message: string, response?: any) {
    super(message);
    this.name = 'MoneybirdValidationError';
    this.response = response;
  }
}

export class MoneybirdResourceNotFoundError extends MoneybirdError {
  constructor(message: string) {
    super(message);
    this.name = 'MoneybirdResourceNotFoundError';
  }
}

export class MoneybirdAuthenticationError extends MoneybirdError {
  constructor(message: string) {
    super(message);
    this.name = 'MoneybirdAuthenticationError';
  }
}

export class MoneybirdPermissionError extends MoneybirdError {
  constructor(message: string) {
    super(message);
    this.name = 'MoneybirdPermissionError';
  }
}

export class MoneybirdRateLimitError extends MoneybirdError {
  resetAt: Date;

  constructor(message: string, resetAt: Date = new Date()) {
    super(message);
    this.name = 'MoneybirdRateLimitError';
    this.resetAt = resetAt;
  }
}

export class MoneybirdConflictError extends MoneybirdError {
  constructor(message: string) {
    super(message);
    this.name = 'MoneybirdConflictError';
  }
}

export function isMoneybirdError(error: any): error is MoneybirdError {
  return error instanceof MoneybirdError;
} 