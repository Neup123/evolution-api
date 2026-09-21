import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const roots = ['src/validate', 'src/api/integrations'];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else if (item.name.endsWith('.schema.ts')) files.push(full);
    }
  };
  for (const root of roots) walk(root);
  const clean = (value: any): any => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== '$id')
          .map(([key, val]) => [key, clean(val)]),
      );
    return value;
  };
  const out: Record<string, unknown> = {};
  for (const file of files) {
    const mod = await import(pathToFileURL(path.resolve(file)).href);
    for (const [name, value] of Object.entries(mod))
      if (name.endsWith('Schema') && value && typeof value === 'object') out[name] = clean(value);
  }
  fs.writeFileSync(path.join(os.tmpdir(), 'evolution-validation-schemas.json'), JSON.stringify(out));
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
