import { TemplateSettings } from '@api/dto/settingsTemplate.dto';

export type TemplateBinding = { Template: { settings: unknown } } | null;
export type TemplateLookup = {
  getTemplate: (id: string) => Promise<{ settings: unknown } | null>;
  getBinding: (scope: 'instance' | 'group' | 'contact', target: string) => Promise<TemplateBinding>;
};

export async function resolveSettingsTemplate(
  lookup: TemplateLookup,
  recipient?: string,
  requestedTemplateId?: string,
): Promise<TemplateSettings | null> {
  if (requestedTemplateId)
    return ((await lookup.getTemplate(requestedTemplateId))?.settings as TemplateSettings) ?? null;
  const normalized = recipient?.trim().toLowerCase();
  if (normalized) {
    const scope = normalized.endsWith('@g.us') ? 'group' : 'contact';
    const scoped = await lookup.getBinding(scope, normalized);
    if (scoped) return scoped.Template.settings as TemplateSettings;
  }
  return ((await lookup.getBinding('instance', ''))?.Template.settings as TemplateSettings) ?? null;
}
