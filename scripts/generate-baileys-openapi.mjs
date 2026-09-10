import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import YAML from 'yaml';
import prettier from 'prettier';

const root = process.cwd();
const methodsPath = path.join(root, 'src/api/integrations/channel/whatsapp/baileys.methods.ts');
const socketPath = path.join(root, 'node_modules/baileys/lib/Socket/index.d.ts');
const generatedPath = path.join(root, 'src/api/integrations/channel/whatsapp/baileys.generated.ts');
const openApiPath = path.join(root, 'docs/openapi.yaml');
const archiveOpenApiPath = path.join(root, 'docs/archive.openapi.yaml');

const groupLabels = {
  communities: ['Communities', 'Community creation, membership, invitations, and settings.'],
  business: ['Business & catalog', 'Business profiles, catalogs, collections, and products.'],
  messages: ['Calls & messages', 'Messages, receipts, calls, media, and history.'],
  newsletters: ['Newsletters', 'Newsletter lifecycle, subscribers, content, and reactions.'],
  groups: ['Groups', 'Group creation, membership, invitations, and settings.'],
  account: ['Account & privacy', 'Account, presence, profile, privacy, contacts, labels, and quick replies.'],
  advanced: ['Advanced protocol', 'Low-level protocol, cryptographic, query, and binary operations.'],
};

const methodDescriptions = {
  communityMetadata:
    'Get a parent community name, description, participants, and settings. Use Group Metadata for regular groups.',
  communityCreate: 'Create a WhatsApp community with a subject and description.',
  communityCreateGroup: 'Create a group inside an existing community and add participants.',
  groupMetadata: 'Get the subject, description, owner, participants, and settings of a group.',
  groupCreate: 'Create a WhatsApp group and add the supplied participants.',
  groupParticipantsUpdate: 'Add, remove, promote, or demote participants in a group.',
  groupRequestParticipantsList: 'List pending requests from people who want to join a group.',
  groupRequestParticipantsUpdate: 'Approve or reject pending group join requests.',
  newsletterCreate: 'Create a WhatsApp newsletter (channel).',
  newsletterMetadata: 'Get newsletter details using its JID or invite code.',
  newsletterFetchMessages: 'Load messages published by a newsletter.',
  newsletterReactMessage: 'Add or remove an emoji reaction on a newsletter message.',
  sendMessage: 'Send a Baileys message payload directly to a chat or group.',
  readMessages: 'Mark one or more WhatsApp messages as read.',
  sendReceipt: 'Send a delivery, read, played, or other receipt for a message.',
  sendReceipts: 'Send the same receipt for multiple messages.',
  relayMessage: 'Relay an already constructed protocol message to a WhatsApp JID.',
  fetchMessageHistory: 'Request older messages for a chat from linked WhatsApp devices.',
  updateMediaMessage: 'Re-upload or refresh media data for a message whose media is unavailable.',
  fetchBlocklist: 'Get all WhatsApp accounts blocked by the connected account.',
  updateBlockStatus: 'Block or unblock a WhatsApp contact.',
  fetchPrivacySettings: 'Get the connected account privacy settings.',
  chatModify: 'Archive, unarchive, mute, pin, clear, or delete a chat.',
  sendPresenceUpdate: 'Set account presence, such as available, unavailable, composing, or recording.',
  presenceSubscribe: 'Subscribe to live presence updates for a contact.',
  requestPairingCode: 'Generate a pairing code for linking without scanning a QR code.',
  query: 'Send a low-level WhatsApp binary query. Intended for advanced protocol integrations.',
  sendRawMessage: 'Send a low-level raw WhatsApp message. Intended for advanced protocol integrations.',
};

function readableName(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (character) => character.toUpperCase());
}

function describeMethod(method) {
  if (methodDescriptions[method]) return methodDescriptions[method];
  const readable = readableName(method).toLowerCase();
  if (/^(fetch|get)/.test(method)) return `Retrieve ${readable.replace(/^(fetch|get) /, '')} from WhatsApp.`;
  if (/^(create|add)/.test(method)) return `Create or add ${readable.replace(/^(create|add) /, '')} in WhatsApp.`;
  if (/^(update|set|modify)/.test(method))
    return `Change ${readable.replace(/^(update|set|modify) /, '')} for the connected WhatsApp account.`;
  if (/^(remove|delete|clean)/.test(method))
    return `Remove ${readable.replace(/^(remove|delete|clean) /, '')} from WhatsApp.`;
  if (/^(send|relay|issue)/.test(method))
    return `Send ${readable.replace(/^(send|relay|issue) /, '')} through the connected WhatsApp account.`;
  return `Run ${readableName(method)} and return the WhatsApp result.`;
}

function describeParameter(method, parameter) {
  const name = parameter.name;
  if (method.startsWith('community') && ['jid', 'communityJid', 'parentCommunityJid'].includes(name)) {
    return 'Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise.';
  }
  if (method.startsWith('group') && ['jid', 'id', 'groupJid'].includes(name)) {
    return 'WhatsApp group JID ending in @g.us.';
  }
  if (['jid', 'to', 'toJid'].includes(name)) {
    return 'Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us.';
  }
  if (/participants?/i.test(name)) return 'Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix.';
  if (/inviteCode|^code$/i.test(name)) return 'Invite code only, without the chat.whatsapp.com URL prefix.';
  if (name === 'action') return `Action performed by ${readableName(method)}.`;
  return parameter.schema.description ?? `${readableName(name)} for ${readableName(method)}.`;
}

function guidedQuerySchema(schema) {
  if (schema?.enum || ['string', 'number', 'integer', 'boolean'].includes(schema?.type)) return schema;
  if (
    schema?.type === 'array' &&
    schema.items &&
    ['string', 'number', 'integer', 'boolean'].includes(schema.items.type)
  )
    return schema;
  return {
    type: 'string',
    description: `${schema?.description ?? 'Structured value'}. Enter valid JSON.`,
    example: schema?.type === 'array' ? '[]' : '{}',
  };
}

function readGroups() {
  const source = fs.readFileSync(methodsPath, 'utf8');
  const groupsBlock = source.match(/export const BAILEYS_METHOD_GROUPS = \{([\s\S]*?)\n\} as const;/)?.[1];
  if (!groupsBlock) throw new Error('Could not find BAILEYS_METHOD_GROUPS');

  return Object.fromEntries(
    [...groupsBlock.matchAll(/(\w+): \[([\s\S]*?)\n\s*\],/g)].map((match) => [
      match[1],
      [...match[2].matchAll(/'([^']+)'/g)].map((method) => method[1]),
    ]),
  );
}

function readUnsupportedMethods() {
  const source = fs.readFileSync(methodsPath, 'utf8');
  const block = source.match(/export const BAILEYS_UNSUPPORTED_API_METHODS = \[([\s\S]*?)\] as const;/)?.[1];
  if (!block) throw new Error('Could not find BAILEYS_UNSUPPORTED_API_METHODS');
  return [...block.matchAll(/'([^']+)'/g)].map((method) => method[1]);
}

const groups = readGroups();
const methods = Object.values(groups).flat();
const duplicateMethods = methods.filter((method, index) => methods.indexOf(method) !== index);
if (duplicateMethods.length)
  throw new Error(`Methods assigned to multiple groups: ${[...new Set(duplicateMethods)].join(', ')}`);
const unsupportedMethods = new Set(readUnsupportedMethods());
const exposedUnsupportedMethods = methods.filter((method) => unsupportedMethods.has(method));
if (exposedUnsupportedMethods.length) {
  throw new Error(`Unsupported methods cannot be exposed: ${exposedUnsupportedMethods.join(', ')}`);
}
const methodSet = new Set(methods);
const groupByMethod = Object.fromEntries(
  Object.entries(groups).flatMap(([group, names]) => names.map((name) => [name, group])),
);

const program = ts.createProgram([socketPath], {
  target: ts.ScriptTarget.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(socketPath);
if (!sourceFile) throw new Error(`Could not read ${socketPath}`);

function primitiveSchema(type) {
  if (type.flags & ts.TypeFlags.StringLike) return { type: 'string' };
  if (type.flags & ts.TypeFlags.NumberLike) return { type: 'number' };
  if (type.flags & ts.TypeFlags.BooleanLike) return { type: 'boolean' };
  if (type.flags & ts.TypeFlags.BigIntLike) return { type: 'integer' };
  if (type.flags & ts.TypeFlags.Null) return { type: 'null' };
  return undefined;
}

function schemaForType(type, depth = 0, seen = new Set()) {
  const typeName = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
  if (/\bWAMediaUpload\b/.test(typeName)) {
    return {
      anyOf: [
        { type: 'string' },
        { type: 'object', additionalProperties: true },
        {
          type: 'object',
          properties: { $base64: { type: 'string', format: 'byte' } },
          required: ['$base64'],
          additionalProperties: false,
        },
      ],
      description: typeName,
    };
  }

  if (/\b(Buffer|Uint8Array)\b/.test(typeName)) {
    return {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: { $base64: { type: 'string', format: 'byte' } },
          required: ['$base64'],
          additionalProperties: false,
        },
      ],
      description: typeName,
    };
  }

  if (type.isUnion()) {
    const members = type.types.filter((member) => !(member.flags & ts.TypeFlags.Undefined));
    const literals = members.map((member) => member.value).filter((value) => value !== undefined);
    if (literals.length === members.length && literals.length > 0) {
      const kind = literals.every((value) => typeof value === 'number') ? 'number' : 'string';
      return { type: kind, enum: literals, description: typeName };
    }
    const schemas = members.map((member) => schemaForType(member, depth, new Set(seen)));
    return schemas.length === 1 ? schemas[0] : { anyOf: schemas, description: typeName };
  }

  const primitive = primitiveSchema(type);
  if (primitive) return { ...primitive, description: typeName };

  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const arguments_ = checker.getTypeArguments(type);
    return {
      type: 'array',
      items: arguments_.length === 1 ? schemaForType(arguments_[0], depth + 1, new Set(seen)) : {},
      description: typeName,
    };
  }

  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) {
    return { description: typeName };
  }

  if (type.flags & ts.TypeFlags.Object) {
    if (seen.has(type) || depth >= 2) return { type: 'object', additionalProperties: true, description: typeName };
    seen.add(type);
    const properties = checker.getPropertiesOfType(type).filter((property) => !property.getName().startsWith('__'));
    if (properties.length === 0 || properties.length > 35) {
      return { type: 'object', additionalProperties: true, description: typeName };
    }

    const objectProperties = {};
    const required = [];
    for (const property of properties) {
      const declaration = property.valueDeclaration ?? property.declarations?.[0] ?? sourceFile;
      const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
      objectProperties[property.getName()] = schemaForType(propertyType, depth + 1, new Set(seen));
      if (!(property.flags & ts.SymbolFlags.Optional)) required.push(property.getName());
    }
    return {
      type: 'object',
      properties: objectProperties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
      description: typeName,
    };
  }

  return { description: typeName };
}

function parameterName(symbol, declaration, index) {
  if (ts.isParameter(declaration) && ts.isBindingPattern(declaration.name)) return 'options';
  const name = symbol.getName();
  return name.startsWith('__') ? `argument${index + 1}` : name;
}

const signatures = {};
function visit(node) {
  if (ts.isPropertySignature(node) && node.name && methodSet.has(node.name.getText(sourceFile))) {
    const method = node.name.getText(sourceFile);
    const callableType = checker.getTypeAtLocation(node.type);
    const signature = callableType.getCallSignatures()[0];
    if (!signature) throw new Error(`No call signature found for ${method}`);
    signatures[method] = signature.getParameters().map((symbol, index) => {
      const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? node;
      const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
      const isRest = Boolean(declaration.dotDotDotToken);
      return {
        name: parameterName(symbol, declaration, index),
        required: !isRest && !(symbol.flags & ts.SymbolFlags.Optional),
        rest: isRest,
        schema: schemaForType(type),
      };
    });
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);

const missing = methods.filter((method) => !signatures[method]);
if (missing.length) throw new Error(`Missing signatures: ${missing.join(', ')}`);

const metadata = Object.fromEntries(
  methods.map((method) => [method, { group: groupByMethod[method], parameters: signatures[method] }]),
);
const generated =
  `// Generated by scripts/generate-baileys-openapi.mjs. Do not edit manually.\n` +
  `export const BAILEYS_METHOD_METADATA = ${JSON.stringify(metadata, null, 2)} as const;\n`;
const prettierConfig = (await prettier.resolveConfig(generatedPath)) ?? {};
fs.writeFileSync(
  generatedPath,
  await prettier.format(generated, { ...prettierConfig, parser: 'typescript', printWidth: 120, singleQuote: true }),
);

const instanceParameter = {
  name: 'instanceName',
  in: 'path',
  required: true,
  description: 'Connected Evolution API instance name.',
  schema: { type: 'string' },
};
const successResponse = {
  description: 'Baileys method result. Binary values use the $base64 envelope.',
  content: { 'application/json': { schema: {} } },
};
const paths = {
  '/baileys/methods/{instanceName}': {
    get: {
      tags: ['Registry'],
      summary: 'List supported Baileys methods and grouped routes',
      operationId: 'listBaileysMethods',
      parameters: [instanceParameter],
      responses: { 200: successResponse },
    },
  },
};

const localFirstMethods = new Set([
  'communityMetadata',
  'communityFetchLinkedGroups',
  'communityRequestParticipantsList',
  'communityInviteCode',
  'communityGetInviteInfo',
  'communityFetchAllParticipating',
  'getOrderDetails',
  'getCatalog',
  'getCollections',
  'fetchPrivacySettings',
  'newsletterSubscribers',
  'newsletterMetadata',
  'newsletterFetchMessages',
  'newsletterAdminCount',
  'groupMetadata',
  'groupRequestParticipantsList',
  'groupInviteCode',
  'groupGetInviteInfo',
  'groupFetchAllParticipating',
  'getBotListV2',
  'fetchBlocklist',
  'fetchStatus',
  'fetchDisappearingDuration',
  'getBusinessProfile',
  'fetchAccountReachoutTimelock',
  'fetchNewChatMessageCap',
]);

const webhookEndpointSchema = {
  type: 'object',
  required: ['enabled', 'url'],
  properties: {
    enabled: { type: 'boolean', description: 'Whether this destination receives events.' },
    url: { type: 'string', format: 'uri', description: 'HTTPS or HTTP destination URL.' },
    events: {
      type: 'array',
      description: 'Events to deliver. Omit or pass an empty array to enable every supported event.',
      items: {
        type: 'string',
        enum: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'MESSAGES_SET',
          'MESSAGES_UPSERT',
          'MESSAGES_EDITED',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'MESSAGES_MEDIA_UPDATE',
          'MESSAGES_REACTION',
          'MESSAGE_RECEIPT_UPDATE',
          'SEND_MESSAGE',
          'SEND_MESSAGE_UPDATE',
          'CONTACTS_SET',
          'CONTACTS_UPSERT',
          'CONTACTS_UPDATE',
          'PRESENCE_UPDATE',
          'CHATS_SET',
          'CHATS_UPSERT',
          'CHATS_UPDATE',
          'CHATS_DELETE',
          'CHATS_LOCK',
          'GROUPS_UPSERT',
          'GROUPS_UPDATE',
          'GROUP_PARTICIPANTS_UPDATE',
          'GROUP_JOIN_REQUEST',
          'GROUP_MEMBER_TAG_UPDATE',
          'CONNECTION_UPDATE',
          'CREDS_UPDATE',
          'MESSAGING_HISTORY_SET',
          'MESSAGING_HISTORY_STATUS',
          'LID_MAPPING_UPDATE',
          'BLOCKLIST_SET',
          'BLOCKLIST_UPDATE',
          'NEWSLETTER_REACTION',
          'NEWSLETTER_VIEW',
          'NEWSLETTER_PARTICIPANTS_UPDATE',
          'NEWSLETTER_SETTINGS_UPDATE',
          'MESSAGE_CAPPING_UPDATE',
          'SETTINGS_UPDATE',
          'LABELS_EDIT',
          'LABELS_ASSOCIATION',
          'CALL',
          'TYPEBOT_START',
          'TYPEBOT_CHANGE_STATUS',
          'REMOVE_INSTANCE',
          'LOGOUT_INSTANCE',
          'INSTANCE_CREATE',
          'INSTANCE_DELETE',
          'STATUS_INSTANCE',
        ],
      },
    },
    headers: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description: 'Headers sent to this destination.',
    },
    byEvents: { type: 'boolean', description: 'Append the kebab-case event name to the URL.' },
    base64: { type: 'boolean', description: 'Preserve base64 media payloads when supported by the event.' },
  },
  additionalProperties: false,
};

paths['/webhook/set-many/{instanceName}'] = {
  post: {
    tags: ['Webhooks'],
    summary: 'Replace an instance webhook destination list',
    description:
      'Atomically replaces all local webhook destinations for an instance. The legacy /webhook/set route remains available for one destination.',
    operationId: 'setManyWebhooks',
    parameters: [instanceParameter],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['webhooks'],
            properties: { webhooks: { type: 'array', minItems: 1, items: webhookEndpointSchema } },
            additionalProperties: false,
          },
        },
      },
    },
    responses: {
      201: { description: 'Saved webhook destinations.' },
      400: { description: 'Invalid destination configuration.' },
    },
  },
};

paths['/webhook/find-all/{instanceName}'] = {
  get: {
    tags: ['Webhooks'],
    summary: 'List an instance webhook destinations',
    operationId: 'listWebhooks',
    parameters: [instanceParameter],
    responses: { 200: { description: 'Webhook destinations.' } },
  },
};

for (const [method, definition] of Object.entries(metadata)) {
  paths[`/baileys/${definition.group}/${method}/{instanceName}`] = {
    post: {
      tags: [groupLabels[definition.group][0]],
      summary: readableName(method),
      description: `${describeMethod(method)} Complete the named fields below. Structured fields accept JSON. JSON request bodies remain supported for API clients.`,
      operationId: `baileys_${method}`,
      parameters: [
        instanceParameter,
        ...(localFirstMethods.has(method)
          ? [
              {
                name: 'live',
                in: 'query',
                required: false,
                description: 'Bypass the local snapshot and query WhatsApp now.',
                schema: { type: 'boolean', default: false },
              },
            ]
          : []),
        ...definition.parameters.map((parameter) => ({
          name: parameter.name,
          in: 'query',
          required: parameter.required,
          description: describeParameter(method, parameter),
          schema: guidedQuerySchema(parameter.schema),
          ...(parameter.schema.type === 'array' ? { style: 'form', explode: true } : {}),
        })),
      ],
      responses: { 200: successResponse, 400: { description: 'Invalid method parameters.' } },
    },
  };
}

const archiveContract = YAML.parse(fs.readFileSync(archiveOpenApiPath, 'utf8'));

const document = {
  openapi: '3.1.0',
  info: {
    title: 'Evolution API – Baileys 7',
    version: '4.0.0-baileys-7.0.0-rc14',
    description:
      'Typed, grouped HTTP routes for the Baileys WASocket API. Named request fields are generated from the installed Baileys TypeScript declarations. Before using Try it out, click Authorize and enter the Evolution API global API key; Swagger sends it in the apikey header.',
  },
  servers: [{ url: '/', description: 'Current Evolution API server' }],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: 'Registry', description: 'Runtime method discovery.' },
    { name: 'Webhooks', description: 'Instance event delivery configuration, including multiple destinations.' },
    ...archiveContract.tags,
    ...Object.values(groupLabels).map(([name, description]) => ({ name, description })),
  ],
  paths: { ...paths, ...archiveContract.paths },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'apikey',
        description: 'Enter the Evolution API global API key configured as AUTHENTICATION_API_KEY.',
      },
    },
    schemas: {
      BinaryValue: {
        oneOf: [
          { type: 'string', description: 'A normal string when the Baileys type permits it.' },
          {
            type: 'object',
            properties: { $base64: { type: 'string', format: 'byte' } },
            required: ['$base64'],
            additionalProperties: false,
          },
        ],
      },
    },
    ...archiveContract.components,
  },
};

fs.writeFileSync(openApiPath, YAML.stringify(document, { lineWidth: 0 }));
console.log(`Generated ${methods.length} typed Baileys operations.`);
