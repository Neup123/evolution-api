import assert from 'node:assert/strict';
import { applyMistakesToMessage, generateNaturalMistakes } from '../src/api/services/mistakes-generator.service';

const settings = { enabled: true, minLetters: 2, maxLetters: 2, probability: 100 };
const sequence = (...values: number[]) => { let i = 0; return () => values[i++] ?? 0; };
assert.equal(generateNaturalMistakes('hello', { ...settings, probability: 0 }, () => 0), 'hello');
assert.equal(generateNaturalMistakes('hello', { ...settings, enabled: false }, () => 0), 'hello');
const changed = generateNaturalMistakes('hello', settings, sequence(0, 0, 0, 0, 0, 0));
assert.equal([...changed].filter((c, i) => c !== [...'hello'][i]).length, 2);
const protectedDestinations = generateNaturalMistakes('Visit wikipedia.com and https://example.org/a?q=1', { ...settings, minLetters: 20, maxLetters: 20 }, () => 0);
assert(protectedDestinations.includes('wikipedia.com'));
assert(protectedDestinations.includes('https://example.org/a?q=1'));
const protectedIdentifiers = generateNaturalMistakes(
  'Email me@example.com, mention @Support_Team, or call +972 55 123 4567',
  { ...settings, minLetters: 20, maxLetters: 20 },
  () => 0,
);
assert(protectedIdentifiers.includes('me@example.com'));
assert(protectedIdentifiers.includes('@Support_Team'));
assert(protectedIdentifiers.includes('+972 55 123 4567'));
assert.notEqual(generateNaturalMistakes('שלום', { ...settings, minLetters: 1, maxLetters: 1 }, () => 0), 'שלום');
assert.notEqual(generateNaturalMistakes('Привет', { ...settings, minLetters: 1, maxLetters: 1 }, () => 0), 'Привет');
assert.notEqual(generateNaturalMistakes('مرحبا', { ...settings, minLetters: 1, maxLetters: 1 }, () => 0), 'مرحبا');
const uppercase = generateNaturalMistakes('HELLO', { ...settings, minLetters: 1, maxLetters: 1 }, () => 0);
assert.match(uppercase, /^[A-Z]+$/);
assert.equal(generateNaturalMistakes('https://wikipedia.com', { ...settings, minLetters: 20, maxLetters: 20 }, () => 0), 'https://wikipedia.com');
const message = { conversation: 'Hello world', contextInfo: { mentionedJid: ['1@s.whatsapp.net'] } };
const transformed = applyMistakesToMessage(message, { ...settings, minLetters: 1, maxLetters: 1 });
assert.deepEqual(transformed.contextInfo, message.contextInfo);
assert.deepEqual(message, { conversation: 'Hello world', contextInfo: { mentionedJid: ['1@s.whatsapp.net'] } });
console.log('mistakes generator tests passed');
