import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
const app = express();
const base = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'), { maxAliasCount: -1 });
const runtime = JSON.parse(fs.readFileSync('docs/runtime-routes.json', 'utf8'));
for (const route of runtime) {
  base.paths[route.path] ??= {};
  const existing = base.paths[route.path][route.method] ?? {};
  base.paths[route.path][route.method] = {
    ...route.operation,
    ...existing,
    parameters: route.operation.parameters,
    ...(route.operation.requestBody ? { requestBody: route.operation.requestBody } : {}),
    responses: route.operation.responses,
  };
}
app.get('/docs/openapi.json', (_q, r) => r.json(base));
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(base, {
    customSiteTitle: 'Evolution API - Swagger',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  }),
);
const manager = path.resolve('manager/dist');
app.use('/assets', express.static(path.join(manager, 'assets')));
app.use('/manager', express.static(manager));
app.get('/manager/*', (_q, r) => r.sendFile(path.join(manager, 'index.html')));
app.listen(4174, '0.0.0.0', () => console.log('review surfaces at :4174'));
