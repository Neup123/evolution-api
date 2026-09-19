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

export function normalizeGroupJoinRequestIdentity(request: Record<string, unknown>) {
  const jidValue = typeof request.jid === 'string' ? request.jid : null;
  const username = typeof request.username === 'string' ? request.username : null;
  const identity = normalizeParticipantIdentity({ id: jidValue, username }, jidValue);

  return {
    ...request,
    username,
    lid: identity.lid,
    phoneNumber: identity.phoneNumber,
    canonicalJid: identity.canonicalJid,
    identifierType: identity.identifierType,
    identityResolved: Boolean(identity.canonicalJid),
    resolutionReason: identity.lid
      ? username
        ? 'username_lid_available'
        : 'lid_available'
      : identity.phoneNumber
        ? 'phone_number_available'
        : 'jid_unavailable',
  };
}

export class AuthoritativeLidRegistry {
  private readonly lids = new Set<string>();

  observeJoinRequests(requests: unknown[]): void {
    for (const request of requests) {
      if (!request || typeof request !== 'object') continue;
      const jid = (request as Record<string, unknown>).jid;
      if (typeof jid === 'string' && jid.endsWith('@lid')) this.lids.add(jid.toLowerCase());
    }
  }

  has(jid: string): boolean {
    return this.lids.has(jid.toLowerCase());
  }
}

export function responseContainsAuthoritativeLid(value: unknown, lid: string): boolean {
  const result =
    value && typeof value === 'object' && 'result' in (value as Record<string, unknown>)
      ? (value as Record<string, unknown>).result
      : value;
  return (
    Array.isArray(result) &&
    result.some(
      (request) =>
        request &&
        typeof request === 'object' &&
        typeof (request as Record<string, unknown>).jid === 'string' &&
        ((request as Record<string, unknown>).jid as string).toLowerCase() === lid.toLowerCase(),
    )
  );
}

export type OutboundIdentifierValidation =
  | { valid: true }
  | { valid: false; code: 'username_resolution_required'; message: string };

export function validateOutboundIdentifier(value: string): OutboundIdentifierValidation {
  const trimmed = value.trim();
  if (trimmed.startsWith('@') && !trimmed.includes('.')) {
    return {
      valid: false,
      code: 'username_resolution_required',
      message:
        'A raw WhatsApp username cannot be used as a message destination. Resolve it to an authoritative @lid JID first.',
    };
  }
  return { valid: true };
}

export type MessageKeyValidation = { valid: true } | { valid: false; code: 'invalid_whatsapp_jid'; message: string };

export function validateMessageKeyRemoteJid(value: string): MessageKeyValidation {
  const valid =
    /^(?:\d+@(?:s\.whatsapp\.net|lid)|\d+-\d+@g\.us|status@broadcast)$/.test(value) ||
    /^[^@\s]+@broadcast$/.test(value);
  if (valid) return { valid: true };
  return {
    valid: false,
    code: 'invalid_whatsapp_jid',
    message:
      'remoteJid must be a full WhatsApp JID such as 15551234567@s.whatsapp.net, 153081895514146@lid, or 120363000000000000@g.us.',
  };
}
