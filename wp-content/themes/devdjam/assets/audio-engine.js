/* DEVDJAM 音频引擎：双唱盘（流式 <audio> 与解码缓冲两种模式）、三段隔离 EQ 混音台、BEAT FX、采样器，
   以及拍网格 / 波形分析。只管音频与状态，不碰界面；site.js 通过方法与事件驱动它。 */
(() => {
  'use strict';
  const NS = (window.DEVDJAM = window.DEVDJAM || {});

  const PAD_COUNT = 8;
  const BINS_PER_SEC = 150;   // 波形与起音包络的时间分辨率
  const FX_TYPES = ['ECHO', 'REVERB', 'FLANGER', 'PHASER', 'ROLL', 'TRANS'];
  const FX_BEATS = [1 / 8, 1 / 4, 1 / 2, 3 / 4, 1, 2, 4, 8];
  const SAMPLE_NAMES = ['HORN', 'SIREN', 'LASER', 'RISER', 'BOOM', 'KICK', 'CLAP', 'STAB'];

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dbToGain = (db) => 10 ** (db / 20);
  const glide = (ctx, param, value, tau = 0.012) => param.setTargetAtTime(value, ctx.currentTime, tau);
  // MessageChannel 让出主线程（不受 setTimeout 的 4ms 下限影响），长计算切片执行避免卡顿与回退路径爆音
  const yieldPort = new MessageChannel();
  const yieldQueue = [];
  yieldPort.port1.onmessage = () => yieldQueue.shift()?.();
  const idle = () => new Promise((resolve) => { yieldQueue.push(resolve); yieldPort.port2.postMessage(0); });
  // 长计算的检查点：让出主线程；任务已被新装载作废就中止，不再抢纯 HTTP 回退路径的主线程
  async function checkpoint(stale) {
    await idle();
    if (stale && stale()) {
      const error = new Error('Superseded');
      error.name = 'AbortError';
      throw error;
    }
  }

  class Emitter {
    constructor() { this.listeners = new Map(); }
    on(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(fn);
      return () => this.listeners.get(type)?.delete(fn);
    }
    emit(type, detail) {
      const run = (fn, ...args) => { try { fn(...args); } catch (error) { console.error(error); } };
      this.listeners.get(type)?.forEach((fn) => run(fn, detail, this));
      this.listeners.get('*')?.forEach((fn) => run(fn, type, detail, this));
    }
  }

  function makeFilter(ctx, type, frequency, q = Math.SQRT1_2) {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q;
    return node;
  }
  function makeAnalyser(ctx) {
    const node = ctx.createAnalyser();
    node.fftSize = 1024;
    return node;
  }

  // ---------- 三段隔离 EQ：LR4 分频（220Hz / 2.4kHz），各段可完全切除，全 0 时幅频平直 ----------
  class Isolator {
    constructor(ctx) {
      this.ctx = ctx;
      this.input = ctx.createGain();
      this.output = ctx.createGain();
      this.bands = { low: ctx.createGain(), mid: ctx.createGain(), high: ctx.createGain() };
      const f1 = 220; const f2 = 2400;
      const lowAllpass = makeFilter(ctx, 'allpass', f2); // 补齐高分频点的相位，三段相加仍为全通
      this.input.connect(makeFilter(ctx, 'lowpass', f1)).connect(makeFilter(ctx, 'lowpass', f1))
        .connect(lowAllpass).connect(this.bands.low).connect(this.output);
      const upper = this.input.connect(makeFilter(ctx, 'highpass', f1)).connect(makeFilter(ctx, 'highpass', f1));
      upper.connect(makeFilter(ctx, 'lowpass', f2)).connect(makeFilter(ctx, 'lowpass', f2)).connect(this.bands.mid).connect(this.output);
      upper.connect(makeFilter(ctx, 'highpass', f2)).connect(makeFilter(ctx, 'highpass', f2)).connect(this.bands.high).connect(this.output);
    }

    // v: -1（切除）… 0（0dB）… 1（+6dB），对应 Pioneer −26dB/kill ~ +6dB 的手感
    set(band, v) {
      const gain = v <= -0.99 ? 0 : v < 0 ? dbToGain(26 * v) : dbToGain(6 * v);
      glide(this.ctx, this.bands[band].gain, gain);
    }
  }

  // BEAT FX 插入点：dry 直通；send → 效果器；效果器 → return
  class Insert {
    constructor(ctx) {
      this.input = ctx.createGain();
      this.output = ctx.createGain();
      this.dry = ctx.createGain();
      this.send = ctx.createGain();
      this.ret = ctx.createGain();
      this.send.gain.value = 0;
      this.ret.gain.value = 0;
      this.input.connect(this.dry).connect(this.output);
      this.input.connect(this.send);
      this.ret.connect(this.output);
    }
  }

  // 通道条：TRIM → EQ → CFX(LP/HP) → 电平表 → 推子 → FX 插入 → Crossfader
  class Channel {
    constructor(ctx, out) {
      this.ctx = ctx;
      this.input = ctx.createGain();
      this.trim = ctx.createGain();
      this.eq = new Isolator(ctx);
      this.top = Math.min(20000, ctx.sampleRate / 2 - 200);
      this.lp = makeFilter(ctx, 'lowpass', this.top);
      this.hp = makeFilter(ctx, 'highpass', 10);
      this.meter = makeAnalyser(ctx);
      this.fader = ctx.createGain();
      this.insert = new Insert(ctx);
      this.xf = ctx.createGain();
      this.input.connect(this.trim).connect(this.eq.input);
      this.eq.output.connect(this.lp).connect(this.hp).connect(this.meter).connect(this.fader).connect(this.insert.input);
      this.insert.output.connect(this.xf).connect(out);
    }

    // CFX：中间旁通，左转低通扫到 60Hz，右转高通扫到 8kHz，越靠边谐振越明显
    setCfx(v) {
      const { ctx, lp, hp, top } = this;
      const x = clamp((Math.abs(v) - 0.03) / 0.97, 0, 1);
      const q = Math.SQRT1_2 + 1.8 * x;
      glide(ctx, lp.frequency, v < 0 ? top * (60 / top) ** x : top, 0.02);
      glide(ctx, hp.frequency, v > 0 ? 20 * 400 ** x : 10, 0.02);
      glide(ctx, lp.Q, v < 0 ? q : Math.SQRT1_2, 0.02);
      glide(ctx, hp.Q, v > 0 ? q : Math.SQRT1_2, 0.02);
    }
  }

  // Crossfader：中间两路全开（单盘收听音量不变），两端余弦切出
  const crossfade = (x) => [x <= 0.5 ? 1 : Math.cos((x - 0.5) * Math.PI), x >= 0.5 ? 1 : Math.cos((0.5 - x) * Math.PI)];

  // ---------- 引擎 ----------
  class Engine extends Emitter {
    constructor({ elements, workletUrl }) {
      super();
      this.workletUrl = workletUrl;
      this.ctx = null;
      this.voiceKind = null;
      this.voiceReady = Promise.resolve(null);
      this.values = { master: 0.7, xfader: 0.5, 'fx.level': 0.5 };
      [1, 2].forEach((n) => Object.assign(this.values, {
        [`ch${n}.trim`]: 0, [`ch${n}.hi`]: 0, [`ch${n}.mid`]: 0, [`ch${n}.low`]: 0, [`ch${n}.cfx`]: 0, [`ch${n}.fader`]: 1,
      }));
      this.muted = false;
      this.quantize = true;
      this.performance = false;
      this.channels = [];
      this.fx = null;
      this.sampler = null;
      this.meterBuffer = null;
      this.decks = elements.map((el, index) => new Deck(this, index + 1, el));
      this.applyFallback();
    }

    // 必须在用户手势里调用（播放、装载、打击垫……）；重复调用只负责恢复挂起的上下文
    start() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        this.build();
      } catch (error) {
        console.error(error);
        this.ctx = null;
        return null;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.voiceReady = this.loadVoice();
      this.emit('start');
      this.decks.forEach((deck) => { if (deck.pendingAnalyze) deck.analyze(); });
      return this.ctx;
    }

    build() {
      const { ctx } = this;
      this.masterBus = ctx.createGain();
      // 总线固定为立体声：两路都是单声道音源时也上混成 L=R，否则后面的分离 / 合并只剩左声道有声
      this.masterBus.channelCount = 2;
      this.masterBus.channelCountMode = 'explicit';
      this.masterBus.channelInterpretation = 'speakers';
      this.masterInsert = new Insert(ctx);
      this.masterGain = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.002; limiter.release.value = 0.12;
      const split = ctx.createChannelSplitter(2);
      const merge = ctx.createChannelMerger(2);
      this.meterL = makeAnalyser(ctx);
      this.meterR = makeAnalyser(ctx);
      this.masterBus.connect(this.masterInsert.input);
      this.masterInsert.output.connect(this.masterGain).connect(limiter).connect(split);
      split.connect(this.meterL, 0).connect(merge, 0, 0);
      split.connect(this.meterR, 1).connect(merge, 0, 1);
      merge.connect(ctx.destination);
      this.channels = [new Channel(ctx, this.masterBus), new Channel(ctx, this.masterBus)];
      this.decks.forEach((deck, index) => deck.attach(this.channels[index]));
      this.fx = new BeatFx(this, { 1: this.channels[0].insert, 2: this.channels[1].insert, M: this.masterInsert });
      this.sampler = new Sampler(this, this.masterBus);
      Object.keys(this.values).forEach((id) => this.apply(id));
    }

    async loadVoice() {
      const { ctx } = this;
      if (ctx.audioWorklet && this.workletUrl) {
        try {
          await ctx.audioWorklet.addModule(this.workletUrl);
          this.voiceKind = 'worklet';
          return this.voiceKind;
        } catch (error) {
          console.warn('DEVDJAM: AudioWorklet unavailable, falling back to ScriptProcessor', error);
        }
      }
      this.voiceKind = typeof ctx.createScriptProcessor === 'function' && typeof NS.DeckCore === 'function' ? 'script' : null;
      return this.voiceKind;
    }

    // 缓冲声部：AudioWorklet（音频线程）或 ScriptProcessor（纯 HTTP 下的回退，主线程），接口一致
    createVoice(onMessage) {
      const { ctx } = this;
      if (this.voiceKind === 'worklet') {
        const node = new AudioWorkletNode(ctx, 'devdjam-deck', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
        node.port.onmessage = (event) => onMessage(event.data);
        return {
          node,
          send: (msg, transfer) => node.port.postMessage(msg, transfer || []),
          dispose: () => { node.port.onmessage = null; node.disconnect(); },
        };
      }
      if (this.voiceKind === 'script') {
        const node = ctx.createScriptProcessor(1024, 1, 2);
        const core = new NS.DeckCore(ctx.sampleRate, onMessage);
        node.onaudioprocess = (event) => {
          const out = event.outputBuffer;
          core.process(out.getChannelData(0), out.getChannelData(1), out.length, event.playbackTime);
        };
        return {
          node,
          send: (msg) => core.handle(msg),
          dispose: () => { node.onaudioprocess = null; node.disconnect(); },
        };
      }
      return null;
    }

    set(id, value) {
      this.values[id] = value;
      this.apply(id);
    }

    apply(id) {
      if (!this.ctx) { this.applyFallback(); return; }
      const v = this.values[id];
      const strip = /^ch([12])\.(\w+)$/.exec(id);
      if (strip) {
        const channel = this.channels[strip[1] - 1];
        if (strip[2] === 'trim') glide(this.ctx, channel.trim.gain, dbToGain(12 * v));
        else if (strip[2] === 'fader') glide(this.ctx, channel.fader.gain, v * v);
        else if (strip[2] === 'cfx') channel.setCfx(v);
        else channel.eq.set({ hi: 'high', mid: 'mid', low: 'low' }[strip[2]], v);
      } else if (id === 'xfader') {
        const [a, b] = crossfade(v);
        glide(this.ctx, this.channels[0].xf.gain, a);
        glide(this.ctx, this.channels[1].xf.gain, b);
      } else if (id === 'master') {
        glide(this.ctx, this.masterGain.gain, this.muted ? 0 : v);
      } else if (id === 'fx.level') {
        this.fx.setLevel(v);
      }
    }

    // 尚未创建 AudioContext（或浏览器不支持）时，直接用 <audio> 自身音量
    applyFallback() {
      if (this.ctx) return;
      const [a, b] = crossfade(this.values.xfader);
      this.decks.forEach((deck, index) => {
        const fader = this.values[`ch${index + 1}.fader`];
        deck.el.volume = clamp(this.values.master * fader * fader * (index ? b : a), 0, 1);
        deck.el.muted = this.muted;
      });
    }

    setMuted(on) {
      this.muted = on;
      if (this.ctx) this.apply('master'); else this.applyFallback();
    }

    setPerformance(on) {
      this.performance = on;
      if (on) this.decks.forEach((deck) => { if (deck.track) deck.analyze(); });
      // 控制台在音频启动前就关了（会话恢复为放大、未交互）：取消待办解码，之后的普通播放保持轻量
      else this.decks.forEach((deck) => { deck.pendingAnalyze = false; });
    }

    // 电平：线性峰值（0…1+），界面自行换算 dB 与回落。Safari 14.1 以前没有浮点版本，退回字节版本
    levels() {
      if (!this.ctx) return null;
      const float = typeof this.meterL.getFloatTimeDomainData === 'function';
      if (!this.meterBuffer) this.meterBuffer = float ? new Float32Array(1024) : new Uint8Array(1024);
      const buf = this.meterBuffer;
      const peak = (node) => {
        let p = 0;
        if (float) {
          node.getFloatTimeDomainData(buf);
          for (let i = 0; i < buf.length; i += 1) { const a = buf[i] < 0 ? -buf[i] : buf[i]; if (a > p) p = a; }
          return p;
        }
        node.getByteTimeDomainData(buf);
        for (let i = 0; i < buf.length; i += 1) { const a = Math.abs(buf[i] - 128); if (a > p) p = a; }
        return p / 128;
      };
      return { ch1: peak(this.channels[0].meter), ch2: peak(this.channels[1].meter), L: peak(this.meterL), R: peak(this.meterR) };
    }

    other(deck) { return this.decks.find((d) => d !== deck); }

    // 主控盘：有盘开同步时，另一盘即主盘；否则唯一在放的那盘
    masterDeck() {
      const synced = this.decks.find((d) => d.sync);
      if (synced) return this.other(synced);
      const playing = this.decks.filter((d) => d.isPlaying);
      return playing.length === 1 ? playing[0] : null;
    }

    fxBpm(channel) {
      const deck = channel === '1' ? this.decks[0] : channel === '2' ? this.decks[1]
        : (this.masterDeck() || this.decks.find((d) => d.isPlaying) || this.decks[0]);
      return deck.bpm() || 120;
    }

    toggleSync(deck) {
      if (deck.sync) {
        deck.sync = false;
        deck.emit('sync');
        return true;
      }
      const master = this.other(deck);
      if (!deck.track || !master.track || !deck.gridBpm() || !master.gridBpm()) {
        deck.emit('sync-fail');
        return false;
      }
      if (master.sync) { master.sync = false; master.emit('sync'); }
      deck.sync = true;
      this.matchTempo(deck, master);
      if (master.isPlaying && deck.isPlaying) this.alignPhase(deck, master);
      deck.emit('sync');
      return true;
    }

    // 速度匹配：允许半速 / 倍速对齐（70 BPM 跟 140 BPM 同步）
    matchTempo(slave, master) {
      if (!slave.gridBpm() || !master.gridBpm()) return;
      const target = master.bpm();
      let best = null;
      [0.5, 1, 2].forEach((mul) => {
        const pct = ((target * mul) / slave.gridBpm() - 1) * 100;
        if (!best || Math.abs(pct) < Math.abs(best.pct)) best = { pct, mul };
      });
      slave.syncMul = best.mul;
      slave.setTempo(best.pct, { fromSync: true });
    }

    alignPhase(slave, master) {
      if (!slave.gridBpm() || !master.gridBpm()) return;
      // 两盘都取读头位置，保证比较的是同一时刻
      const masterBeat = master.beatPos(master.headPosition());
      const want = slave.syncMul === 0.5 ? ((masterBeat / 2) % 1 + 1) % 1 : (((masterBeat * slave.syncMul) % 1) + 1) % 1;
      const head = slave.headPosition();
      const have = ((slave.beatPos(head) % 1) + 1) % 1;
      let delta = want - have;
      if (delta > 0.5) delta -= 1;
      if (delta < -0.5) delta += 1;
      if (Math.abs(delta) > 0.004) slave.seek(head + delta * slave.beatLen());
    }

    onTempo(deck) {
      this.decks.forEach((d) => { if (d !== deck && d.sync && this.other(d) === deck) this.matchTempo(d, deck); });
      this.fx?.refresh();
    }

    onPlay(deck) {
      if (deck.sync) {
        const master = this.other(deck);
        if (master.isPlaying) this.alignPhase(deck, master);
      }
      this.fx?.refresh();
    }
  }

  // ---------- 唱盘 ----------
  const analysisCache = new Map();
  function remember(id, analysis) {
    analysisCache.delete(id);
    analysisCache.set(id, analysis);
    while (analysisCache.size > 8) analysisCache.delete(analysisCache.keys().next().value);
  }

  class Deck extends Emitter {
    constructor(engine, id, el) {
      super();
      this.engine = engine;
      this.id = id;
      this.el = el;
      this.track = null;
      this.duration = 0;
      this.mode = 'stream';      // stream：<audio> 边下边播；buffer：解码后由 DSP 声部播放
      this.phase = 'empty';      // empty | stream | analyzing | ready | error
      this.analysis = null;
      this.playing = false;
      this.scratching = false;
      this.silent = null;        // 未解码时的静音拖动定位
      this.tempo = 0;
      this.range = 10;
      this.bend = 0;
      this.sync = false;
      this.syncMul = 1;
      this.repeat = false;
      this.cue = 0;
      this.hotcues = new Array(PAD_COUNT).fill(null);
      this.gridOverride = null;  // TAP 校正后的拍网格 { bpm, offset }，优先于自动分析
      this.taps = [];
      this.seekSeq = 0;          // 跳转序号，用来丢弃声部迟到的旧位置回报
      this.loop = { in: null, out: null, active: false, beats: 0 };
      this.cuePreview = false;
      this.hotPreview = -1;
      this.latched = false;
      this.token = 0;
      this.analyzing = null;
      this.abort = null;
      this.pendingAnalyze = false;
      this.voice = null;
      this.rep = null;
      this.streamGain = null;
      this.bufferGain = null;
      try { el.preservesPitch = false; el.mozPreservesPitch = false; el.webkitPreservesPitch = false; } catch { /* 可选 */ }
      const stream = (type, fn) => el.addEventListener(type, (event) => { if (this.mode === 'stream') fn(event); });
      stream('play', () => this.emit('state'));
      stream('playing', () => { this.emit('status', 'playing'); this.emit('state'); this.engine.onPlay(this); });
      stream('pause', () => this.emit('state'));
      stream('waiting', () => this.emit('status', 'buffering'));
      stream('ended', () => { this.emit('state'); this.finish(); });
      stream('error', () => { if (this.track && el.getAttribute('src')) this.emit('error', el.error); });
      const meta = () => {
        if (this.mode === 'stream' && Number.isFinite(el.duration) && el.duration > 0) {
          this.duration = el.duration;
          this.emit('meta');
        }
      };
      el.addEventListener('loadedmetadata', meta);
      el.addEventListener('durationchange', meta);
    }

    attach(channel) {
      const { ctx } = this.engine;
      this.streamGain = ctx.createGain();
      this.bufferGain = ctx.createGain();
      this.streamGain.gain.value = this.mode === 'stream' ? 1 : 0;
      this.bufferGain.gain.value = this.mode === 'buffer' ? 1 : 0;
      ctx.createMediaElementSource(this.el).connect(this.streamGain).connect(channel.input);
      this.bufferGain.connect(channel.input);
      this.el.volume = 1;
      this.el.muted = false;
    }

    get isPlaying() {
      if (!this.track) return false;
      return this.mode === 'buffer' ? this.playing : !this.el.paused && !this.el.ended;
    }
    get ready() { return this.mode === 'buffer'; }
    rateBase() { return 1 + this.tempo / 100; }
    gridBpm() { return this.gridOverride?.bpm || this.analysis?.bpm || this.track?.bpm || 0; }
    bpm() { return this.gridBpm() * this.rateBase(); }
    beatLen() { const b = this.gridBpm(); return b ? 60 / b : 0.5; }
    gridOffset() { return this.gridOverride?.offset ?? this.analysis?.offset ?? 0; }
    beatPos(t = this.position()) { return (t - this.gridOffset()) / this.beatLen(); }
    snap(t) {
      if (!this.engine.quantize || !this.gridBpm()) return t;
      const b = this.beatLen();
      const o = this.gridOffset();
      return clamp(o + Math.round((t - o) / b) * b, 0, this.maxPos(0.01));
    }
    // 时长未知（元数据未到）时不设上限，避免把位置夹回 0
    maxPos(margin) { return this.duration > 0 ? Math.max(0, this.duration - margin) : Infinity; }
    // 内部触发的播放：浏览器拒绝时由界面层的状态提示处理，这里不抛未捕获的 Promise
    resume() { this.play().catch(() => {}); }

    // 读头位置（秒）：下一条指令生效时刻的位置，不扣输出延迟。
    // 相对操作（跳拍、相位对齐、搓碟基准）必须以它为基准，否则两盘速度不同时会差出 速度×延迟。
    // AudioWorklet 回报来自过去 → 外推到当前；ScriptProcessor 回报在未来（已排队的缓冲末尾）→ 不外推
    headPosition() {
      const { ctx } = this.engine;
      if (this.mode === 'buffer' && this.rep && ctx) {
        const dt = clamp(ctx.currentTime - this.rep.t, 0, 0.1);
        return clamp((this.rep.pos + this.rep.rate * dt * ctx.sampleRate) / ctx.sampleRate, 0, this.duration || 0);
      }
      if (this.silent) return this.silent.pos;
      return this.el.currentTime || 0;
    }

    // 可听位置（秒）：扬声器此刻正在放的位置，用于显示与设 CUE / 热点 / 循环点
    position() {
      const { ctx } = this.engine;
      if (this.mode === 'buffer' && this.rep && ctx) {
        const dt = clamp(ctx.currentTime - (ctx.outputLatency || 0) - this.rep.t, -0.5, 0.1);
        let p = (this.rep.pos + this.rep.rate * dt * ctx.sampleRate) / ctx.sampleRate;
        // 读头刚在循环里回绕时，扬声器还在放回绕前的那一段：把外推结果折回循环区间
        const { loop } = this;
        const len = loop.active ? loop.out - loop.in : 0;
        if (len > 0) {
          const head = this.headPosition();
          if (head >= loop.in && head <= loop.out) {
            if (p < loop.in) p += len * Math.ceil((loop.in - p) / len);
            else if (p > loop.out) p -= len * Math.ceil((p - loop.out) / len);
          }
        }
        return clamp(p, 0, this.duration || 0);
      }
      return this.headPosition();
    }

    rate() {
      if (this.mode === 'buffer') return this.rep ? this.rep.rate : 0;
      return this.isPlaying ? this.el.playbackRate : 0;
    }

    load(track, { autoplay = false, cues = null } = {}) {
      this.reset();
      this.track = track;
      this.phase = 'stream';
      this.analysis = analysisCache.get(track.id) || null;
      this.duration = track.duration || 0;
      this.cue = cues?.cue ?? 0;
      this.hotcues = Array.from({ length: PAD_COUNT }, (_, i) => cues?.hot?.[i] ?? null);
      const grid = cues?.grid;
      this.gridOverride = grid && grid.bpm >= 40 && grid.bpm <= 250 && Number.isFinite(grid.offset) ? { bpm: grid.bpm, offset: grid.offset } : null;
      this.taps = [];
      this.el.src = track.url;
      this.el.load();
      this.applyRate();
      this.emit('track', track);
      this.emit('state');
      this.engine.onTempo(this); // 另一盘若同步在这盘上，换曲后重新对速
      if (this.engine.performance) this.analyze();
      return autoplay ? this.play() : Promise.resolve();
    }

    unload() {
      this.reset();
      this.track = null;
      this.phase = 'empty';
      this.analysis = null;
      this.duration = 0;
      this.el.removeAttribute('src');
      this.el.load();
      this.emit('track', null);
      this.emit('state');
    }

    reset() {
      this.token += 1;
      this.abort?.abort();
      this.abort = null;
      this.analyzing = null;
      this.pendingAnalyze = false;
      this.releaseVoice();
      this.setMode('stream');
      this.el.pause();
      this.playing = false;
      this.scratching = false;
      this.silent = null;
      this.cuePreview = false;
      this.hotPreview = -1;
      this.loop = { in: null, out: null, active: false, beats: 0 };
      this.emit('loop', this.loop);
    }

    setMode(mode) {
      this.mode = mode;
      if (!this.streamGain || !this.engine.ctx) return;
      const t = this.engine.ctx.currentTime;
      this.streamGain.gain.cancelScheduledValues(t);
      this.bufferGain.gain.cancelScheduledValues(t);
      this.streamGain.gain.setValueAtTime(mode === 'stream' ? 1 : 0, t);
      this.bufferGain.gain.setValueAtTime(mode === 'buffer' ? 1 : 0, t);
    }

    releaseVoice() {
      if (!this.voice) return;
      this.voice.send({ type: 'unload' });
      this.voice.dispose();
      this.voice = null;
      this.rep = null;
    }

    play() {
      if (!this.track) return Promise.resolve();
      this.engine.start();
      if (this.mode === 'buffer') {
        if (!this.playing) {
          this.playing = true;
          this.voice.send({ type: 'play' });
          this.emit('state');
          this.emit('status', 'playing');
          this.engine.onPlay(this);
        }
        return Promise.resolve();
      }
      this.applyRate();
      return this.el.play();
    }

    pause({ instant = false } = {}) {
      if (this.mode === 'buffer') {
        if (!this.playing) return;
        this.playing = false;
        this.voice.send({ type: 'pause', instant });
        this.emit('state');
        this.emit('status', 'paused');
        return;
      }
      this.el.pause();
    }

    toggle() {
      if (this.isPlaying) { this.pause(); return Promise.resolve(); }
      return this.play();
    }

    seek(t) {
      if (!this.track) return;
      const target = clamp(t, 0, this.duration > 0 ? this.duration - 0.02 : Math.max(0, t));
      const { ctx } = this.engine;
      if (this.mode === 'buffer') {
        const pos = target * ctx.sampleRate;
        this.seekSeq += 1;
        this.voice.send({ type: 'seek', pos, seq: this.seekSeq });
        this.rep = { pos, rate: this.rep ? this.rep.rate : 0, t: ctx.currentTime, seq: this.seekSeq };
      } else {
        this.el.currentTime = target;
        if (this.silent) this.silent.pos = target;
      }
      this.emit('seek', target);
    }

    // 跳到循环外的点会自动退出循环（与 Pioneer 一致）
    jumpTo(t) {
      if (this.loop.active && (t < this.loop.in || t >= this.loop.out)) {
        this.loop.active = false;
        this.pushLoop();
      }
      this.seek(t);
    }

    applyRate() {
      const base = this.rateBase();
      this.voice?.send({ type: 'tempo', rate: base });
      const r = clamp(base * (1 + this.bend), 0.25, 4);
      if (Math.abs(this.el.playbackRate - r) > 1e-4) this.el.playbackRate = r;
    }

    setTempo(pct, { fromSync = false } = {}) {
      const limit = fromSync ? 50 : this.range;
      if (!fromSync && this.sync) { this.sync = false; this.emit('sync'); }
      this.tempo = clamp(pct, -limit, limit);
      this.applyRate();
      this.emit('tempo', this.tempo);
      this.engine.onTempo(this);
    }

    setRange(range) {
      this.range = range;
      if (!this.sync && Math.abs(this.tempo) > range) this.setTempo(this.tempo);
      else this.emit('tempo', this.tempo);
    }

    // 转盘外圈弯音：临时加减速，松手归零
    setBend(amount) {
      this.bend = clamp(amount, -0.8, 1.5);
      this.voice?.send({ type: 'bend', amount: this.bend });
      const r = clamp(this.rateBase() * (1 + this.bend), 0.25, 4);
      if (this.mode === 'stream' && Math.abs(this.el.playbackRate - r) > 1e-4) this.el.playbackRate = r;
    }

    setRepeat(on) {
      this.repeat = on;
      this.el.loop = on;
    }

    finish() {
      if (this.repeat && this.mode === 'buffer') {
        this.seek(0);
        this.resume();
        return;
      }
      this.emit('ended');
    }

    // ---------- CUE（CDJ 规则） ----------
    cueDown() {
      if (!this.track) return;
      if (this.isPlaying && !this.cuePreview) {
        this.pause({ instant: true });
        this.jumpTo(this.cue);
        return;
      }
      const pos = this.position();
      if (Math.abs(pos - this.cue) > 0.03) {
        this.cue = this.snap(pos);
        this.seek(this.cue);
        this.emit('cues');
        return;
      }
      this.cuePreview = true;
      this.latched = false;
      this.resume();
    }

    cueUp() {
      if (!this.cuePreview) return;
      this.cuePreview = false;
      if (this.latched) { this.latched = false; return; }
      this.pause({ instant: true });
      this.seek(this.cue);
    }

    playPress({ shift = false } = {}) {
      if (!this.track) return Promise.resolve();
      if (shift) { this.jumpTo(this.cue); return this.play(); }
      if (this.cuePreview || this.hotPreview >= 0) { this.latched = true; return Promise.resolve(); }
      return this.toggle();
    }

    toStart() {
      this.pause({ instant: true });
      this.jumpTo(0);
    }

    // ---------- TAP：跟着音乐敲拍，校正自动分析的拍网格 ----------
    // 播放中：对"敲击时的音轨位置 ~ 序号"做最小二乘，斜率 = 拍长（已含变速），截距定拍位；
    // 暂停时只能按敲击间隔估速度。间隔超过 2 秒重新开始计数，至少 4 下生效
    tap() {
      if (!this.track) return 0;
      const now = performance.now();
      const last = this.taps[this.taps.length - 1];
      if (!last || now - last.at > 2000) this.taps = [];
      this.taps.push({ at: now, pos: this.position(), playing: this.isPlaying });
      if (this.taps.length > 16) this.taps.shift();
      const taps = this.taps;
      if (taps.length < 4) return taps.length;
      let beat;
      let offset = this.gridOffset();
      if (taps.every((tap) => tap.playing)) {
        const n = taps.length;
        const mx = (n - 1) / 2;
        const my = taps.reduce((s, tap) => s + tap.pos, 0) / n;
        let sxy = 0; let sxx = 0;
        taps.forEach((tap, i) => { sxy += (i - mx) * (tap.pos - my); sxx += (i - mx) ** 2; });
        beat = sxy / sxx;
        if (!(beat > 0.2 && beat < 1.6)) return taps.length;
        const intercept = my - beat * mx;
        offset = ((intercept % beat) + beat) % beat;
      } else {
        const span = (taps[taps.length - 1].at - taps[0].at) / 1000 / (taps.length - 1);
        beat = span * this.rateBase();
        if (!(beat > 0.2 && beat < 1.6)) return taps.length;
      }
      this.gridOverride = { bpm: Math.round((60 / beat) * 100) / 100, offset };
      this.gridChanged();
      return taps.length;
    }

    clearGrid() {
      this.taps = [];
      if (!this.gridOverride) return;
      this.gridOverride = null;
      this.gridChanged();
    }

    gridChanged() {
      const other = this.engine.other(this);
      if (this.sync) this.engine.matchTempo(this, other);
      this.engine.onTempo(this);
      this.emit('grid', this.gridOverride);
    }

    // ---------- HOT CUE ----------
    hotcueDown(index, { shift = false } = {}) {
      if (!this.track) return;
      if (shift) {
        if (this.hotcues[index] != null) { this.hotcues[index] = null; this.emit('cues'); }
        return;
      }
      const t = this.hotcues[index];
      if (t == null) {
        this.hotcues[index] = this.snap(this.position());
        this.emit('cues');
        return;
      }
      if (this.isPlaying) { this.jumpTo(t); return; }
      this.hotPreview = index;
      this.latched = false;
      this.jumpTo(t);
      this.resume();
    }

    hotcueUp(index) {
      if (this.hotPreview !== index) return;
      this.hotPreview = -1;
      if (this.latched) { this.latched = false; return; }
      this.pause({ instant: true });
      if (this.hotcues[index] != null) this.seek(this.hotcues[index]);
    }

    // ---------- LOOP / BEAT LOOP / BEAT JUMP（精确循环需缓冲模式，未就绪时先记下，解码完成后生效） ----------
    pushLoop() {
      const { ctx } = this.engine;
      if (this.voice && ctx) {
        const sr = ctx.sampleRate;
        const on = this.loop.active && this.loop.out > this.loop.in;
        this.voice.send({ type: 'loop', in: (this.loop.in || 0) * sr, out: (this.loop.out || 0) * sr, on });
      }
      this.emit('loop', this.loop);
    }

    loopIn() {
      if (!this.track) return;
      this.analyze();
      this.loop = { in: this.snap(this.position()), out: null, active: false, beats: 0 };
      this.pushLoop();
    }

    loopOut() {
      if (!this.track || this.loop.in == null) return;
      const out = this.snap(this.position());
      if (out <= this.loop.in + 0.02) return;
      this.loop = { ...this.loop, out, active: true, beats: Math.round(((out - this.loop.in) / this.beatLen()) * 8) / 8 };
      this.pushLoop();
    }

    loopExit() {
      if (this.loop.active) {
        this.loop.active = false;
        this.pushLoop();
      } else if (this.loop.in != null && this.loop.out != null) {
        this.loop.active = true;
        this.pushLoop();
        this.seek(this.loop.in);
      }
    }

    beatLoop(beats) {
      if (!this.track) return;
      if (this.loop.active && this.loop.beats === beats) { this.loopExit(); return; }
      this.analyze();
      const start = this.loop.active ? this.loop.in : this.snap(this.position());
      this.loop = { in: start, out: start + beats * this.beatLen(), active: true, beats };
      this.pushLoop();
    }

    loopResize(factor) {
      if (this.loop.in == null || this.loop.out == null) return;
      const len = (this.loop.out - this.loop.in) * factor;
      if (len < 0.01 || len > 64 * this.beatLen()) return;
      this.loop = { ...this.loop, out: this.loop.in + len, beats: this.loop.beats ? this.loop.beats * factor : 0 };
      this.pushLoop();
    }

    // 循环中跳拍会带着循环一起移动
    beatJump(beats) {
      if (!this.track) return;
      const d = beats * this.beatLen();
      if (this.loop.active) {
        this.loop = { ...this.loop, in: this.loop.in + d, out: this.loop.out + d };
        this.pushLoop();
      }
      this.seek(clamp(this.headPosition() + d, 0, this.maxPos(0.05)));
    }

    // ---------- 搓碟 ----------
    scratchStart() {
      if (!this.track) return null;
      this.engine.start();
      if (this.mode === 'buffer' && this.voice) {
        this.scratching = true;
        this.voice.send({ type: 'scratch', on: true });
        this.emit('state');
        return 'audio';
      }
      // 还没解码：先静音拖动定位，同时后台解码，下一次就有声音
      this.silent = { wasPlaying: this.isPlaying, pos: this.el.currentTime || 0 };
      this.el.pause();
      this.analyze();
      this.emit('state');
      return 'silent';
    }

    // target：手势对应的目标位置（秒）；vel：手势速度（1 = 正常播放速度，可为负）
    scratchTo(target, vel) {
      if (!this.track) return;
      const t = clamp(target, 0, this.duration || target);
      if (this.scratching && this.voice) {
        const sr = this.engine.ctx.sampleRate;
        this.voice.send({ type: 'scratchMove', target: t * sr, vel });
      } else if (this.silent) {
        this.silent.pos = t;
        if (Math.abs((this.el.currentTime || 0) - t) > 0.04) this.el.currentTime = t;
      }
    }

    scratchEnd() {
      if (this.scratching) {
        this.scratching = false;
        this.voice?.send({ type: 'scratch', on: false });
      } else if (this.silent) {
        const { wasPlaying } = this.silent;
        this.silent = null;
        if (wasPlaying) this.resume();
      }
      this.emit('state');
    }

    // ---------- 解码 → 分析 → 交接给缓冲声部 ----------
    analyze() {
      if (!this.track || this.mode === 'buffer') return Promise.resolve(this.mode === 'buffer');
      if (this.analyzing) return this.analyzing;
      // 解码失败过：留在流式模式，不在每次碰转盘时重新下载整首（重新装载曲目可再试）
      if (this.phase === 'error') return Promise.resolve(false);
      const { ctx } = this.engine;
      if (!ctx) { this.pendingAnalyze = true; return Promise.resolve(false); }
      this.pendingAnalyze = false;
      const token = this.token;
      const stale = () => token !== this.token;
      const track = this.track;
      const controller = new AbortController();
      this.abort = controller;
      this.phase = 'analyzing';
      this.emit('analysis', this.phase);
      const job = (async () => {
        const kind = await this.engine.voiceReady;
        if (!kind) throw new Error('No buffer voice available');
        const response = await fetch(track.url, { credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        if (token !== this.token) return false;
        const buffer = await decodeAudio(ctx, data);
        if (token !== this.token) return false;
        let analysis = analysisCache.get(track.id);
        if (!analysis) {
          analysis = await analyzeBuffer(buffer, track.bpm, stale);
          remember(track.id, analysis);
        }
        if (token !== this.token) return false;
        this.analysis = analysis;
        this.emit('analysis', this.phase);
        const pcm = await toInt16(buffer, stale);
        if (token !== this.token) return false;
        this.duration = buffer.duration;
        this.attachVoice(pcm);
        this.handoff();
        return true;
      })();
      this.analyzing = job.then(
        (ok) => { if (ok && token === this.token) this.phase = 'ready'; return ok; },
        (error) => {
          if (token === this.token && error.name !== 'AbortError') {
            this.phase = 'error';
            console.warn('DEVDJAM: deck analysis failed', error);
          }
          return false;
        },
      ).finally(() => {
        if (token !== this.token) return;
        this.analyzing = null;
        this.abort = null;
        // 分析得到精确 BPM 后：自己若是从盘就重新对速；若是主盘就带动从盘
        const other = this.engine.other(this);
        if (this.sync) this.engine.matchTempo(this, other);
        this.engine.onTempo(this);
        this.emit('analysis', this.phase);
      });
      return this.analyzing;
    }

    attachVoice([left, right]) {
      this.releaseVoice();
      const voice = this.engine.createVoice((msg) => this.onVoice(msg));
      if (!voice) throw new Error('No buffer voice available');
      voice.node.connect(this.bufferGain);
      const stereo = right && right !== left;
      // 带上当前位置与跳转序号：交接前的首批回报就是正确位置，不会闪回 00:00
      const pos = (this.silent ? this.silent.pos : this.el.currentTime || 0) * this.engine.ctx.sampleRate;
      voice.send({ type: 'load', L: left, R: stereo ? right : left, pos, seq: this.seekSeq }, stereo ? [left.buffer, right.buffer] : [left.buffer]);
      voice.send({ type: 'tempo', rate: this.rateBase() });
      voice.send({ type: 'bend', amount: this.bend });
      this.voice = voice;
    }

    // 60ms 交叉淡化，从 <audio> 无缝换到缓冲声部
    handoff() {
      const { ctx } = this.engine;
      const sr = ctx.sampleRate;
      const wasPlaying = !this.el.paused && !this.el.ended;
      const grab = this.silent;
      const t = grab ? grab.pos : this.el.currentTime || 0;
      const now = ctx.currentTime;
      this.seekSeq += 1;
      this.voice.send({ type: 'seek', pos: t * sr, fade: false, seq: this.seekSeq });
      this.mode = 'buffer';
      this.rep = { pos: t * sr, rate: wasPlaying ? this.rateBase() : 0, t: now, seq: this.seekSeq };
      this.pushLoop();
      const sg = this.streamGain.gain;
      const bg = this.bufferGain.gain;
      sg.cancelScheduledValues(now);
      bg.cancelScheduledValues(now);
      if (wasPlaying) {
        this.playing = true;
        this.voice.send({ type: 'play', instant: true });
        sg.setValueAtTime(1, now); sg.linearRampToValueAtTime(0, now + 0.06);
        bg.setValueAtTime(0, now); bg.linearRampToValueAtTime(1, now + 0.06);
        setTimeout(() => { if (this.mode === 'buffer') this.el.pause(); }, 120);
      } else {
        this.playing = false;
        sg.setValueAtTime(0, now);
        bg.setValueAtTime(1, now);
      }
      // 静音拖动途中解码完成：直接转成有声搓碟（手势继续有效），松手后按拖动前的播放状态继续
      if (grab) {
        this.silent = null;
        this.scratching = true;
        this.voice.send({ type: 'scratch', on: true });
        if (grab.wasPlaying) { this.playing = true; this.voice.send({ type: 'play' }); }
      }
      this.emit('mode', 'buffer');
      this.emit('state');
    }

    onVoice(msg) {
      if (msg.type === 'pos') {
        if (msg.seq < this.seekSeq) return; // 跳转前发出的迟到回报
        this.rep = msg;
        return;
      }
      if (msg.type === 'ended' && this.mode === 'buffer') {
        this.playing = false;
        this.emit('state');
        this.finish();
      }
    }
  }

  // ---------- BEAT FX ----------
  function makeImpulse(ctx, seconds) {
    const length = Math.floor(seconds * ctx.sampleRate);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c += 1) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
    }
    return buffer;
  }

  // TRANS 的门限整形曲线：tanh(8x) 把正弦 LFO 压成边沿略圆的方波
  const GATE_CURVE = (() => {
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i += 1) curve[i] = Math.tanh(8 * ((i / (curve.length - 1)) * 2 - 1));
    return curve;
  })();

  class BeatFx extends Emitter {
    constructor(engine, inserts) {
      super();
      this.engine = engine;
      this.ctx = engine.ctx;
      this.inserts = inserts;
      this.input = this.ctx.createGain();
      this.output = this.ctx.createGain();
      Object.entries(inserts).forEach(([channel, insert]) => {
        // 主输出插入点在通道之后：效果器 → 通道 return → 主总线 → 主 send → 效果器 构成回路。
        // 规范要求回路里必须有 DelayNode（Firefox 会把无延迟回路整体静音，PHASER / ROLL / TRANS 就没有），
        // 所以主 send 串一个渲染块（128 帧）的延迟，打破回路且听不出来
        let tap = insert.send;
        if (channel === 'M') {
          const gap = this.ctx.createDelay(0.05);
          gap.delayTime.value = 128 / this.ctx.sampleRate;
          tap = tap.connect(gap);
        }
        tap.connect(this.input);
        this.output.connect(insert.ret);
      });
      this.type = FX_TYPES[0];
      this.beat = 2;
      this.channel = '1';
      this.level = engine.values['fx.level'];
      this.enabled = false;
      // 六种效果一次建好常驻，切换只改各单元进出口的增益，运行中不再增删节点：
      // Firefox 在 ROLL 用过之后把它从回路里拆掉，会让整个音频线程卡住约 0.3 秒
      this.units = new Map(FX_TYPES.map((type) => [type, this.buildUnit(type)]));
      // 各单元先按当前拍长初始化：LFO 从默认 440Hz 滑到位时单元还关着，之后第一次切过去不会有怪声
      this.units.forEach((unit) => unit.update(this.beatSeconds(), this.level));
      this.unit = this.units.get(this.type);
      this.gate(this.unit, 1, 0);
      this.refresh();
      this.route();
    }

    get replace() { return this.type === 'ROLL' || this.type === 'TRANS'; }
    get beatLabel() {
      const b = FX_BEATS[this.beat];
      return b >= 1 ? String(b) : b === 0.75 ? '3/4' : `1/${Math.round(1 / b)}`;
    }
    beatSeconds() { return (60 / this.engine.fxBpm(this.channel)) * FX_BEATS[this.beat]; }

    // 单元的进口、出口各有一道门（增益），不用时关着
    buildUnit(type) {
      const { ctx } = this;
      const input = ctx.createGain();
      const output = ctx.createGain();
      input.gain.value = 0;
      output.gain.value = 0;
      this.input.connect(input);
      output.connect(this.output);
      let unit;
      if (type === 'ECHO') {
        const delay = ctx.createDelay(4); const fb = ctx.createGain();
        const damp = makeFilter(ctx, 'lowpass', 3200); const wet = ctx.createGain();
        input.connect(delay).connect(damp).connect(fb).connect(delay);
        damp.connect(wet).connect(output);
        unit = { update: (sec, level) => {
          glide(ctx, delay.delayTime, clamp(sec, 0.01, 3.9), 0.04);
          glide(ctx, fb.gain, 0.3 + 0.5 * level); glide(ctx, wet.gain, 0.2 + 0.8 * level);
        } };
      } else if (type === 'REVERB') {
        const pre = ctx.createDelay(1); const conv = ctx.createConvolver(); const wet = ctx.createGain();
        conv.buffer = makeImpulse(ctx, 2.6);
        input.connect(pre).connect(conv).connect(wet).connect(output);
        unit = { update: (sec, level) => { glide(ctx, pre.delayTime, clamp(sec / 8, 0, 0.25), 0.04); glide(ctx, wet.gain, 1.3 * level); } };
      } else if (type === 'FLANGER') {
        const delay = ctx.createDelay(0.05); const lfo = ctx.createOscillator(); const depth = ctx.createGain();
        const fb = ctx.createGain(); const wet = ctx.createGain();
        delay.delayTime.value = 0.004; depth.gain.value = 0.0032;
        lfo.connect(depth).connect(delay.delayTime);
        input.connect(delay).connect(fb).connect(delay);
        delay.connect(wet).connect(output);
        lfo.start();
        unit = { update: (sec, level) => {
          glide(ctx, lfo.frequency, 1 / Math.max(0.05, sec * 16), 0.1);
          glide(ctx, fb.gain, 0.35 + 0.45 * level); glide(ctx, wet.gain, 0.3 + 0.7 * level);
        } };
      } else if (type === 'PHASER') {
        const stages = Array.from({ length: 6 }, () => makeFilter(ctx, 'allpass', 800, 0.6));
        const lfo = ctx.createOscillator(); const depth = ctx.createGain(); const wet = ctx.createGain();
        depth.gain.value = 600;
        lfo.connect(depth);
        stages.forEach((stage) => depth.connect(stage.frequency));
        stages.reduce((prev, stage) => prev.connect(stage), input).connect(wet).connect(output);
        lfo.start();
        unit = { update: (sec, level) => { glide(ctx, lfo.frequency, 1 / Math.max(0.05, sec * 8), 0.1); glide(ctx, wet.gain, level); } };
      } else if (type === 'ROLL') {
        // 打开瞬间先放行一个循环长度的现场声音，同时录进延迟线；之后反馈=1 无限重复
        const dry = ctx.createGain(); const gate = ctx.createGain(); const delay = ctx.createDelay(8);
        const fb = ctx.createGain(); const wet = ctx.createGain();
        gate.gain.value = 0; fb.gain.value = 0; wet.gain.value = 0;
        input.connect(dry).connect(output);
        input.connect(gate).connect(delay).connect(fb).connect(delay);
        delay.connect(wet).connect(output);
        unit = {
          trigger: (on, sec, level) => {
            const t = ctx.currentTime + 0.005;
            [gate.gain, fb.gain, wet.gain, dry.gain].forEach((p) => p.cancelScheduledValues(t - 0.004));
            if (on) {
              const len = clamp(sec, 0.02, 7.9);
              delay.delayTime.setValueAtTime(len, t);
              gate.gain.setValueAtTime(1, t); gate.gain.setValueAtTime(0, t + len);
              fb.gain.setValueAtTime(1, t);
              wet.gain.setValueAtTime(0, t); wet.gain.setValueAtTime(level, t + len);
              dry.gain.setValueAtTime(1, t); dry.gain.setValueAtTime(1 - level, t + len);
            } else {
              gate.gain.setValueAtTime(0, t); fb.gain.setValueAtTime(0, t);
              wet.gain.setTargetAtTime(0, t, 0.01); dry.gain.setTargetAtTime(1, t, 0.01);
            }
          },
          update: (sec, level) => {
            if (!this.enabled) return;
            glide(ctx, wet.gain, level, 0.01); glide(ctx, dry.gain, 1 - level, 0.01);
          },
        };
      } else {
        // TRANS：按拍切断，DEPTH 控制切到多低。门限用正弦 LFO 经软削波整形成方波（边沿略圆，不咔嗒）；
        // 不用 'square' 振荡器：Firefox 第一次用到几赫兹的方波时要现算上千个谐波的带限波表，会卡住音频线程约 0.3 秒
        const vca = ctx.createGain(); const lfo = ctx.createOscillator(); const shape = ctx.createWaveShaper(); const depth = ctx.createGain();
        shape.curve = GATE_CURVE;
        input.connect(vca).connect(output);
        lfo.connect(shape).connect(depth).connect(vca.gain);
        lfo.start();
        unit = { update: (sec, level) => {
          glide(ctx, lfo.frequency, 1 / Math.max(0.02, sec), 0.02);
          glide(ctx, vca.gain, 1 - level / 2, 0.01); glide(ctx, depth.gain, level / 2, 0.01);
        } };
      }
      unit.gateIn = input;
      unit.gateOut = output;
      return unit;
    }

    // 开关单元的进出口；fade 为淡变秒数，0 表示立即
    gate(unit, value, fade) {
      const t = this.ctx.currentTime;
      [unit.gateIn.gain, unit.gateOut.gain].forEach((param) => {
        param.cancelScheduledValues(t);
        param.setValueAtTime(fade ? param.value : value, t);
        if (fade) param.linearRampToValueAtTime(value, t + fade);
      });
    }

    // 插入点路由：开 = send 打开；叠加型效果关掉后 return 仍开着让回声 / 混响自然拖尾
    route() {
      const t = this.ctx.currentTime;
      Object.entries(this.inserts).forEach(([channel, insert]) => {
        const active = channel === this.channel;
        const live = active && this.enabled;
        insert.send.gain.setTargetAtTime(live ? 1 : 0, t, 0.008);
        insert.ret.gain.setTargetAtTime(active && (live || !this.replace) ? 1 : 0, t, 0.008);
        insert.dry.gain.setTargetAtTime(live && this.replace ? 0 : 1, t, 0.008);
      });
      if (this.unit.trigger) this.unit.trigger(this.enabled, this.beatSeconds(), this.level);
    }

    refresh() { this.unit.update(this.beatSeconds(), this.level); this.emit('change'); }
    setLevel(v) { this.level = v; this.refresh(); }
    setOn(on) { this.enabled = on; this.route(); this.emit('change'); }
    setChannel(channel) { this.channel = channel; this.route(); this.refresh(); }
    // 换效果：旧单元 20ms 淡出、新单元淡入，只改增益不改连接；回声 / 混响尾音随淡出收掉，不会硬断出爆音
    cycleType(step = 1) {
      const old = this.unit;
      old.trigger?.(false, this.beatSeconds(), this.level); // ROLL 停止循环录音
      this.type = FX_TYPES[(FX_TYPES.indexOf(this.type) + step + FX_TYPES.length) % FX_TYPES.length];
      this.unit = this.units.get(this.type);
      this.gate(old, 0, 0.02);
      this.gate(this.unit, 1, 0.02);
      this.refresh();
      this.route();
    }
    stepBeat(step) {
      this.beat = clamp(this.beat + step, 0, FX_BEATS.length - 1);
      this.refresh();
      if (this.enabled && this.unit.trigger) this.route();
    }
  }

  // ---------- 采样器：8 个 WebAudio 即时合成音色，不需要任何音频文件 ----------
  const SOFT_CLIP = (() => {
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i += 1) curve[i] = Math.tanh(2.2 * ((i / (curve.length - 1)) * 2 - 1));
    return curve;
  })();
  function makeNoise(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  function oscillator(ctx, type, frequency) {
    const node = ctx.createOscillator();
    node.type = type;
    node.frequency.value = frequency;
    return node;
  }
  function noiseSource(ctx, noise) {
    const node = ctx.createBufferSource();
    node.buffer = noise;
    node.loop = true;
    return node;
  }
  function shaper(ctx) {
    const node = ctx.createWaveShaper();
    node.curve = SOFT_CLIP;
    return node;
  }
  function decay(param, t, peak, attack, end) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, end);
  }

  const SYNTHS = [
    // HORN：五支失谐锯齿波气笛，BWA-BWA-BWA-BWAAA
    (ctx, dest, t) => {
      const gate = ctx.createGain(); const band = makeFilter(ctx, 'bandpass', 1500, 0.8);
      gate.gain.value = 0;
      gate.connect(band).connect(shaper(ctx)).connect(dest);
      const hits = [[0, 0.12], [0.17, 0.12], [0.34, 0.12], [0.51, 0.72]];
      const end = t + 1.3;
      hits.forEach(([s, d]) => {
        gate.gain.setValueAtTime(0, t + s);
        gate.gain.linearRampToValueAtTime(0.45, t + s + 0.012);
        gate.gain.setValueAtTime(0.45, t + s + d);
        gate.gain.linearRampToValueAtTime(0, t + s + d + 0.03);
      });
      [1, 1.006, 0.994, 1.5, 1.497].forEach((m) => {
        const o = oscillator(ctx, 'sawtooth', 415 * m);
        hits.forEach(([s]) => {
          o.frequency.setValueAtTime(385 * m, t + s);
          o.frequency.exponentialRampToValueAtTime(415 * m, t + s + 0.05);
        });
        o.connect(gate);
        o.start(t); o.stop(end);
      });
      return end;
    },
    // SIREN：方波 + LFO 扫频
    (ctx, dest, t) => {
      const o = oscillator(ctx, 'square', 880); const lfo = oscillator(ctx, 'sine', 2.2);
      const depth = ctx.createGain(); const g = ctx.createGain(); const end = t + 1.8;
      depth.gain.value = 320;
      lfo.connect(depth).connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.04);
      g.gain.setValueAtTime(0.25, t + 1.55); g.gain.linearRampToValueAtTime(0, t + 1.75);
      o.connect(makeFilter(ctx, 'lowpass', 2600)).connect(g).connect(dest);
      o.start(t); lfo.start(t); o.stop(end); lfo.stop(end);
      return end;
    },
    // LASER：三连降调激光
    (ctx, dest, t) => {
      [0, 0.13, 0.26].forEach((s) => {
        const o = oscillator(ctx, 'sawtooth', 2600); const g = ctx.createGain();
        o.frequency.setValueAtTime(2600, t + s);
        o.frequency.exponentialRampToValueAtTime(110, t + s + 0.2);
        decay(g.gain, t + s, 0.3, 0.005, t + s + 0.22);
        o.connect(g).connect(dest);
        o.start(t + s); o.stop(t + s + 0.23);
      });
      return t + 0.5;
    },
    // RISER：白噪声带通上扫
    (ctx, dest, t, noise) => {
      const src = noiseSource(ctx, noise); const band = makeFilter(ctx, 'bandpass', 250, 3); const g = ctx.createGain();
      const end = t + 2.35;
      band.frequency.setValueAtTime(250, t); band.frequency.exponentialRampToValueAtTime(9000, t + 2.2);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 2.1); g.gain.linearRampToValueAtTime(0, t + 2.3);
      src.connect(band).connect(g).connect(dest);
      src.start(t); src.stop(end);
      return end;
    },
    // BOOM：808 下潜
    (ctx, dest, t) => {
      const o = oscillator(ctx, 'sine', 90); const g = ctx.createGain(); const end = t + 1.65;
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(34, t + 1.1);
      decay(g.gain, t, 0.85, 0.01, t + 1.6);
      o.connect(shaper(ctx)).connect(g).connect(dest);
      o.start(t); o.stop(end);
      return end;
    },
    // KICK
    (ctx, dest, t) => {
      const o = oscillator(ctx, 'sine', 160); const g = ctx.createGain(); const end = t + 0.45;
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
      decay(g.gain, t, 1, 0.004, t + 0.42);
      o.connect(g).connect(dest);
      o.start(t); o.stop(end);
      return end;
    },
    // CLAP：三段噪声爆发 + 尾音
    (ctx, dest, t, noise) => {
      const src = noiseSource(ctx, noise); const g = ctx.createGain(); const end = t + 0.32;
      g.gain.setValueAtTime(0, t);
      [0, 0.011, 0.022].forEach((d) => {
        g.gain.setValueAtTime(0.9, t + d);
        g.gain.exponentialRampToValueAtTime(0.08, t + d + 0.009);
      });
      g.gain.setValueAtTime(0.7, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      src.connect(makeFilter(ctx, 'bandpass', 1300, 1.1)).connect(g).connect(dest);
      src.start(t); src.stop(end);
      return end;
    },
    // STAB：A 小调和弦刺
    (ctx, dest, t) => {
      const lp = makeFilter(ctx, 'lowpass', 3800, 2); const g = ctx.createGain(); const end = t + 0.52;
      lp.frequency.setValueAtTime(3800, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
      decay(g.gain, t, 0.3, 0.006, t + 0.5);
      lp.connect(g).connect(dest);
      [220, 261.63, 329.63, 440].forEach((f) => [0.996, 1.004].forEach((detune) => {
        const o = oscillator(ctx, 'sawtooth', f * detune);
        o.connect(lp);
        o.start(t); o.stop(end);
      }));
      return end;
    },
  ];

  class Sampler extends Emitter {
    constructor(engine, out) {
      super();
      this.ctx = engine.ctx;
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.55;
      this.out.connect(out);
      this.noise = makeNoise(this.ctx);
      this.voices = new Map();
    }

    active(index) { return this.voices.has(index); }

    trigger(index) {
      this.stop(index);
      const { ctx } = this;
      const bus = ctx.createGain();
      bus.connect(this.out);
      const end = SYNTHS[index](ctx, bus, ctx.currentTime + 0.005, this.noise);
      const entry = { bus };
      entry.timer = setTimeout(() => this.release(index, entry), (end - ctx.currentTime) * 1000 + 60);
      this.voices.set(index, entry);
      this.emit('change');
    }

    stop(index) {
      const entry = this.voices.get(index);
      if (!entry) return;
      clearTimeout(entry.timer);
      entry.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
      setTimeout(() => { try { entry.bus.disconnect(); } catch { /* 已断开 */ } }, 150);
      this.voices.delete(index);
      this.emit('change');
    }

    release(index, entry) {
      if (this.voices.get(index) !== entry) return;
      this.voices.delete(index);
      try { entry.bus.disconnect(); } catch { /* 已断开 */ }
      this.emit('change');
    }
  }

  // ---------- 解码与分析 ----------
  function decodeAudio(ctx, data) {
    return new Promise((resolve, reject) => {
      const result = ctx.decodeAudioData(data, resolve, reject);
      if (result && typeof result.then === 'function') result.then(resolve, reject);
    });
  }

  // Int16 立体声交给声部：内存减半，分片转换避免卡住主线程
  async function toInt16(buffer, stale) {
    const channels = Math.min(2, buffer.numberOfChannels);
    const n = buffer.length;
    const out = [];
    for (let c = 0; c < channels; c += 1) {
      const src = buffer.getChannelData(c);
      const dst = new Int16Array(n);
      for (let i = 0; i < n; i += 131072) {
        const end = Math.min(n, i + 131072);
        for (let j = i; j < end; j += 1) {
          const v = src[j];
          dst[j] = v >= 1 ? 32767 : v <= -1 ? -32767 : (v * 32767) | 0;
        }
        await checkpoint(stale);
      }
      out.push(dst);
    }
    return out;
  }

  // 波形峰值 + 低/中/高三段能量（150 格/秒）与起音包络 → 拍速 + 拍网格相位
  async function analyzeBuffer(buffer, hintBpm, stale) {
    const sr = buffer.sampleRate;
    const n = buffer.length;
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
    const hop = Math.max(1, Math.round(sr / BINS_PER_SEC));
    const bins = Math.ceil(n / hop);
    const binsPerSec = sr / hop;
    const peak = new Float32Array(bins); const low = new Float32Array(bins);
    const mid = new Float32Array(bins); const high = new Float32Array(bins);
    const aLow = 1 - Math.exp((-2 * Math.PI * 180) / sr);
    const aMid = 1 - Math.exp((-2 * Math.PI * 2500) / sr);
    let yl = 0; let ym = 0;
    for (let b = 0; b < bins; b += 1) {
      const start = b * hop;
      const end = Math.min(n, start + hop);
      let pk = 0; let el = 0; let em = 0; let eh = 0;
      for (let i = start; i < end; i += 1) {
        const x = (left[i] + right[i]) * 0.5;
        yl += aLow * (x - yl);
        ym += aMid * (x - ym);
        const lo = yl; const mi = ym - yl; const hi = x - ym;
        const ax = x < 0 ? -x : x;
        if (ax > pk) pk = ax;
        el += lo * lo; em += mi * mi; eh += hi * hi;
      }
      const count = end - start || 1;
      peak[b] = pk;
      low[b] = Math.sqrt(el / count); mid[b] = Math.sqrt(em / count); high[b] = Math.sqrt(eh / count);
      if ((b & 1023) === 1023) await checkpoint(stale);
    }
    const flux = new Float32Array(bins);
    let prev = 0;
    for (let b = 0; b < bins; b += 1) {
      const e = Math.log1p(1000 * (2 * low[b] * low[b] + mid[b] * mid[b]));
      flux[b] = b ? Math.max(0, e - prev) : 0;
      prev = e;
    }
    const grid = await estimateGrid(flux, binsPerSec, hintBpm, stale);
    const maxOf = (arr) => arr.reduce((m, v) => (v > m ? v : m), 0);
    const bandMax = Math.max(maxOf(low), maxOf(mid), maxOf(high));
    const bytes = (arr, max) => {
      const out = new Uint8Array(arr.length);
      const k = max > 0 ? 255 / max : 0;
      for (let i = 0; i < arr.length; i += 1) out[i] = Math.min(255, Math.round(arr[i] * k));
      return out;
    };
    return {
      bpm: grid.bpm, offset: grid.offset, binsPerSec, duration: n / sr,
      peak: bytes(peak, maxOf(peak)), low: bytes(low, bandMax), mid: bytes(mid, bandMax), high: bytes(high, bandMax),
    };
  }

  async function estimateGrid(flux, bps, hint, stale) {
    const N = flux.length;
    if (N < bps * 4) return { bpm: hint || 120, offset: 0 };
    let mean = 0;
    for (let i = 0; i < N; i += 1) mean += flux[i];
    mean /= N;
    const f = new Float32Array(N);
    for (let i = 0; i < N; i += 1) f[i] = flux[i] - mean;
    const acf = (lag) => {
      const i0 = Math.floor(lag);
      const fr = lag - i0;
      const limit = N - i0 - 1;
      if (limit < bps) return 0;
      let s = 0;
      for (let i = 0; i < limit; i += 1) s += f[i] * (f[i + i0] + (f[i + i0 + 1] - f[i + i0]) * fr);
      return s / limit;
    };
    const score = (bpm, lags) => {
      const period = (60 * bps) / bpm;
      return lags.reduce((sum, k) => sum + acf(period * k) / Math.sqrt(k), 0);
    };
    const search = async (from, to, step, lags, weight) => {
      let best = from; let bestScore = -Infinity;
      for (let bpm = from, i = 0; bpm <= to + 1e-9; bpm += step, i += 1) {
        const s = score(bpm, lags) * weight(bpm);
        if (s > bestScore) { bestScore = s; best = bpm; }
        if ((i & 15) === 15) await checkpoint(stale);
      }
      return best;
    };
    const flat = () => 1;
    let bpm;
    if (hint > 0) {
      bpm = await search(hint - 2, hint + 2, 0.02, [1, 2, 4, 8, 16], flat);
    } else {
      const prior = (b) => Math.exp(-0.5 * (Math.log2(b / 115) / 0.8) ** 2);
      bpm = await search(60, 190, 0.5, [1, 2, 4], prior);
      bpm = await search(bpm - 0.6, bpm + 0.6, 0.02, [1, 2, 4, 8, 16], flat);
      while (bpm < 70) bpm *= 2;
      while (bpm > 185) bpm /= 2;
    }
    // 相位：在一个拍长内梳状搜索起音最集中的位置
    const period = (60 * bps) / bpm;
    let bestPhase = 0; let bestSum = -Infinity;
    for (let phase = 0; phase < period; phase += 0.25) {
      let s = 0;
      for (let k = phase; k < N - 1; k += period) {
        const i = Math.floor(k);
        s += flux[i] + (flux[i + 1] - flux[i]) * (k - i);
      }
      if (s > bestSum) { bestSum = s; bestPhase = phase; }
    }
    return { bpm: Math.round(bpm * 100) / 100, offset: bestPhase / bps };
  }

  NS.createEngine = (options) => new Engine(options);
  NS.audioConstants = { PAD_COUNT, FX_TYPES, FX_BEATS, SAMPLE_NAMES };
})();
