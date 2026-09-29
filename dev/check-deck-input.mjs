import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../wp-content/themes/devdjam/assets/site.js', import.meta.url), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const functions = [
  section('  function pointerFrame(', '  // 控制台旋钮'),
  section('  function mountControl(', '  // 可按住的硬件键'),
  section('  function bindJog(', '  // ---------- 紧凑播放器'),
].join('\n');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
let cases = 0;

function fixture(rotated, classes, width, height, invert = false) {
  const listeners = new Map();
  const resize = [];
  const active = new Set(classes.split(' '));
  const at = (x, y, stamp = 0) => ({
    clientX: rotated ? 40 + height - y : 40 + x,
    clientY: rotated ? 60 + x : 60 + y,
    pointerId: 1, button: 0, timeStamp: stamp, shiftKey: false,
    preventDefault() {},
  });
  const bounds = (x, y, w, h) => {
    const a = at(x, y); const b = at(x + w, y + h);
    return { left: Math.min(a.clientX, b.clientX), top: Math.min(a.clientY, b.clientY), right: Math.max(a.clientX, b.clientX), bottom: Math.max(a.clientY, b.clientY), width: Math.abs(b.clientX - a.clientX), height: Math.abs(b.clientY - a.clientY) };
  };
  const el = {
    dataset: { param: 'test', invert: invert ? '1' : '0' },
    classList: { contains: c => active.has(c), add: c => active.add(c), remove: c => active.delete(c), toggle() {} },
    style: { setProperty() {} }, setAttribute() {}, focus() {}, setPointerCapture() {},
    getBoundingClientRect: () => bounds(0, 0, width, height),
    querySelector: () => ({ getBoundingClientRect: () => active.has('h') ? bounds((width - 14) / 2, 0, 14, height) : bounds(0, (height - 14) / 2, width, 14) }),
    addEventListener: (name, fn) => listeners.set(name, fn),
  };
  const param = { min: 0, max: 1, def: 0.5, value: 0.5, step: 0.05, text: String, views: new Set() };
  const context = vm.createContext({
    getComputedStyle: () => ({ getPropertyValue: () => rotated ? '1' : '0' }),
    window: { addEventListener: (name, fn) => { if (name === 'resize') resize.push(fn); } },
    params: new Map([['test', param]]),
    setParam: (_id, value) => { param.value = Math.max(param.min, Math.min(param.max, value)); },
    engine: { start() {} }, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    deck: { classList: { toggle() {}, remove() {} } }, deckA: null,
    REV_SECONDS: 1.8, wake() {}, setTimeout: () => 1, clearTimeout() {},
    el,
  });
  vm.runInContext(functions, context);
  return { context, el, param, at, active, resize: () => resize.forEach(fn => fn()), fire: (name, x, y, stamp) => listeners.get(name)?.(at(x, y, stamp)) };
}

for (const rotated of [false, true]) {
  for (const [classes, invert, start, end, expected] of [
    ['ctl-knob', false, [13, 13], [13, -27], 0.75],
    ['ctl-fader v', false, [13, 57], [13, 87], 0.2],
    ['ctl-fader v tempo', true, [13, 57], [13, 87], 0.8],
    ['ctl-fader h', false, [57, 13], [87, 13], 0.8],
  ]) {
    const h = classes.endsWith(' h');
    const f = fixture(rotated, classes, h ? 114 : 26, classes === 'ctl-knob' ? 26 : h ? 26 : 114, invert);
    vm.runInContext('mountControl(el)', f.context);
    f.fire('pointerdown', ...start); f.fire('pointermove', ...end);
    close(f.param.value, expected);
    f.resize(); const value = f.param.value;
    f.fire('pointermove', 1000, 1000);
    close(f.param.value, value); assert.equal(f.active.has('is-active'), false);
    cases++;
  }
  for (const horizontal of [false, true]) {
    const f = fixture(rotated, `ctl-fader ${horizontal ? 'h' : 'v'}`, horizontal ? 114 : 26, horizontal ? 26 : 114);
    vm.runInContext('mountControl(el)', f.context);
    f.fire('pointerdown', ...(horizontal ? [7, 13] : [13, 7]));
    close(f.param.value, horizontal ? 0 : 1);
    f.fire('pointermove', ...(horizontal ? [107, 13] : [13, 107]));
    close(f.param.value, horizontal ? 1 : 0);
    f.fire('pointerup', 0, 0); cases++;
  }
  for (const rim of [false, true]) {
    const f = fixture(rotated, 'jog', 200, 200);
    const moves = []; const bends = []; let ends = 0;
    f.context.d = { track: {}, headPosition: () => 20, scratchStart() {}, scratchTo: (target, velocity) => moves.push([target, velocity]), scratchEnd: () => ends++, setBend: value => bends.push(value) };
    vm.runInContext('bindJog(el, d)', f.context);
    f.fire('pointerdown', rim ? 195 : 130, 100, 0);
    f.fire('pointermove', 100, rim ? 195 : 130, 20);
    if (rim) assert.ok(bends[0] > 0); else close(moves[0][0], 20.45);
    f.resize();
    if (rim) close(bends.at(-1), 0); else assert.equal(ends, 1);
    const total = moves.length + bends.length;
    f.fire('pointermove', 40, 100, 40);
    assert.equal(moves.length + bends.length, total); cases++;
  }
  {
    const f = fixture(rotated, 'overview', 400, 20);
    let position;
    f.context.u = { over: f.el };
    f.context.d = { track: {}, duration: 240, jumpTo: value => position = value };
    vm.runInContext(section("    u.over.addEventListener('pointerdown'", "    d.on('*'"), f.context);
    f.fire('pointerdown', 100, 10); close(position, 60);
    f.fire('pointerdown', 300, 10); close(position, 180); cases++;
  }
  {
    const f = fixture(rotated, 'browse', 32, 32); const selections = [];
    f.context.browseKnob = f.el; f.context.moveSelection = value => selections.push(value);
    vm.runInContext(section('  let browseDrag = null;', '  // ---------- 屏幕绘制'), f.context);
    f.fire('pointerdown', 16, 16); f.fire('pointermove', 16, 52);
    assert.equal(selections[0], 2);
    f.resize(); f.fire('pointermove', 16, 100);
    assert.equal(selections.length, 1); cases++;
  }
}
console.log(`PASS: ${cases} real-handler cases; normal/rotated knobs, channel/tempo/crossfaders, track clicks, jog scratch/bend, waveform seek, browse, and resize cancellation.`);
