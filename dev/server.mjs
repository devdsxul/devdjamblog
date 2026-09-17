import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qa = process.argv.includes('--qa');
const name = qa ? 'qa' : 'preview';
const port = qa ? 8788 : 8787;
const runtime = path.join(root, '.runtime');
const wordpress = path.join(runtime, name, 'wordpress-7.1');
const accessPath = path.join(runtime, `${name}-access.json`);
fs.mkdirSync(wordpress, { recursive: true });
const fresh = !fs.existsSync(path.join(wordpress, 'wp-config.php'));
const access = fs.existsSync(accessPath)
  ? JSON.parse(fs.readFileSync(accessPath, 'utf8'))
  : { username: 'admin', password: crypto.randomBytes(24).toString('base64url'), url: `http://127.0.0.1:${port}/wp-admin/admin.php?page=devdjam` };
fs.writeFileSync(accessPath, JSON.stringify(access, null, 2) + '\n');

// Playground exposes only a port option. Bind its HTTP listener and port probe
// to loopback without changing the installed package or machine configuration.
const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'number' && typeof args[1] !== 'string') args.splice(1, 0, '127.0.0.1');
  else if (args[0] && typeof args[0] === 'object' && 'port' in args[0]) args[0] = { ...args[0], host: '127.0.0.1' };
  return originalListen.apply(this, args);
};

const { runCLI } = await import('@wp-playground/cli');
const bootstrap = `<?php
require_once '/wordpress/wp-load.php';
if (!get_option('devdjam_local_initialized')) {
    wp_set_password('${access.password}', 1);
    wp_update_user(array('ID'=>1,'display_name'=>'DEVDJAM','user_email'=>'devdjam@example.test'));
    foreach (array('hello-world','sample-page','privacy-policy') as $slug) {
        $demo = get_page_by_path($slug, OBJECT, array('post','page'));
        if ($demo && (int)$demo->post_author === 1) wp_delete_post($demo->ID, true);
    }
    foreach (get_comments(array('status'=>'all')) as $comment) wp_delete_comment($comment->comment_ID, true);
    update_option('blogname','DEVDJAM');
    update_option('blogdescription','music, beats, thoughts, whatever.');
    update_option('default_comment_status','closed');
    update_option('default_ping_status','closed');
    update_option('timezone_string','Asia/Shanghai');
    devdjam_setup_site();
    update_option('devdjam_local_initialized',1);
}
`;
const blueprint = {
  landingPage: '/',
  constants: { DISABLE_WP_CRON: true, AUTOMATIC_UPDATER_DISABLED: true, WP_AUTO_UPDATE_CORE: false },
  steps: [
    { step: 'activatePlugin', pluginPath: 'devdjam-core/devdjam-core.php' },
    { step: 'activateTheme', themeFolderName: 'devdjam' },
    { step: 'runPHP', code: bootstrap },
    ...(fresh ? [{ step: 'setSiteLanguage', language: 'zh_CN' }] : []),
  ],
};

const server = await runCLI({
  command: 'server', port, 'site-url': `http://127.0.0.1:${port}`,
  wp: 'https://wordpress.org/wordpress-7.1.zip', php: '8.3',
  workers: 6, login: false, blueprint, verbosity: 'normal',
  'define-bool': { DISABLE_WP_CRON: true, AUTOMATIC_UPDATER_DISABLED: true, WP_AUTO_UPDATE_CORE: false, WP_DEBUG: true, WP_DEBUG_DISPLAY: false, WP_DEBUG_LOG: true },
  wordpressInstallMode: fresh ? 'download-and-install' : 'do-not-attempt-installing',
  'mount-before-install': [{ hostPath: wordpress, vfsPath: '/wordpress' }],
  mount: [
    { hostPath: path.join(root, 'wp-content/themes/devdjam'), vfsPath: '/wordpress/wp-content/themes/devdjam' },
    { hostPath: path.join(root, 'wp-content/plugins/devdjam-core'), vfsPath: '/wordpress/wp-content/plugins/devdjam-core' },
  ],
});
const versionSource = fs.readFileSync(path.join(wordpress, 'wp-includes/version.php'), 'utf8');
const actualVersion = versionSource.match(/\$wp_version\s*=\s*'([^']+)'/)?.[1];
if (actualVersion !== '7.1') {
  await server[Symbol.asyncDispose]();
  throw new Error(`Expected WordPress 7.1, found ${actualVersion}. Use a fresh local runtime or restore the official stable core files.`);
}
console.log(`DEVDJAM ${name} ready at ${server.serverUrl} (verified WordPress ${actualVersion})`);
console.log(`Local-only credentials: ${accessPath}`);
async function close() {
  await server[Symbol.asyncDispose]();
  process.exit(0);
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
