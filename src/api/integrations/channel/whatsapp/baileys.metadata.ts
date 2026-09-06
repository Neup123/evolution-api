import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import { BAILEYS_METHOD_METADATA } from './baileys.generated';
import { BaileysApiMethod } from './baileys.methods';

type BaileysMethodParameter = {
  name: string;
  required: boolean;
  rest: boolean;
  schema: JSONSchema7Definition;
};

const metadata = BAILEYS_METHOD_METADATA as unknown as Record<
  BaileysApiMethod,
  { group: string; parameters: BaileysMethodParameter[] }
>;

export function getBaileysNamedBodySchema(method: BaileysApiMethod): JSONSchema7 {
  const parameters = metadata[method].parameters;
  const required = parameters.filter((parameter) => parameter.required).map((parameter) => parameter.name);

  return {
    type: 'object',
    properties: Object.fromEntries(parameters.map((parameter) => [parameter.name, parameter.schema])),
    required,
    additionalProperties: false,
  };
}

export function mapBaileysNamedBodyToArgs(method: BaileysApiMethod, body: Record<string, unknown>): unknown[] {
  return metadata[method].parameters.flatMap((parameter) => {
    const value = body[parameter.name];
    if (parameter.rest) return Array.isArray(value) ? value : [];
    return [value];
  });
}

export function listBaileysMethodMetadata() {
  return BAILEYS_METHOD_METADATA;
}
