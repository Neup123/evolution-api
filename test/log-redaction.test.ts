import assert from 'node:assert/strict';
import fs from 'node:fs';

import { redactSensitiveData } from '../src/config/logger.config';

const structured = redactSensitiveData({
  apiKey: 'top-secret',
  headers: { authorization: 'Bearer secret-token', clientSecret: 'also-secret', normal: 'kept' },
  data: JSON.stringify({ chatInput: 'hello', apiKey: 'nested-secret' }),
}) as Record<string, any>;

assert.equal(structured.apiKey, '[REDACTED]');
assert.equal(structured.headers.authorization, '[REDACTED]');
assert.equal(structured.headers.clientSecret, '[REDACTED]');
assert.equal(structured.headers.normal, 'kept');
assert.deepEqual(JSON.parse(structured.data), { chatInput: 'hello', apiKey: '[REDACTED]' });

const axiosLike = Object.assign(new Error('connect failed for ?apikey=secret-value'), {
  code: 'ECONNREFUSED',
  config: { data: JSON.stringify({ apiKey: 'must-not-appear' }) },
  response: { status: 503 },
});
const safeError = redactSensitiveData(axiosLike) as Record<string, unknown>;

assert.equal(safeError.code, 'ECONNREFUSED');
assert.equal(safeError.statusCode, 503);
assert.equal(safeError.message, 'connect failed for ?apikey=[REDACTED]');
assert.equal('config' in safeError, false);
assert.equal(JSON.stringify(safeError).includes('must-not-appear'), false);

const libsignalSessionRecord = fs.readFileSync('node_modules/libsignal/src/session_record.js', 'utf8');
assert.equal(libsignalSessionRecord.includes('console.info("Closing session:", session)'), false);
assert.equal(libsignalSessionRecord.includes('console.warn("Session already closed", session)'), false);

console.log('log redaction tests passed');
