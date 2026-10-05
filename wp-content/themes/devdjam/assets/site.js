(() => {
  'use strict';
  const config = window.DEVDJAM;
  const audio = document.getElementById('devdjam-audio');
  const audioB = document.getElementById('devdjam-audio-b');
  const deck = document.querySelector('[data-player]');
  if (!config || !audio || !audioB || !deck || typeof config.createEngine !== 'function') return;

  const $ = (selector) => deck.querySelector(selector);
  const seek = $('[data-seek]');
  const queue = $('[data-queue-list]');
  const status = $('[data-player-status]');
  const retry = $('[data-player-retry]');
  const state = { tracks: [], index: -1, queueController: null, error: null, shuffle: false };
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* 偏好可选 */ } },
  };
  const sparkColors = ['#7fe9ff', '#ff5fd0', '#ffe94a', '#7dff5a', '#b21ed6'];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let seeking = false;

  // ---------- 界面文案中英切换：英文原文作键 ----------
  const zh = {
    home: '首页', lang: '语言', fx: '动效', music: '音乐', beats: '节拍', blog: '杂谈', links: '链接', about: '关于', guestbook: '留言簿', author: '作者',
    'control panel': '控制面板', calendar: '日历', search: '搜索', error: '错误',
    latest: '最新', 'open >>': '打开 >>', 'read >>': '阅读 >>', '<< back': '<< 返回', ok: '好', play: '播放', pause: '暂停', retry: '重试', go: '搜',
    'nothing here yet': '这里还什么都没有', 'no beats yet': '还没有节拍', 'no tape': '没有磁带', 'no entries yet': '还没有留言',
    stopped: '已停止', queue: '队列', empty: '空', vol: '音量', admin: '后台', 'now playing': '正在播放', paused: '已暂停',
    playing: '播放中', loading: '加载中', ready: '就绪', buffering: '缓冲中', end: '结束', 'queue offline': '曲库离线',
    'not available': '不可用', 'tap play again': '再点一次播放', "can't play this file": '无法播放这个文件',
    language: '语言', theme: '配色', effects: '动效', on: '开', off: '关', milk: '牛奶', ink: '墨', cherry: '樱桃',
    'dj deck': '打碟机', cue: '起点', loop: '循环', shuffle: '随机', pitch: '变速', low: '低', mid: '中', hi: '高',
    visitors: '访客', 'last updated': '最近更新', rss: '订阅', muted: '已静音', unmuted: '取消静音',
    'sign the guestbook': '写下留言', name: '名字', email: '邮箱', message: '留言', send: '发送', 'awaiting approval': '等待审核', 'login required': '需要登录',
    'dj controller': '打碟控制台', 'thanks for visiting': '谢谢来访', title: '曲名', 'double-click row to load': '双击整行装载',
  };
  let lang = storage.get('dj-lang') === 'zh' ? 'zh' : 'en';
  const t = (key) => (lang === 'zh' && zh[key]) || key;
  function applyLanguage() {
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-lang-select]').forEach((select) => { select.value = lang; });
    document.querySelectorAll('button[data-set-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.setLang === lang));
    });
    const submit = document.getElementById('submit');
    if (submit) submit.value = t('send');
  }
  const time = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };
  const activeTrack = () => state.tracks[state.index];
  const mediaURL = (value) => {
    try {
      const url = new URL(value, config.homeUrl);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  function message(key) { status.dataset.i18n = key; status.textContent = t(key); }

  // ---------- 音频引擎：Deck 1 = 全站常驻播放器，Deck 2 只在放大的控制台里装载 ----------
  const engine = config.createEngine({ elements: [audio, audioB], workletUrl: config.workletUrl });
  config.engine = engine; // 仅挂在 DEVDJAM 命名空间下，便于站长在控制台排查与自动化验收
  const [deckA, deckB] = engine.decks;
  const { SAMPLE_NAMES } = config.audioConstants;
  const REV_SECONDS = 1.8; // 33⅓ 转/分钟，唱盘一圈 = 1.8 秒音频
  const effectsOn = () => document.documentElement.dataset.effects !== 'off';
  // 已有过用户交互才创建 AudioContext，避免浏览器"未经手势启动"的警告
  const mayStartAudio = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;

  // 热点 / CUE 点按曲目存本机；键名加前缀，保证按写入顺序淘汰
  const cueStore = {
    read() { try { return JSON.parse(localStorage.getItem('dj-cues') || '{}'); } catch { return {}; } },
    get(id) { return this.read()[`t${id}`] || null; },
    set(id, value) {
      const all = this.read();
      delete all[`t${id}`];
      all[`t${id}`] = value;
      Object.keys(all).slice(0, -60).forEach((key) => delete all[key]);
      try { localStorage.setItem('dj-cues', JSON.stringify(all)); } catch { /* 可选 */ }
    },
  };
  engine.decks.forEach((d) => {
    const persist = () => { if (d.track) cueStore.set(d.track.id, { cue: d.cue, hot: d.hotcues, grid: d.gridOverride }); };
    d.on('cues', persist);
    d.on('grid', persist);
  });

  // ---------- 参数存储：同一参数可有多个视图（紧凑滑条 / 控制台旋钮推子），单一数据源 ----------
  const params = new Map();
  function defineParam(id, spec) {
    params.set(id, { step: 0.05, bipolar: false, text: (v) => `${Math.round(v * 100)}%`, ...spec, value: spec.def, views: new Set() });
  }
  function setParam(id, value, { apply = true, from = null } = {}) {
    const p = params.get(id);
    if (!p) return;
    const v = Number(value) || 0;
    p.value = apply ? clamp(v, p.min, p.max) : v;
    if (apply) p.apply(p.value);
    p.views.forEach((view) => { if (view !== from) view(p.value); });
  }
  const savedVolume = Number(storage.get('devdjam-volume'));
  const signed = (v, digits = 1, unit = '') => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}${unit}`;
  defineParam('master', {
    min: 0, max: 1, def: storage.get('devdjam-volume') !== null && Number.isFinite(savedVolume) ? clamp(savedVolume, 0, 1) : 0.7,
    apply: (v) => { engine.set('master', v); storage.set('devdjam-volume', String(v)); },
  });
  defineParam('xfader', { min: 0, max: 1, def: 0.5, apply: (v) => engine.set('xfader', v), text: (v) => `${Math.round((1 - v) * 100)} / ${Math.round(v * 100)}` });
  defineParam('fx.level', { min: 0, max: 1, def: 0.5, apply: (v) => engine.set('fx.level', v) });
  [1, 2].forEach((n) => {
    ['trim', 'hi', 'mid', 'low', 'cfx'].forEach((key) => defineParam(`ch${n}.${key}`, {
      min: -1, max: 1, def: 0, bipolar: true, apply: (v) => engine.set(`ch${n}.${key}`, v),
      text: key === 'cfx' ? (v) => (Math.abs(v) < 0.03 ? 'off' : `${v < 0 ? 'LPF' : 'HPF'} ${Math.round(Math.abs(v) * 100)}%`)
        : key === 'trim' ? (v) => signed(12 * v, 1, 'dB') : (v) => (v <= -0.99 ? 'kill' : signed(v < 0 ? 26 * v : 6 * v, 1, 'dB')),
    }));
    defineParam(`ch${n}.fader`, { min: 0, max: 1, def: 1, apply: (v) => engine.set(`ch${n}.fader`, v) });
    defineParam(`d${n}.tempo`, { min: -10, max: 10, def: 0, step: 0.1, bipolar: true, apply: (v) => engine.decks[n - 1].setTempo(v), text: (v) => signed(v, 1, '%') });
  });
  setParam('master', params.get('master').value);

  // 原生滑条（紧凑播放器）绑定到参数
  function bindInput(input, id) {
    if (!input) return;
    const view = (v) => { input.value = String(v); };
    params.get(id).views.add(view);
    view(params.get(id).value);
    input.addEventListener('input', () => setParam(id, input.value, { from: view }));
  }
  bindInput($('[data-volume]'), 'master');
  bindInput($('[data-pitch]'), 'd1.tempo');
  deck.querySelectorAll('[data-eq]').forEach((input) => bindInput(input, `ch1.${input.dataset.eq}`));

  // 手机竖屏时控制台顺时针旋转 90°；所有拖动统一换回控件自身的坐标。
  function pointerFrame(el) {
    const box = el.getBoundingClientRect();
    const rotated = getComputedStyle(el).getPropertyValue('--deck-rotated').trim() === '1';
    return {
      width: rotated ? box.height : box.width,
      height: rotated ? box.width : box.height,
      point: (event) => rotated
        ? { x: event.clientY - box.top, y: box.right - event.clientX }
        : { x: event.clientX - box.left, y: event.clientY - box.top },
    };
  }

  // 控制台旋钮 / 推子：指针拖动、滚轮、键盘、双击复位；抓住推子帽为相对拖动，点槽位直接跳
  function mountControl(el) {
    const id = el.dataset.param;
    const p = params.get(id);
    if (!p) return;
    const knob = el.classList.contains('ctl-knob');
    const horizontal = el.classList.contains('h');
    const invert = el.dataset.invert === '1';
    el.setAttribute('role', 'slider');
    el.tabIndex = 0;
    if (!knob) el.setAttribute('aria-orientation', horizontal ? 'horizontal' : 'vertical');
    const ratio = (v) => (clamp(v, p.min, p.max) - p.min) / (p.max - p.min);
    const view = (v) => {
      const r = ratio(v);
      if (knob) {
        const turn = -135 + r * 270;
        el.style.setProperty('--turn', `${turn}deg`);
        el.style.setProperty('--a0', `${p.bipolar ? Math.min(0, turn) : -135}deg`);
        el.style.setProperty('--a1', `${p.bipolar ? Math.max(0, turn) : turn}deg`);
      } else {
        el.style.setProperty('--pos', (horizontal || invert ? r : 1 - r).toFixed(4));
      }
      el.setAttribute('aria-valuemin', String(p.min));
      el.setAttribute('aria-valuemax', String(p.max));
      el.setAttribute('aria-valuenow', String(Math.round(v * 100) / 100));
      el.setAttribute('aria-valuetext', p.text(v));
    };
    p.views.add(view);
    view(p.value);
    const set = (v) => setParam(id, v);
    let drag = null;
    const valueAt = (event) => {
      const { frame } = drag;
      const point = frame.point(event);
      let r = horizontal ? (point.x - 7) / (frame.width - 14) : (point.y - 7) / (frame.height - 14);
      r = clamp(r, 0, 1);
      if (!horizontal && !invert) r = 1 - r;
      return p.min + r * (p.max - p.min);
    };
    el.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      el.focus({ preventScroll: true });
      try { el.setPointerCapture(event.pointerId); } catch { /* 可选 */ }
      el.classList.add('is-active');
      engine.start();
      const frame = pointerFrame(el);
      const point = frame.point(event);
      if (knob) { drag = { frame, y: point.y, v: p.value }; return; }
      const cap = el.querySelector('.cap').getBoundingClientRect();
      const onCap = event.clientX >= cap.left - 3 && event.clientX <= cap.right + 3 && event.clientY >= cap.top - 3 && event.clientY <= cap.bottom + 3;
      drag = { frame, start: horizontal ? point.x : point.y, v: p.value, relative: onCap || el.classList.contains('tempo') };
      if (!drag.relative) set(valueAt(event));
    });
    el.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const range = p.max - p.min;
      const point = drag.frame.point(event);
      if (knob) { set(drag.v + ((drag.y - point.y) / (event.shiftKey ? 640 : 160)) * range); return; }
      if (!drag.relative) { set(valueAt(event)); return; }
      const size = (horizontal ? drag.frame.width : drag.frame.height) - 14;
      let delta = ((horizontal ? point.x : point.y) - drag.start) / size;
      if (!horizontal && !invert) delta = -delta;
      set(drag.v + delta * range * (event.shiftKey ? 0.25 : 1));
    });
    const end = () => { drag = null; el.classList.remove('is-active'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    window.addEventListener('resize', end);
    el.addEventListener('dblclick', () => set(p.def));
    el.addEventListener('keydown', (event) => {
      const small = p.step;
      const steps = { ArrowUp: small, ArrowRight: small, ArrowDown: -small, ArrowLeft: -small, PageUp: small * 5, PageDown: -small * 5 };
      if (event.key in steps) { event.preventDefault(); set(p.value + steps[event.key]); }
      else if (event.key === 'Home') { event.preventDefault(); set(p.min); }
      else if (event.key === 'End') { event.preventDefault(); set(p.max); }
    });
    if (knob) el.addEventListener('wheel', (event) => { event.preventDefault(); set(p.value - Math.sign(event.deltaY) * p.step); }, { passive: false });
  }

  // 可按住的硬件键：按下 / 松开分别触发（CUE 试听、热点试听、SHIFT、IN 长按）
  function holdable(el, onDown, onUp) {
    if (!el) return;
    let active = false;
    let viaKey = false;
    const down = (event) => { if (active) return; active = true; viaKey = event.type === 'keydown'; el.classList.add('is-down'); onDown(event); };
    const up = (event) => { if (!active) return; active = false; el.classList.remove('is-down'); onUp?.(event); };
    el.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      try { el.setPointerCapture(event.pointerId); } catch { /* 可选 */ }
      engine.start();
      down(event);
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); engine.start(); down(event); }
    });
    el.addEventListener('keyup', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); up(event); } });
    // 键盘按住时焦点被移走（点了别处 / 切走窗口）：keyup 不会再送到这里，视同松开，避免 CUE 试听等卡住
    el.addEventListener('blur', (event) => { if (viaKey) up(event); });
  }

  // 转盘：顶盘按住拖动 = 搓碟（位置跟手），外圈拖动 = 弯音；键盘 ←/→ 微调，空格播放
  function bindJog(el, d, { rim = 0.78, onToggle } = {}) {
    if (!el) return;
    let drag = null;
    let idle = 0;
    const settle = () => {
      if (!drag) return;
      if (drag.type === 'scratch') { drag.vel = 0; d.scratchTo(drag.target, 0); }
      else { drag.amount = 0; d.setBend(0); }
    };
    const step = (event) => {
      const point = drag.frame.point(event);
      const angle = Math.atan2(point.y - drag.cy, point.x - drag.cx);
      let delta = angle - drag.angle;
      if (delta > Math.PI) delta -= 2 * Math.PI; else if (delta < -Math.PI) delta += 2 * Math.PI;
      drag.angle = angle;
      const dt = Math.max(1, event.timeStamp - drag.t) / 1000;
      drag.t = event.timeStamp;
      if (drag.type === 'scratch') {
        drag.total += delta;
        drag.target = drag.base + (drag.total / (2 * Math.PI)) * REV_SECONDS;
        drag.vel = drag.vel * 0.5 + (((delta / (2 * Math.PI)) * REV_SECONDS) / dt) * 0.5;
        d.scratchTo(drag.target, clamp(drag.vel, -6, 6));
      } else {
        drag.amount = clamp(drag.amount * 0.6 + (delta / dt / (2 * Math.PI)) * 0.12 * 0.4, -0.5, 0.5);
        d.setBend(drag.amount);
      }
      clearTimeout(idle);
      idle = setTimeout(settle, 45);
    };
    el.addEventListener('pointerdown', (event) => {
      // 第二个触点（多指 / 手掌）不接管：否则会覆盖正在进行的手势，并丢掉"搓碟前是否在播放"
      if (event.button !== 0 || !d.track || drag) return;
      const frame = pointerFrame(el);
      const point = frame.point(event);
      const cx = frame.width / 2;
      const cy = frame.height / 2;
      const r = Math.hypot(point.x - cx, point.y - cy) / (frame.width / 2);
      if (r > 1.02) return;
      event.preventDefault();
      el.focus({ preventScroll: true });
      try { el.setPointerCapture(event.pointerId); } catch { /* 可选 */ }
      const angle = Math.atan2(point.y - cy, point.x - cx);
      if (r <= rim) {
        d.scratchStart();
        const base = d.headPosition();
        drag = { type: 'scratch', id: event.pointerId, frame, cx, cy, angle, t: event.timeStamp, total: 0, base, target: base, vel: 0 };
        el.classList.add('is-touch');
        deck.classList.toggle('is-scratching', d === deckA);
      } else {
        engine.start();
        drag = { type: 'bend', id: event.pointerId, frame, cx, cy, angle, t: event.timeStamp, amount: 0 };
        el.classList.add('is-bend');
      }
      wake();
    });
    el.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
      (events.length ? events : [event]).forEach(step);
    });
    const end = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      clearTimeout(idle);
      if (drag.type === 'scratch') d.scratchEnd(); else d.setBend(0);
      drag = null;
      el.classList.remove('is-touch', 'is-bend');
      deck.classList.remove('is-scratching');
      wake();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    window.addEventListener('resize', () => { if (drag) end({ pointerId: drag.id }); });
    el.addEventListener('keydown', (event) => {
      if (!d.track) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const dir = event.key === 'ArrowRight' ? 1 : -1;
        if (d.isPlaying) {
          d.setBend(dir * 0.08);
          clearTimeout(idle);
          idle = setTimeout(() => d.setBend(0), 250);
        } else d.seek(d.position() + dir * d.beatLen());
        wake();
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onToggle();
      }
    });
  }

  // ---------- 紧凑播放器（Deck 1） ----------
  const platter = $('[data-platter]');
  const liveB = $('[data-deck2-live]');
  function broadcast() {
    const track = activeTrack();
    const playing = track && deckA.isPlaying;
    document.querySelectorAll('[data-tray-title]').forEach((el) => { el.textContent = playing ? track.title : t('stopped'); });
  }
  function syncButtons() {
    const hasTrack = state.index >= 0 && !!activeTrack();
    const playing = hasTrack && deckA.isPlaying;
    deck.classList.toggle('is-playing', playing);
    document.body.classList.toggle('is-playing', engine.decks.some((d) => d.isPlaying));
    $('[data-play-icon]').hidden = playing;
    $('[data-pause-icon]').hidden = !playing;
    const toggle = $('[data-player-action="toggle"]');
    toggle.disabled = !hasTrack;
    toggle.setAttribute('aria-label', playing ? '暂停' : '播放');
    $('[data-player-action="cue"]').disabled = !hasTrack;
    $('[data-player-action="prev"]').disabled = state.tracks.length < 2;
    $('[data-player-action="next"]').disabled = state.tracks.length < 2;
    if (liveB) liveB.hidden = !deckB.isPlaying;
    document.querySelectorAll('[data-track-id]').forEach((button) => {
      const isCurrent = Number(button.dataset.trackId) === activeTrack()?.id;
      const isTrackPlaying = isCurrent && playing;
      button.classList.toggle('is-current', isCurrent);
      button.classList.toggle('is-playing', isTrackPlaying);
      button.setAttribute('aria-pressed', String(isTrackPlaying));
      const playIcon = button.querySelector('[data-play-icon]');
      const pauseIcon = button.querySelector('[data-pause-icon]');
      const label = button.querySelector('.track-btn-label [data-i18n]') || button.querySelector('.track-btn-label');
      if (playIcon && pauseIcon) {
        playIcon.hidden = isTrackPlaying;
        pauseIcon.hidden = !isTrackPlaying;
      }
      if (label) {
        const actionKey = isTrackPlaying ? 'pause' : 'play';
        label.dataset.i18n = actionKey;
        label.textContent = t(actionKey);
      }
      const title = button.dataset.trackTitle || '';
      button.setAttribute('aria-label', `${t(isTrackPlaying ? 'pause' : 'play')} ${title}`);
    });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    broadcast();
  }
  let compactText = '';
  function progress() {
    const duration = deckA.duration || activeTrack()?.duration || 0;
    const pos = deckA.position();
    const text = `${time(pos)}|${time(duration)}`;
    seek.disabled = !deckA.track || !(duration > 0);
    if (text !== compactText) {
      compactText = text;
      $('[data-elapsed]').textContent = time(pos);
      $('[data-duration]').textContent = time(duration);
      seek.setAttribute('aria-valuetext', `${time(pos)} / ${time(duration)}`);
      platter?.setAttribute('aria-valuenow', String(duration > 0 ? Math.round((pos / duration) * 1000) : 0));
    }
    if (!seeking) seek.value = duration > 0 ? String(Math.round((pos / duration) * 1000)) : '0';
  }
  function updateBpm() {
    const bpm = deckA.bpm();
    $('[data-bpm]').textContent = bpm ? `${bpm.toFixed(1)} bpm` : '--- bpm';
    $('[data-rate]').textContent = signed(deckA.tempo, 1, '%');
  }
  function renderQueue() {
    queue.replaceChildren();
    $('[data-queue-count]').textContent = String(state.tracks.length).padStart(2, '0');
    if (!state.tracks.length) {
      const item = document.createElement('li');
      item.className = 'queue-empty';
      item.dataset.i18n = 'empty';
      item.textContent = t('empty');
      queue.append(item);
    } else {
      state.tracks.forEach((track, index) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.trackId = String(track.id);
        button.textContent = `${String(index + 1).padStart(2, '0')}. ${track.title}`;
        button.setAttribute('aria-label', `播放 ${track.title}`);
        item.append(button);
        queue.append(item);
      });
    }
    syncButtons();
    renderBrowser();
  }
  function renderTrack() {
    const track = activeTrack();
    const title = $('[data-track-title]');
    title.textContent = track?.title || t('no tape');
    if (track) delete title.dataset.i18n; else title.dataset.i18n = 'no tape';
    if (track && 'mediaSession' in navigator && 'MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title, artist: config.siteName || 'DEVDJAM', album: 'DEVDJAM',
        artwork: track.cover ? [{ src: track.cover }] : [],
      });
    } else if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    progress();
    syncButtons();
    updateBpm();
  }
  function playError(error) {
    if (error?.name === 'AbortError') return;
    state.error = 'audio';
    message(error?.name === 'NotAllowedError' ? 'tap play again' : "can't play this file");
    retry.hidden = false;
    syncButtons();
  }
  function play() {
    if (!activeTrack()) return;
    state.error = null;
    retry.hidden = true;
    if (!deckA.ready) message('loading');
    deckA.play().catch(playError);
  }
  function toggleA() { if (deckA.isPlaying) deckA.pause(); else play(); }
  function selectTrack(index, autoplay = true) {
    if (index < 0 || index >= state.tracks.length) return;
    const track = state.tracks[index];
    const changed = index !== state.index || deckA.track?.url !== track.url || state.error === 'audio';
    state.index = index;
    state.error = null;
    retry.hidden = true;
    if (changed) deckA.load(track, { cues: cueStore.get(track.id) });
    renderTrack();
    message('ready');
    if (autoplay) play();
  }
  async function loadTracks() {
    state.queueController?.abort();
    const controller = new AbortController();
    state.queueController = controller;
    try {
      const response = await fetch(config.tracksUrl, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Queue unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid queue');
      const old = activeTrack();
      const tracks = data.filter((item) => Number.isInteger(item.id) && typeof item.title === 'string' && typeof item.url === 'string' && mediaURL(item.url))
        .map((item) => ({ ...item, url: mediaURL(item.url), cover: item.cover ? mediaURL(item.cover) : '', duration: Number(item.duration) || 0, bpm: Number(item.bpm) || 0 }));
      state.tracks = tracks;
      const nextIndex = old ? tracks.findIndex((track) => track.id === old.id) : -1;
      if (nextIndex >= 0) {
        state.index = nextIndex;
        if (old.url !== tracks[nextIndex].url) selectTrack(nextIndex, deckA.isPlaying);
        else renderTrack();
      } else if (tracks.length) {
        state.index = -1;
        selectTrack(0, false);
      } else {
        state.index = -1;
        deckA.unload();
        message('stopped');
        renderTrack();
      }
      if (state.error === 'queue') state.error = null;
      retry.hidden = state.error !== 'audio';
      renderQueue();
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (!deckA.isPlaying) message('queue offline');
      state.error = 'queue';
      retry.hidden = false;
    }
  }
  function next() {
    if (!state.tracks.length) return;
    if (state.shuffle && state.tracks.length > 1) {
      let pick = state.index;
      while (pick === state.index) pick = Math.floor(Math.random() * state.tracks.length);
      selectTrack(pick);
    } else selectTrack((state.index + 1) % state.tracks.length);
  }
  function previous() {
    if (deckA.position() > 3) { deckA.jumpTo(0); progress(); return; }
    if (state.tracks.length) selectTrack((state.index - 1 + state.tracks.length) % state.tracks.length);
  }
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-track-id]');
    if (!button) return;
    const id = Number(button.dataset.trackId);
    if (!state.tracks.some((track) => track.id === id)) await loadTracks();
    const index = state.tracks.findIndex((track) => track.id === id);
    if (index < 0) { message('not available'); return; }
    if (index === state.index && deckA.isPlaying) deckA.pause();
    else selectTrack(index);
  });
  const playerWin = deck.closest('.window');
  deck.addEventListener('click', (event) => {
    const action = event.target.closest('[data-player-action]')?.dataset.playerAction;
    if (action === 'toggle') toggleA();
    else if (action === 'next') next();
    else if (action === 'prev') previous();
    else if (action === 'cue') { deckA.jumpTo(deckA.cue || 0); progress(); }
    else if (action === 'loop') { deckA.setRepeat(!deckA.repeat); $('[data-player-action="loop"]').setAttribute('aria-pressed', String(deckA.repeat)); }
    else if (action === 'shuffle') { state.shuffle = !state.shuffle; $('[data-player-action="shuffle"]').setAttribute('aria-pressed', String(state.shuffle)); }
    else if (action === 'pitch-reset') setParam('d1.tempo', 0);
    else if (action === 'open-console') playerWin?.querySelector('[data-window-action="max"]')?.click();
  });
  retry.addEventListener('click', () => {
    if (state.error === 'audio' && activeTrack()) selectTrack(state.index);
    else void loadTracks();
  });
  seek.addEventListener('input', () => {
    const duration = deckA.duration || activeTrack()?.duration || 0;
    if (duration > 0) {
      seeking = true;
      // jumpTo：拖到循环外会退出循环（控制台关着时紧凑播放器没有 EXIT 键，否则会被循环困住）
      deckA.jumpTo((Number(seek.value) / 1000) * duration);
      seeking = false;
      progress();
    }
  });
  bindJog(platter, deckA, { rim: 2, onToggle: toggleA });

  let wasPlayingA = false;
  deckA.on('state', () => {
    const now = deckA.isPlaying;
    if (wasPlayingA && !now && deckA.track && !state.error && !deckA.scratching && !deckA.silent) message('paused');
    wasPlayingA = now;
    syncButtons();
    wake();
  });
  deckA.on('status', (kind) => {
    if (kind === 'playing') {
      const track = activeTrack();
      message([track?.bpm ? `${track.bpm} bpm` : '', track?.key || ''].filter(Boolean).join(' / ') || 'playing');
      state.error = null;
      retry.hidden = true;
    } else if (kind === 'buffering' && deckA.isPlaying) message('buffering');
  });
  deckA.on('ended', () => {
    // 控制台打开时像真实唱盘一样停在曲尾；平时按播放列表自动下一首
    if (!consoleOpen && state.index + 1 < state.tracks.length) selectTrack(state.index + 1);
    else { message('end'); syncButtons(); }
  });
  deckA.on('error', () => {
    state.error = 'audio';
    message("can't play this file");
    retry.hidden = false;
    syncButtons();
  });
  deckA.on('tempo', updateBpm);
  deckA.on('analysis', updateBpm);
  deckA.on('meta', () => { progress(); wake(); });
  deckA.on('seek', () => { progress(); wake(); });
  deckB.on('state', syncButtons);
  if ('mediaSession' in navigator) {
    const handlers = { play: () => play(), pause: () => deckA.pause(), previoustrack: previous, nexttrack: next,
      seekto: (details) => { if (Number.isFinite(details.seekTime)) deckA.jumpTo(details.seekTime); } };
    Object.entries(handlers).forEach(([name, handler]) => {
      try { navigator.mediaSession.setActionHandler(name, handler); } catch { /* 可选能力 */ }
    });
  }

  // ---------- 放大后的 DDJ 双盘控制台 ----------
  const pro = $('[data-player-pro]');
  const LOOP_BEATS = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
  const LOOP_LABELS = ['1/4', '1/2', '1', '2', '4', '8', '16', '32'];
  const JUMPS = [-1, 1, -2, 2, -4, 4, -8, 8];
  const RANGES = [6, 10, 16, 50];
  const HOT_COLORS = ['#ff5fd0', '#7fe9ff', '#ffe94a', '#7dff5a', '#c9a0ff', '#ffb35c', '#8fc4ff', '#ff7a7a'];
  const SPANS = [2, 3, 4, 6, 8, 12, 16];
  let spanIndex = 3;
  let consoleOpen = false;
  let keyShift = false;
  let accent = '#ff3d8a';
  let selected = 0;
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);

  const ui = [1, 2].map((n) => {
    const root = pro.querySelector(`[data-ddj-deck="${n}"]`);
    const screen = pro.querySelector(`.scr-deck[data-scr="${n}"]`);
    const zoom = screen.querySelector('[data-scr-canvas="zoom"]');
    const over = screen.querySelector('[data-scr-canvas="overview"]');
    const field = (name) => screen.querySelector(`[data-scr="${name}"]`);
    return {
      n, deck: engine.decks[n - 1], root, mode: 'hotcue', shift: false,
      jog: root.querySelector('[data-jog]'), plate: root.querySelector('[data-jog-plate]'), cover: root.querySelector('[data-jog-cover]'),
      pads: [...root.querySelectorAll('[data-pad]')], padsBox: root.querySelector('.pads'),
      btn: (act) => root.querySelector(`[data-act="${act}"]`),
      masterLed: root.querySelector('[data-master-led]'),
      tempoFader: root.querySelector('.ctl-fader.tempo'),
      fields: { title: field('title'), mode: field('mode'), sync: field('sync'), master: field('master'), loop: field('loop'), bpm: field('bpm'), key: field('key'), tempo: field('tempo'), time: field('time') },
      zoom, over, zoomCtx: zoom.getContext('2d'), overCtx: over.getContext('2d'),
      overImage: document.createElement('canvas'), overDirty: true, overX: -1, text: {},
    };
  });
  const shiftOf = (u) => u.shift || keyShift;
  const setText = (u, key, el, value) => { if (el && u.text[key] !== value) { u.text[key] = value; el.textContent = value; } };

  pro.querySelectorAll('[data-param]').forEach(mountControl);

  function renderPads(u) {
    const d = u.deck;
    u.padsBox.dataset.mode = u.mode;
    u.pads.forEach((pad, i) => {
      let label;
      let lit = false;
      let dim = false;
      let aria;
      if (u.mode === 'hotcue') {
        const at = d.hotcues[i];
        label = String.fromCharCode(65 + i);
        lit = at != null;
        dim = !lit;
        aria = lit ? `Hot cue ${label} ${time(at)}` : `Hot cue ${label}: empty`;
      } else if (u.mode === 'loop') {
        label = LOOP_LABELS[i];
        lit = d.loop.active && d.loop.beats === LOOP_BEATS[i];
        aria = `Beat loop ${label}`;
      } else if (u.mode === 'jump') {
        const j = JUMPS[i];
        label = j < 0 ? `◀${-j}` : `${j}▶`;
        aria = `Beat jump ${j}`;
      } else {
        label = SAMPLE_NAMES[i];
        lit = !!engine.sampler?.active(i);
        aria = `Sampler ${label}`;
      }
      const span = pad.firstElementChild;
      if (span.textContent !== label) span.textContent = label;
      pad.classList.toggle('is-lit', lit);
      pad.classList.toggle('is-dim', dim);
      pad.setAttribute('aria-label', aria);
    });
    u.root.querySelectorAll('[data-pad-mode]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.padMode === u.mode)));
  }

  function renderDeck(u) {
    const d = u.deck;
    const playing = d.isPlaying;
    const atCue = d.track && Math.abs(d.position() - d.cue) < 0.03;
    const play = u.btn('play');
    play.classList.toggle('is-lit', playing);
    play.classList.toggle('is-blink', !playing && !!d.track);
    const cue = u.btn('cue');
    cue.classList.toggle('is-lit', !!d.track && (d.cuePreview || (!playing && atCue)));
    cue.classList.toggle('is-blink', !!d.track && !playing && !atCue);
    u.btn('shift').classList.toggle('is-lit', shiftOf(u));
    u.btn('sync').setAttribute('aria-pressed', String(d.sync));
    u.masterLed.classList.toggle('is-on', engine.masterDeck() === d);
    u.tempoFader?.classList.toggle('is-synced', d.sync);
    u.btn('tap').classList.toggle('is-armed', !!d.gridOverride);
    setText(u, 'range', u.btn('range'), `±${d.range}`);
    const { loop } = d;
    const pending = !d.ready && loop.active;
    u.btn('loop-in').classList.toggle('is-armed', loop.in != null && loop.out == null);
    u.btn('loop-out').classList.toggle('is-lit', loop.active);
    u.btn('loop-exit').classList.toggle('is-lit', loop.active);
    u.btn('loop-exit').classList.toggle('is-blink', pending);
    ['loop-half', 'loop-double'].forEach((act) => { u.btn(act).disabled = loop.out == null; });
    renderPads(u);
    renderFlags(u);
  }

  function renderFlags(u) {
    const d = u.deck;
    const f = u.fields;
    const phase = { empty: 'empty', stream: 'stream', analyzing: 'loading', ready: '', error: 'stream only' }[d.phase] ?? '';
    setText(u, 'mode', f.mode, phase);
    f.mode.hidden = !phase;
    f.mode.classList.toggle('is-busy', d.phase === 'analyzing');
    f.sync.hidden = !d.sync;
    f.master.hidden = engine.masterDeck() !== d;
    f.loop.hidden = !d.loop.active;
    setText(u, 'title', f.title, d.track?.title || t('no tape'));
    setText(u, 'key', f.key, d.track?.key || '--');
    const art = d.track?.cover || '';
    if (u.text.cover !== art) {
      u.text.cover = art;
      if (art) { u.cover.src = art; u.cover.hidden = false; } else { u.cover.hidden = true; u.cover.removeAttribute('src'); }
    }
  }

  function cycleRange(u) {
    const d = u.deck;
    const range = RANGES[(RANGES.indexOf(d.range) + 1) % RANGES.length];
    d.setRange(range);
    const p = params.get(`d${u.n}.tempo`);
    p.min = -range;
    p.max = range;
    if (u.n === 1) { const pitch = $('[data-pitch]'); pitch.min = String(-range); pitch.max = String(range); }
    setParam(`d${u.n}.tempo`, d.tempo, { apply: false });
    renderDeck(u);
  }

  // 装载：Deck 1 跟随站点播放列表；Deck 2 独立。表格不重建（盘号角标由 track 事件就地更新），键盘焦点不丢
  function loadInto(n, index) {
    const track = state.tracks[index];
    if (!track) return;
    engine.start();
    if (n === 1) selectTrack(index, false);
    else deckB.load(track, { cues: cueStore.get(track.id) });
  }

  ui.forEach((u) => {
    const d = u.deck;
    const toggle = u.n === 1 ? toggleA : () => d.toggle().catch(() => {});
    bindJog(u.jog, d, { onToggle: toggle });
    holdable(u.btn('shift'), () => { u.shift = true; renderDeck(u); }, () => { u.shift = false; renderDeck(u); });
    // TAP 在按下瞬间计时（click 要等松手，会带入按压时长的抖动）
    holdable(u.btn('tap'), () => {
      if (shiftOf(u)) d.clearGrid(); else d.tap();
      wake();
    });
    holdable(u.btn('cue'), () => { if (shiftOf(u)) d.toStart(); else d.cueDown(); wake(); }, () => { d.cueUp(); wake(); });
    let loopTimer = 0;
    let loopHeld = false;
    holdable(u.btn('loop-in'), () => {
      loopHeld = false;
      loopTimer = setTimeout(() => { loopHeld = true; d.beatLoop(4); }, 450);
    }, () => {
      clearTimeout(loopTimer);
      if (!loopHeld) d.loopIn();
    });
    u.pads.forEach((pad, index) => {
      let held = ''; // 按下时的垫模式：松手按同一模式收尾，按住热点垫时切了模式也能结束试听
      holdable(pad, () => {
        held = u.mode;
        const shift = shiftOf(u);
        if (held === 'hotcue') d.hotcueDown(index, { shift });
        else if (held === 'loop') d.beatLoop(LOOP_BEATS[index]);
        else if (held === 'jump') d.beatJump(JUMPS[index]);
        else if (engine.sampler) { if (shift) engine.sampler.stop(index); else engine.sampler.trigger(index); }
        wake();
      }, () => { if (held === 'hotcue') d.hotcueUp(index); });
    });
    u.root.addEventListener('click', (event) => {
      const mode = event.target.closest('[data-pad-mode]')?.dataset.padMode;
      if (mode) { u.mode = mode; renderPads(u); return; }
      const act = event.target.closest('[data-act]')?.dataset.act;
      if (act === 'play') {
        engine.start();
        const run = d.playPress({ shift: shiftOf(u) });
        if (u.n === 1) run.catch(playError); else run.catch(() => {});
      } else if (act === 'sync') {
        engine.start();
        if (shiftOf(u)) cycleRange(u); else engine.toggleSync(d);
      } else if (act === 'range') cycleRange(u);
      else if (act === 'loop-out') d.loopOut();
      else if (act === 'loop-exit') d.loopExit();
      else if (act === 'loop-half') d.loopResize(0.5);
      else if (act === 'loop-double') d.loopResize(2);
      wake();
    });
    u.over.addEventListener('pointerdown', (event) => {
      if (!d.track || !(d.duration > 0)) return;
      const frame = pointerFrame(u.over);
      engine.start();
      d.jumpTo(clamp(frame.point(event).x / frame.width, 0, 1) * d.duration);
      wake();
    });
    d.on('*', (type) => {
      if (type === 'track' || type === 'analysis') { u.overDirty = true; renderBrowserBadges(); }
      if (type === 'tempo') setParam(`d${u.n}.tempo`, d.tempo, { apply: false });
      renderDeck(u);
      ui.forEach((other) => { if (other !== u) renderFlags(other); });
      wake();
    });
    d.on('sync-fail', () => {
      const btn = u.btn('sync');
      btn.classList.add('is-blink');
      setTimeout(() => btn.classList.remove('is-blink'), 900);
    });
  });
  const renderShift = () => ui.forEach(renderDeck);
  window.addEventListener('keydown', (event) => { if (event.key === 'Shift' && !keyShift) { keyShift = true; renderShift(); } });
  window.addEventListener('keyup', (event) => { if (event.key === 'Shift') { keyShift = false; renderShift(); } });
  window.addEventListener('blur', () => { if (keyShift) { keyShift = false; renderShift(); } });

  // BEAT FX 与采样器（引擎启动后才存在）
  const fxUnit = pro.querySelector('[data-fx-unit]');
  const fxField = (name) => fxUnit.querySelector(`[data-fx="${name}"]`);
  function renderFx() {
    const fx = engine.fx;
    const name = fx ? fx.type : 'ECHO';
    const channel = fx ? fx.channel : '1';
    fxField('name').textContent = name;
    fxField('beat').textContent = fx ? fx.beatLabel : '1/2';
    const bpm = engine.fxBpm(channel);
    fxField('bpm').textContent = bpm.toFixed(1);
    fxUnit.style.setProperty('--beat', `${(60 / bpm).toFixed(3)}s`);
    fxUnit.querySelector('[data-fx-act="on"]').setAttribute('aria-pressed', String(!!fx?.enabled));
    fxUnit.querySelectorAll('[data-fx-ch]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.fxCh === channel)));
  }
  fxUnit.addEventListener('click', (event) => {
    const act = event.target.closest('[data-fx-act]')?.dataset.fxAct;
    const channel = event.target.closest('[data-fx-ch]')?.dataset.fxCh;
    if (!act && !channel) return;
    engine.start();
    const fx = engine.fx;
    if (!fx) return;
    if (channel) fx.setChannel(channel);
    else if (act === 'on') fx.setOn(!fx.enabled);
    else if (act === 'select') fx.cycleType(keyShift ? -1 : 1);
    else if (act === 'beat-down') fx.stepBeat(-1);
    else if (act === 'beat-up') fx.stepBeat(1);
    renderFx();
  });
  engine.on('start', () => {
    engine.fx.on('change', renderFx);
    engine.sampler.on('change', () => ui.forEach(renderPads));
    renderFx();
  });

  // 屏幕：量化开关与波形缩放
  pro.querySelector('.scr-tools').addEventListener('click', (event) => {
    const act = event.target.closest('[data-screen-act]')?.dataset.screenAct;
    if (act === 'quantize') {
      engine.quantize = !engine.quantize;
      event.target.closest('button').setAttribute('aria-pressed', String(engine.quantize));
    } else if (act === 'zoom-in') spanIndex = Math.max(0, spanIndex - 1);
    else if (act === 'zoom-out') spanIndex = Math.min(SPANS.length - 1, spanIndex + 1);
    wake();
  });

  // ---------- 曲库浏览器：BROWSE 旋钮 / 点选 / 双击装载 ----------
  const libList = pro.querySelector('[data-lib-list]');
  const browseKnob = pro.querySelector('[data-browse]');
  function renderBrowser() {
    pro.querySelector('[data-lib-count]').textContent = String(state.tracks.length).padStart(2, '0');
    libList.replaceChildren();
    selected = clamp(selected, 0, Math.max(0, state.tracks.length - 1));
    if (!state.tracks.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'browser-empty';
      cell.dataset.i18n = 'empty';
      cell.textContent = t('empty');
      row.append(cell);
      libList.append(row);
      return;
    }
    state.tracks.forEach((track, index) => {
      const row = document.createElement('tr');
      row.dataset.idx = String(index);
      const cell = (className, text) => {
        const td = document.createElement('td');
        td.className = className;
        if (text !== undefined) td.textContent = text;
        row.append(td);
        return td;
      };
      cell('c-no', String(index + 1).padStart(2, '0'));
      const art = cell('c-art');
      if (track.cover) {
        const img = document.createElement('img');
        img.src = track.cover;
        img.alt = '';
        img.loading = 'lazy';
        art.append(img);
      }
      cell('c-title', track.title);
      cell('c-num', track.bpm ? String(track.bpm) : '--');
      cell('c-num c-key', track.key || '--');
      cell('c-num c-time', time(track.duration));
      const load = cell('c-load');
      const badges = document.createElement('span');
      badges.className = 'lib-badges';
      load.append(badges);
      [1, 2].forEach((n) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ddj-btn lib-load';
        btn.dataset.loadDeck = String(n);
        const word = document.createElement('span');
        word.className = 'lib-load-word';
        word.textContent = 'load '; // 按钮是弹性容器，普通空格会被当作行尾空白吞掉
        btn.append(word, String(n));
        btn.setAttribute('aria-label', `Load ${track.title} to deck ${n}`);
        load.append(btn);
      });
      libList.append(row);
    });
    renderBrowserBadges();
    renderSelection(false);
  }
  function renderBrowserBadges() {
    libList.querySelectorAll('tr[data-idx]').forEach((row) => {
      const track = state.tracks[Number(row.dataset.idx)];
      const badges = row.querySelector('.lib-badges');
      if (!track || !badges) return;
      badges.replaceChildren();
      ui.forEach((u) => {
        if (u.deck.track?.id !== track.id) return;
        const badge = document.createElement('span');
        badge.className = `lib-deck d${u.n}`;
        badge.textContent = String(u.n);
        badges.append(badge);
      });
    });
  }
  function renderSelection(scroll = true) {
    libList.querySelectorAll('tr[data-idx]').forEach((row) => {
      const on = Number(row.dataset.idx) === selected;
      row.classList.toggle('is-selected', on);
      if (on && scroll) row.scrollIntoView({ block: 'nearest' });
    });
    browseKnob.style.setProperty('--turn', `${selected * 24}deg`);
    browseKnob.setAttribute('aria-valuemax', String(Math.max(1, state.tracks.length)));
    browseKnob.setAttribute('aria-valuenow', String(selected + 1));
    browseKnob.setAttribute('aria-valuetext', state.tracks[selected]?.title || t('empty'));
  }
  const moveSelection = (stepBy) => {
    if (!state.tracks.length) return;
    selected = clamp(selected + stepBy, 0, state.tracks.length - 1);
    renderSelection();
  };
  libList.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-idx]');
    if (!row) return;
    const index = Number(row.dataset.idx);
    const loadBtn = event.target.closest('[data-load-deck]');
    if (loadBtn) { loadInto(Number(loadBtn.dataset.loadDeck), index); return; }
    selected = index;
    renderSelection(false);
  });
  // 双击装载：优先空闲的盘；两台都在放时装到被 Crossfader 推没声的那台，两边都听得见就不动（用 LOAD 键明确指定）
  libList.addEventListener('dblclick', (event) => {
    const row = event.target.closest('tr[data-idx]');
    if (!row || event.target.closest('[data-load-deck]')) return;
    const x = engine.values.xfader;
    const n = !deckA.isPlaying ? 1 : !deckB.isPlaying ? 2 : x > 0.9 ? 1 : x < 0.1 ? 2 : 0;
    if (n) loadInto(n, Number(row.dataset.idx));
  });
  pro.querySelector('.mix-browse').addEventListener('click', (event) => {
    const target = event.target.closest('[data-load]');
    if (target) loadInto(Number(target.dataset.load), selected);
  });
  let browseDrag = null;
  browseKnob.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    browseKnob.focus({ preventScroll: true });
    try { browseKnob.setPointerCapture(event.pointerId); } catch { /* 可选 */ }
    const frame = pointerFrame(browseKnob);
    browseDrag = { frame, y: frame.point(event).y };
  });
  browseKnob.addEventListener('pointermove', (event) => {
    if (!browseDrag) return;
    const steps = Math.trunc((browseDrag.frame.point(event).y - browseDrag.y) / 18);
    if (steps) { browseDrag.y += steps * 18; moveSelection(steps); }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => browseKnob.addEventListener(type, () => { browseDrag = null; }));
  window.addEventListener('resize', () => { browseDrag = null; });
  browseKnob.addEventListener('wheel', (event) => { event.preventDefault(); moveSelection(Math.sign(event.deltaY)); }, { passive: false });
  browseKnob.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); moveSelection(1); }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(-1); }
    else if (event.key === 'Enter') { event.preventDefault(); loadInto(event.shiftKey ? 2 : 1, selected); }
  });

  // ---------- 屏幕绘制：滚动放大波形（拍线 / 热点 / 循环 / 播放头）+ 总览波形 ----------
  function fit(canvas) {
    const ratio = dpr();
    const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  const fitAll = () => ui.forEach((u) => { fit(u.zoom); if (fit(u.over)) u.overDirty = true; });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (consoleOpen) { fitAll(); wake(); } }).observe(pro.querySelector('[data-screen]'));

  function columnMax(arr, b0, b1) {
    let m = 0;
    for (let b = b0; b < b1; b += 1) if (arr[b] > m) m = arr[b];
    return m;
  }
  function drawWave(g, a, t0, pxPerSec, w, h, stepPx) {
    const mid = h / 2;
    const bps = a.binsPerSec;
    const n = a.peak.length;
    const layer = (arr, scale, color) => {
      g.fillStyle = color;
      g.beginPath();
      for (let x = 0; x < w; x += stepPx) {
        const b0 = Math.floor((t0 + x / pxPerSec) * bps);
        const b1 = Math.max(b0 + 1, Math.floor((t0 + (x + stepPx) / pxPerSec) * bps));
        if (b1 <= 0 || b0 >= n) continue;
        const v = (columnMax(arr, Math.max(0, b0), Math.min(n, b1)) / 255) * scale * (mid - 1);
        if (v >= 0.5) g.rect(x, mid - v, stepPx, v * 2);
      }
      g.fill();
    };
    layer(a.peak, 1, '#d9d9d9');
    layer(a.low, 1, accent);
    layer(a.high, 0.7, '#7fe9ff');
  }
  function drawZoom(u, pos) {
    const { zoom: c, zoomCtx: g, deck: d } = u;
    const w = c.width;
    const h = c.height;
    const ratio = dpr();
    g.fillStyle = '#0b0b0b';
    g.fillRect(0, 0, w, h);
    if (!d.track) return;
    const span = SPANS[spanIndex];
    const pxPerSec = w / span;
    const t0 = pos - span / 2;
    const xAt = (sec) => (sec - t0) * pxPerSec;
    const { loop } = d;
    if (loop.in != null) {
      const x0 = xAt(loop.in);
      const x1 = loop.out != null ? xAt(loop.out) : x0 + ratio;
      g.fillStyle = loop.active ? 'rgba(255, 233, 74, .24)' : 'rgba(255, 233, 74, .1)';
      g.fillRect(x0, 0, x1 - x0, h);
    }
    const a = d.analysis;
    if (d.gridBpm()) {
      const beat = d.beatLen();
      const offset = d.gridOffset();
      for (let k = Math.ceil((t0 - offset) / beat); ; k += 1) {
        const x = xAt(offset + k * beat);
        if (x > w) break;
        g.fillStyle = k % 4 === 0 ? '#6a6a6a' : '#2e2e2e';
        g.fillRect(Math.round(x), 0, ratio, h);
      }
    }
    if (a) drawWave(g, a, t0, pxPerSec, w, h, ratio);
    else {
      g.fillStyle = '#8a8a8a';
      g.font = `${10 * ratio}px "Courier New", monospace`;
      g.fillText(d.phase === 'analyzing' ? 'ANALYZING...' : 'STREAM', 8 * ratio, h / 2 + 4 * ratio);
    }
    const marker = (sec, color, label, bottom = false) => {
      const x = xAt(sec);
      if (x < -20 || x > w + 20) return;
      g.fillStyle = color;
      g.fillRect(Math.round(x), 0, ratio, h);
      g.beginPath();
      const y = bottom ? h : 0;
      const dir = bottom ? -1 : 1;
      g.moveTo(x - 4 * ratio, y); g.lineTo(x + 4 * ratio, y); g.lineTo(x, y + dir * 6 * ratio);
      g.fill();
      if (label) {
        g.font = `bold ${9 * ratio}px "Courier New", monospace`;
        g.fillText(label, x + 3 * ratio, bottom ? h - 2 * ratio : 15 * ratio);
      }
    };
    d.hotcues.forEach((at, i) => { if (at != null) marker(at, HOT_COLORS[i], String.fromCharCode(65 + i)); });
    marker(d.cue, '#ffb35c', '', true);
    g.fillStyle = accent;
    g.fillRect(Math.round(w / 2) - ratio, 0, 2 * ratio, h);
  }
  function buildOverview(u) {
    const img = u.overImage;
    img.width = u.over.width;
    img.height = u.over.height;
    const g = img.getContext('2d');
    g.fillStyle = '#0b0b0b';
    g.fillRect(0, 0, img.width, img.height);
    const a = u.deck.analysis;
    if (a) drawWave(g, a, 0, img.width / a.duration, img.width, img.height, 1);
    u.overDirty = false;
    u.overX = -1;
  }
  function drawOverview(u, pos) {
    const { over: c, overCtx: g, deck: d } = u;
    if (u.overDirty) buildOverview(u);
    const duration = d.duration || d.analysis?.duration || 0;
    const w = c.width;
    const h = c.height;
    const x = duration > 0 ? Math.round((pos / duration) * w) : 0;
    const key = `${x}|${d.loop.active}|${d.loop.in}|${d.loop.out}|${d.hotcues.join()}|${d.cue}`;
    if (key === u.overX) return;
    u.overX = key;
    g.drawImage(u.overImage, 0, 0);
    if (!(duration > 0)) return;
    const ratio = dpr();
    g.fillStyle = 'rgba(0, 0, 0, .5)';
    g.fillRect(0, 0, x, h);
    const xAt = (sec) => (sec / duration) * w;
    if (d.loop.in != null && d.loop.out != null) {
      g.fillStyle = d.loop.active ? 'rgba(255, 233, 74, .35)' : 'rgba(255, 233, 74, .15)';
      g.fillRect(xAt(d.loop.in), 0, Math.max(ratio, xAt(d.loop.out) - xAt(d.loop.in)), h);
    }
    d.hotcues.forEach((at, i) => { if (at != null) { g.fillStyle = HOT_COLORS[i]; g.fillRect(Math.round(xAt(at)), 0, ratio, h); } });
    g.fillStyle = '#ffb35c';
    g.fillRect(Math.round(xAt(d.cue)), h - 3 * ratio, 2 * ratio, 3 * ratio);
    g.fillStyle = '#ffffff';
    g.fillRect(x - ratio, 0, 2 * ratio, h);
  }

  // 电平表：峰值换算 dBFS（-48…0），快起慢落
  const meterEls = { ch1: pro.querySelector('[data-meter="ch1"]'), ch2: pro.querySelector('[data-meter="ch2"]'), L: pro.querySelector('[data-meter="L"]'), R: pro.querySelector('[data-meter="R"]') };
  const meterLevel = { ch1: 0, ch2: 0, L: 0, R: 0 };
  const meterShown = { ch1: 0, ch2: 0, L: 0, R: 0 };
  let meterAt = 0;
  function drawMeters(now) {
    const levels = engine.levels();
    const dt = meterAt ? Math.min(0.1, (now - meterAt) / 1000) : 0;
    meterAt = now;
    Object.keys(meterEls).forEach((key) => {
      const peak = levels ? levels[key] : 0;
      const norm = peak > 0 ? clamp((20 * Math.log10(peak) + 48) / 48, 0, 1) : 0;
      const next = Math.max(norm, meterLevel[key] - dt * 0.9);
      meterLevel[key] = next;
      // 只节流 DOM 写入；内部电平每帧照常回落，否则高刷新率屏（≥240Hz）每帧回落量低于阈值，表会卡住不落
      if (Math.abs(next - meterShown[key]) > 0.004 || (next === 0 && meterShown[key] !== 0)) {
        meterShown[key] = next;
        meterEls[key].style.setProperty('--lvl', next.toFixed(3));
      }
    });
  }

  function consoleFrame(now) {
    ui.forEach((u) => {
      const d = u.deck;
      const pos = d.position();
      if (effectsOn() || d.scratching || d.silent) u.plate.style.setProperty('--angle', `${((pos / REV_SECONDS) * 360) % 360}deg`);
      const f = u.fields;
      const bpm = d.bpm();
      setText(u, 'bpm', f.bpm, bpm ? bpm.toFixed(2) : '---.--');
      setText(u, 'tempo', f.tempo, signed(d.tempo, 1, '%'));
      const left = Math.max(0, (d.duration || 0) - pos);
      setText(u, 'time', f.time, d.track ? `-${time(left)}.${Math.floor((left % 1) * 10)}` : '-00:00.0');
      u.jog.setAttribute('aria-valuenow', String(d.duration > 0 ? Math.round((pos / d.duration) * 100) : 0));
      drawZoom(u, pos);
      drawOverview(u, pos);
      const atCue = d.track && Math.abs(pos - d.cue) < 0.03;
      if (u.text.atCue !== atCue) { u.text.atCue = atCue; renderDeck(u); }
    });
    drawMeters(now);
  }
  function compactFrame() {
    progress();
    if (platter && (effectsOn() || deckA.scratching || deckA.silent)) {
      platter.style.setProperty('--angle', `${((deckA.position() / REV_SECONDS) * 360) % 360}deg`);
    }
  }

  let raf = 0;
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    if (consoleOpen) consoleFrame(now); else compactFrame();
    const moving = engine.decks.some((d) => d.isPlaying || d.scratching || d.silent);
    const ringing = consoleOpen && Object.values(meterLevel).some((v) => v > 0);
    if (moving || ringing || (consoleOpen && engine.sampler?.voices.size)) wake();
  }

  // 放大 / 还原：控制台打开时进入演奏模式（按需解码两盘，精确循环与有声搓碟）
  function syncConsole() {
    const open = !!playerWin && playerWin.classList.contains('is-max') && !playerWin.classList.contains('is-unmax');
    if (open === consoleOpen) return;
    consoleOpen = open;
    document.documentElement.classList.toggle('has-player-max', open);
    engine.setPerformance(open);
    if (open) {
      if (mayStartAudio()) engine.start();
      accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accent;
      fitAll();
      ui.forEach((u) => { u.overDirty = true; u.overX = -1; renderDeck(u); });
      renderBrowser();
      renderFx();
    }
    wake();
  }
  if (playerWin) new MutationObserver(syncConsole).observe(playerWin, { attributes: true, attributeFilter: ['class'] });

  // ---------- 站内导航：只替换正文，音频保持挂载 ----------
  // 页面 HTML 缓存 + 悬停预取：命中缓存时立即切换，再后台刷新。
  const pages = new Map();
  const pending = new Map();
  let navigation = null;
  let contentURL = new URL(location.href);
  const live = document.querySelector('.navigation-status');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  history.replaceState({ ...history.state, dj: true, scrollY: window.scrollY }, '', location.href);
  let scrollTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (!navigation) history.replaceState({ ...history.state, dj: true, scrollY: window.scrollY }, '', location.href);
    }, 120);
  }, { passive: true });

  const pageKey = (url) => url.origin + url.pathname + url.search;
  function fetchPage(url, signal) {
    const key = pageKey(url);
    if (pending.has(key)) return pending.get(key);
    const request = (async () => {
      const response = await fetch(url.href, { credentials: 'same-origin', headers: { Accept: 'text/html' }, signal });
      if ((!response.ok && response.status !== 404) || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Navigation failed');
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (!doc.getElementById('site-content')) throw new Error('Not a DEVDJAM page');
      const page = { doc, url: new URL(response.url), at: Date.now() };
      pages.set(key, page);
      return page;
    })();
    pending.set(key, request);
    request.catch(() => {}).finally(() => pending.delete(key));
    return request;
  }
  function prefetch(url) {
    const key = pageKey(url);
    const cached = pages.get(key);
    if (pending.has(key) || (cached && Date.now() - cached.at < 60000)) return;
    fetchPage(url).catch(() => {});
  }
  function render(page, url, { push, scrollY } = {}) {
    const currentMain = document.getElementById('site-content');
    const incoming = page.doc.getElementById('site-content').cloneNode(true);
    incoming.querySelectorAll('script').forEach((script) => script.remove());
    currentMain.replaceWith(incoming);
    document.title = page.doc.title;
    const canonical = page.doc.querySelector('link[rel="canonical"]');
    document.querySelector('link[rel="canonical"]')?.remove();
    if (canonical) document.head.append(canonical.cloneNode(true));
    const resolvedURL = new URL(page.url);
    if (url.hash) resolvedURL.hash = url.hash;
    if (push) history.pushState({ dj: true, scrollY: 0 }, '', resolvedURL.href);
    contentURL = resolvedURL;
    const view = incoming.dataset.view;
    document.querySelectorAll('[data-nav]').forEach((link) => {
      if (link.dataset.nav === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const titleText = document.querySelector('.win-content .title-bar-text');
    if (titleText) {
      // 同步 data-i18n，否则随后的 applyLanguage() 会把标题改回首次加载页的名字
      const label = titleText.querySelector('span');
      label.dataset.i18n = incoming.dataset.title || view;
      label.textContent = t(label.dataset.i18n);
      const titleIcon = titleText.querySelector('img');
      const freshIcon = page.doc.querySelector('.win-content .title-bar-text img');
      if (titleIcon && freshIcon) titleIcon.src = freshIcon.src;
    }
    incoming.focus({ preventScroll: true });
    incoming.scrollTop = 0;
    const hashTarget = resolvedURL.hash ? document.getElementById(decodeURIComponent(resolvedURL.hash.slice(1))) : null;
    if (hashTarget) {
      hashTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    live.textContent = `已打开 ${page.doc.title}`;
    applyLanguage();
    syncButtons();
    if (view === 'beats' || incoming.querySelector('[data-track-id]')) void loadTracks();
  }
  function endNavigation(controller) {
    if (navigation === controller) {
      document.getElementById('site-content')?.removeAttribute('aria-busy');
      navigation = null;
    }
  }
  async function navigate(url, { push = true, scrollY } = {}) {
    navigation?.abort();
    const controller = new AbortController();
    navigation = controller;
    if (push) history.replaceState({ ...history.state, dj: true, scrollY: window.scrollY }, '', location.href);
    const key = pageKey(url);
    const cached = pages.get(key);
    if (cached) {
      render(cached, url, { push, scrollY });
      endNavigation(controller);
      // 缓存超过 60 秒则后台刷新正文
      if (Date.now() - cached.at > 60000) {
        fetchPage(url).then((fresh) => {
          if (contentURL.pathname === fresh.url.pathname && contentURL.search === fresh.url.search
            && fresh.doc.getElementById('site-content').innerHTML !== cached.doc.getElementById('site-content').innerHTML) {
            render(fresh, url, { push: false, scrollY: window.scrollY });
          }
        }).catch(() => {});
      }
      return;
    }
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 18000);
    document.getElementById('site-content').setAttribute('aria-busy', 'true');
    live.textContent = '正在打开页面…';
    try {
      const page = await fetchPage(url, controller.signal);
      if (navigation !== controller) return;
      render(page, url, { push, scrollY });
    } catch (error) {
      if (error.name === 'AbortError' && !timedOut) return;
      location.assign(url.href);
    } finally {
      clearTimeout(timeout);
      endNavigation(controller);
    }
  }
  function internalURL(link) {
    if (!link || link.hasAttribute('download') || link.hasAttribute('data-full-navigation') || (link.target && link.target !== '_self')) return null;
    let url;
    try { url = new URL(link.href, location.href); } catch { return null; }
    if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)
      || /\/(wp-admin|wp-login\.php|wp-json|wp-content|feed)(\/|\?|$)/.test(url.pathname)
      || /\.(mp3|wav|ogg|m4a|zip|pdf|png|jpe?g|webp|gif)$/i.test(url.pathname)) return null;
    return url;
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = internalURL(link);
    if (!url) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault();
    void navigate(url);
  });
  const prefetchFromEvent = (event) => {
    const url = internalURL(event.target.closest?.('a[href]'));
    if (url && pageKey(url) !== pageKey(contentURL)) prefetch(url);
  };
  document.addEventListener('pointerenter', prefetchFromEvent, true);
  document.addEventListener('focusin', prefetchFromEvent);
  document.addEventListener('touchstart', prefetchFromEvent, { passive: true });
  window.addEventListener('popstate', (event) => {
    const url = new URL(location.href);
    if (url.pathname === contentURL.pathname && url.search === contentURL.search) {
      navigation?.abort();
      endNavigation(navigation);
      window.scrollTo({ top: event.state?.scrollY || 0, behavior: 'instant' });
      return;
    }
    void navigate(url, { push: false, scrollY: event.state?.scrollY || 0 });
  });
  // 空闲时预取主导航，让第一次点击也不用等
  const warmUp = () => document.querySelectorAll('.dock [data-nav]').forEach((link) => { const url = internalURL(link); if (url) prefetch(url); });
  if ('requestIdleCallback' in window) requestIdleCallback(warmUp, { timeout: 4000 }); else setTimeout(warmUp, 1500);

  // ---------- 控制面板：语言 / 配色 ----------
  function syncTheme() {
    if (!['milk', 'ink', 'cherry'].includes(document.documentElement.dataset.theme)) delete document.documentElement.dataset.theme;
    const theme = document.documentElement.dataset.theme || 'milk';
    document.querySelectorAll('button[data-theme]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
  }
  document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-lang-select]')) return;
    lang = event.target.value === 'zh' ? 'zh' : 'en';
    storage.set('dj-lang', lang);
    applyLanguage();
    renderTrack();
  });
  document.addEventListener('click', (event) => {
    const langButton = event.target.closest('button[data-set-lang]');
    if (langButton) {
      lang = langButton.dataset.setLang === 'zh' ? 'zh' : 'en';
      storage.set('dj-lang', lang);
      applyLanguage();
      renderTrack();
      return;
    }
    const themeButton = event.target.closest('button[data-theme]');
    if (themeButton) setTheme(themeButton.dataset.theme);
  });
  syncTheme();
  applyLanguage();

  // ---------- 窗口管理：最小化（再点恢复）/ 最大化，状态保存在本次会话 ----------
  const windows = [...document.querySelectorAll('.window[data-window]')];
  const session = {
    get() { try { return JSON.parse(sessionStorage.getItem('dj-windows') || '{}'); } catch { return {}; } },
    set(value) { try { sessionStorage.setItem('dj-windows', JSON.stringify(value)); } catch { /* 可选 */ } },
  };
  const windowState = session.get();
  const dim = document.querySelector('[data-dim]');
  let isWindowTransitioning = false;
  const restoreTimers = new WeakMap();
  const windowMotionDuration = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--window-motion-duration')) || 0;
  function applyWindows() {
    let anyMax = false;
    windows.forEach((win) => {
      const mode = windowState[win.dataset.window] || 'open';
      // 弹出前先放一个同高的占位虚框，其他窗口不会跳位
      const ghost = win.previousElementSibling?.classList.contains('window-ghost') ? win.previousElementSibling : null;
      if (mode === 'max' && !ghost) {
        const placeholder = document.createElement('div');
        placeholder.className = 'window-ghost';
        placeholder.style.height = `${win.offsetHeight}px`;
        win.before(placeholder);
      } else if (mode !== 'max' && ghost) {
        ghost.remove();
      }
      const wasMin = win.classList.contains('is-min');
      clearTimeout(restoreTimers.get(win));
      win.classList.remove('is-restoring', 'is-minimizing');
      if (wasMin && mode === 'open') {
        win.classList.add('is-restoring');
        restoreTimers.set(win, setTimeout(() => win.classList.remove('is-restoring'), windowMotionDuration()));
      }
      win.classList.toggle('is-min', mode === 'min');
      win.classList.toggle('is-max', mode === 'max');
      win.classList.remove('is-unmax');
      if (mode === 'max') anyMax = true;
      win.querySelector('[data-window-action="min"]')?.setAttribute('aria-label', mode === 'min' ? 'Restore' : 'Minimize');
      win.querySelector('[data-window-action="max"]')?.setAttribute('aria-label', mode === 'max' ? 'Restore' : 'Maximize');
    });
    if (dim) {
      dim.hidden = false;
      dim.classList.toggle('is-active', anyMax);
    }
    document.documentElement.classList.toggle('has-max', anyMax);
  }
  function restoreMaximized(callback) {
    if (isWindowTransitioning) return;
    const maxWins = windows.filter((w) => w.classList.contains('is-max'));
    if (!maxWins.length) {
      if (callback) callback();
      return;
    }
    isWindowTransitioning = true;
    maxWins.forEach((w) => w.classList.add('is-unmax'));
    if (dim) dim.classList.remove('is-active');
    setTimeout(() => {
      isWindowTransitioning = false;
      Object.keys(windowState).forEach((id) => { if (windowState[id] === 'max') delete windowState[id]; });
      session.set(windowState);
      if (callback) callback();
      applyWindows();
    }, windowMotionDuration());
  }
  dim?.addEventListener('click', () => restoreMaximized());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') restoreMaximized(); });
  function setWindow(id, mode) {
    if (isWindowTransitioning) return;
    if (mode === 'min') {
      const win = windows.find((item) => item.dataset.window === id);
      if (!win) return;
      isWindowTransitioning = true;
      win.classList.remove('is-restoring');
      win.classList.add('is-minimizing');
      if (windowState[id] === 'max') {
        win.classList.add('is-unmax');
        dim?.classList.remove('is-active');
      }
      setTimeout(() => {
        isWindowTransitioning = false;
        windowState[id] = 'min';
        session.set(windowState);
        applyWindows();
      }, windowMotionDuration());
      return;
    }
    if (mode === 'open' && windowState[id] === 'max') {
      restoreMaximized();
      return;
    }
    if (mode === 'open') delete windowState[id]; else windowState[id] = mode;
    session.set(windowState);
    applyWindows();
  }
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-window-action]');
    if (!action || isWindowTransitioning) return;
    const win = action.closest('.window[data-window]');
    if (!win) return;
    const id = win.dataset.window;
    const current = windowState[id] || 'open';
    const target = action.dataset.windowAction;
    if (target === 'max' && current === 'max') {
      restoreMaximized();
      return;
    }
    // 同一时间只弹出一个窗口
    if (target === 'max' && current !== 'max') {
      Object.keys(windowState).forEach((key) => { if (windowState[key] === 'max') delete windowState[key]; });
    }
    setWindow(id, current === target ? 'open' : target);
  });
  document.addEventListener('dblclick', (event) => {
    if (event.target.closest('[data-window-action]')) return;
    const bar = event.target.closest('.title-bar');
    if (!bar) return;
    const win = bar.closest('.window[data-window]');
    if (!win) return;
    const id = win.dataset.window;
    const current = windowState[id] || 'open';
    if (current === 'min') {
      setWindow(id, 'open');
    } else {
      setWindow(id, 'min');
    }
  });
  applyWindows();

  // ---------- 贴纸：点击有动效，并触发对应动作 ----------
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    storage.set('dj-theme', theme);
    syncTheme();
  }
  function burst(el) {
    if (document.documentElement.dataset.effects === 'off') return;
    const box = el.getBoundingClientRect();
    for (let i = 0; i < 8; i += 1) {
      const spark = document.createElement('i');
      spark.className = 'spark';
      spark.style.left = `${box.left + box.width / 2 + (Math.random() - 0.5) * box.width}px`;
      spark.style.top = `${box.top + box.height / 2 + (Math.random() - 0.5) * box.height}px`;
      spark.style.color = sparkColors[i % sparkColors.length];
      spark.textContent = '✦';
      document.body.append(spark);
      spark.addEventListener('animationend', () => spark.remove());
    }
  }

  // ---------- 贴纸拖拽支持：支持拖拽到任意位置，单击仍触发特效与动作 ----------
  const stickerPositions = {
    get() { try { return JSON.parse(sessionStorage.getItem('dj-sticker-pos') || '{}'); } catch { return {}; } },
    set(val) { try { sessionStorage.setItem('dj-sticker-pos', JSON.stringify(val)); } catch {} },
  };

  function detachSticker(stickerEl) {
    if (!stickerEl || stickerEl.parentElement === document.body) return;
    const rect = stickerEl.getBoundingClientRect();
    const initialWidth = `${rect.width}px`;
    const initialHeight = `${rect.height}px`;
    const slot = document.createElement('div');
    slot.className = 'sticker-slot';
    slot.style.width = initialWidth;
    slot.style.height = initialHeight;
    slot.style.flexShrink = '0';
    const stickerId = stickerEl.dataset.stickerId || stickerEl.querySelector('img')?.src?.split('/')?.pop()?.replace('.gif', '');
    if (stickerId) slot.dataset.slotFor = stickerId;
    stickerEl.parentElement.insertBefore(slot, stickerEl);

    stickerEl.style.width = initialWidth;
    stickerEl.style.height = initialHeight;
    stickerEl.style.position = 'absolute';
    stickerEl.style.left = `${rect.left + window.scrollX}px`;
    stickerEl.style.top = `${rect.top + window.scrollY}px`;
    stickerEl.style.margin = '0';
    stickerEl.classList.add('is-dragged');
    document.body.appendChild(stickerEl);
  }

  function checkAndDetachCollidingStickers(activeSticker) {
    if (!activeSticker) return;
    const activeRect = activeSticker.getBoundingClientRect();
    document.querySelectorAll('.sticker').forEach((s) => {
      if (s === activeSticker || s.classList.contains('is-dragged') || s.classList.contains('is-dragging')) return;
      const sRect = s.getBoundingClientRect();
      if (
        activeRect.left < sRect.right &&
        activeRect.right > sRect.left &&
        activeRect.top < sRect.bottom &&
        activeRect.bottom > sRect.top
      ) {
        detachSticker(s);
      }
    });
  }

  function resolveStickerCollisions(activeSticker) {
    if (activeSticker) {
      checkAndDetachCollidingStickers(activeSticker);
    }

    const floating = Array.from(document.querySelectorAll('.sticker.is-dragged, .sticker.is-dragging'));
    if (floating.length < 2) return;

    const maxDocWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth);
    const maxDocHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    const margin = 8;

    const items = floating.map((el) => {
      const w = el.offsetWidth || parseFloat(el.style.width) || 60;
      const h = el.offsetHeight || parseFloat(el.style.height) || 60;
      let left = parseFloat(el.style.left);
      let top = parseFloat(el.style.top);
      if (Number.isNaN(left) || Number.isNaN(top)) {
        const r = el.getBoundingClientRect();
        left = r.left + window.scrollX;
        top = r.top + window.scrollY;
      }
      return {
        el,
        left,
        top,
        width: w,
        height: h,
        isFixed: el === activeSticker,
        moved: false,
      };
    });

    for (let pass = 0; pass < 4; pass++) {
      let anyCollision = false;

      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        for (let j = 0; j < items.length; j++) {
          if (i === j) continue;
          const b = items[j];

          if (b.isFixed) continue;

          const cxA = a.left + a.width / 2;
          const cyA = a.top + a.height / 2;
          const cxB = b.left + b.width / 2;
          const cyB = b.top + b.height / 2;

          let dx = cxB - cxA;
          let dy = cyB - cyA;
          if (dx === 0 && dy === 0) {
            dx = (Math.random() - 0.5) || 1;
            dy = (Math.random() - 0.5) || 1;
          }

          const hx = (a.width + b.width) / 2 + margin;
          const hy = (a.height + b.height) / 2 + margin;

          const overlapX = hx - Math.abs(dx);
          const overlapY = hy - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            anyCollision = true;

            const dirX = dx >= 0 ? 1 : -1;
            const dirY = dy >= 0 ? 1 : -1;

            const limitRight = maxDocWidth - b.width;
            const limitBottom = maxDocHeight - b.height;

            let pushX = 0;
            let pushY = 0;

            if (overlapX <= overlapY) {
              const targetX = b.left + overlapX * dirX;
              if (targetX >= 0 && targetX <= limitRight) {
                pushX = overlapX * dirX;
              } else {
                pushY = overlapY * dirY;
              }
            } else {
              const targetY = b.top + overlapY * dirY;
              if (targetY >= 0 && targetY <= limitBottom) {
                pushY = overlapY * dirY;
              } else {
                pushX = overlapX * dirX;
              }
            }

            if (pushX === 0 && pushY === 0) {
              pushX = overlapX * dirX;
              pushY = overlapY * dirY;
            }

            b.left = Math.max(0, Math.min(limitRight, b.left + pushX));
            b.top = Math.max(0, Math.min(limitBottom, b.top + pushY));
            b.moved = true;
          }
        }
      }

      if (!anyCollision) break;
    }

    items.forEach((item) => {
      if (item.isFixed || !item.moved) return;
      item.el.style.left = `${Math.round(item.left)}px`;
      item.el.style.top = `${Math.round(item.top)}px`;
    });
  }

  function saveAllStickerPositions() {
    const current = stickerPositions.get();
    document.querySelectorAll('.sticker.is-dragged').forEach((s) => {
      const id = s.dataset.stickerId || s.querySelector('img')?.src?.split('/')?.pop()?.replace('.gif', '');
      if (id && s.style.left && s.style.top) {
        current[id] = {
          left: s.style.left,
          top: s.style.top,
          width: s.style.width || `${s.offsetWidth}px`,
          height: s.style.height || `${s.offsetHeight}px`,
        };
      }
    });
    stickerPositions.set(current);
  }

  function applySavedStickers() {
    const saved = stickerPositions.get();
    document.querySelectorAll('.sticker').forEach((sticker) => {
      const id = sticker.dataset.stickerId || sticker.querySelector('img')?.src?.split('/')?.pop()?.replace('.gif', '');
      if (!id || !saved[id]) return;
      const { left, top, width, height } = saved[id];
      if (sticker.parentElement && sticker.parentElement !== document.body) {
        const slot = document.createElement('div');
        slot.className = 'sticker-slot';
        slot.style.width = width || `${sticker.offsetWidth}px`;
        slot.style.height = height || `${sticker.offsetHeight}px`;
        slot.style.flexShrink = '0';
        slot.dataset.slotFor = id;
        sticker.parentElement.insertBefore(slot, sticker);
      }
      if (width) sticker.style.width = width;
      if (height) sticker.style.height = height;
      sticker.style.position = 'absolute';
      sticker.style.left = left;
      sticker.style.top = top;
      sticker.style.margin = '0';
      sticker.classList.add('is-dragged');
      if (sticker.parentElement !== document.body) {
        document.body.appendChild(sticker);
      }
    });
    resolveStickerCollisions(null);
  }

  function initStickerDrag() {
    document.addEventListener('pointerdown', (event) => {
      const sticker = event.target.closest('.sticker');
      if (!sticker || event.button !== 0) return;

      sticker.style.transition = 'none';
      const rect = sticker.getBoundingClientRect();
      const initialWidth = `${rect.width}px`;
      const initialHeight = `${rect.height}px`;
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const startX = event.clientX;
      const startY = event.clientY;
      let hasDragged = false;
      const pointerId = event.pointerId;

      try {
        sticker.setPointerCapture(pointerId);
      } catch {}

      function onPointerMove(moveEvent) {
        if (moveEvent.pointerId !== pointerId) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!hasDragged && Math.hypot(dx, dy) >= 5) {
          hasDragged = true;
          sticker.classList.add('is-dragging');
          detachSticker(sticker);
        }
        if (hasDragged) {
          moveEvent.preventDefault();
          const pageX = moveEvent.pageX || (moveEvent.clientX + window.scrollX);
          const pageY = moveEvent.pageY || (moveEvent.clientY + window.scrollY);
          const maxLeft = Math.max(document.documentElement.scrollWidth, window.innerWidth) - rect.width;
          const maxTop = Math.max(document.documentElement.scrollHeight, window.innerHeight) - rect.height;
          const targetLeft = Math.max(0, Math.min(maxLeft, pageX - offsetX));
          const targetTop = Math.max(0, Math.min(maxTop, pageY - offsetY));
          sticker.style.left = `${targetLeft}px`;
          sticker.style.top = `${targetTop}px`;

          resolveStickerCollisions(sticker);
        }
      }

      function onPointerUp(upEvent) {
        if (upEvent.pointerId !== pointerId) return;
        try {
          sticker.releasePointerCapture(pointerId);
        } catch {}
        sticker.removeEventListener('pointermove', onPointerMove);
        sticker.removeEventListener('pointerup', onPointerUp);
        sticker.removeEventListener('pointercancel', onPointerUp);

        sticker.style.transition = '';
        if (hasDragged) {
          sticker.classList.remove('is-dragging');
          sticker.classList.add('is-dragged');
          sticker._preventClick = true;
          setTimeout(() => { delete sticker._preventClick; }, 120);

          resolveStickerCollisions(null);
          saveAllStickerPositions();
        }
      }

      sticker.addEventListener('pointermove', onPointerMove);
      sticker.addEventListener('pointerup', onPointerUp);
      sticker.addEventListener('pointercancel', onPointerUp);
    });

    // 双击已拖拽贴纸重置回初始位置
    document.addEventListener('dblclick', (event) => {
      const sticker = event.target.closest('.sticker.is-dragged');
      if (!sticker) return;
      const id = sticker.dataset.stickerId || sticker.querySelector('img')?.src?.split('/')?.pop()?.replace('.gif', '');
      if (id) {
        const current = stickerPositions.get();
        delete current[id];
        stickerPositions.set(current);
      }
      const slot = id ? document.querySelector(`.sticker-slot[data-slot-for="${id}"]`) : null;
      if (slot) {
        sticker.classList.remove('is-dragged');
        sticker.style.position = '';
        sticker.style.left = '';
        sticker.style.top = '';
        sticker.style.width = '';
        sticker.style.height = '';
        sticker.style.margin = '';
        sticker.style.transition = '';
        slot.replaceWith(sticker);
        saveAllStickerPositions();
      } else {
        location.reload();
      }
    });
  }

  // ---------- 动效开关 ----------
  const motion = document.querySelector('[data-motion-toggle]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let effects = storage.get('devdjam-effects') !== 'off';
  function syncMotion() {
    const enabled = effects && !reducedMotion.matches;
    document.documentElement.dataset.effects = enabled ? 'on' : 'off';
    if (motion) {
      motion.setAttribute('aria-pressed', String(!enabled));
      motion.setAttribute('aria-label', '减少装饰动效');
      motion.disabled = reducedMotion.matches;
      const label = motion.querySelector('[data-i18n]');
      if (label) { label.dataset.i18n = enabled ? 'on' : 'off'; label.textContent = t(label.dataset.i18n); }
    }
  }
  function toggleEffects() {
    effects = !effects;
    storage.set('devdjam-effects', effects ? 'on' : 'off');
    syncMotion();
  }
  motion?.addEventListener('click', toggleEffects);
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();

  document.addEventListener('click', (event) => {
    const sticker = event.target.closest('button[data-sticker]');
    if (!sticker) return;
    if (sticker._preventClick) {
      delete sticker._preventClick;
      return;
    }
    sticker.className = sticker.className.replace(/\bhit-\S+/g, '').trim();
    void sticker.offsetWidth;
    sticker.classList.add(`hit-${sticker.dataset.anim || 'pop'}`);
    burst(sticker);
    const [action, arg] = sticker.dataset.sticker.split(':');
    if (action === 'play') { if (!activeTrack()) message('no tape'); else toggleA(); }
    else if (action === 'next') next();
    else if (action === 'prev') previous();
    else if (action === 'mute') { engine.setMuted(!engine.muted); message(engine.muted ? 'muted' : 'unmuted'); }
    else if (action === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (action === 'theme') { const order = ['milk', 'ink', 'cherry']; setTheme(order[(order.indexOf(document.documentElement.dataset.theme || 'milk') + 1) % order.length]); }
    else if (action === 'fx') toggleEffects();
    else if (action === 'nav') { const link = document.querySelector(`.dock [data-nav="${arg}"]`); if (link) void navigate(new URL(link.href)); }
  });
  document.addEventListener('animationend', (event) => {
    if (event.target.matches?.('.sticker')) event.target.className = event.target.className.replace(/\bhit-\S+/g, '').trim();
  });

  applySavedStickers();
  initStickerDrag();

  // ---------- 真实访客计数：每个浏览器每天记一次 ----------
  const hits = document.querySelector('[data-hits]');
  if (hits && config.hitsUrl) {
    const today = new Date().toISOString().slice(0, 10);
    const counted = storage.get('dj-hit') === today;
    fetch(config.hitsUrl, { method: counted ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('hits'))))
      .then((data) => { hits.textContent = String(data.hits).padStart(6, '0'); if (!counted) storage.set('dj-hit', today); })
      .catch(() => {});
  }

  // ---------- 鼠标星星拖尾 ----------
  let lastSpark = 0;
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || document.documentElement.dataset.effects === 'off') return;
    const now = performance.now();
    if (now - lastSpark < 45) return;
    lastSpark = now;
    const spark = document.createElement('i');
    spark.className = 'spark';
    spark.style.left = `${event.clientX}px`;
    spark.style.top = `${event.clientY}px`;
    spark.style.color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
    spark.textContent = '✦';
    document.body.append(spark);
    spark.addEventListener('animationend', () => spark.remove());
  }, { passive: true });

  // ---------- 进站页：仅点击 entering 进站，本次会话不再显示 ----------
  const enter = document.querySelector('.enter[data-enter]');
  const enterTrigger = enter?.querySelector('[data-enter-trigger]');
  enterTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    try { sessionStorage.setItem('dj-entered', '1'); } catch { /* 可选 */ }
    enter.classList.add('is-leaving');
    const leave = () => { if (enter.isConnected) enter.remove(); delete document.documentElement.dataset.gate; };
    enter.addEventListener('animationend', leave, { once: true });
    setTimeout(leave, 900);
  });

  // ---------- 任务栏时钟 ----------
  const clocks = document.querySelectorAll('[data-clock]');
  function tick() {
    const now = new Date();
    const text = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    clocks.forEach((clock) => { clock.textContent = text; });
  }
  tick();
  setInterval(tick, 15000);

  void loadTracks();
})();
