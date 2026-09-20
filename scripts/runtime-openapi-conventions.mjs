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

const templateSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    localReadTtlSeconds: { type: ['integer', 'null'], minimum: 0, maximum: 2592000 },
    localReadTtlOverrides: {
      type: ['object', 'null'],
      additionalProperties: { type: 'integer', minimum: 0, maximum: 2592000 },
    },
    automationSafety: { type: ['object', 'null'], additionalProperties: true },
  },
};
const templateBody = (action) => {
  const schemas = {
    create: {
      required: ['name', 'settings'],
      properties: { name: { type: 'string', minLength: 1, maxLength: 255 }, settings: templateSettingsSchema },
    },
    edit: {
      required: ['templateId'],
      properties: {
        templateId: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        settings: templateSettingsSchema,
      },
    },
    duplicate: {
      required: ['templateId', 'name'],
      properties: {
        templateId: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 255 },
      },
    },
    delete: { required: ['templateId'], properties: { templateId: { type: 'string', minLength: 1 } } },
    assign: {
      required: ['templateId', 'scope'],
      properties: {
        templateId: { type: 'string', minLength: 1 },
        scope: { type: 'string', enum: ['instance', 'group', 'contact'] },
        target: {
          type: 'string',
          minLength: 3,
          maxLength: 255,
          description:
            'Omit for instance scope. Group targets end in @g.us; contact targets are full non-group WhatsApp identifiers.',
        },
      },
    },
    unassign: {
      required: ['scope'],
      properties: {
        scope: { type: 'string', enum: ['instance', 'group', 'contact'] },
        target: { type: 'string', minLength: 3, maxLength: 255 },
      },
    },
  };
  return schemas[action] ? { type: 'object', additionalProperties: false, ...schemas[action] } : null;
};

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
export const runtimeOperation = ({ method, path, source }) => {
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
  const operation = {
    tags: [domainNames[domain] || title(domain)],
    summary,
    description: `${summary} for ${domainNames[domain] || title(domain)}.`,
    operationId: `${method}_${[domain, ...segments.slice(1).filter((x) => !x.startsWith('{'))].join('_').replace(/[^A-Za-z0-9_]/g, '_')}`,
    parameters: params,
    responses: {
      '200': { description: 'Successful response.' },
      '400': { description: 'Invalid request.' },
      '401': { description: 'Missing or invalid API key.' },
      '404': { description: 'Instance or resource not found.' },
    },
  };
  if (method === 'post' && /create|duplicate/i.test(action)) {
    operation.responses = {
      '201': operation.responses['200'],
      ...Object.fromEntries(Object.entries(operation.responses).filter(([k]) => k !== '200')),
    };
  }
  if (bodyMethods.has(method))
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema: { type: 'object', additionalProperties: true }, example: {} } },
    };
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
    const schema = templateBody(action);
    if (schema)
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema,
            example:
              action === 'create'
                ? {
                    name: 'Careful outreach',
                    settings: { localReadTtlSeconds: 120, automationSafety: { enabled: true } },
                  }
                : undefined,
          },
        },
      };
    operation.responses = {
      ...(operation.responses['201']
        ? { '201': { description: 'Settings template created.' } }
        : {
            '200': {
              description:
                action === 'list'
                  ? 'Settings template list.'
                  : action === 'bindings'
                    ? 'Template binding list.'
                    : 'Settings template operation completed.',
            },
          }),
      '400': { description: 'Invalid template, scope, or target.' },
      '401': { description: 'Missing or invalid API key.' },
      '404': { description: 'Instance or settings template not found.' },
    };
  }
  operation['x-source'] = source;
  return operation;
};
export const runtimeTags = [...new Set(Object.values(domainNames))].map((name) => ({
  name,
  description: `${name} operations.`,
}));
