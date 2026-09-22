const string = { type: 'string' };
const integer = { type: 'integer' };
const boolean = { type: 'boolean' };
const params = (properties, required = []) =>
  Object.entries(properties).map(([name, schema]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema,
  }));
const bodySchema = (properties, required = []) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const body = (properties, required = []) => ({
  required: true,
  description: 'Use the guided form fields, or select application/json for the raw JSON editor.',
  content: {
    'application/x-www-form-urlencoded': { schema: bodySchema(properties, required) },
    'application/json': { schema: bodySchema(properties, required) },
  },
});
const limit = { ...integer, minimum: 1, maximum: 1000 };
const eventsQuery = {
  limit,
  entityJid: string,
  groupJid: string,
  entityType: string,
  eventType: string,
  from: { ...string, format: 'date-time' },
  before: { ...string, format: 'date-time' },
};
const archiveHeader = {
  name: 'x-archive-key',
  in: 'header',
  required: true,
  schema: string,
  description: 'Archive authorization key with the scope required by this operation.',
};
const withArchiveHeader = (operation) => ({
  ...operation,
  parameters: [archiveHeader, ...(operation.parameters ?? [])],
});
export const overrides = {
  'get /archive/status': { parameters: params({ instanceName: string }) },
  'get /archive/events/{instanceName}': { parameters: params({ ...eventsQuery, includePayload: boolean }) },
  ...Object.fromEntries(
    ['messages', 'contacts', 'chats', 'groups'].map((x) => [
      `get /archive/${x}/{instanceName}`,
      { parameters: params(eventsQuery) },
    ]),
  ),
  'get /archive/media/{instanceName}': {
    parameters: params({ limit, entityJid: string, groupJid: string, mediaType: string, state: string }),
  },
  'get /archive/messages/{instanceName}/{messageId}/revisions': {
    parameters: params({ chatJid: string }, ['chatJid']),
  },
  'get /archive/receipts/{instanceName}': { parameters: params({ limit, messageId: string, entityJid: string }) },
  'get /archive/reactions/{instanceName}': { parameters: params({ limit, messageId: string, entityJid: string }) },
  'get /archive/memberships/{instanceName}': {
    parameters: params({ limit, groupJid: string, participantJid: string }),
  },
  'get /archive/calls/{instanceName}': { parameters: params({ limit, peerJid: string, groupJid: string }) },
  'get /archive/sync-gaps/{instanceName}': { parameters: params({ limit, status: string, entityJid: string }) },
  'put /archive/policies': {
    requestBody: body(
      {
        id: string,
        scope: { type: 'string', enum: ['general', 'entity', 'account', 'jid'] },
        selector: { type: 'object', additionalProperties: true },
        policy: { type: 'object', additionalProperties: true },
        effectiveAt: { ...string, format: 'date-time' },
      },
      ['scope', 'policy'],
    ),
  },
  'post /archive/verify/{instanceName}': { requestBody: body({}) },
  'post /archive/backfill/{instanceName}': {
    requestBody: body({ limit: { ...integer, minimum: 1, maximum: 100000 } }),
  },
  'post /archive/purges/preview/{instanceName}': {
    requestBody: body({
      before: { ...string, format: 'date-time' },
      entityJid: string,
      groupJid: string,
      eventTypes: { type: 'array', items: string },
      mediaOnly: boolean,
    }),
  },
  'post /archive/purges/confirm': {
    requestBody: body({ previewId: string, confirmationToken: string }, ['previewId', 'confirmationToken']),
  },
  'get /settings/outbound-audit/{instanceName}': {
    parameters: params({ limit: { ...integer, minimum: 1 }, recipient: string, status: string }),
  },
  'post /chat/getBase64FromMediaMessage/{instanceName}': {
    requestBody: body(
      {
        message: { type: 'object', additionalProperties: true, description: 'Baileys WebMessageInfo object.' },
        convertToMp4: boolean,
      },
      ['message'],
    ),
  },
  'delete /chat/deleteMessageForEveryone/{instanceName}': {
    summary: 'Delete message with maximum permitted scope',
    description:
      'Automatically deletes for everyone when WhatsApp permits it and otherwise deletes for the connected account. The response identifies the applied EVERYONE or ME scope.',
  },
  'get /chat/findChatByRemoteJid/{instanceName}': { parameters: params({ remoteJid: string }, ['remoteJid']) },
  'post /instance/restart/{instanceName}': { requestBody: body({}) },
  'get /instance/connect/{instanceName}': { parameters: params({ number: string }) },
};
export const applyOverride = (route, operation) => {
  let x = overrides[`${route.method} ${route.path}`];
  if (route.path.startsWith('/archive/')) x = withArchiveHeader(x ?? {});
  return Object.keys(x ?? {}).length
    ? { ...operation, ...x, parameters: [...(operation.parameters ?? []), ...(x.parameters ?? [])] }
    : operation;
};
