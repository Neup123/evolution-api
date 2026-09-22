import { JSONSchema7 } from 'json-schema';

const schemaType = (schema: JSONSchema7) =>
  Array.isArray(schema.type) ? schema.type.find((type) => type !== 'null') : schema.type;

/** Convert Swagger's guided URL-encoded controls back to JSON-compatible types. */
export const coerceFormValue = (value: unknown, schema: JSONSchema7): unknown => {
  if (value === undefined || value === null) return value;
  const type = schemaType(schema);
  if (type === 'boolean' && typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  if ((type === 'integer' || type === 'number') && typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    if (Number.isFinite(number)) return type === 'integer' ? Math.trunc(number) : number;
  }
  if (type === 'object') {
    let objectValue = value;
    if (typeof value === 'string') {
      try {
        objectValue = JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (objectValue && typeof objectValue === 'object' && !Array.isArray(objectValue)) {
      const result = { ...(objectValue as Record<string, unknown>) };
      const required = new Set(schema.required ?? []);
      for (const [name, propertySchema] of Object.entries(schema.properties ?? {})) {
        if (result[name] === '' && !required.has(name)) {
          delete result[name];
        } else if (typeof propertySchema === 'object') {
          result[name] = coerceFormValue(result[name], propertySchema);
        }
      }
      return result;
    }
  }
  if (type === 'array') {
    const values = Array.isArray(value) ? value : [value];
    const itemSchema = typeof schema.items === 'object' && !Array.isArray(schema.items) ? schema.items : undefined;
    return itemSchema ? values.map((item) => coerceFormValue(item, itemSchema)) : values;
  }
  return value;
};
