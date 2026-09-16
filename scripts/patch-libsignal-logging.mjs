import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve('node_modules/libsignal/src/session_record.js');

if (!fs.existsSync(target)) {
  console.warn('libsignal session logger patch skipped: dependency file is not installed');
  process.exit(0);
}

const original = fs.readFileSync(target, 'utf8');
const replacements = [
  ['console.warn("Session already closed", session);', 'console.warn("Session already closed");'],
  ['console.info("Closing session:", session);', 'console.info("Closing session");'],
];

let patched = original;
for (const [unsafe, safe] of replacements) {
  if (!patched.includes(unsafe) && !patched.includes(safe)) {
    throw new Error(`Unsupported libsignal session logger source: ${unsafe}`);
  }
  patched = patched.replace(unsafe, safe);
}

if (patched !== original) {
  fs.writeFileSync(target, patched);
  console.log('Patched libsignal session lifecycle logs to omit cryptographic session material');
}
