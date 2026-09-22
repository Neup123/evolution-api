import fs from 'node:fs';
import YAML from 'yaml';
const routes = JSON.parse(fs.readFileSync('docs/runtime-routes.json', 'utf8'));
const base = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'), { maxAliasCount: -1 });
const paths = structuredClone(base.paths ?? {});
for (const route of routes) {
  paths[route.path] ??= {};
  const existing = paths[route.path][route.method] ?? {};
  paths[route.path][route.method] = {
    ...route.operation,
    ...existing,
    parameters: route.operation.parameters,
    ...(route.operation.requestBody ? { requestBody: route.operation.requestBody } : {}),
    responses: route.operation.responses,
  };
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

const exactRoutes = routes.filter(
  (item) => item.schema && !(item.method === 'get' && item.schemaName === 'instanceSchema'),
);
const contractFailures = [];
for (const route of exactRoutes) {
  const operation = paths[route.path][route.method];
  const documented =
    route.method === 'get'
      ? Object.fromEntries(
          (operation.parameters ?? [])
            .filter((parameter) => parameter.in === 'query')
            .map((parameter) => [parameter.name, parameter.schema]),
        )
      : (Object.values(operation.requestBody?.content ?? {})[0]?.schema?.properties ?? {});
  const expected = route.schema.properties ?? {};
  for (const key of Object.keys(expected))
    if (!documented[key]) contractFailures.push(`${route.method} ${route.path}: missing validator field ${key}`);
  const unexpected = Object.keys(documented).filter((key) => key !== 'file' && !(key in expected));
  for (const key of unexpected)
    contractFailures.push(`${route.method} ${route.path}: undocumented runtime field ${key}`);
  const required =
    route.method === 'get'
      ? (operation.parameters ?? [])
          .filter((parameter) => parameter.in === 'query' && parameter.required)
          .map((parameter) => parameter.name)
      : (Object.values(operation.requestBody?.content ?? {})[0]?.schema?.required ?? []);
  for (const key of route.schema.required ?? [])
    if (!required.includes(key)) contractFailures.push(`${route.method} ${route.path}: missing required field ${key}`);
  for (const key of required)
    if (!(route.schema.required ?? []).includes(key) && key !== 'file')
      contractFailures.push(`${route.method} ${route.path}: incorrectly required field ${key}`);
}
for (const route of routes) {
  const operation = paths[route.path][route.method];
  if (['post', 'put', 'patch'].includes(route.method) && !operation.requestBody)
    contractFailures.push(`${route.method} ${route.path}: missing exact request body`);
  if (route.schema && route.method !== 'get' && !route.multipart) {
    const content = operation.requestBody?.content ?? {};
    if (!content['application/x-www-form-urlencoded']?.schema)
      contractFailures.push(`${route.method} ${route.path}: missing guided form body`);
    if (!content['application/json']?.schema)
      contractFailures.push(`${route.method} ${route.path}: missing raw JSON fallback`);
  }
  for (const code of ['400', '401', '404', '422', '429', '500'])
    if (!operation.responses?.[code]?.content)
      contractFailures.push(`${route.method} ${route.path}: missing ${code} error schema/example`);
  const success = Object.entries(operation.responses ?? {}).find(([code]) => code.startsWith('2'))?.[1];
  if (!success?.content) contractFailures.push(`${route.method} ${route.path}: missing success schema/example`);
}
if (contractFailures.length)
  throw new Error(`Runtime contract failures (${contractFailures.length}):\n${contractFailures.join('\n')}`);
console.log(
  `Audited exact validator fields for ${exactRoutes.length} runtime operations and response/error contracts for ${routes.length}.`,
);
