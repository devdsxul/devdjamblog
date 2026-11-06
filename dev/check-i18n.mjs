import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import PhpParser from 'php-parser';

const theme = new URL('../wp-content/themes/devdjam/', import.meta.url);
const source = fs.readFileSync(new URL('assets/i18n.js', theme), 'utf8');
const dictionary = JSON.parse(source.slice(source.indexOf('const zh = ') + 11, source.indexOf('\n};') + 2));
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
for (const [key, value] of Object.entries(dictionary)) {
  assert.equal(typeof value, 'string', key);
  assert.ok(value.trim(), `Empty Chinese translation: ${key}`);
  assert.deepEqual(placeholders(key), placeholders(value), `Parameter mismatch: ${key}`);
}

// Inspect PHP AST string arguments rather than counting text inside comments/author content.
const parser = new PhpParser({ parser: { version: '8.3' } });
let calls = 0;
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.kind === 'call' && node.what?.kind === 'name') {
    const name = node.what.name;
    const index = name === 'dj_attr' ? 1 : ['dj_text', 'dj_empty', 'dj_window_open'].includes(name) ? 0 : -1;
    const key = node.arguments?.[index];
    if (key?.kind === 'string') {
      assert.ok(Object.hasOwn(dictionary, key.value), `Missing PHP key: ${key.value}`);calls++;
    }
  }
  for (const value of Object.values(node)) if (typeof value === 'object') {
    if (Array.isArray(value)) value.forEach(visit); else visit(value);
  }
}
for (const file of fs.readdirSync(theme, { recursive: true }).filter((f) => f.endsWith('.php'))) {
  visit(parser.parseCode(fs.readFileSync(new URL(file.split(path.sep).join('/'), theme), 'utf8'), file));
}
const site = fs.readFileSync(new URL('assets/site.js', theme), 'utf8');
for (const match of site.matchAll(/\b(?:t|message)\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g)) {
  const key = vm.runInNewContext(match[1]);
  assert.ok(!key || Object.hasOwn(dictionary, key), `Missing JS key: ${key}`);calls++;
}
console.log(`PASS ${Object.keys(dictionary).length} translations, EN/ZH parameter parity, ${calls} literal PHP/JS uses. DOM/attributes: python dev/check-ui-i18n.py.`);
