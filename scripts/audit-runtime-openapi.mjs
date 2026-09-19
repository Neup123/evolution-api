import fs from 'node:fs';

import YAML from 'yaml';

const routes = JSON.parse(fs.readFileSync('docs/runtime-routes.json', 'utf8'));
const base = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'), { maxAliasCount: -1 });
const paths = structuredClone(base.paths ?? {});
for (const route of routes) {
  paths[route.path] ??= {};
  paths[route.path][route.method] ??= { responses: { default: { description: 'Evolution API response.' } } };
}
const missing = routes.filter(({ method, path }) => !paths[path]?.[method]);
if (missing.length > 0) throw new Error(`Merged OpenAPI is missing ${missing.length} runtime operations.`);
console.log(`Audited ${routes.length} runtime operations successfully.`);
