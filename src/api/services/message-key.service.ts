import type { proto } from 'baileys';

export type MessageKeyLike = proto.IMessageKey & {
  remoteJidAlt?: string | null;
  participantAlt?: string | null;
  addressingMode?: string | null;
};

export type DeleteOwnershipSource =
  | 'ARCHIVED_MESSAGE_KEY'
  | 'REQUEST_OVERRIDE'
  | 'INFERRED_CONNECTED_ACCOUNT'
  | 'INFERRED_GROUP_PARTICIPANT';

export type ResolvedDeleteScope = 'EVERYONE' | 'ME';

export type DeleteScopeResolution = {
  scope: ResolvedDeleteScope;
  fallbackReason?:
    | 'INCOMING_DIRECT_MESSAGE'
    | 'GROUP_ADMIN_REQUIRED'
    | 'GROUP_PARTICIPANT_REQUIRED'
    | 'EVERYONE_NOT_CONFIRMED';
};

/**
 * Select the strongest delete scope that WhatsApp permits for the original
 * message. An unknown group-admin state intentionally keeps the revoke path:
 * the caller can try it and require a real server acknowledgement.
 */
export function resolveMaximumDeleteScope(
  fromMe: boolean,
  isGroup: boolean,
  connectedAccountIsGroupAdmin?: boolean,
): DeleteScopeResolution {
  if (fromMe) return { scope: 'EVERYONE' };
  if (!isGroup) return { scope: 'ME', fallbackReason: 'INCOMING_DIRECT_MESSAGE' };
  if (connectedAccountIsGroupAdmin === false) {
    return { scope: 'ME', fallbackReason: 'GROUP_ADMIN_REQUIRED' };
  }
  return { scope: 'EVERYONE' };
}

export function resolveDeleteMessageOwnership(
  requested: MessageKeyLike,
  stored?: MessageKeyLike | null,
  storedParticipant?: string | null,
): { fromMe: boolean; participant?: string; source: DeleteOwnershipSource } {
  const participant =
    stored?.participant ??
    storedParticipant ??
    requested.participant ??
    stored?.participantAlt ??
    requested.participantAlt ??
    undefined;
  const storedFromMe = typeof stored?.fromMe === 'boolean' ? stored.fromMe : undefined;
  const fromMe =
    storedFromMe ??
    (typeof requested.fromMe === 'boolean'
      ? requested.fromMe
      : !(requested.remoteJid?.endsWith('@g.us') && Boolean(participant)));
  const source: DeleteOwnershipSource =
    storedFromMe !== undefined
      ? 'ARCHIVED_MESSAGE_KEY'
      : typeof requested.fromMe === 'boolean'
        ? 'REQUEST_OVERRIDE'
        : fromMe
          ? 'INFERRED_CONNECTED_ACCOUNT'
          : 'INFERRED_GROUP_PARTICIPANT';

  return { fromMe, ...(participant ? { participant } : {}), source };
}

/**
 * Return a copy of a WhatsApp message key without normalising PN/LID addresses.
 *
 * Delete, reaction and quote operations refer to an existing message, so the
 * exact key received from WhatsApp must be preserved. Treating participant as
 * a new outbound recipient can silently turn an accepted protocol request into
 * a no-op, especially for groups and LID-addressed chats.
 */
export function preserveMessageKey<T extends MessageKeyLike>(key: T): T {
  if (!key || typeof key !== 'object') return key;

  return {
    ...key,
    ...(key.remoteJidAlt ? { remoteJidAlt: key.remoteJidAlt } : {}),
    ...(key.participantAlt ? { participantAlt: key.participantAlt } : {}),
    ...(key.addressingMode ? { addressingMode: key.addressingMode } : {}),
  };
}

/**
 * Rebuild a protocol key from the authoritative key stored with the original message.
 *
 * API clients often retain only id/fromMe/remoteJid/participant. Group deletes also
 * need the original participant alternate and addressing mode when WhatsApp used LID
 * addressing. The stored key wins for protocol fields; the requested id is retained
 * so a mismatched database record can never redirect the operation.
 */
export function hydrateMessageKey<T extends MessageKeyLike>(requested: T, stored?: MessageKeyLike | null): T {
  if (!stored || typeof stored !== 'object') return preserveMessageKey(requested);
  return preserveMessageKey({ ...requested, ...stored, id: requested.id } as T);
}

/**
 * Build the key that Baileys actually serializes inside a revoke protocol message.
 *
 * WhatsApp's protobuf MessageKey contains only remoteJid, fromMe, id and
 * participant. Fields such as participantAlt and addressingMode are useful for
 * identity resolution, but forwarding them does not put them on the wire.
 */
export function buildDeleteMessageKey(
  requested: MessageKeyLike,
  stored?: MessageKeyLike | null,
  storedParticipant?: string | null,
): proto.IMessageKey {
  const authoritative = stored && typeof stored === 'object' ? stored : requested;
  const remoteJid = authoritative.remoteJid ?? requested.remoteJid;
  const fromMe = typeof authoritative.fromMe === 'boolean' ? authoritative.fromMe : requested.fromMe;
  const participant =
    authoritative.participant ??
    storedParticipant ??
    requested.participant ??
    authoritative.participantAlt ??
    requested.participantAlt;

  return {
    remoteJid,
    fromMe,
    id: requested.id,
    ...(participant ? { participant } : {}),
  };
}
