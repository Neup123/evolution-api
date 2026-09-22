import { MistakesGeneratorSettings } from '@api/dto/settings.dto';

export type RandomSource = () => number;

const KEYBOARD_ROWS = [
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'ёйцукенгшщзхъ',
  'фывапролджэ',
  'ячсмитьбю',
  'קראטוןםפ',
  'שדגכעיחלךף',
  'זסבהנמצתץ',
  'ضصثقفغعهخحج',
  'شسيبلاتنمكط',
  'ئءؤرلاىةوزظ',
];

const ADJACENT = new Map<string, string[]>();
for (const row of KEYBOARD_ROWS) {
  const letters = [...row];
  letters.forEach((letter, index) => {
    const neighbors = [letters[index - 1], letters[index + 1]].filter(Boolean);
    ADJACENT.set(letter, [...new Set([...(ADJACENT.get(letter) ?? []), ...neighbors])]);
  });
}

// Protect destinations and identifiers before selecting mutable letters. The bare-domain
// branch intentionally catches text such as "wikipedia.com" without requiring a scheme.
const PROTECTED_TOKEN =
  /(?:https?:\/\/|www\.)[^\s]+|\b(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}(?:\/[^\s]*)?|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b|@[\p{L}\p{N}_.-]+|\+?\d[\d\s().-]{5,}\d/giu;

function protectedIndexes(text: string): Set<number> {
  const protectedSet = new Set<number>();
  for (const match of text.matchAll(PROTECTED_TOKEN)) {
    const start = match.index ?? 0;
    for (let index = start; index < start + match[0].length; index += 1) protectedSet.add(index);
  }
  return protectedSet;
}

export function generateNaturalMistakes(
  text: string,
  settings?: MistakesGeneratorSettings | null,
  random: RandomSource = Math.random,
): string {
  if (!settings?.enabled || settings.probability <= 0 || random() * 100 >= settings.probability) return text;

  const protectedSet = protectedIndexes(text);
  const eligible: Array<{ index: number; neighbors: string[]; upper: boolean }> = [];
  let offset = 0;
  for (const character of text) {
    const lower = character.toLocaleLowerCase();
    const neighbors = ADJACENT.get(lower);
    if (neighbors?.length && !protectedSet.has(offset)) {
      eligible.push({ index: offset, neighbors, upper: character !== lower });
    }
    offset += character.length;
  }
  if (!eligible.length) return text;

  const minimum = Math.max(0, Math.min(settings.minLetters, eligible.length));
  const maximum = Math.max(minimum, Math.min(settings.maxLetters, eligible.length));
  const count = minimum + Math.floor(random() * (maximum - minimum + 1));
  if (!count) return text;

  const pool = [...eligible];
  const replacements = new Map<number, string>();
  for (let changed = 0; changed < count && pool.length; changed += 1) {
    const picked = Math.floor(random() * pool.length);
    const candidate = pool.splice(picked, 1)[0];
    let replacement = candidate.neighbors[Math.floor(random() * candidate.neighbors.length)];
    if (candidate.upper) replacement = replacement.toLocaleUpperCase();
    replacements.set(candidate.index, replacement);
  }

  let result = '';
  offset = 0;
  for (const character of text) {
    result += replacements.get(offset) ?? character;
    offset += character.length;
  }
  return result;
}

export function applyMistakesToMessage<T>(message: T, settings?: MistakesGeneratorSettings | null): T {
  if (!settings?.enabled || !message || typeof message !== 'object') return message;
  const copy: any = { ...(message as any) };
  for (const key of ['conversation', 'caption', 'text']) {
    if (typeof copy[key] === 'string') copy[key] = generateNaturalMistakes(copy[key], settings);
  }
  for (const key of ['extendedTextMessage', 'imageMessage', 'videoMessage', 'documentMessage']) {
    if (copy[key] && typeof copy[key] === 'object') copy[key] = applyMistakesToMessage(copy[key], settings);
  }
  if (copy.status?.content && typeof copy.status.content === 'object') {
    copy.status = { ...copy.status, content: applyMistakesToMessage(copy.status.content, settings) };
  }
  return copy;
}
