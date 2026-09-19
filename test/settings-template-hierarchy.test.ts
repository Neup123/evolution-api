import assert from 'node:assert/strict';
import { resolveSettingsTemplate } from '../src/api/services/settings-template-resolution';

async function main() {
  const templates = new Map([
    ['instance', { id: 'instance', settings: { localReadTtlSeconds: 10 } }],
    ['group', { id: 'group', settings: { localReadTtlSeconds: 20 } }],
    ['contact', { id: 'contact', settings: { localReadTtlSeconds: 30 } }],
    ['request', { id: 'request', settings: { localReadTtlSeconds: 40 } }],
  ]);
  const bindings = new Map([
    ['instance:', { Template: templates.get('instance')! }],
    ['group:123@g.us', { Template: templates.get('group')! }],
    ['contact:456@s.whatsapp.net', { Template: templates.get('contact')! }],
  ]);
  const lookup = {
    getTemplate: async (id: string) => templates.get(id) ?? null,
    getBinding: async (scope: 'instance' | 'group' | 'contact', target: string) => bindings.get(`${scope}:${target}`) ?? null,
  };
  assert.equal((await resolveSettingsTemplate(lookup))?.localReadTtlSeconds, 10);
  assert.equal((await resolveSettingsTemplate(lookup, '123@g.us'))?.localReadTtlSeconds, 20);
  assert.equal((await resolveSettingsTemplate(lookup, '456@s.whatsapp.net'))?.localReadTtlSeconds, 30);
  assert.equal((await resolveSettingsTemplate(lookup, '123@g.us', 'request'))?.localReadTtlSeconds, 40);
  assert.equal((await resolveSettingsTemplate(lookup, 'unassigned@s.whatsapp.net'))?.localReadTtlSeconds, 10);
  templates.get('instance')!.settings.localReadTtlSeconds = 11;
  assert.equal((await resolveSettingsTemplate(lookup))?.localReadTtlSeconds, 11);
  console.log('settings template hierarchy tests passed');
}
main().catch((error) => { console.error(error); process.exit(1); });
