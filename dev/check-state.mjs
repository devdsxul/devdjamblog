import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const site = read('wp-content/themes/devdjam/assets/site.js');
const admin = read('wp-content/plugins/devdjam-core/admin.js');
function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing source section: ${start}`);
  return source.slice(from, to);
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve; let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function router() {
  const requests = []; const redirects = []; const timers = new Map(); const anchors = [];
  const listeners = {}; const rendered = [];
  const location = { href: 'https://example.test/', assign: (url) => redirects.push(url) };
  let main;
  function content(html) {
    return {
      innerHTML: html, dataset: { view: 'blog' }, scrollTop: 0, busy: false,
      cloneNode: () => content(html), querySelectorAll: () => [], querySelector: () => null,
      replaceWith(node) { main = node; rendered.push(node.innerHTML); }, focus() {},
      setAttribute() { this.busy = true; }, removeAttribute() { this.busy = false; },
    };
  }
  main = content('initial');
  const window = {
    scrollY: 0, scrollTo({ top }) { this.scrollY = top; },
    addEventListener(name, fn) { listeners[name] = fn; },
  };
  const history = {
    state: {}, scrollRestoration: 'auto',
    replaceState(state, _title, url) { this.state = state; location.href = url; },
    pushState(state, _title, url) { this.replaceState(state, _title, url); },
  };
  const context = vm.createContext({
    window, history, location, URL, AbortController,
    document: {
      querySelector: (selector) => selector === '.navigation-status' ? { dataset: {}, setAttribute() {} } : null,
      querySelectorAll: () => [], addEventListener() {},
      getElementById: (id) => id === 'site-content' ? main : id === 'target' ? { scrollIntoView: () => anchors.push(id) } : null,
    },
    DOMParser: class {
      parseFromString(html) { return { title: html, getElementById: () => content(html), querySelector: () => null }; }
    },
    setTimeout(fn, ms) { const key = {}; timers.set(key, { fn, ms }); return key; },
    clearTimeout: (key) => timers.delete(key),
    fetch(url, { signal }) {
      const job = deferred();
      signal?.addEventListener('abort', () => job.reject(signal.reason), { once: true });
      requests.push({ url, signal, reject: job.reject, respond(html = url) {
        job.resolve({ ok: true, url, headers: { get: () => 'text/html' }, text: async () => html });
      } });
      return job.promise;
    },
    t: (key, params = {}) => key.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match),
    applyLanguage() {}, syncButtons() {}, initNovelReader() {}, loadTracks() {},
  });
  vm.runInContext(section(site, '  const pages = new Map();', '  // ---------- 控制面板'), context);
  return {
    context, requests, redirects, rendered, window, anchors, listeners, location,
    main: () => main,
    go: (path, options = {}) => context.navigate(new URL(path, location.href), options),
    prefetch: (path) => context.prefetch(new URL(path, location.href)),
    expire() { for (const { fn, ms } of [...timers.values()]) if (ms === 18000) fn(); },
  };
}

test('rapid repeat navigation shares a usable request and renders once', async () => {
  const f = router();
  const first = f.go('/a'); const second = f.go('/a');
  assert.equal(f.requests.length, 1);
  f.requests[0].respond();
  await Promise.all([first, second]);
  assert.deepEqual(f.rendered, ['https://example.test/a']);
  assert.equal(f.main().busy, false);
  assert.equal(f.redirects.length, 0);
});

test('a late failure from prefetch cannot redirect a newer navigation', async () => {
  const f = router(); f.prefetch('/a');
  const first = f.go('/a'); const second = f.go('/b');
  f.requests[1].respond(); await second;
  f.requests[0].reject(new Error('offline')); await first;
  assert.deepEqual(f.rendered, ['https://example.test/b']);
  assert.deepEqual(f.redirects, []);
});

test('prefetch timeout ends waiting navigation and allows retry', async () => {
  const f = router(); f.prefetch('/a'); const waiting = f.go('/a');
  f.expire(); await tick();
  assert.deepEqual(f.redirects, ['https://example.test/a']);
  await waiting;
  const retry = f.go('/a');
  assert.equal(f.requests.length, 2);
  f.requests[1].respond(); await retry;
});

test('switching back to displayed history invalidates a pending navigation', async () => {
  const f = router(); const waiting = f.go('/a');
  f.listeners.popstate({ state: { scrollY: 90 } });
  f.requests[0].respond(); await waiting;
  assert.deepEqual(f.rendered, []);
  assert.equal(f.window.scrollY, 90);
  assert.equal(f.main().busy, false);
});

test('new pages start at top; cross-page history restores scroll ahead of hash', async () => {
  const f = router(); f.window.scrollY = 700;
  const first = f.go('/a'); f.requests[0].respond(); await first;
  assert.equal(f.window.scrollY, 0);
  const back = f.go('/b#target', { push: false, scrollY: 420 });
  f.requests[1].respond(); await back;
  assert.equal(f.window.scrollY, 420);
  assert.deepEqual(f.anchors, []);
  await f.go('/a#target');
  assert.deepEqual(f.anchors, ['target']);
  await f.go('/a#%E0%A4');
  assert.deepEqual(f.redirects, []);
});

test('background refresh preserves page and inner scroll offsets', async () => {
  const f = router(); const first = f.go('/a'); f.requests[0].respond('old'); await first;
  vm.runInContext("pages.get('https://example.test/a').at = 0", f.context);
  await f.go('/a');
  f.window.scrollY = 280; f.main().scrollTop = 150;
  f.requests[1].respond('fresh'); await tick();
  assert.equal(f.main().innerHTML, 'fresh');
  assert.equal(f.window.scrollY, 280);
  assert.equal(f.main().scrollTop, 150);
});

test('saved cues tolerate invalid JSON shapes, retain 60 newest and optional storage', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const window = { localStorage: storage };
  const context = vm.createContext({ window, localStorage: storage });
  const helper = site.includes('  function objectStore(') ? section(site, '  function objectStore(', '  const sparkColors') : '';
  vm.runInContext(helper + section(site, '  // 热点 / CUE 点', '  engine.decks.forEach'), context);
  for (const invalid of ['null', '[]', 'false', '7', '"text"', '{']) {
    values.set('dj-cues', invalid);
    assert.equal(vm.runInContext('cueStore.get(1)', context), null);
    vm.runInContext('cueStore.set(1, { cue: 4 })', context);
    assert.equal(JSON.parse(values.get('dj-cues')).t1.cue, 4);
  }
  values.clear();
  for (let i = 1; i <= 61; i++) vm.runInContext(`cueStore.set(${i}, { cue: ${i} })`, context);
  const cues = JSON.parse(values.get('dj-cues'));
  assert.equal(Object.keys(cues).length, 60); assert.equal(cues.t1, undefined);
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } });
  assert.equal(vm.runInContext('cueStore.get(1)', context), null);
  assert.doesNotThrow(() => vm.runInContext('cueStore.set(1, {})', context));
});

function editor() {
  const elements = new Map(); const jobs = [];
  for (const id of ['dj-detect', 'dj-detect-status', 'dj-bpm', 'dj-key', 'dj-audio-preview']) {
    elements.set(id, { value: '', textContent: '', disabled: false, src: 'a', getAttribute() { return this.src; }, addEventListener() {} });
  }
  const context = vm.createContext({
    window: { DEVDJAM: { analysis: {} } }, document: { getElementById: (id) => elements.get(id) },
  });
  const source = section(admin, '  const describe = ', '  // 控制室：');
  vm.runInContext('const analysis = window.DEVDJAM.analysis; const audioPreview = document.getElementById("dj-audio-preview");' + source, context);
  context.detect = () => { const job = deferred(); jobs.push(job); return job.promise; };
  return { context, jobs, el: (id) => elements.get(`dj-${id}`), run: () => context.detectInto('a', false) };
}

test('old detection errors cannot replace status or unlock the newer job', async () => {
  const f = editor(); const old = f.run(); const current = f.run();
  f.jobs[0].reject(new Error('old download failed')); await old;
  assert.equal(f.el('detect-status').textContent, '正在分析音频…');
  assert.equal(f.el('detect').disabled, true);
  f.jobs[1].resolve({ bpm: 130, key: 'Am' }); await current;
  assert.equal(f.el('bpm').value, '130'); assert.equal(f.el('detect').disabled, false);
});

test('changing audio with filled fields invalidates old successful detection', async () => {
  const f = editor(); const old = f.run();
  f.el('bpm').value = '99'; f.el('key').value = 'C'; f.el('audio-preview').src = 'b';
  f.context.audioChanged('b');
  f.jobs[0].resolve({ bpm: 140, key: 'Fm' }); await old;
  assert.equal(f.el('bpm').value, '99'); assert.equal(f.el('key').value, 'C');
  assert.equal(f.el('detect-status').textContent, '');
});

test('removing audio ignores late errors and keeps detection disabled', async () => {
  const f = editor(); const old = f.run();
  f.el('audio-preview').src = ''; f.context.audioChanged('');
  f.jobs[0].reject(new Error('late failure')); await old;
  assert.equal(f.el('detect-status').textContent, ''); assert.equal(f.el('detect').disabled, true);
});
