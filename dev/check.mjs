import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import PhpParser from 'php-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parser = new PhpParser({ parser: { suppressErrors: false, version: '8.3' } });
const files = fs.readdirSync(path.join(root, 'wp-content'), { recursive: true, withFileTypes: true })
  .filter((entry) => !entry.isDirectory())
  .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
let checked = 0;
for (const file of files) {
  if (file.endsWith('.php')) {
    parser.parseCode(fs.readFileSync(file, 'utf8'), file);
    checked++;
  } else if (file.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
    checked++;
  }
}
console.log(`Syntax OK: ${checked} PHP / JavaScript files.`);
