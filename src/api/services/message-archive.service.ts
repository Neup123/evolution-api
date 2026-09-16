export type MessageArchiveOrigin = 'LOCAL_OUTBOUND' | 'WHATSAPP_EVENT' | 'HISTORY_SYNC' | 'LEGACY';

export type MessageArchiveState =
  | 'PROVISIONAL'
  | 'SERVER_ACCEPTED'
  | 'AUTHORITATIVE'
  | 'DELIVERED'
  | 'READ'
  | 'PLAYED'
  | 'FAILED';

const ARCHIVE_STATE_RANK: Record<MessageArchiveState, number> = {
  PROVISIONAL: 1,
  AUTHORITATIVE: 2,
  SERVER_ACCEPTED: 3,
  FAILED: 4,
  DELIVERED: 5,
  READ: 6,
  PLAYED: 7,
};

export function messageArchiveStateFromStatus(
  status: string | null | undefined,
  fromMe: boolean,
  origin: MessageArchiveOrigin,
): MessageArchiveState {
  switch (status) {
    case 'SERVER_ACK':
      return 'SERVER_ACCEPTED';
    case 'DELIVERY_ACK':
      return 'DELIVERED';
    case 'READ':
      return 'READ';
    case 'PLAYED':
      return 'PLAYED';
    case 'ERROR':
    case 'FAILED':
      return 'FAILED';
    default:
      return fromMe && origin === 'LOCAL_OUTBOUND' ? 'PROVISIONAL' : 'AUTHORITATIVE';
  }
}

export function mergeMessageArchiveState(
  current: string | null | undefined,
  incoming: MessageArchiveState,
): MessageArchiveState {
  const currentState = current as MessageArchiveState | undefined;
  if (!currentState || ARCHIVE_STATE_RANK[currentState] === undefined) return incoming;
  return ARCHIVE_STATE_RANK[incoming] >= ARCHIVE_STATE_RANK[currentState] ? incoming : currentState;
}

export function acknowledgementTimestamps(
  state: MessageArchiveState,
  now = new Date(),
): { serverAcceptedAt?: Date; deliveredAt?: Date; readAt?: Date } {
  return {
    ...(state === 'SERVER_ACCEPTED' || state === 'DELIVERED' || state === 'READ' || state === 'PLAYED'
      ? { serverAcceptedAt: now }
      : {}),
    ...(state === 'DELIVERED' || state === 'READ' || state === 'PLAYED' ? { deliveredAt: now } : {}),
    ...(state === 'READ' || state === 'PLAYED' ? { readAt: now } : {}),
  };
}

export function alternateJid(original: string | null | undefined, observed: string | null | undefined) {
  if (!original || !observed || original === observed) return null;
  return observed;
}

export function messageUpdateIdentity(keyId: string, status: string, remoteJid: string, participant?: string | null) {
  return [keyId, status, remoteJid, participant ?? ''].join(':');
}
