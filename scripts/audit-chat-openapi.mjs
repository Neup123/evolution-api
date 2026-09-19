import fs from 'node:fs';

import YAML from 'yaml';

const router = fs.readFileSync('src/api/routes/chat.router.ts', 'utf8');
const openapi = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'), { maxAliasCount: -1 });
const routePattern = /\.(get|post|put|patch|delete)\(this\.routerPath\('([^']+)'\)/g;
const operations = [...router.matchAll(routePattern)].map(([, method, route]) => [
  method,
  `/chat/${route}/{instanceName}`,
]);

if (operations.length === 0) throw new Error('No chat routes were found');
for (const [method, route] of operations) {
  if (!openapi.paths?.[route]?.[method]) throw new Error(`OpenAPI is missing ${method.toUpperCase()} ${route}`);
}

console.log(`Audited ${operations.length} chat operations successfully.`);
