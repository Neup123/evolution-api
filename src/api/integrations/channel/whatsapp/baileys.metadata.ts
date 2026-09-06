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

function coerceQueryValue(value: unknown, schema: JSONSchema7Definition): unknown {
  if (typeof schema === 'boolean' || typeof value !== 'string') return value;
  if (schema.type === 'boolean') return value === 'true' ? true : value === 'false' ? false : value;
  if (schema.type === 'number' || schema.type === 'integer') {
    const number = Number(value);
    return Number.isNaN(number) ? value : number;
  }
  if (schema.type === 'array') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  if (schema.type === 'object' || schema.anyOf || schema.oneOf) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function mapBaileysNamedQueryToBody(
  method: BaileysApiMethod,
  query: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    metadata[method].parameters
      .filter((parameter) => query[parameter.name] !== undefined)
      .map((parameter) => [parameter.name, coerceQueryValue(query[parameter.name], parameter.schema)]),
  );
}

export function listBaileysMethodMetadata() {
  return BAILEYS_METHOD_METADATA;
}
