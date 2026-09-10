import fs from 'node:fs';

import YAML from 'yaml';

const generated = fs.readFileSync('src/api/integrations/channel/whatsapp/baileys.generated.ts', 'utf8');
const methods = [...generated.matchAll(/^  (\w+): \{$/gm)].map((match) => match[1]);
const openapi = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'), { maxAliasCount: -1 });
const failures = [];

for (const method of methods) {
  const route = Object.entries(openapi.paths).find(([path]) => path.includes(`/${method}/{instanceName}`));
  if (!route) {
    failures.push(`${method}: OpenAPI route missing`);
    continue;
  }
  const operation = route[1].post;
  if (!operation.description || /^Run (the )?/i.test(operation.description)) failures.push(`${method}: weak description`);
  const resultSchema = operation.responses?.[200]?.content?.['application/json']?.schema?.properties?.result;
  if (!resultSchema || Object.keys(resultSchema).length === 0) failures.push(`${method}: response schema missing`);
  const group = route[0].split('/')[2];
  const guide = fs.readFileSync(`docs/baileys/${group}.md`, 'utf8');
  if (!guide.includes(`(\`${method}\`)`)) failures.push(`${method}: generated guide section missing`);
}

const privacy = openapi.paths['/baileys/messages/fetchPrivacySettings/{instanceName}'].post;
const force = privacy.parameters.find((parameter) => parameter.name === 'force');
if (!force || force.required) failures.push('fetchPrivacySettings.force must be optional');
const groups = openapi.paths['/baileys/groups/groupFetchAllParticipating/{instanceName}'].post;
if (!groups.parameters.some((parameter) => parameter.name === 'includeParticipants' && !parameter.required)) {
  failures.push('groupFetchAllParticipating.includeParticipants must be optional');
}

if (failures.length) throw new Error(`Baileys contract audit failed:\n${failures.join('\n')}`);
console.log(`Audited ${methods.length} Baileys request/response documentation sections successfully.`);
