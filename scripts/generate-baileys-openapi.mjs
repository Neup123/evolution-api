import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import YAML from 'yaml';
import prettier from 'prettier';

const root = process.cwd();
const methodsPath = path.join(root, 'src/api/integrations/channel/whatsapp/baileys.methods.ts');
const socketPath = path.join(root, 'node_modules/baileys/lib/Socket/index.d.ts');
const generatedPath = path.join(root, 'src/api/integrations/channel/whatsapp/baileys.generated.ts');
const openApiPath = path.join(root, 'docs/openapi.yaml');

const groupLabels = {
  communities: ['Communities', 'Community creation, membership, invitations, and settings.'],
  business: ['Business & catalog', 'Business profiles, catalogs, collections, and products.'],
  messages: ['Calls & messages', 'Messages, receipts, calls, media, and history.'],
  newsletters: ['Newsletters', 'Newsletter lifecycle, subscribers, content, and reactions.'],
  groups: ['Groups', 'Group creation, membership, invitations, and settings.'],
  account: ['Account & privacy', 'Account, presence, profile, privacy, contacts, labels, and quick replies.'],
  advanced: ['Advanced protocol', 'Low-level protocol, cryptographic, query, and binary operations.'],
};

function readGroups() {
  const source = fs.readFileSync(methodsPath, 'utf8');
  const groupsBlock = source.match(/export const BAILEYS_METHOD_GROUPS = \{([\s\S]*?)\n\} as const;/)?.[1];
  if (!groupsBlock) throw new Error('Could not find BAILEYS_METHOD_GROUPS');

  return Object.fromEntries(
    [...groupsBlock.matchAll(/(\w+): \[([\s\S]*?)\n\s*\],/g)].map((match) => [
      match[1],
      [...match[2].matchAll(/'([^']+)'/g)].map((method) => method[1]),
    ]),
  );
}

const groups = readGroups();
const methods = Object.values(groups).flat();
const methodSet = new Set(methods);
const groupByMethod = Object.fromEntries(
  Object.entries(groups).flatMap(([group, names]) => names.map((name) => [name, group])),
);

const program = ts.createProgram([socketPath], {
  target: ts.ScriptTarget.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(socketPath);
if (!sourceFile) throw new Error(`Could not read ${socketPath}`);

function primitiveSchema(type) {
  if (type.flags & ts.TypeFlags.StringLike) return { type: 'string' };
  if (type.flags & ts.TypeFlags.NumberLike) return { type: 'number' };
  if (type.flags & ts.TypeFlags.BooleanLike) return { type: 'boolean' };
  if (type.flags & ts.TypeFlags.BigIntLike) return { type: 'integer' };
  if (type.flags & ts.TypeFlags.Null) return { type: 'null' };
  return undefined;
}

function schemaForType(type, depth = 0, seen = new Set()) {
  const typeName = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
  if (/\bWAMediaUpload\b/.test(typeName)) {
    return {
      anyOf: [
        { type: 'string' },
        { type: 'object', additionalProperties: true },
        {
          type: 'object',
          properties: { $base64: { type: 'string', format: 'byte' } },
          required: ['$base64'],
          additionalProperties: false,
        },
      ],
      description: typeName,
    };
  }

  if (/\b(Buffer|Uint8Array)\b/.test(typeName)) {
    return {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: { $base64: { type: 'string', format: 'byte' } },
          required: ['$base64'],
          additionalProperties: false,
        },
      ],
      description: typeName,
    };
  }

  if (type.isUnion()) {
    const members = type.types.filter((member) => !(member.flags & ts.TypeFlags.Undefined));
    const literals = members.map((member) => member.value).filter((value) => value !== undefined);
    if (literals.length === members.length && literals.length > 0) {
      const kind = literals.every((value) => typeof value === 'number') ? 'number' : 'string';
      return { type: kind, enum: literals, description: typeName };
    }
    const schemas = members.map((member) => schemaForType(member, depth, new Set(seen)));
    return schemas.length === 1 ? schemas[0] : { anyOf: schemas, description: typeName };
  }

  const primitive = primitiveSchema(type);
  if (primitive) return { ...primitive, description: typeName };

  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const arguments_ = checker.getTypeArguments(type);
    return {
      type: 'array',
      items: arguments_.length === 1 ? schemaForType(arguments_[0], depth + 1, new Set(seen)) : {},
      description: typeName,
    };
  }

  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) {
    return { description: typeName };
  }

  if (type.flags & ts.TypeFlags.Object) {
    if (seen.has(type) || depth >= 2) return { type: 'object', additionalProperties: true, description: typeName };
    seen.add(type);
    const properties = checker.getPropertiesOfType(type).filter((property) => !property.getName().startsWith('__'));
    if (properties.length === 0 || properties.length > 35) {
      return { type: 'object', additionalProperties: true, description: typeName };
    }

    const objectProperties = {};
    const required = [];
    for (const property of properties) {
      const declaration = property.valueDeclaration ?? property.declarations?.[0] ?? sourceFile;
      const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
      objectProperties[property.getName()] = schemaForType(propertyType, depth + 1, new Set(seen));
      if (!(property.flags & ts.SymbolFlags.Optional)) required.push(property.getName());
    }
    return {
      type: 'object',
      properties: objectProperties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
      description: typeName,
    };
  }

  return { description: typeName };
}

function parameterName(symbol, declaration, index) {
  if (ts.isParameter(declaration) && ts.isBindingPattern(declaration.name)) return 'options';
  const name = symbol.getName();
  return name.startsWith('__') ? `argument${index + 1}` : name;
}

const signatures = {};
function visit(node) {
  if (ts.isPropertySignature(node) && node.name && methodSet.has(node.name.getText(sourceFile))) {
    const method = node.name.getText(sourceFile);
    const callableType = checker.getTypeAtLocation(node.type);
    const signature = callableType.getCallSignatures()[0];
    if (!signature) throw new Error(`No call signature found for ${method}`);
    signatures[method] = signature.getParameters().map((symbol, index) => {
      const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? node;
      const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
      const isRest = Boolean(declaration.dotDotDotToken);
      return {
        name: parameterName(symbol, declaration, index),
        required: !isRest && !(symbol.flags & ts.SymbolFlags.Optional),
        rest: isRest,
        schema: schemaForType(type),
      };
    });
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);

const missing = methods.filter((method) => !signatures[method]);
if (missing.length) throw new Error(`Missing signatures: ${missing.join(', ')}`);

const metadata = Object.fromEntries(
  methods.map((method) => [method, { group: groupByMethod[method], parameters: signatures[method] }]),
);
const generated =
  `// Generated by scripts/generate-baileys-openapi.mjs. Do not edit manually.\n` +
  `export const BAILEYS_METHOD_METADATA = ${JSON.stringify(metadata, null, 2)} as const;\n`;
const prettierConfig = (await prettier.resolveConfig(generatedPath)) ?? {};
fs.writeFileSync(
  generatedPath,
  await prettier.format(generated, { ...prettierConfig, parser: 'typescript', printWidth: 120, singleQuote: true }),
);

const instanceParameter = {
  name: 'instanceName',
  in: 'path',
  required: true,
  description: 'Connected Evolution API instance name.',
  schema: { type: 'string' },
};
const successResponse = {
  description: 'Baileys method result. Binary values use the $base64 envelope.',
  content: { 'application/json': { schema: {} } },
};
const paths = {
  '/baileys/methods/{instanceName}': {
    get: {
      tags: ['Registry'],
      summary: 'List supported Baileys methods and grouped routes',
      operationId: 'listBaileysMethods',
      parameters: [instanceParameter],
      responses: { 200: successResponse },
    },
  },
};

for (const [method, definition] of Object.entries(metadata)) {
  const properties = Object.fromEntries(definition.parameters.map((parameter) => [parameter.name, parameter.schema]));
  const required = definition.parameters.filter((parameter) => parameter.required).map((parameter) => parameter.name);
  const requestSchema = {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
  paths[`/baileys/${definition.group}/${method}/{instanceName}`] = {
    post: {
      tags: [groupLabels[definition.group][0]],
      summary: method,
      description: `Invokes WASocket.${method} with named fields.`,
      operationId: `baileys_${method}`,
      parameters: [instanceParameter],
      ...(definition.parameters.length
        ? {
            requestBody: {
              required: required.length > 0,
              content: { 'application/json': { schema: requestSchema } },
            },
          }
        : {}),
      responses: { 200: successResponse, 400: { description: 'Invalid method parameters.' } },
    },
  };
}

paths['/baileys/{method}/{instanceName}'] = {
  post: {
    deprecated: true,
    tags: ['Legacy'],
    summary: 'Invoke a method with an ordered args array',
    description: 'Compatibility route. Prefer the grouped method-specific routes with named fields.',
    operationId: 'invokeBaileysLegacy',
    parameters: [
      { name: 'method', in: 'path', required: true, schema: { type: 'string', enum: methods } },
      instanceParameter,
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { args: { type: 'array', items: {} } },
            additionalProperties: false,
          },
        },
      },
    },
    responses: { 200: successResponse },
  },
};

const document = {
  openapi: '3.1.0',
  info: {
    title: 'Evolution API – Baileys 7',
    version: '2.3.7-baileys-7.0.0-rc14',
    description:
      'Typed, grouped HTTP routes for the Baileys WASocket API. Named request fields are generated from the installed Baileys TypeScript declarations. Before using Try it out, click Authorize and enter the Evolution API global API key; Swagger sends it in the apikey header.',
  },
  servers: [{ url: '/', description: 'Current Evolution API server' }],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: 'Registry', description: 'Runtime method discovery.' },
    ...Object.values(groupLabels).map(([name, description]) => ({ name, description })),
    { name: 'Legacy', description: 'Backward-compatible ordered-argument route.' },
  ],
  paths,
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'apikey',
        description: 'Enter the Evolution API global API key configured as AUTHENTICATION_API_KEY.',
      },
    },
    schemas: {
      BinaryValue: {
        oneOf: [
          { type: 'string', description: 'A normal string when the Baileys type permits it.' },
          {
            type: 'object',
            properties: { $base64: { type: 'string', format: 'byte' } },
            required: ['$base64'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
};

fs.writeFileSync(openApiPath, YAML.stringify(document, { lineWidth: 0 }));
console.log(`Generated ${methods.length} typed Baileys operations.`);
