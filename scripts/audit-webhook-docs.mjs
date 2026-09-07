import fs from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';

const repoRoot = path.resolve(import.meta.dirname, '..');
const controllerSource = fs.readFileSync(path.join(repoRoot, 'src', 'api', 'integrations', 'event', 'event.controller.ts'), 'utf8');
const enumSource = fs.readFileSync(path.join(repoRoot, 'src', 'api', 'types', 'wa.types.ts'), 'utf8');
const spec = YAML.parse(fs.readFileSync(path.join(repoRoot, 'docs', 'asyncapi.yaml'), 'utf8'));
const html = fs.readFileSync(path.join(repoRoot, 'docs', 'webhooks', 'index.html'), 'utf8');

const configuredBlock = controllerSource.match(/public static readonly events = \[([\s\S]*?)\];/);
if (!configuredBlock) throw new Error('Could not find EventController.events.');

const configuredEvents = [...configuredBlock[1].matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1]);
const wireEvents = new Map([...enumSource.matchAll(/^\s+([A-Z0-9_]+) = '([^']+)'/gm)].map((match) => [match[1], match[2]]));
const documentedEvents = Object.keys(spec.components?.messages ?? {});

const difference = (left, right) => left.filter((value) => !right.includes(value));
const missing = difference(configuredEvents, documentedEvents);
const stale = difference(documentedEvents, configuredEvents);
if (missing.length || stale.length) {
  throw new Error(`Webhook documentation event mismatch. Missing: ${missing.join(', ') || 'none'}. Stale: ${stale.join(', ') || 'none'}.`);
}

for (const eventName of configuredEvents) {
  const wireName = wireEvents.get(eventName);
  if (!wireName) throw new Error(`${eventName} has no Events enum wire value.`);
  const suffix = eventName.toLowerCase().replaceAll('_', '-');
  const channel = spec.channels?.[`/${suffix}`];
  const message = spec.components.messages[eventName];
  if (!channel?.publish) throw new Error(`${eventName} has no /${suffix} publish channel.`);
  if (message?.name !== wireName) throw new Error(`${eventName} documents ${message?.name}, expected ${wireName}.`);
  if (!message?.payload?.$ref) throw new Error(`${eventName} has no payload schema.`);
  if (!message?.examples?.length) throw new Error(`${eventName} has no payload example.`);
  if (!html.includes(wireName)) throw new Error(`Generated HTML does not contain ${wireName}; regenerate docs/webhooks.`);
}

if (!html.includes('Evolution API Webhook Events') || html.length < 100_000) {
  throw new Error('Generated interactive webhook documentation is missing or incomplete.');
}

console.log(`Audited ${configuredEvents.length} webhook event contracts successfully.`);
