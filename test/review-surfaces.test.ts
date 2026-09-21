import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync('manager/dist/index.html', 'utf8');
const asset = html.match(/src="([^"]+\.js)"/)?.[1];
assert(asset, 'Manager JavaScript asset is referenced');
const js = fs.readFileSync(`manager/dist${asset.startsWith('/') ? asset : `/${asset}`}`, 'utf8');
for (const text of ['Settings templates', 'New template', 'Automation safety & pacing'])
  assert(js.includes(text), `embedded Manager contains ${text}`);
const routes = JSON.parse(fs.readFileSync('docs/runtime-routes.json', 'utf8'));
assert.equal(routes.length, 202);
const sendText = routes.find((route: any) => route.path === '/message/sendText/{instanceName}');
assert.deepEqual(Object.keys(sendText.operation.requestBody.content['application/json'].schema.properties), [
  'number',
  'settingsTemplateId',
  'text',
  'linkPreview',
  'delay',
  'quoted',
  'everyOne',
  'mentioned',
]);
assert(
  sendText.operation.responses['201'].content['application/json'].schema,
  'sendText has a documented success envelope',
);
console.log('review surface regression tests passed');
