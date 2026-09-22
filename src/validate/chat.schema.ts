import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { v4 } from 'uuid';

const isNotEmpty = (...propertyNames: string[]): JSONSchema7 => {
  const properties = {};
  propertyNames.forEach(
    (property) =>
      (properties[property] = {
        minLength: 1,
        description: `The "${property}" cannot be empty`,
      }),
  );
  return {
    if: {
      propertyNames: {
        enum: [...propertyNames],
      },
    },
    then: { properties },
  };
};

const numberDefinition: JSONSchema7Definition = {
  type: 'string',
  description: 'Invalid format',
};

export const whatsappNumberSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    numbers: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: {
        type: 'string',
        description: '"numbers" must be an array of numeric strings',
      },
    },
  },
};

export const readMessageSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    readMessages: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: {
        properties: {
          id: { type: 'string' },
          fromMe: { type: 'boolean', enum: [true, false] },
          remoteJid: { type: 'string' },
        },
        required: ['id', 'fromMe', 'remoteJid'],
        ...isNotEmpty('id', 'remoteJid'),
      },
    },
  },
  required: ['readMessages'],
};

export const archiveChatSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    chat: { type: 'string' },
    lastMessage: {
      type: 'object',
      properties: {
        key: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            remoteJid: { type: 'string' },
            fromMe: { type: 'boolean', enum: [true, false] },
          },
          required: ['id', 'fromMe', 'remoteJid'],
          ...isNotEmpty('id', 'remoteJid'),
        },
        messageTimestamp: { type: 'integer', minLength: 1 },
      },
      required: ['key'],
      ...isNotEmpty('messageTimestamp'),
    },
    archive: { type: 'boolean', enum: [true, false] },
  },
  required: ['archive'],
};

export const markChatUnreadSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    chat: { type: 'string' },
    lastMessage: {
      type: 'object',
      properties: {
        key: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            remoteJid: { type: 'string' },
            fromMe: { type: 'boolean', enum: [true, false] },
          },
          required: ['id', 'fromMe', 'remoteJid'],
          ...isNotEmpty('id', 'remoteJid'),
        },
        messageTimestamp: { type: 'integer', minLength: 1 },
      },
      required: ['key'],
      ...isNotEmpty('messageTimestamp'),
    },
  },
  required: ['lastMessage'],
};

export const deleteMessageSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    id: { type: 'string' },
    remoteJid: {
      type: 'string',
      pattern: '^(?:\\d+@(?:s\\.whatsapp\\.net|lid)|\\d+-\\d+@g\\.us|status@broadcast|[^@\\s]+@broadcast)$',
      description:
        'Exact remoteJid from the original message key. For group messages this must be the group JID ending in @g.us, not participant, participantAlt, sender, or an internal database row ID.',
    },
    participant: {
      type: 'string',
      description:
        'Original group participant JID from the webhook message key. It enables delete-for-everyone for another participant’s group message; when unavailable the operation falls back to delete-for-me.',
    },
    participantAlt: {
      type: 'string',
      description: 'Alternate participant JID from the webhook message key, used as a fallback for LID/PN resolution.',
    },
    messageTimestamp: {
      type: 'integer',
      minimum: 1,
      description:
        'Original Unix timestamp in seconds. Required for delete-for-me only when the original message is unavailable in Evolution message storage.',
    },
    deleteMedia: {
      type: 'boolean',
      default: true,
      description: 'Also remove locally stored message media when the selected scope is delete-for-me.',
    },
  },
  required: ['id', 'remoteJid'],
  ...isNotEmpty('id', 'remoteJid'),
};

export const profilePictureSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: { type: 'string' },
    picture: { type: 'string' },
  },
};

export const updateMessageSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: { type: 'string' },
    text: { type: 'string' },
    key: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        remoteJid: { type: 'string' },
        fromMe: { type: 'boolean', enum: [true, false] },
      },
      required: ['id', 'fromMe', 'remoteJid'],
      ...isNotEmpty('id', 'remoteJid'),
    },
  },
  ...isNotEmpty('number', 'text', 'key'),
};

export const presenceSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: { ...numberDefinition },
    delay: { type: 'number' },
    presence: {
      type: 'string',
      enum: ['unavailable', 'available', 'composing', 'recording', 'paused'],
    },
  },
  required: ['number', 'presence', 'delay'],
};

export const blockUserSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: { type: 'string' },
    status: { type: 'string', enum: ['block', 'unblock'] },
  },
  required: ['number', 'status'],
  ...isNotEmpty('number', 'status'),
};

export const contactValidateSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    where: {
      type: 'object',
      properties: {
        _id: { type: 'string', minLength: 1 },
        pushName: { type: 'string', minLength: 1 },
        id: { type: 'string', minLength: 1 },
        remoteJid: { type: 'string', minLength: 1 },
      },
      ...isNotEmpty('_id', 'id', 'pushName', 'remoteJid'),
    },
  },
};

export const messageValidateSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    where: {
      type: 'object',
      properties: {
        _id: { type: 'string', minLength: 1 },
        key: {
          type: 'object',
          if: {
            propertyNames: {
              enum: ['fromMe', 'remoteJid', 'id'],
            },
          },
          then: {
            properties: {
              remoteJid: {
                type: 'string',
                minLength: 1,
                description: 'The property cannot be empty',
              },
              id: {
                type: 'string',
                minLength: 1,
                description: 'The property cannot be empty',
              },
              fromMe: { type: 'boolean', enum: [true, false] },
            },
          },
        },
        message: { type: 'object' },
      },
      ...isNotEmpty('_id'),
    },
    limit: { type: 'integer' },
  },
};

export const messageUpSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    where: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        remoteJid: { type: 'string' },
        id: { type: 'string' },
        fromMe: { type: 'boolean', enum: [true, false] },
        participant: { type: 'string' },
        status: {
          type: 'string',
          enum: ['ERROR', 'PENDING', 'SERVER_ACK', 'DELIVERY_ACK', 'READ', 'PLAYED'],
        },
      },
      ...isNotEmpty('_id', 'remoteJid', 'id', 'status'),
    },
    limit: { type: 'integer' },
  },
};

export const privacySettingsSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    readreceipts: { type: 'string', enum: ['all', 'none'] },
    profile: {
      type: 'string',
      enum: ['all', 'contacts', 'contact_blacklist', 'none'],
    },
    status: {
      type: 'string',
      enum: ['all', 'contacts', 'contact_blacklist', 'none'],
    },
    online: { type: 'string', enum: ['all', 'match_last_seen'] },
    last: { type: 'string', enum: ['all', 'contacts', 'contact_blacklist', 'none'] },
    groupadd: {
      type: 'string',
      enum: ['all', 'contacts', 'contact_blacklist', 'none'],
    },
  },
  required: ['readreceipts', 'profile', 'status', 'online', 'last', 'groupadd'],
  ...isNotEmpty('readreceipts', 'profile', 'status', 'online', 'last', 'groupadd'),
};

export const profileNameSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
  ...isNotEmpty('name'),
};

export const profileStatusSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    status: { type: 'string' },
  },
  ...isNotEmpty('status'),
};

export const profileSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    wuid: { type: 'string' },
    name: { type: 'string' },
    picture: { type: 'string' },
    status: { type: 'string' },
    isBusiness: { type: 'boolean' },
  },
};
