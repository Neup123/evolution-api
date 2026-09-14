import { HttpStatus } from '@api/routes/index.router';

export class TooManyRequestsException {
  constructor(...objectError: any[]) {
    throw {
      status: HttpStatus.TOO_MANY_REQUESTS,
      error: 'Too Many Requests',
      message: objectError.length > 0 ? objectError : undefined,
    };
  }
}
