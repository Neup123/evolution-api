import { JSONSchema7 } from 'json-schema';
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

export const settingsSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    rejectCall: { type: 'boolean' },
    msgCall: { type: 'string' },
    groupsIgnore: { type: 'boolean' },
    alwaysOnline: { type: 'boolean' },
    readMessages: { type: 'boolean' },
    readStatus: { type: 'boolean' },
    syncFullHistory: { type: 'boolean' },
    wavoipToken: { type: 'string' },
    localReadTtlSeconds: { type: ['integer', 'null'], minimum: 0, maximum: 2592000 },
    localReadTtlOverrides: {
      type: ['object', 'null'],
      additionalProperties: { type: 'integer', minimum: 0, maximum: 2592000 },
    },
    automationSafety: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        typing: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            minMs: { type: 'integer', minimum: 0, maximum: 20000 },
            maxMs: { type: 'integer', minimum: 0, maximum: 20000 },
            charactersPerSecond: { type: 'number', minimum: 1, maximum: 100 },
            jitterPercent: { type: 'integer', minimum: 0, maximum: 25 },
            presence: { type: 'string', enum: ['composing', 'recording'] },
            applyToMediaCaptions: { type: 'boolean' },
          },
        },
        rateLimit: {
          type: 'object',
          additionalProperties: false,
          properties: {
            instancePerMinute: { type: 'integer', minimum: 1, maximum: 10000 },
            instancePerDay: { type: 'integer', minimum: 1, maximum: 1000000 },
            recipientPerMinute: { type: 'integer', minimum: 1, maximum: 1000 },
            recipientPerDay: { type: 'integer', minimum: 1, maximum: 100000 },
            minimumIntervalMs: { type: 'integer', minimum: 0, maximum: 600000 },
            maxConcurrentSends: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
        quietHours: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            start: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
            end: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
            timeZone: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        duplicate: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            windowSeconds: { type: 'integer', minimum: 1, maximum: 86400 },
          },
        },
        suppression: {
          type: 'object',
          additionalProperties: false,
          properties: {
            recipients: { type: 'array', maxItems: 10000, items: { type: 'string', minLength: 3, maxLength: 100 } },
            allowlistEnabled: { type: 'boolean' },
            allowedRecipients: {
              type: 'array',
              maxItems: 10000,
              items: { type: 'string', minLength: 3, maxLength: 100 },
            },
          },
        },
        failurePause: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            threshold: { type: 'integer', minimum: 1, maximum: 100 },
            pauseSeconds: { type: 'integer', minimum: 1, maximum: 86400 },
          },
        },
        audit: {
          type: 'object',
          additionalProperties: false,
          properties: { retentionDays: { type: 'integer', minimum: 1, maximum: 3650 } },
        },
      },
    },
  },
  required: ['rejectCall', 'groupsIgnore', 'alwaysOnline', 'readMessages', 'readStatus', 'syncFullHistory'],
  ...isNotEmpty('rejectCall', 'groupsIgnore', 'alwaysOnline', 'readMessages', 'readStatus', 'syncFullHistory'),
};
