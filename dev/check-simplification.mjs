import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checker = read('dev/check.mjs');
// Execute the actual enumeration block, not a second native implementation.
const start = checker.indexOf('const files = ');
const end = checker.indexOf('let checked = 0;', start);
assert.ok(start >= 0 && end > start, 'checker enumeration block exists');
function nativeFiles(base) {
  return Array.from(vm.runInNewContext(`${checker.slice(start, end)}\nfiles;`, { fs, path, root: base }));
}
function oldFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...oldFiles(file));
    else files.push(file);
  }
  return files;
}
const targets = (files) => files.filter((file) => /\.(php|js)$/.test(file)).sort();
function compare(base) {
  const old = oldFiles(path.join(base, 'wp-content'));
  const native = nativeFiles(base);
  assert.deepEqual(native.sort(), old.sort(), 'all non-directory entries match');
  assert.deepEqual(targets(native), targets(old), 'PHP / JS targets match');
  return targets(native).length;
}
const count = compare(root);
const runtime = path.join(root, '.runtime');
fs.mkdirSync(runtime, { recursive: true });
const fixture = fs.mkdtempSync(path.join(runtime, 'simplification-'));
let linkStatus = 'tested';
try {
  fs.mkdirSync(path.join(fixture, 'dev'));
  fs.mkdirSync(path.join(fixture, 'wp-content', 'nested', 'deep'), { recursive: true });
  fs.copyFileSync(path.join(root, 'dev/check.mjs'), path.join(fixture, 'dev/check.mjs'));
  const put = (name, value) => fs.writeFileSync(path.join(fixture, 'wp-content', name), value);
  put('valid.php', '<?php echo "valid";');
  put('nested/deep/valid.js', 'const valid = true;');
  put('nested/ignored.txt', 'not valid PHP or JS');
  put('nested/ignored.JS', 'also ignored: case-sensitive extension');
  try {
    fs.symlinkSync(path.join(fixture, 'wp-content', 'nested', 'deep', 'valid.js'), path.join(fixture, 'wp-content', 'linked.js'), 'file');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
    linkStatus = `not available (${error.code})`;
  }
  const fixtureCount = compare(fixture);
  const run = () => spawnSync(process.execPath, [path.join(fixture, 'dev/check.mjs')], { encoding: 'utf8' });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`Syntax OK: ${fixtureCount} PHP / JavaScript files.`));
  for (const [name, invalid, valid] of [
    ['nested/deep/broken.php', '<?php function broken( {', '<?php echo "fixed";'],
    ['nested/deep/broken.js', 'const broken = ;', 'const fixed = true;'],
  ]) {
    put(name, invalid);
    result = run();
    assert.notEqual(result.status, null, 'checker must start');
    assert.notEqual(result.status, 0, `${name} must fail`);
    assert.ok(result.stderr.includes(path.basename(name)), result.stderr);
    put(name, valid);
    result = run();
    assert.equal(result.status, 0, result.stderr);
  }
} finally {
  // Only remove the fixture created by this run, never preview data.
  fs.rmSync(fixture, { recursive: true, force: true });
}

const theme = 'wp-content/themes/devdjam/';
const plugin = 'wp-content/plugins/devdjam-core/';
const php = read(`${plugin}devdjam-core.php`);
const helpers = read(`${theme}functions.php`);
const player = read(`${theme}parts/player.php`);
const site = read(`${theme}assets/site.js`);
const css = read(`${theme}assets/site.css`);
const admin = read(`${plugin}admin.js`);
for (const file of nativeFiles(root).filter((file) => /\.(php|js|css)$/.test(file))) {
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /dj_recent\(|dj_post_rows\(|dj_beat_button\(|data-player-cover|platter-label|dj-(?:choose-cover|remove-cover|cover-id|cover-preview|cover-hint|cover-field)/, file);
}
// Static contracts only: these do not establish WordPress editor save behavior.
assert.match(helpers, /add_theme_support\('post-thumbnails'\)/);
assert.match(php, /'supports' => array\([^\n]*'thumbnail'/);
for (const type of ['dj_music', 'dj_beat']) {
  assert.ok(php.includes(`register_post_type('${type}', array_merge($common, array(`));
  assert.ok(php.includes(`add_action('save_post_${type}', 'devdjam_save_beat')`));
}
assert.doesNotMatch(php, /\$_POST\['_thumbnail_id'\]|(?:set|delete)_post_thumbnail\(/);
assert.doesNotMatch(php + helpers, /remove_(?:meta_box\(['"]postimagediv|theme_support\(['"]post-thumbnails)/);
assert.match(php, /get_the_post_thumbnail_url\(\$post, 'medium'\)/);
assert.match(php, /devdjam_default_cover_url\(\)/);
assert.match(helpers, /function devdjam_default_cover_url\(\)/);
assert.match(admin, /getElementById\('dj-choose-audio'\)/);
assert.match(admin, /window\.DEVDJAM\?\.analysis/);
assert.match(php, /devdjam_valid_audio\(\$audio_id\)/);
assert.match(php, /id="dj-detect"/);
assert.match(read(`${theme}views/home.php`), /dj_track_button\(/);
assert.match(helpers, /data-track-id=/);
assert.match(helpers, /data-pause-icon hidden/);
assert.match(player, /data-jog-cover/);
assert.match(site, /u\.cover\.src = art/);
assert.match(site, /img\.src = track\.cover/);
assert.match(site, /artwork: track\.cover/);
assert.match(css, /:is\(\.home-split, \.archive-track-list\) \.track-button:is\(:hover, :active, \.is-playing\) \{\s*color: var\(--accent\) !important;\s*\}/);
assert.match(css, /\.archive-track-list \.track-button:hover \{\s*transform: scale\(1\.15\);/);
assert.match(css, /\.archive-track-list \.track-button:active \{\s*transform: scale\(0\.92\);/);
assert.match(css, /\.home-split \.track-button \{\s*width: 44px !important;\s*height: 44px !important;/);
assert.match(css, /\.archive-track-list \.track-button \{\s*width: 32px !important;\s*height: 32px !important;/);
assert.match(css, /\.archive-track-list \.track-button \[hidden\] \{\s*display: none !important;/);
console.log(`PASS: ${count} repository syntax targets match; nested fixtures, ignored extensions, PHP / JS failure propagation, and static UI contracts. File symlink: ${linkStatus}.`);
