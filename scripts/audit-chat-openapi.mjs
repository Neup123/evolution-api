import fs from 'node:fs';
const routes = JSON.parse(fs.readFileSync('docs/runtime-routes.json', 'utf8'));
const chat = routes.filter((route) => route.path.startsWith('/chat/'));
const failures = [];
for (const route of chat) {
  const operation = route.operation;
  if (!operation.operationId || !operation.summary) failures.push(`${route.method} ${route.path}: missing identity`);
  if (['post', 'put', 'patch'].includes(route.method) && !operation.requestBody)
    failures.push(`${route.method} ${route.path}: missing body`);
  if (route.schema && route.method !== 'get') {
    const documented = Object.values(operation.requestBody?.content ?? {})[0]?.schema?.properties ?? {};
    for (const key of Object.keys(route.schema.properties ?? {}))
      if (!documented[key]) failures.push(`${route.method} ${route.path}: missing ${key}`);
  }
  const success = Object.keys(operation.responses ?? {}).find((code) => code.startsWith('2'));
  if (!success) failures.push(`${route.method} ${route.path}: missing success response`);
}
if (failures.length) throw new Error(`Chat OpenAPI failures (${failures.length}):\n${failures.join('\n')}`);
console.log(`Audited ${chat.length} chat operations against runtime schemas successfully.`);
