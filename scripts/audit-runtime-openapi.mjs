import fs from 'node:fs';
import YAML from 'yaml';
const routes = JSON.parse(fs.readFileSync('docs/runtime-routes.json', 'utf8'));
const base = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'), { maxAliasCount: -1 });
const paths = structuredClone(base.paths ?? {});
for (const route of routes) {
  paths[route.path] ??= {};
  paths[route.path][route.method] ??= route.operation;
}
const missing = routes.filter(({ method, path }) => !paths[path]?.[method]);
if (missing.length) throw new Error(`Merged OpenAPI is missing ${missing.length} runtime operations.`);
const bad = [];
for (const route of routes) {
  const operation = paths[route.path][route.method];
  const generated = !base.paths?.[route.path]?.[route.method];
  for (const field of ['tags', 'summary', 'responses'])
    if (!operation[field] || (Array.isArray(operation[field]) && !operation[field].length))
      bad.push(`${route.method} ${route.path}: ${field}`);
  if (!generated) continue;
  for (const field of ['description', 'operationId'])
    if (!operation[field]) bad.push(`${route.method} ${route.path}: ${field}`);
  for (const name of [...route.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]))
    if (
      !(operation.parameters ?? []).some(
        (parameter) => parameter.name === name && parameter.in === 'path' && parameter.required === true,
      )
    )
      bad.push(`${route.method} ${route.path}: path parameter ${name}`);
  if (['post', 'put', 'patch'].includes(route.method) && !operation.requestBody)
    bad.push(`${route.method} ${route.path}: requestBody`);
}
const generatedIds = routes
  .filter((route) => !base.paths?.[route.path]?.[route.method])
  .map((route) => paths[route.path][route.method].operationId);
const duplicateIds = generatedIds.filter((id, index) => generatedIds.indexOf(id) !== index);
if (duplicateIds.length) bad.push(`duplicate operationIds: ${[...new Set(duplicateIds)].join(', ')}`);
if (bad.length) throw new Error(`Runtime OpenAPI convention failures (${bad.length}):\n${bad.join('\n')}`);
console.log(`Audited ${routes.length} runtime operations and presentation conventions successfully.`);
