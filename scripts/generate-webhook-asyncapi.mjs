import fs from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';

const jid = (description) => ({
  type: 'string',
  description,
  examples: ['120363000000000000@g.us'],
});

const schemas = {
  Jid: jid(
    'WhatsApp JID. Common suffixes are @s.whatsapp.net (phone), @lid (linked identity), @g.us (group), @newsletter, and @broadcast.',
  ),
  MessageKey: {
    type: 'object',
    required: ['remoteJid', 'id', 'fromMe'],
    properties: {
      remoteJid: { $ref: '#/components/schemas/Jid' },
      remoteJidAlt: { $ref: '#/components/schemas/Jid' },
      id: {
        type: 'string',
        description: 'WhatsApp message ID. Use this as the primary idempotency key together with remoteJid.',
      },
      fromMe: { type: 'boolean', description: 'True when the connected account sent the message.' },
      participant: { $ref: '#/components/schemas/Jid' },
      participantAlt: { $ref: '#/components/schemas/Jid' },
    },
    additionalProperties: true,
  },
  MessageContent: {
    type: 'object',
    description:
      'Exactly one principal message variant is normally present. Wrapper variants such as ephemeralMessage and viewOnceMessage contain another message object.',
    properties: {
      conversation: { type: 'string', description: 'Plain text message.' },
      extendedTextMessage: {
        type: 'object',
        properties: { text: { type: 'string' }, contextInfo: { type: 'object', additionalProperties: true } },
        additionalProperties: true,
      },
      imageMessage: { $ref: '#/components/schemas/MediaMessage' },
      videoMessage: { $ref: '#/components/schemas/MediaMessage' },
      audioMessage: { $ref: '#/components/schemas/MediaMessage' },
      documentMessage: { $ref: '#/components/schemas/MediaMessage' },
      stickerMessage: { $ref: '#/components/schemas/MediaMessage' },
      contactMessage: {
        type: 'object',
        properties: { displayName: { type: 'string' }, vcard: { type: 'string' } },
        additionalProperties: true,
      },
      contactsArrayMessage: { type: 'object', additionalProperties: true },
      locationMessage: { $ref: '#/components/schemas/LocationMessage' },
      liveLocationMessage: { $ref: '#/components/schemas/LocationMessage' },
      reactionMessage: {
        type: 'object',
        properties: {
          key: { $ref: '#/components/schemas/MessageKey' },
          text: { type: 'string', description: 'Emoji; empty means reaction removed.' },
        },
        additionalProperties: true,
      },
      pollCreationMessage: { type: 'object', additionalProperties: true },
      pollUpdateMessage: { type: 'object', additionalProperties: true },
      buttonsResponseMessage: { type: 'object', additionalProperties: true },
      listResponseMessage: { type: 'object', additionalProperties: true },
      templateButtonReplyMessage: { type: 'object', additionalProperties: true },
      interactiveResponseMessage: { type: 'object', additionalProperties: true },
      protocolMessage: {
        type: 'object',
        description: 'Protocol action such as edit, revoke, or history sync.',
        additionalProperties: true,
      },
      editedMessage: {
        type: 'object',
        properties: { message: { $ref: '#/components/schemas/MessageContent' } },
        additionalProperties: true,
      },
      ephemeralMessage: {
        type: 'object',
        properties: { message: { $ref: '#/components/schemas/MessageContent' } },
        additionalProperties: true,
      },
      viewOnceMessage: {
        type: 'object',
        properties: { message: { $ref: '#/components/schemas/MessageContent' } },
        additionalProperties: true,
      },
      viewOnceMessageV2: {
        type: 'object',
        properties: { message: { $ref: '#/components/schemas/MessageContent' } },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  },
  MediaMessage: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Temporary media URL when supplied by WhatsApp.' },
      mimetype: { type: 'string' },
      caption: { type: 'string' },
      fileName: { type: 'string' },
      fileLength: {
        oneOf: [{ type: 'integer' }, { type: 'string' }],
        description: 'May serialize as a number or Long-compatible string.',
      },
      seconds: { type: 'integer' },
      ptt: { type: 'boolean', description: 'True for a voice note.' },
      mediaKey: { type: 'string', format: 'byte' },
      directPath: { type: 'string' },
      jpegThumbnail: { type: 'string', format: 'byte' },
      base64: {
        type: 'string',
        format: 'byte',
        description: 'Present only when webhook base64 delivery is enabled and Evolution prepared media data.',
      },
    },
    additionalProperties: true,
  },
  LocationMessage: {
    type: 'object',
    properties: {
      degreesLatitude: { type: 'number' },
      degreesLongitude: { type: 'number' },
      name: { type: 'string' },
      address: { type: 'string' },
    },
    additionalProperties: true,
  },
  Message: {
    type: 'object',
    required: ['key'],
    properties: {
      key: { $ref: '#/components/schemas/MessageKey' },
      pushName: { type: ['string', 'null'], description: 'Sender display name when known.' },
      message: { $ref: '#/components/schemas/MessageContent' },
      messageType: {
        type: 'string',
        description:
          'Evolution-derived principal message type, for example conversation, imageMessage, or reactionMessage.',
      },
      messageTimestamp: {
        oneOf: [{ type: 'integer' }, { type: 'string' }],
        description: 'Unix time in seconds; large protobuf Long values may serialize as strings.',
      },
      status: {
        type: ['string', 'null'],
        enum: ['ERROR', 'PENDING', 'SERVER_ACK', 'DELIVERY_ACK', 'READ', 'DELETED', 'PLAYED', 'EDITED', null],
      },
      source: { type: 'string' },
      contextInfo: { type: 'object', additionalProperties: true },
      instanceId: {
        type: 'string',
        description: 'Evolution database instance ID when the event was prepared for persistence.',
      },
    },
    additionalProperties: true,
  },
  MessageArray: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
  MessageUpdate: {
    type: 'object',
    required: ['key'],
    properties: {
      key: { $ref: '#/components/schemas/MessageKey' },
      status: {
        type: ['string', 'null'],
        enum: ['ERROR', 'PENDING', 'SERVER_ACK', 'DELIVERY_ACK', 'READ', 'DELETED', 'PLAYED', 'EDITED', null],
      },
      update: { type: 'object', description: 'Raw Baileys update fields.', additionalProperties: true },
      message: {
        type: 'object',
        description: 'Evolution normalized update when available.',
        additionalProperties: true,
      },
      messageId: { type: 'string', description: 'Evolution database message ID when found.' },
      instanceId: { type: 'string' },
    },
    additionalProperties: true,
  },
  Contact: {
    type: 'object',
    required: ['remoteJid'],
    properties: {
      remoteJid: { $ref: '#/components/schemas/Jid' },
      pushName: { type: ['string', 'null'] },
      profilePicUrl: { type: ['string', 'null'], format: 'uri' },
      instanceId: { type: 'string' },
    },
    additionalProperties: true,
  },
  ContactArray: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
  Chat: {
    type: 'object',
    required: ['remoteJid'],
    properties: {
      remoteJid: { $ref: '#/components/schemas/Jid' },
      name: { type: ['string', 'null'] },
      unreadMessages: { type: 'integer' },
      instanceId: { type: 'string' },
    },
    additionalProperties: true,
  },
  ChatArray: { type: 'array', items: { $ref: '#/components/schemas/Chat' } },
  Presence: {
    type: 'object',
    required: ['id', 'presences'],
    properties: {
      id: { $ref: '#/components/schemas/Jid' },
      presences: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            lastKnownPresence: {
              type: 'string',
              enum: ['unavailable', 'available', 'composing', 'recording', 'paused'],
            },
            lastSeen: { type: 'integer', description: 'Unix timestamp in seconds.' },
            groupOnlineCount: { type: 'integer' },
          },
          additionalProperties: true,
        },
      },
    },
  },
  GroupParticipant: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { $ref: '#/components/schemas/Jid' },
      phoneNumber: { type: 'string', description: 'Resolved phone number when available.' },
      name: { type: 'string' },
      imgUrl: { type: ['string', 'null'], format: 'uri' },
      admin: { type: ['string', 'null'], enum: ['admin', 'superadmin', null] },
      isAdmin: { type: 'boolean' },
      isSuperAdmin: { type: 'boolean' },
    },
    additionalProperties: true,
  },
  GroupMetadata: {
    type: 'object',
    required: ['id', 'subject'],
    properties: {
      id: { $ref: '#/components/schemas/Jid' },
      subject: { type: 'string' },
      owner: { $ref: '#/components/schemas/Jid' },
      addressingMode: { type: 'string', enum: ['lid', 'pn'] },
      desc: { type: 'string' },
      linkedParent: { $ref: '#/components/schemas/Jid' },
      restrict: { type: 'boolean' },
      announce: { type: 'boolean' },
      memberAddMode: { type: 'boolean' },
      joinApprovalMode: { type: 'boolean' },
      isCommunity: { type: 'boolean' },
      isCommunityAnnounce: { type: 'boolean' },
      size: { type: 'integer' },
      participants: { type: 'array', items: { $ref: '#/components/schemas/GroupParticipant' } },
      ephemeralDuration: { type: 'integer' },
    },
    additionalProperties: true,
  },
  GroupMetadataArray: { type: 'array', items: { $ref: '#/components/schemas/GroupMetadata' } },
  GroupParticipantsUpdate: {
    type: 'object',
    required: ['id', 'participants', 'action'],
    properties: {
      id: { $ref: '#/components/schemas/Jid' },
      participants: { type: 'array', items: { $ref: '#/components/schemas/Jid' } },
      action: { type: 'string', enum: ['add', 'remove', 'promote', 'demote', 'modify'] },
      author: { $ref: '#/components/schemas/Jid' },
      authorPn: { $ref: '#/components/schemas/Jid' },
      authorUsername: { type: 'string' },
      participantsData: {
        type: 'array',
        description: 'Evolution enhancement. May be omitted if participant resolution fails.',
        items: { $ref: '#/components/schemas/ResolvedParticipant' },
      },
    },
    additionalProperties: true,
  },
  ResolvedParticipant: {
    type: 'object',
    required: ['jid', 'phoneNumber'],
    properties: {
      jid: { $ref: '#/components/schemas/Jid' },
      phoneNumber: { type: 'string' },
      name: { type: 'string' },
      imgUrl: { type: ['string', 'null'], format: 'uri' },
    },
  },
  Connection: {
    type: 'object',
    properties: {
      instance: { type: 'string' },
      state: { type: 'string', enum: ['open', 'connecting', 'close', 'refused'] },
      statusReason: { type: 'integer', description: 'Disconnect reason/status code when available.' },
      connection: { type: 'string', enum: ['open', 'connecting', 'close'] },
      isNewLogin: { type: 'boolean' },
      isOnline: { type: 'boolean' },
      lastDisconnect: {
        type: 'object',
        properties: {
          error: { type: 'object', additionalProperties: true },
          date: { type: 'string', format: 'date-time' },
        },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  },
  History: {
    type: 'object',
    required: ['chats', 'contacts', 'messages'],
    properties: {
      chats: { type: 'array', items: { type: 'object', additionalProperties: true } },
      contacts: { type: 'array', items: { type: 'object', additionalProperties: true } },
      messages: { $ref: '#/components/schemas/MessageArray' },
      lidPnMappings: { type: 'array', items: { $ref: '#/components/schemas/LidMapping' } },
      isLatest: { type: 'boolean' },
      progress: { type: ['number', 'null'], minimum: 0, maximum: 100 },
      syncType: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
      chunkOrder: { type: ['integer', 'null'] },
      peerDataRequestSessionId: { type: ['string', 'null'] },
    },
    additionalProperties: true,
  },
  LidMapping: {
    type: 'object',
    description: 'Mapping between a linked-identity JID and phone-number JID.',
    properties: { lid: { $ref: '#/components/schemas/Jid' }, pn: { $ref: '#/components/schemas/Jid' } },
    additionalProperties: true,
  },
  Receipt: {
    type: 'object',
    required: ['key', 'receipt'],
    properties: {
      key: { $ref: '#/components/schemas/MessageKey' },
      receipt: {
        type: 'object',
        properties: {
          userJid: { $ref: '#/components/schemas/Jid' },
          readTimestamp: { type: 'integer' },
          playedTimestamp: { type: 'integer' },
          receiptTimestamp: { type: 'integer' },
        },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  },
  ReceiptArray: { type: 'array', items: { $ref: '#/components/schemas/Receipt' } },
  JidArray: { type: 'array', items: { $ref: '#/components/schemas/Jid' } },
  MediaUpdateArray: {
    type: 'array',
    items: {
      type: 'object',
      required: ['key'],
      properties: {
        key: { $ref: '#/components/schemas/MessageKey' },
        media: {
          type: 'object',
          properties: { ciphertext: { type: 'string', format: 'byte' }, iv: { type: 'string', format: 'byte' } },
          additionalProperties: true,
        },
        error: {
          type: 'object',
          description: 'Serialized media retrieval error when media is unavailable.',
          additionalProperties: true,
        },
      },
      additionalProperties: true,
    },
  },
  ReactionArray: {
    type: 'array',
    items: {
      type: 'object',
      required: ['key', 'reaction'],
      properties: {
        key: { $ref: '#/components/schemas/MessageKey' },
        reaction: {
          type: 'object',
          properties: {
            key: { $ref: '#/components/schemas/MessageKey' },
            text: { type: 'string', description: 'Reaction emoji; empty means removed.' },
            senderTimestampMs: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: true,
    },
  },
  Call: {
    type: 'object',
    required: ['id', 'from', 'status'],
    properties: {
      id: { type: 'string' },
      from: { $ref: '#/components/schemas/Jid' },
      chatId: { $ref: '#/components/schemas/Jid' },
      callerPn: { $ref: '#/components/schemas/Jid' },
      status: {
        type: 'string',
        enum: [
          'offer',
          'ringing',
          'preaccept',
          'transport',
          'relaylatency',
          'timeout',
          'reject',
          'accept',
          'terminate',
        ],
      },
      isGroup: { type: 'boolean' },
      groupJid: { $ref: '#/components/schemas/Jid' },
      isVideo: { type: 'boolean' },
      offline: { type: 'boolean' },
      latencyMs: { type: 'number' },
      date: { type: 'string', format: 'date-time' },
    },
    additionalProperties: true,
  },
  ApplicationStartup: {
    type: 'object',
    properties: { version: { type: 'string' }, message: { type: 'string' } },
    description: 'Startup details depend on the configured global event publisher.',
    additionalProperties: true,
  },
  InstanceLifecycle: {
    type: 'object',
    required: ['instanceName'],
    properties: {
      instanceName: { type: 'string' },
      instanceId: { type: 'string', description: 'Evolution database instance ID when still available.' },
    },
    additionalProperties: true,
  },
  QrCodeUpdate: {
    type: 'object',
    properties: {
      qrcode: {
        type: 'object',
        properties: {
          count: { type: 'integer', description: 'Number of QR generations/refreshes.' },
          pairingCode: { type: 'string' },
          base64: { type: 'string', description: 'QR image data URL when generated.' },
          code: { type: 'string', description: 'Raw QR content.' },
        },
        additionalProperties: true,
      },
      pairingCode: { type: 'string' },
      code: { type: 'string' },
      base64: { type: 'string' },
      count: { type: 'integer' },
    },
    additionalProperties: true,
  },
  EditedMessage: {
    type: 'object',
    properties: {
      key: { $ref: '#/components/schemas/MessageKey' },
      editedMessage: { $ref: '#/components/schemas/MessageContent' },
      type: { oneOf: [{ type: 'integer' }, { type: 'string' }], description: 'WhatsApp protocol message type.' },
      timestampMs: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
    },
    additionalProperties: true,
  },
  MessageDelete: {
    oneOf: [
      {
        type: 'object',
        required: ['remoteJid', 'id'],
        properties: {
          remoteJid: { $ref: '#/components/schemas/Jid' },
          id: { type: 'string' },
          fromMe: { type: 'boolean' },
          participant: { $ref: '#/components/schemas/Jid' },
          status: { type: 'string', enum: ['DELETED'] },
        },
        additionalProperties: true,
      },
      {
        type: 'object',
        required: ['key'],
        properties: {
          key: { $ref: '#/components/schemas/MessageKey' },
          messageId: { type: 'string' },
          instanceId: { type: 'string' },
          messageType: { type: 'string' },
        },
        additionalProperties: true,
      },
      {
        type: 'object',
        required: ['jid', 'all'],
        properties: { jid: { $ref: '#/components/schemas/Jid' }, all: { type: 'boolean', enum: [true] } },
        additionalProperties: true,
      },
    ],
  },
  GroupJoinRequest: {
    type: 'object',
    required: ['id', 'author', 'participant', 'action'],
    properties: {
      id: { $ref: '#/components/schemas/Jid' },
      author: { $ref: '#/components/schemas/Jid' },
      authorPn: { $ref: '#/components/schemas/Jid' },
      authorUsername: { type: 'string' },
      participant: { $ref: '#/components/schemas/Jid' },
      participantPn: { $ref: '#/components/schemas/Jid' },
      action: { type: 'string', enum: ['created', 'revoked', 'rejected'] },
      method: { type: ['string', 'null'], enum: ['invite_link', 'linked_group_join', 'non_admin_add', null] },
    },
    additionalProperties: true,
  },
  GroupMemberTagUpdate: {
    type: 'object',
    required: ['groupId', 'participant', 'label'],
    properties: {
      groupId: { $ref: '#/components/schemas/Jid' },
      participant: { $ref: '#/components/schemas/Jid' },
      participantAlt: { $ref: '#/components/schemas/Jid' },
      label: { type: 'string' },
      messageTimestamp: { type: 'integer' },
    },
    additionalProperties: true,
  },
  TypebotStart: {
    type: 'object',
    required: ['remoteJid', 'url', 'typebot', 'sessionId'],
    properties: {
      remoteJid: { $ref: '#/components/schemas/Jid' },
      url: { type: 'string', format: 'uri' },
      typebot: { type: 'string' },
      variables: { type: 'array', items: { type: 'object', additionalProperties: true } },
      sessionId: { type: 'string' },
    },
    additionalProperties: true,
  },
  TypebotStatus: {
    type: 'object',
    properties: {
      remoteJid: { $ref: '#/components/schemas/Jid' },
      sessionId: { type: 'string' },
      status: { type: 'string', description: 'Integration status/transition name.' },
    },
    additionalProperties: true,
  },
  LabelEdit: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      color: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
      predefinedId: { type: 'string' },
      deleted: { type: 'boolean' },
      instance: { type: 'string' },
    },
    additionalProperties: true,
  },
  LabelAssociation: {
    type: 'object',
    required: ['instance', 'type', 'chatId', 'labelId'],
    properties: {
      instance: { type: 'string' },
      type: { type: 'string', enum: ['add', 'remove'] },
      chatId: { $ref: '#/components/schemas/Jid' },
      labelId: { type: 'string' },
    },
    additionalProperties: true,
  },
  CredentialsUpdate: {
    type: 'object',
    required: ['instance'],
    properties: { instance: { type: 'string' } },
    additionalProperties: false,
    description: 'Deliberately excludes authentication state, keys, and tokens.',
  },
  HistoryStatus: {
    type: 'object',
    required: ['syncType', 'status', 'explicit'],
    properties: {
      syncType: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
      status: { type: 'string', enum: ['complete', 'paused'] },
      explicit: { type: 'boolean', description: 'False when completion was inferred after no more chunks arrived.' },
    },
    additionalProperties: true,
  },
  BlocklistSet: {
    type: 'object',
    required: ['blocklist'],
    properties: { blocklist: { type: 'array', items: { $ref: '#/components/schemas/Jid' } } },
    additionalProperties: true,
  },
  BlocklistUpdate: {
    type: 'object',
    required: ['blocklist', 'type'],
    properties: {
      blocklist: { type: 'array', items: { $ref: '#/components/schemas/Jid' } },
      type: { type: 'string', enum: ['add', 'remove'] },
    },
    additionalProperties: true,
  },
  NewsletterReaction: {
    type: 'object',
    required: ['id', 'server_id', 'reaction'],
    properties: {
      id: { $ref: '#/components/schemas/Jid' },
      server_id: { type: 'string' },
      reaction: {
        type: 'object',
        properties: { code: { type: 'string' }, count: { type: 'integer' }, removed: { type: 'boolean' } },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  },
  NewsletterView: {
    type: 'object',
    required: ['id', 'server_id', 'count'],
    properties: { id: { $ref: '#/components/schemas/Jid' }, server_id: { type: 'string' }, count: { type: 'integer' } },
    additionalProperties: true,
  },
  NewsletterParticipantsUpdate: {
    type: 'object',
    required: ['id', 'author', 'user', 'new_role', 'action'],
    properties: {
      id: { $ref: '#/components/schemas/Jid' },
      author: { $ref: '#/components/schemas/Jid' },
      user: { $ref: '#/components/schemas/Jid' },
      new_role: { type: 'string' },
      action: { type: 'string' },
    },
    additionalProperties: true,
  },
  NewsletterSettingsUpdate: {
    type: 'object',
    required: ['id', 'update'],
    properties: { id: { $ref: '#/components/schemas/Jid' }, update: { type: 'object', additionalProperties: true } },
    additionalProperties: true,
  },
  MessageCappingUpdate: {
    type: 'object',
    properties: {
      total_quota: { type: 'integer' },
      used_quota: { type: 'integer' },
      cycle_start_timestamp: { type: 'string' },
      cycle_end_timestamp: { type: 'string' },
      server_sent_timestamp: { type: 'string' },
      capping_status: { type: 'string', enum: ['NONE', 'FIRST_WARNING', 'SECOND_WARNING', 'CAPPED'] },
      mv_status: { type: 'string', enum: ['NOT_ELIGIBLE', 'NOT_ACTIVE', 'ACTIVE', 'ACTIVE_UPGRADE_AVAILABLE'] },
      ote_status: { type: 'string', enum: ['NOT_ELIGIBLE', 'ELIGIBLE', 'ACTIVE_IN_CURRENT_CYCLE', 'EXHAUSTED'] },
    },
    additionalProperties: true,
  },
  ChatLock: {
    type: 'object',
    required: ['id', 'locked'],
    properties: { id: { $ref: '#/components/schemas/Jid' }, locked: { type: 'boolean' } },
    additionalProperties: true,
  },
  SettingsUpdate: {
    oneOf: [
      {
        type: 'object',
        required: ['setting', 'value'],
        properties: { setting: { type: 'string', enum: ['unarchiveChats'] }, value: { type: 'boolean' } },
        additionalProperties: true,
      },
      {
        type: 'object',
        required: ['setting', 'value'],
        properties: { setting: { type: 'string', enum: ['locale'] }, value: { type: 'string' } },
        additionalProperties: true,
      },
      {
        type: 'object',
        required: ['setting', 'value'],
        properties: {
          setting: {
            type: 'string',
            enum: [
              'disableLinkPreviews',
              'privacySettingRelayAllCalls',
              'statusPrivacy',
              'channelsPersonalisedRecommendation',
            ],
          },
          value: { type: 'object', additionalProperties: true },
        },
        additionalProperties: true,
      },
      {
        type: 'object',
        required: ['setting', 'value'],
        properties: {
          setting: { type: 'string', enum: ['timeFormat', 'notificationActivitySetting'] },
          value: { oneOf: [{ type: 'string' }, { type: 'integer' }, { type: 'object', additionalProperties: true }] },
        },
        additionalProperties: true,
      },
    ],
  },
  GenericObject: { type: 'object', additionalProperties: true },
  NullableObject: { oneOf: [{ type: 'object', additionalProperties: true }, { type: 'null' }] },
};

const event = (key, wire, group, summary, dataSchema, dataExample, details = '') => ({
  key,
  wire,
  group,
  summary,
  dataSchema,
  dataExample,
  details,
});
const events = [
  event(
    'APPLICATION_STARTUP',
    'application.startup',
    'Lifecycle',
    'Server application started',
    'ApplicationStartup',
    { version: '3.0.0' },
    'Global webhook event; it may not be associated with a connected instance.',
  ),
  event('INSTANCE_CREATE', 'instance.create', 'Lifecycle', 'Instance created', 'InstanceLifecycle', {
    instanceName: 'my-instance',
    instanceId: 'clx123',
  }),
  event('INSTANCE_DELETE', 'instance.delete', 'Lifecycle', 'Instance deleted', 'InstanceLifecycle', {
    instanceName: 'my-instance',
    instanceId: 'clx123',
  }),
  event('QRCODE_UPDATED', 'qrcode.updated', 'Connection', 'QR or pairing code changed', 'QrCodeUpdate', {
    qrcode: { pairingCode: 'ABCD-EFGH', code: '2@...' },
  }),
  event('CONNECTION_UPDATE', 'connection.update', 'Connection', 'WhatsApp connection state changed', 'Connection', {
    instance: 'my-instance',
    state: 'open',
    statusReason: 200,
  }),
  event('STATUS_INSTANCE', 'status.instance', 'Connection', 'Evolution instance status changed', 'Connection', {
    instance: 'my-instance',
    state: 'open',
  }),
  event(
    'MESSAGES_SET',
    'messages.set',
    'Messages',
    'Historical messages batch prepared',
    'MessageArray',
    [
      {
        key: { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: false },
        message: { conversation: 'Older message' },
        messageType: 'conversation',
        messageTimestamp: 1760000000,
      },
    ],
    '`isLatest` and `progress` can also appear at envelope level.',
  ),
  event(
    'MESSAGES_UPSERT',
    'messages.upsert',
    'Messages',
    'One new or newly synchronized message',
    'Message',
    {
      key: { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: false },
      pushName: 'Alice',
      message: { conversation: 'Hello' },
      messageType: 'conversation',
      messageTimestamp: 1760000000,
    },
    'Evolution emits one prepared message per HTTP delivery, not the Baileys `{ messages, type }` batch.',
  ),
  event('MESSAGES_EDITED', 'messages.edited', 'Messages', 'Message edit protocol action received', 'EditedMessage', {
    key: { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: false },
    editedMessage: { conversation: 'Corrected text' },
  }),
  event('MESSAGES_UPDATE', 'messages.update', 'Messages', 'Message status or content updated', 'MessageUpdate', {
    key: { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: true },
    status: 'READ',
    instanceId: 'clx123',
  }),
  event(
    'MESSAGES_DELETE',
    'messages.delete',
    'Messages',
    'Message or chat messages deleted',
    'MessageDelete',
    { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: true, status: 'DELETED' },
    'Shape depends on whether deletion came from a WhatsApp update or an Evolution API delete operation.',
  ),
  event('SEND_MESSAGE', 'send.message', 'Messages', 'Evolution sent a message', 'Message', {
    key: { remoteJid: '15551234567@s.whatsapp.net', id: 'OUT123', fromMe: true },
    message: { conversation: 'Sent text' },
    messageType: 'conversation',
    messageTimestamp: 1760000000,
  }),
  event(
    'SEND_MESSAGE_UPDATE',
    'send.message.update',
    'Messages',
    'A sent message edit was confirmed',
    'EditedMessage',
    {
      key: { remoteJid: '15551234567@s.whatsapp.net', id: 'OUT123', fromMe: true },
      editedMessage: { conversation: 'Updated text' },
    },
  ),
  event(
    'CONTACTS_SET',
    'contacts.set',
    'Contacts',
    'Initial contacts batch',
    'ContactArray',
    [{ remoteJid: '15551234567@s.whatsapp.net', pushName: 'Alice' }],
    'Retained for compatibility; Baileys 7 does not currently emit contacts.set.',
  ),
  event('CONTACTS_UPSERT', 'contacts.upsert', 'Contacts', 'Contacts inserted or replaced', 'ContactArray', [
    { remoteJid: '15551234567@s.whatsapp.net', pushName: 'Alice', profilePicUrl: null, instanceId: 'clx123' },
  ]),
  event('CONTACTS_UPDATE', 'contacts.update', 'Contacts', 'Contacts changed', 'ContactArray', [
    {
      remoteJid: '15551234567@s.whatsapp.net',
      pushName: 'Alice',
      profilePicUrl: 'https://example.test/avatar.jpg',
      instanceId: 'clx123',
    },
  ]),
  event(
    'PRESENCE_UPDATE',
    'presence.update',
    'Contacts',
    'Typing, recording, online, or unavailable presence changed',
    'Presence',
    {
      id: '15551234567@s.whatsapp.net',
      presences: { '15551234567@s.whatsapp.net': { lastKnownPresence: 'composing', lastSeen: 1760000000 } },
    },
  ),
  event('CHATS_SET', 'chats.set', 'Chats', 'Initial/history chats batch prepared', 'ChatArray', [
    { remoteJid: '15551234567@s.whatsapp.net', name: 'Alice', instanceId: 'clx123' },
  ]),
  event('CHATS_UPSERT', 'chats.upsert', 'Chats', 'Chats inserted or replaced', 'ChatArray', [
    { remoteJid: '15551234567@s.whatsapp.net', name: 'Alice', unreadMessages: 1, instanceId: 'clx123' },
  ]),
  event('CHATS_UPDATE', 'chats.update', 'Chats', 'Chats changed', 'ChatArray', [
    { remoteJid: '15551234567@s.whatsapp.net', instanceId: 'clx123' },
  ]),
  event('CHATS_DELETE', 'chats.delete', 'Chats', 'Chats deleted', 'JidArray', ['15551234567@s.whatsapp.net']),
  event('GROUPS_UPSERT', 'groups.upsert', 'Groups', 'Group metadata inserted or replaced', 'GroupMetadataArray', [
    { id: '120363000000000000@g.us', subject: 'Community team', owner: '15551234567@s.whatsapp.net', participants: [] },
  ]),
  event('GROUPS_UPDATE', 'groups.update', 'Groups', 'Group metadata changed', 'GroupMetadataArray', [
    { id: '120363000000000000@g.us', subject: 'New subject', announce: false },
  ]),
  event(
    'GROUP_PARTICIPANTS_UPDATE',
    'group-participants.update',
    'Groups',
    'Group members added, removed, promoted, demoted, or modified',
    'GroupParticipantsUpdate',
    {
      id: '120363000000000000@g.us',
      participants: ['151672961659093@lid'],
      action: 'add',
      participantsData: [{ jid: '151672961659093@lid', phoneNumber: '15551234567', name: 'Alice' }],
    },
  ),
  event(
    'GROUP_JOIN_REQUEST',
    'group.join-request',
    'Groups',
    'Group join request created, revoked, or rejected',
    'GroupJoinRequest',
    {
      id: '120363000000000000@g.us',
      author: '15551234567@s.whatsapp.net',
      participant: '16661234567@s.whatsapp.net',
      action: 'created',
      method: 'invite_link',
    },
    '`action`: created, revoked, or rejected. `method`: invite_link, linked_group_join, or non_admin_add.',
  ),
  event(
    'GROUP_MEMBER_TAG_UPDATE',
    'group.member-tag.update',
    'Groups',
    'Group member tag/label changed',
    'GroupMemberTagUpdate',
    {
      groupId: '120363000000000000@g.us',
      participant: '15551234567@s.whatsapp.net',
      label: 'admin',
      messageTimestamp: 1760000000,
    },
  ),
  event('CALL', 'call', 'Calls', 'Call state changed', 'Call', {
    id: 'CALL123',
    chatId: '15551234567@s.whatsapp.net',
    from: '15551234567@s.whatsapp.net',
    status: 'offer',
    isVideo: false,
    offline: false,
    date: '2026-09-07T12:00:00.000Z',
  }),
  event('TYPEBOT_START', 'typebot.start', 'Chatbots', 'Typebot session started', 'TypebotStart', {
    remoteJid: '15551234567@s.whatsapp.net',
    url: 'https://typebot.example',
    typebot: 'support',
    variables: [],
    sessionId: 'session-123',
  }),
  event(
    'TYPEBOT_CHANGE_STATUS',
    'typebot.change-status',
    'Chatbots',
    'Typebot session status changed',
    'TypebotStatus',
    { remoteJid: '15551234567@s.whatsapp.net', status: 'opened', sessionId: 'session-123' },
    'Fields vary with the Typebot integration transition that emitted the event.',
  ),
  event('LABELS_EDIT', 'labels.edit', 'Labels', 'WhatsApp label created, changed, or deleted', 'LabelEdit', {
    id: '1',
    name: 'Important',
    color: 1,
    deleted: false,
    instance: 'my-instance',
  }),
  event(
    'LABELS_ASSOCIATION',
    'labels.association',
    'Labels',
    'Label attached to or removed from a chat',
    'LabelAssociation',
    { instance: 'my-instance', type: 'add', chatId: '15551234567@s.whatsapp.net', labelId: '1' },
    '`type` is add or remove.',
  ),
  event(
    'CREDS_UPDATE',
    'creds.update',
    'Connection',
    'Baileys credentials changed',
    'CredentialsUpdate',
    { instance: 'my-instance' },
    'For security, Evolution emits instance metadata only; authentication keys are never included.',
  ),
  event(
    'MESSAGING_HISTORY_SET',
    'messaging-history.set',
    'History',
    'Raw Baileys history synchronization chunk',
    'History',
    { chats: [], contacts: [], messages: [], isLatest: false, progress: 42, syncType: 1, chunkOrder: 2 },
  ),
  event(
    'MESSAGING_HISTORY_STATUS',
    'messaging-history.status',
    'History',
    'History synchronization completed or paused',
    'HistoryStatus',
    { syncType: 1, status: 'complete', explicit: true },
    '`status` is complete or paused. `explicit=false` means completion was inferred after no more chunks arrived.',
  ),
  event('LID_MAPPING_UPDATE', 'lid-mapping.update', 'Identity', 'LID-to-phone-number mapping changed', 'LidMapping', {
    lid: '151672961659093@lid',
    pn: '15551234567@s.whatsapp.net',
  }),
  event(
    'MESSAGES_MEDIA_UPDATE',
    'messages.media-update',
    'Messages',
    'Encrypted media data or media download error changed',
    'MediaUpdateArray',
    [
      {
        key: { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: false },
        media: { ciphertext: 'AAEC', iv: 'AAEC' },
      },
    ],
  ),
  event(
    'MESSAGES_REACTION',
    'messages.reaction',
    'Messages',
    'Reaction added, changed, or removed',
    'ReactionArray',
    [
      {
        key: { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: false },
        reaction: { text: '👍', key: { remoteJid: '15551234567@s.whatsapp.net', id: 'TARGET123', fromMe: true } },
      },
    ],
    'An empty or missing reaction text means the reaction was removed.',
  ),
  event(
    'MESSAGE_RECEIPT_UPDATE',
    'message-receipt.update',
    'Messages',
    'Delivery, read, or played receipt changed',
    'ReceiptArray',
    [
      {
        key: { remoteJid: '15551234567@s.whatsapp.net', id: 'ABC123', fromMe: true },
        receipt: { userJid: '15551234567@s.whatsapp.net', readTimestamp: 1760000000 },
      },
    ],
  ),
  event('BLOCKLIST_SET', 'blocklist.set', 'Privacy', 'Complete blocklist received', 'BlocklistSet', {
    blocklist: ['15551234567@s.whatsapp.net'],
  }),
  event(
    'BLOCKLIST_UPDATE',
    'blocklist.update',
    'Privacy',
    'Contacts added to or removed from blocklist',
    'BlocklistUpdate',
    { blocklist: ['15551234567@s.whatsapp.net'], type: 'add' },
    '`type` is add or remove.',
  ),
  event(
    'NEWSLETTER_REACTION',
    'newsletter.reaction',
    'Newsletters',
    'Newsletter reaction count changed',
    'NewsletterReaction',
    { id: '120363000000000000@newsletter', server_id: '123', reaction: { code: '👍', count: 3, removed: false } },
  ),
  event(
    'NEWSLETTER_VIEW',
    'newsletter.view',
    'Newsletters',
    'Newsletter message view count changed',
    'NewsletterView',
    { id: '120363000000000000@newsletter', server_id: '123', count: 42 },
  ),
  event(
    'NEWSLETTER_PARTICIPANTS_UPDATE',
    'newsletter-participants.update',
    'Newsletters',
    'Newsletter participant role changed',
    'NewsletterParticipantsUpdate',
    {
      id: '120363000000000000@newsletter',
      author: '15551234567@s.whatsapp.net',
      user: '16661234567@s.whatsapp.net',
      new_role: 'ADMIN',
      action: 'promote',
    },
  ),
  event(
    'NEWSLETTER_SETTINGS_UPDATE',
    'newsletter-settings.update',
    'Newsletters',
    'Newsletter settings changed',
    'NewsletterSettingsUpdate',
    { id: '120363000000000000@newsletter', update: { name: 'News' } },
  ),
  event(
    'MESSAGE_CAPPING_UPDATE',
    'message-capping.update',
    'Limits',
    'New-chat message quota changed',
    'MessageCappingUpdate',
    { total_quota: 1000, used_quota: 25, capping_status: 'NONE', mv_status: 'ACTIVE', ote_status: 'ELIGIBLE' },
    '`capping_status`: NONE, FIRST_WARNING, SECOND_WARNING, CAPPED. See schema description for the MV and OTE states.',
  ),
  event('CHATS_LOCK', 'chats.lock', 'Chats', 'Chat lock state changed', 'ChatLock', {
    id: '15551234567@s.whatsapp.net',
    locked: true,
  }),
  event(
    'SETTINGS_UPDATE',
    'settings.update',
    'Settings',
    'Synced WhatsApp setting changed',
    'SettingsUpdate',
    { setting: 'unarchiveChats', value: true },
    '`setting` can be unarchiveChats, locale, disableLinkPreviews, timeFormat, privacySettingRelayAllCalls, statusPrivacy, notificationActivitySetting, or channelsPersonalisedRecommendation.',
  ),
  event(
    'REMOVE_INSTANCE',
    'remove.instance',
    'Lifecycle',
    'Instance removed from the running monitor',
    'NullableObject',
    null,
  ),
  event('LOGOUT_INSTANCE', 'logout.instance', 'Lifecycle', 'Instance logged out', 'NullableObject', null),
];

const envelopeSchema = (entry) => ({
  type: 'object',
  required: ['event', 'instance', 'data', 'destination', 'date_time', 'server_url'],
  properties: {
    event: {
      type: 'string',
      enum: [entry.wire],
      description: 'Stable lowercase event name. In n8n, switch on `$json.event`.',
    },
    instance: { type: 'string', description: 'Evolution instance name.' },
    data: { $ref: `#/components/schemas/${entry.dataSchema}` },
    destination: {
      type: 'string',
      format: 'uri',
      description: 'Exact URL Evolution attempted. Includes the event suffix when webhook-by-event is enabled.',
    },
    date_time: { type: 'string', format: 'date-time', description: 'Evolution server-local ISO timestamp.' },
    sender: { type: ['string', 'null'], description: 'Connected account JID when available.' },
    server_url: { type: 'string', format: 'uri', description: 'Configured public Evolution API URL.' },
    apikey: {
      type: ['string', 'null'],
      description:
        'Instance API key only when AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES is enabled. Do not depend on or log it.',
    },
    isLatest: { type: 'boolean', description: 'History batch metadata; present mainly on messages.set.' },
    progress: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'History synchronization progress; present mainly on messages.set.',
    },
  },
  additionalProperties: true,
});

const channels = {};
const messages = {};
for (const entry of events) {
  const suffix = entry.key.toLowerCase().replaceAll('_', '-');
  const messageName = entry.key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()).toLowerCase();
  const schemaName = `${entry.key
    .split('_')
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join('')}Envelope`;
  schemas[schemaName] = envelopeSchema(entry);
  messages[entry.key] = {
    messageId: entry.key,
    name: entry.wire,
    title: entry.summary,
    summary: entry.details || entry.summary,
    contentType: 'application/json',
    payload: { $ref: `#/components/schemas/${schemaName}` },
    examples: [
      {
        name: `${entry.key.toLowerCase()}Example`,
        summary: entry.summary,
        payload: {
          event: entry.wire,
          instance: 'my-instance',
          data: entry.dataExample,
          destination: `https://n8n.example/webhook/evolution/${suffix}`,
          date_time: '2026-09-07T12:00:00.000Z',
          sender: '15550000000@s.whatsapp.net',
          server_url: 'https://evolution.example',
          apikey: null,
        },
      },
    ],
    tags: [{ name: entry.group }],
  };
  channels[`/${suffix}`] = {
    description: `${entry.summary}. This suffix is appended only when webhook-by-event is enabled. Without that option, all event messages are POSTed to the configured base URL.`,
    publish: {
      operationId: `receive${entry.key
        .split('_')
        .map((part) => part[0] + part.slice(1).toLowerCase())
        .join('')}`,
      summary: entry.summary,
      description: entry.details || undefined,
      message: { $ref: `#/components/messages/${entry.key}` },
      bindings: { http: { type: 'request', method: 'POST', bindingVersion: '0.3.0' } },
      tags: [{ name: entry.group }],
    },
  };
  void messageName;
}

const document = {
  asyncapi: '2.6.0',
  id: 'https://github.com/Neup123/evolution-api/docs/asyncapi.yaml',
  info: {
    title: 'Evolution API Webhook Events',
    version: '3.0.0-baileys-7.0.0-rc14',
    description: [
      'Consumer-facing contract for webhook HTTP POST requests emitted by this Evolution API fork.',
      '',
      'The documented payload is the complete HTTP body received by n8n. `data` varies by event. Schemas intentionally allow additional Baileys/protobuf fields so compatible upstream additions do not break consumers.',
      '',
      'When webhook-by-event is disabled, every message is posted to the configured URL. When enabled, Evolution appends the kebab-case suffix shown as the channel address.',
    ].join('\n'),
    contact: {
      name: 'Neup123 Evolution API fork',
      url: 'https://github.com/Neup123/evolution-api',
      email: 'Neup123@users.noreply.github.com',
    },
    license: { name: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
  },
  defaultContentType: 'application/json',
  servers: {
    webhookReceiver: {
      url: 'n8n.example/webhook/evolution',
      protocol: 'https',
      description: 'Your configured webhook base URL. Replace this example with the n8n production URL.',
      security: [],
    },
  },
  channels,
  components: { messages, schemas },
  tags: [...new Set(events.map((entry) => entry.group))].sort().map((name) => ({ name })),
};

const repoRoot = path.resolve(import.meta.dirname, '..');
fs.writeFileSync(path.join(repoRoot, 'docs', 'asyncapi.yaml'), YAML.stringify(document, { lineWidth: 120 }));

const table = events
  .map(
    (entry) =>
      `| \`${entry.key}\` | \`${entry.wire}\` | \`/${entry.key.toLowerCase().replaceAll('_', '-')}\` | ${entry.summary} |`,
  )
  .join('\n');
const markdown = `# Webhook payload reference

The interactive event documentation is served at **\`/webhooks/docs\`**. The downloadable AsyncAPI contract is at **\`/webhooks/asyncapi.yaml\`** and [\`asyncapi.yaml\`](./asyncapi.yaml) in this repository.

AsyncAPI is the event/webhook equivalent of OpenAPI/Swagger. It displays every event, the full HTTP envelope, event-specific \`data\` schema, allowed enum values, and realistic examples.

## The envelope received by n8n

Every normal instance webhook is an HTTP \`POST\` with this top-level structure:

\`\`\`json
{
  "event": "messages.upsert",
  "instance": "my-instance",
  "data": {},
  "destination": "https://n8n.example/webhook/evolution",
  "date_time": "2026-09-07T12:00:00.000Z",
  "sender": "15550000000@s.whatsapp.net",
  "server_url": "https://evolution.example",
  "apikey": null
}
\`\`\`

- \`event\` is the stable lowercase wire name. Route n8n workflows with **Switch → \`{{$json.event}}\`**.
- \`instance\` is the Evolution instance name.
- \`data\` is the event-specific payload documented in AsyncAPI.
- \`destination\` is the exact target URL used for this delivery.
- \`date_time\` is an ISO timestamp generated by Evolution.
- \`sender\` is the connected account JID when known.
- \`server_url\` is Evolution's configured public URL.
- \`apikey\` is normally null. It is included only when API-key exposure is explicitly enabled; never use it as webhook authentication.
- Extra top-level fields may be added for particular events. For example, \`messages.set\` can add \`isLatest\` and \`progress\`.

## n8n setup

Use the n8n **production** URL containing \`/webhook/\`, activate/publish the workflow, and normally leave **Webhook by event** disabled. One Webhook node can then feed a Switch node using \`{{$json.event}}\`.

If Webhook by event is enabled, Evolution appends the suffix in the table below. n8n must have an exact production route for each resulting URL; a node listening on \`/evolution\` does not match \`/evolution/messages-upsert\`.

Useful expressions for message workflows:

| Value | n8n expression |
| --- | --- |
| Event | \`{{$json.event}}\` |
| Instance | \`{{$json.instance}}\` |
| Chat/group JID | \`{{$json.data.key.remoteJid}}\` |
| Message ID | \`{{$json.data.key.id}}\` |
| Sent by connected account | \`{{$json.data.key.fromMe}}\` |
| Plain text | \`{{$json.data.message.conversation || $json.data.message.extendedTextMessage?.text}}\` |
| Group participant action | \`{{$json.data.action}}\` |
| Changed participant JIDs | \`{{$json.data.participants}}\` |
| Resolved participant phone | \`{{$json.data.participantsData?.[0]?.phoneNumber}}\` |

Webhook delivery can be retried. Make downstream writes idempotent. For messages, a practical key is \`instance + data.key.remoteJid + data.key.id\`. Do not assume optional display names, phone mappings, profile pictures, quoted context, or media URLs are always present.

## Event index

| Configuration value | Payload \`event\` | By-event suffix | Meaning |
| --- | --- | --- | --- |
${table}

## Compatibility notes

- \`MESSAGES_UPSERT\` delivers one Evolution-prepared message in \`data\`, rather than the raw Baileys \`{ messages, type }\` batch.
- \`GROUP_PARTICIPANTS_UPDATE\` keeps \`participants: string[]\` and adds optional \`participantsData\` with resolved JID, phone number, name, and image URL.
- \`CREDS_UPDATE\` never exposes Baileys credentials; only instance metadata is sent.
- \`CONTACTS_SET\` remains selectable for compatibility, but Baileys 7 currently does not emit it.
- Protobuf/WhatsApp payloads evolve. Documented objects allow additional fields; workflows should read the fields they need and tolerate unknown fields.
- Numbers represented internally as protobuf \`Long\` values can arrive as JSON numbers or strings. Convert explicitly in n8n before arithmetic.

## WhatsApp blocklist behavior

The blocklist belongs to the connected WhatsApp account. It is not scoped to an Evolution workflow, group, or community. Use it when the WhatsApp account itself considers a contact blocked. Keep application-specific deny lists separately when account-level blocking would be too broad.

### Read the current blocklist

Baileys \`fetchBlocklist()\` sends an IQ request to WhatsApp and returns the JIDs in the response. Through the grouped REST adapter, call:

\`\`\`http
POST /baileys/account/fetchBlocklist/{instanceName}
Content-Type: application/json
apikey: your-api-key

{}
\`\`\`

Evolution API v3 serves a fresh persistent snapshot first. Send \`live=true\` in the query or JSON body when the caller needs an authoritative decision-time refresh. Depending on WhatsApp identity data, entries can use a phone-number JID or LID; compare both identities when available.

### Block or unblock a contact

There are two REST surfaces:

- \`POST /chat/updateBlockStatus/{instanceName}\` accepts \`number\` and \`status\`, where \`status\` is \`block\` or \`unblock\`.
- \`POST /baileys/account/updateBlockStatus/{instanceName}\` accepts named \`jid\` and \`action\` fields, where \`action\` is \`block\` or \`unblock\`.

The former flat compatibility route was removed in v3. Baileys normalizes the JID and requires a known mapping between LID and phone-number JID. If the mapping cannot be resolved, it rejects the operation instead of guessing.

### Blocklist webhooks

\`blocklist.set\` is a complete snapshot and replaces the local read snapshot. \`blocklist.update\` is incremental, so Evolution invalidates the snapshot and refreshes it on the next read. Deliveries can be missed or duplicated; use \`live=true\` for decisions that must reflect WhatsApp immediately.

Blocking is account-wide and should not be used merely to reject a group join request unless the same person should also be blocked from direct contact with the connected WhatsApp account.
`;
fs.writeFileSync(path.join(repoRoot, 'docs', 'webhooks.md'), markdown);

console.log(`Generated AsyncAPI documentation for ${events.length} webhook events.`);
