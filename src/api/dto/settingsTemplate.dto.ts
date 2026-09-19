import { AutomationSafetySettings } from './settings.dto';

export type TemplateSettings = {
  localReadTtlSeconds?: number | null;
  localReadTtlOverrides?: Record<string, number> | null;
  automationSafety?: AutomationSafetySettings | null;
};

export class SettingsTemplateCreateDto {
  name: string;
  settings: TemplateSettings;
}
export class SettingsTemplateEditDto {
  templateId: string;
  name?: string;
  settings?: TemplateSettings;
}
export class SettingsTemplateDuplicateDto {
  templateId: string;
  name: string;
}
export class SettingsTemplateDeleteDto {
  templateId: string;
}
export class SettingsTemplateAssignDto {
  templateId: string;
  scope: 'instance' | 'group' | 'contact';
  target?: string;
}
export class SettingsTemplateUnassignDto {
  scope: 'instance' | 'group' | 'contact';
  target?: string;
}
