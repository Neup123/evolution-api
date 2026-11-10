import assert from 'node:assert/strict';
import { applyMistakesToMessage, generateNaturalMistakes } from '../src/api/services/mistakes-generator.service';
import type { MistakesGeneratorSettings } from '../src/api/dto/settings.dto';

const settings: MistakesGeneratorSettings = { enabled: true, lettersPerMistake: 5, probability: 100 };
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++] ?? 0;
};
function changedPositions(before: string, after: string): number {
  const original = [...before];
  const result = [...after];
  assert.equal(original.length, result.length);
  return original.filter((character, index) => character !== result[index]).length;
}

assert.equal(generateNaturalMistakes('aaaa', settings, () => 0), 'aaaa', 'fewer than N letters: no typo');
assert.equal(changedPositions('a'.repeat(9), generateNaturalMistakes('a'.repeat(9), settings, () => 0)), 1);
assert.equal(changedPositions('a'.repeat(20), generateNaturalMistakes('a'.repeat(20), settings, () => 0)), 4);
assert.equal(generateNaturalMistakes('a'.repeat(20), { ...settings, enabled: false }, () => 0), 'a'.repeat(20));
assert.equal(generateNaturalMistakes('a'.repeat(20), { ...settings, probability: 0 }, () => 0), 'a'.repeat(20));
assert.equal(generateNaturalMistakes('a'.repeat(20), { ...settings, probability: 50 }, () => 0.99), 'a'.repeat(20));

// All protected token varieties stay byte-identical even with high typo density.
const protectedText = [
  'a'.repeat(60),
  'https://example.org/a?q=1',
  'wikipedia.com',
  'me@example.com',
  '@Support_Team',
  '+972 55 123 4567',
  'a'.repeat(60),
].join(' ');
const protectedResult = generateNaturalMistakes(protectedText, { ...settings, lettersPerMistake: 1 }, () => 0);
for (const token of [
  'https://example.org/a?q=1',
  'wikipedia.com',
  'me@example.com',
  '@Support_Team',
  '+972 55 123 4567',
]) assert(protectedResult.includes(token), `protected token changed: ${token}`);
assert(changedPositions('a'.repeat(60), protectedResult.slice(0, 60)) > 0);
assert.equal(generateNaturalMistakes('https://wikipedia.com', { ...settings, lettersPerMistake: 1 }, () => 0), 'https://wikipedia.com');

// Legacy min/max midpoint is mistakes per 100 eligible letters: 2 -> N=50.
const legacy = { enabled: true, minLetters: 2, maxLetters: 2, probability: 100 } as unknown as MistakesGeneratorSettings;
assert.equal(generateNaturalMistakes('a'.repeat(49), legacy, () => 0), 'a'.repeat(49));
assert.equal(changedPositions('a'.repeat(50), generateNaturalMistakes('a'.repeat(50), legacy, () => 0)), 1);
assert.equal(changedPositions('a'.repeat(100), generateNaturalMistakes('a'.repeat(100), legacy, () => 0)), 2);
const legacyZero = { enabled: true, minLetters: 0, maxLetters: 0, probability: 100 } as unknown as MistakesGeneratorSettings;
assert.equal(generateNaturalMistakes('a'.repeat(100), legacyZero, () => 0), 'a'.repeat(100));
const legacyNegative = { enabled: true, minLetters: -2, maxLetters: -2, probability: 100 } as unknown as MistakesGeneratorSettings;
assert.equal(generateNaturalMistakes('a'.repeat(100), legacyNegative, () => 0), 'a'.repeat(100));

// Invalid persisted densities clamp to N=1 and never crash or loop.
for (const invalid of [undefined, null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
  const malformed = { ...settings, lettersPerMistake: invalid } as unknown as MistakesGeneratorSettings;
  assert.equal(changedPositions('aa', generateNaturalMistakes('aa', malformed, () => 0)), 2);
}

for (const nonLatin of ['שלום', 'Привет', 'مرحبا']) {
  assert.notEqual(generateNaturalMistakes(nonLatin, { ...settings, lettersPerMistake: 1 }, sequence(0)), nonLatin);
}
const uppercase = generateNaturalMistakes('HELLO', { ...settings, lettersPerMistake: 1 }, () => 0);
assert.match(uppercase, /^[A-Z]+$/);
assert.notEqual(uppercase, 'HELLO');

// Only established readable-text keys are traversed; metadata and input are untouched.
const message = {
  conversation: 'aaaaa',
  caption: 'bbbbb',
  text: 'ccccc',
  extendedTextMessage: { text: 'ddddd', contextInfo: { quotedMessage: { conversation: 'eeeee' } } },
  imageMessage: { caption: 'fffff' },
  videoMessage: { caption: 'ggggg' },
  documentMessage: { caption: 'hhhhh' },
  status: { content: { text: 'iiiii' }, note: 'jjjjj' },
  contextInfo: { mentionedJid: ['1@s.whatsapp.net'], conversation: 'kkkkk' },
  other: { text: 'lllll' },
};
const original = structuredClone(message);
const transformed = applyMistakesToMessage(message, { ...settings, lettersPerMistake: 1 });
assert.deepEqual(message, original, 'original object must not be mutated');
assert.notStrictEqual(transformed, message);
for (const key of ['conversation', 'caption', 'text'] as const) assert.notEqual(transformed[key], message[key]);
assert.notEqual(transformed.extendedTextMessage.text, message.extendedTextMessage.text);
assert.notEqual(transformed.imageMessage.caption, message.imageMessage.caption);
assert.notEqual(transformed.videoMessage.caption, message.videoMessage.caption);
assert.notEqual(transformed.documentMessage.caption, message.documentMessage.caption);
assert.notEqual(transformed.status.content.text, message.status.content.text);
assert.deepEqual(transformed.contextInfo, original.contextInfo);
assert.deepEqual(transformed.extendedTextMessage.contextInfo, original.extendedTextMessage.contextInfo);
assert.deepEqual(transformed.other, original.other);
assert.equal(transformed.status.note, original.status.note);

console.log('mistakes generator tests passed');
