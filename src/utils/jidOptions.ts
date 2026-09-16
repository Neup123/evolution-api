function brazilianNumberOptions(number: string) {
  const numberWithDigit =
    number.slice(4, 5) === '9' && number.length === 13 ? number : `${number.slice(0, 4)}9${number.slice(4)}`;
  const numberWithoutDigit = number.length === 12 ? number : number.slice(0, 4) + number.slice(5);
  return [numberWithDigit, numberWithoutDigit];
}

function mexicoArgentinaNumberOptions(number: string) {
  const prefix = number.startsWith('52') ? '1' : '9';
  const numberWithDigit =
    number.slice(2, 3) === prefix && number.length === 13 ? number : `${number.slice(0, 2)}${prefix}${number.slice(2)}`;
  const numberWithoutDigit = number.length === 12 ? number : number.slice(0, 2) + number.slice(3);
  return [numberWithDigit, numberWithoutDigit];
}

export function getAvailableNumbers(remoteJid: string) {
  const normalizedJid = remoteJid.startsWith('+') ? remoteJid.slice(1) : remoteJid;
  const [number, domain] = normalizedJid.split('@');

  if (!number || !domain) return [normalizedJid];
  if (domain === 'lid' || domain === 'g.us') return [normalizedJid];

  const numbersAvailable = number.startsWith('55')
    ? brazilianNumberOptions(number)
    : number.startsWith('52') || number.startsWith('54')
      ? mexicoArgentinaNumberOptions(number)
      : [number];

  return [...new Set(numbersAvailable.map((availableNumber) => `${availableNumber}@${domain}`))];
}
