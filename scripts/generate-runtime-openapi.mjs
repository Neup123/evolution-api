import fs from 'node:fs';

const routerPrefixes = {
  'src/api/routes/instance.router.ts': '/instance',
  'src/api/routes/archive.router.ts': '/archive',
  'src/api/routes/sendMessage.router.ts': '/message',
  'src/api/routes/call.router.ts': '/call',
  'src/api/routes/chat.router.ts': '/chat',
  'src/api/routes/business.router.ts': '/business',
  'src/api/routes/group.router.ts': '/group',
  'src/api/routes/template.router.ts': '/template',
  'src/api/routes/settings.router.ts': '/settings',
  'src/api/routes/proxy.router.ts': '/proxy',
  'src/api/routes/label.router.ts': '/label',
  'src/api/integrations/event/webhook/webhook.router.ts': '/webhook',
  'src/api/integrations/event/websocket/websocket.router.ts': '/websocket',
  'src/api/integrations/event/rabbitmq/rabbitmq.router.ts': '/rabbitmq',
  'src/api/integrations/event/nats/nats.router.ts': '/nats',
  'src/api/integrations/event/pusher/pusher.router.ts': '/pusher',
  'src/api/integrations/event/sqs/sqs.router.ts': '/sqs',
  'src/api/integrations/event/kafka/kafka.router.ts': '/kafka',
  'src/api/integrations/storage/s3/routes/s3.router.ts': '/s3',
  'src/api/integrations/chatbot/chatwoot/routes/chatwoot.router.ts': '/chatwoot',
  'src/api/integrations/chatbot/typebot/routes/typebot.router.ts': '/typebot',
  'src/api/integrations/chatbot/openai/routes/openai.router.ts': '/openai',
  'src/api/integrations/chatbot/dify/routes/dify.router.ts': '/dify',
  'src/api/integrations/chatbot/flowise/routes/flowise.router.ts': '/flowise',
  'src/api/integrations/chatbot/n8n/routes/n8n.router.ts': '/n8n',
  'src/api/integrations/chatbot/evoai/routes/evoai.router.ts': '/evoai',
  'src/api/integrations/chatbot/evolutionBot/routes/evolutionBot.router.ts': '/evolutionBot',
  'src/api/integrations/channel/meta/meta.router.ts': '',
  'src/api/integrations/channel/evolution/evolution.router.ts': '',
};

const openApiPath = (value) => value.replace(/:([A-Za-z0-9_]+)/g, '{$1}').replace(/\/+/g, '/');
const operations = [];
for (const [file, prefix] of Object.entries(routerPrefixes)) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  const brokerRoute = /\.(get|post|put|patch|delete)\(this\.routerPath\('([^']+)'(?:,\s*(false))?\)/g;
  while ((match = brokerRoute.exec(source))) {
    const suffix = match[3] ? '' : '/{instanceName}';
    operations.push({ method: match[1], path: openApiPath(`${prefix}/${match[2]}${suffix}`), source: file });
  }
  const directRoute = /\.(get|post|put|patch|delete)\(\s*['`]([^'`]+)['`]/g;
  while ((match = directRoute.exec(source))) {
    operations.push({ method: match[1], path: openApiPath(`${prefix}${match[2]}`), source: file });
  }
}
const unique = [...new Map(operations.map((item) => [`${item.method} ${item.path}`, item])).values()].sort(
  (left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method),
);
const output = `${JSON.stringify(unique, null, 2)}\n`;
const target = 'docs/runtime-routes.json';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) {
    throw new Error(`${target} is stale. Run npm run generate:runtime-openapi.`);
  }
} else {
  fs.writeFileSync(target, output);
  console.log(`Generated ${unique.length} runtime route operations.`);
}
