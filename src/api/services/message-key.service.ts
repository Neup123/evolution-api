import type { proto } from 'baileys';

export type MessageKeyLike = proto.IMessageKey & {
  remoteJidAlt?: string | null;
  participantAlt?: string | null;
  addressingMode?: string | null;
};

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
