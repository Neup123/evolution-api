const domainNames = {
  instance: 'Instances',
  settings: 'Instance settings',
  'settings-template': 'Settings templates',
  message: 'Messages',
  call: 'Calls',
  chat: 'Chats',
  group: 'Groups',
  business: 'Business & catalog',
  template: 'WhatsApp templates',
  proxy: 'Proxy',
  label: 'Labels',
  webhook: 'Webhooks',
  websocket: 'WebSocket',
  rabbitmq: 'RabbitMQ',
  nats: 'NATS',
  pusher: 'Pusher',
  sqs: 'SQS',
  kafka: 'Kafka',
  s3: 'S3',
  chatwoot: 'Chatwoot',
  typebot: 'Typebot',
  openai: 'OpenAI',
  dify: 'Dify',
  flowise: 'Flowise',
  n8n: 'n8n',
  evoai: 'EvoAI',
  evolutionBot: 'Evolution Bot',
  instanceapikey: 'Instance API key',
  root: 'Evolution API',
};
const words = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim();
const title = (value) => words(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
const guidedBodyContent = (schema) => ({
  'application/x-www-form-urlencoded': {
    schema,
  },
  'application/json': {
    schema,
  },
});

const actionVerb = (method, action) => {
  if (/^(find|fetch|get|list|connection)/i.test(action)) return 'Get';
  if (/^(delete|remove|logout|leave|revoke)/i.test(action)) return 'Delete';
  if (/^(create|send|offer)/i.test(action)) return 'Create';
  if (/^(set|update|handle|change|toggle|restart|archive|mark|accept|connect|ignore)/i.test(action)) return 'Update';
  return method === 'get'
    ? 'Get'
    : method === 'delete'
      ? 'Delete'
      : method === 'put' || method === 'patch'
        ? 'Update'
        : 'Run';
};
export const runtimeOperation = ({ method, path, source, schemaName, schema, multipart, runtimeStatus }) => {
  const segments = path.split('/').filter(Boolean);
  const domain = segments[0] || 'root';
  const action = segments.find((s, i) => i > 0 && !s.startsWith('{')) || domain;
  const params = [...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    description: name === 'instanceName' ? 'Evolution API instance name.' : `${title(name)} path parameter.`,
    schema: { type: 'string' },
  }));
  const bodyMethods = new Set(['post', 'put', 'patch']);
  const summary = `${actionVerb(method, action)} ${words(action)}`;
  const successCode =
    { OK: '200', CREATED: '201', NO_CONTENT: '204' }[runtimeStatus] ??
    (/^2\d\d$/.test(runtimeStatus ?? '') ? runtimeStatus : '200');
  const errorSchema = {
    type: 'object',
    additionalProperties: true,
    properties: {
      status: { type: 'integer' },
      error: { type: 'string' },
      message: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    },
  };
  const operation = {
    tags: [domainNames[domain] || title(domain)],
    summary,
    description: `${summary} for ${domainNames[domain] || title(domain)}.`,
    operationId: `${method}_${[domain, ...segments.slice(1).filter((x) => !x.startsWith('{'))].join('_').replace(/[^A-Za-z0-9_]/g, '_')}`,
    parameters: params,
    responses: {
      [successCode]: {
        description:
          successCode === '201'
            ? 'Resource created. See the domain documentation for the operation-specific response fields.'
            : 'Successful response. See the domain documentation for the operation-specific response fields.',
        content: {
          'application/json': {
            schema: {
              oneOf: [
                { type: 'object', additionalProperties: true },
                { type: 'array', items: { type: 'object', additionalProperties: true } },
                { type: 'string' },
              ],
            },
          },
        },
      },
      '400': {
        description: 'Invalid request.',
        content: {
          'application/json': {
            schema: errorSchema,
            example: { status: 400, error: 'Bad Request', message: 'Invalid request.' },
          },
        },
      },
      '401': {
        description: 'Missing or invalid API key.',
        content: {
          'application/json': {
            schema: errorSchema,
            example: { status: 401, error: 'Unauthorized', message: 'Missing or invalid API key.' },
          },
        },
      },
      '404': {
        description: 'Instance or resource not found.',
        content: {
          'application/json': {
            schema: errorSchema,
            example: { status: 404, error: 'Not Found', message: 'Resource not found.' },
          },
        },
      },
      '422': {
        description: 'Request validation failed.',
        content: {
          'application/json': {
            schema: errorSchema,
            example: { status: 422, error: 'Unprocessable Entity', message: ['A required field is missing.'] },
          },
        },
      },
      '429': {
        description: 'Request rate limit exceeded.',
        content: {
          'application/json': {
            schema: errorSchema,
            example: { status: 429, error: 'Too Many Requests', message: 'Request rate limit exceeded.' },
          },
        },
      },
      '500': {
        description: 'Unexpected server error.',
        content: {
          'application/json': {
            schema: errorSchema,
            example: { status: 500, error: 'Internal Server Error', message: 'Unexpected server error.' },
          },
        },
      },
    },
  };
  if (schema && method === 'get' && schemaName !== 'instanceSchema') {
    operation.parameters.push(
      ...Object.entries(schema.properties ?? {}).map(([name, property]) => ({
        name,
        in: 'query',
        required: (schema.required ?? []).includes(name),
        schema: property,
      })),
    );
  } else if (schema && (bodyMethods.has(method) || method === 'delete')) {
    const contentType = multipart ? 'multipart/form-data' : 'application/json';
    const requestSchema = multipart
      ? { ...schema, properties: { ...(schema.properties ?? {}), file: { type: 'string', format: 'binary' } } }
      : schema;
    operation.requestBody = {
      required: true,
      description:
        contentType === 'application/json'
          ? 'Use the guided form fields, or select application/json for the raw JSON editor.'
          : undefined,
      content:
        contentType === 'application/json'
          ? guidedBodyContent(requestSchema)
          : { [contentType]: { schema: requestSchema } },
    };
  } else if (bodyMethods.has(method) && path === '/webhook/evolution') {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['numberId'],
            properties: { numberId: { type: 'string' } },
            additionalProperties: true,
          },
          example: { numberId: '15551234567', event: 'messages.upsert', data: {} },
        },
      },
    };
  } else if (bodyMethods.has(method) && path === '/webhook/meta') {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['object', 'entry'],
            properties: {
              object: { type: 'string', enum: ['whatsapp_business_account'] },
              entry: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
            additionalProperties: true,
          },
          example: { object: 'whatsapp_business_account', entry: [] },
        },
      },
    };
  }
  if (schemaName) operation['x-validation-schema'] = schemaName;
  if (domain === 'settings-template') {
    const templateSummaries = {
      assign: 'Assign a settings template',
      bindings: 'List template bindings',
      create: 'Create a settings template',
      delete: 'Delete a settings template',
      duplicate: 'Duplicate a settings template',
      edit: 'Edit a settings template',
      list: 'List settings templates',
      unassign: 'Unassign a settings template',
    };
    operation.summary = templateSummaries[action];
    operation.description =
      action === 'list'
        ? 'List live shared settings templates.'
        : action === 'bindings'
          ? 'List the instance default and exact group/contact bindings.'
          : `${summary}. Template edits propagate to every binding without copying settings.`;
  }
  operation['x-source'] = source;
  return operation;
};
export const runtimeTags = [...new Set(Object.values(domainNames))].map((name) => ({
  name,
  description: `${name} operations.`,
}));
