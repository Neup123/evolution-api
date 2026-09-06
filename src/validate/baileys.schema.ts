import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const baileysInvokeSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    args: {
      type: 'array',
      description: 'Ordered arguments passed to the Baileys socket method',
      items: {},
    },
  },
  additionalProperties: false,
};
