import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

import { settingsSchema } from './settings.schema';

const templateSettings: JSONSchema7 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    localReadTtlSeconds: settingsSchema.properties.localReadTtlSeconds,
    localReadTtlOverrides: settingsSchema.properties.localReadTtlOverrides,
    automationSafety: settingsSchema.properties.automationSafety,
    mistakesGenerator: settingsSchema.properties.mistakesGenerator,
  },
};
export const settingsTemplateCreateSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  additionalProperties: false,
  properties: { name: { type: 'string', minLength: 1, maxLength: 255 }, settings: templateSettings },
  required: ['name', 'settings'],
};
export const settingsTemplateEditSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  additionalProperties: false,
  properties: {
    templateId: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    settings: templateSettings,
  },
  required: ['templateId'],
};
export const settingsTemplateDuplicateSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  additionalProperties: false,
  properties: { templateId: { type: 'string', minLength: 1 }, name: { type: 'string', minLength: 1, maxLength: 255 } },
  required: ['templateId', 'name'],
};
export const settingsTemplateDeleteSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  additionalProperties: false,
  properties: { templateId: { type: 'string', minLength: 1 } },
  required: ['templateId'],
};
export const settingsTemplateAssignSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  additionalProperties: false,
  properties: {
    templateId: { type: 'string', minLength: 1 },
    scope: { type: 'string', enum: ['instance', 'group', 'contact'] },
    target: { type: 'string', minLength: 3, maxLength: 255 },
  },
  required: ['templateId', 'scope'],
};
export const settingsTemplateUnassignSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  additionalProperties: false,
  properties: {
    scope: { type: 'string', enum: ['instance', 'group', 'contact'] },
    target: { type: 'string', minLength: 3, maxLength: 255 },
  },
  required: ['scope'],
};
