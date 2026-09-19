export type ParticipantIdentifierType = 'phone-number' | 'lid' | 'unknown';

export interface NormalizedParticipantIdentity {
  id: string | null;
  username: string | null;
  lid: string | null;
  phoneNumber: string | null;
  phoneNumberDigits: string | null;
  canonicalJid: string | null;
  identifierType: ParticipantIdentifierType;
  identityResolved: boolean;
  resolutionReason: 'phone_number_available' | 'username_lid_only' | 'lid_only' | 'unresolved';
  participantDigits: string | null;
}

function jid(value: unknown, suffix: string) {
  return typeof value === 'string' && value.endsWith(suffix) ? value : null;
}

export function normalizeParticipantIdentity(
  participant: Record<string, unknown> | null | undefined,
  observedId?: string | null,
): NormalizedParticipantIdentity {
  const sourceId = typeof participant?.id === 'string' ? participant.id : null;
  const id = observedId ?? sourceId;
  const username = typeof participant?.username === 'string' ? participant.username : null;
  const phoneNumber =
    jid(participant?.phoneNumber, '@s.whatsapp.net') ??
    jid(sourceId, '@s.whatsapp.net') ??
    jid(observedId, '@s.whatsapp.net');
  const lid = jid(participant?.lid, '@lid') ?? jid(sourceId, '@lid') ?? jid(observedId, '@lid');

  return {
    id,
    username,
    lid,
    phoneNumber,
    phoneNumberDigits: phoneNumber?.split('@')[0] ?? null,
    canonicalJid: phoneNumber ?? lid ?? id,
    identifierType: id?.endsWith('@lid') ? 'lid' : id?.endsWith('@s.whatsapp.net') ? 'phone-number' : 'unknown',
    identityResolved: Boolean(phoneNumber),
    resolutionReason: phoneNumber
      ? 'phone_number_available'
      : username && lid
        ? 'username_lid_only'
        : lid
          ? 'lid_only'
          : 'unresolved',
    participantDigits: id?.split('@')[0] ?? null,
  };
}
