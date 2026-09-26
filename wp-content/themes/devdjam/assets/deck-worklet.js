/* DEVDJAM 唱盘 DSP 核心：变速 / 反向读取、搓碟跟随、循环回绕与无爆音跳转。
   同一个文件两种加载方式：
   - 作为 AudioWorklet 模块：注册 devdjam-deck 处理器（安全上下文，音频线程运行）；
   - 作为主线程普通脚本：导出 DEVDJAM.DeckCore，供纯 HTTP（非安全上下文，浏览器禁用 AudioWorklet）下的 ScriptProcessor 回退使用。 */
(() => {
  'use strict';

  const XFADE = 128;          // 跳转 / 循环回绕的交叉淡化长度（帧）
  const REPORT_FRAMES = 512;  // 运动中约每 11ms 回报一次位置
  const IDLE_REPORT = 8192;   // 静止时降频回报
  const MAX_EXTRAP = 0.04;    // 搓碟目标最多外推 40ms，手停住后速度归零
  const MAX_RATE = 6;

  class DeckCore {
    constructor(sampleRate, report) {
      this.sr = sampleRate;
      this.report = report;
      this.L = null; this.R = null; this.len = 0;
      this.pos = 0; this.rate = 0;
      this.playing = false; this.tempo = 1; this.bend = 0;
      // sShift：手势坐标 → 唱盘位置的平移量（搓碟中循环回绕 / 跳转后，手势相对新位置继续）
      this.scratching = false; this.sTarget = 0; this.sVel = 0; this.sAge = MAX_EXTRAP; this.sShift = 0;
      this.loopOn = false; this.loopIn = 0; this.loopOut = 0;
      this.xfFrom = 0; this.xfLeft = 0;
      this.sinceReport = 0; this.dirty = true; this.endedSent = false;
      this.seq = 0; // 主线程的跳转序号，原样写进位置回报，主线程据此丢弃跳转前发出、迟到的旧回报
      const coef = (tau) => 1 - Math.exp(-1 / (tau * sampleRate));
      this.aScratch = coef(0.004); // 手感：跟手但不刺耳
      this.aRun = coef(0.03);      // 电机启动 / 变速
      this.aBrake = coef(0.07);    // 暂停时唱盘减速
      this.kFollow = 1 / (0.015 * sampleRate);
    }

    handle(m) {
      switch (m.type) {
        case 'load':
          this.L = m.L; this.R = m.R || m.L; this.len = this.L.length;
          this.pos = Math.max(0, Math.min(this.len - 1, m.pos || 0)); this.rate = 0;
          this.playing = false; this.scratching = false; this.loopOn = false; this.xfLeft = 0; this.endedSent = false;
          break;
        case 'unload':
          this.L = this.R = null; this.len = 0; this.pos = 0; this.rate = 0; this.playing = false;
          break;
        case 'play':
          this.playing = true; this.endedSent = false;
          // 从流式模式交接时直接以当前速度起步，避免电机加速造成的错位
          if (m.instant) this.rate = this.tempo * (1 + this.bend);
          break;
        case 'pause':
          this.playing = false;
          if (m.instant) this.rate = 0;
          break;
        case 'seek': this.jump(m.pos, m.fade !== false); break;
        case 'tempo': this.tempo = m.rate; break;
        case 'bend': this.bend = m.amount; break;
        case 'scratch':
          this.scratching = !!m.on;
          if (this.scratching) { this.sTarget = this.pos; this.sVel = 0; this.sAge = 0; this.sShift = 0; }
          break;
        case 'scratchMove': this.sTarget = m.target + this.sShift; this.sVel = m.vel; this.sAge = 0; break;
        case 'loop':
          this.loopIn = m.in; this.loopOut = m.out; this.loopOn = !!m.on && m.out > m.in;
          break;
        default: break;
      }
      if (m.seq !== undefined) this.seq = m.seq;
      this.dirty = true;
    }

    jump(target, fade) {
      if (!this.len) return;
      const next = Math.max(0, Math.min(this.len - 2, target));
      if (fade && Math.abs(this.rate) > 0.01) { this.xfFrom = this.pos; this.xfLeft = XFADE; }
      this.pos = next;
      // 搓碟中跳转（热点 / 跳拍 / CUE）：手势坐标整体平移到新位置，否则下一次手势会把唱盘拉回原处
      if (this.scratching) { this.sShift += next - this.sTarget; this.sTarget = next; this.sVel = 0; }
      this.endedSent = false;
    }

    // 三次 Hermite 插值读取 Int16 采样
    read(a, p) {
      const i = Math.floor(p);
      const f = p - i;
      const last = this.len - 1;
      const x0 = a[i > 0 ? i - 1 : 0];
      const x1 = a[i < last ? i : last];
      const x2 = a[i + 1 < last ? i + 1 : last];
      const x3 = a[i + 2 < last ? i + 2 : last];
      const c1 = 0.5 * (x2 - x0);
      const c2 = x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3;
      const c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2);
      return (((c3 * f + c2) * f + c1) * f + x1) * (1 / 32768);
    }

    process(outL, outR, n, time) {
      if (!this.L || (!this.playing && !this.scratching && this.rate === 0 && this.xfLeft === 0)) {
        outL.fill(0); if (outR !== outL) outR.fill(0);
        this.sinceReport += n;
        if (this.dirty || this.sinceReport >= IDLE_REPORT) this.emit(time + n / this.sr);
        return;
      }

      // 本块的目标速度：搓碟跟随手势位置，否则按电机（速度推子 × 弯音）
      let desired;
      let a;
      if (this.scratching) {
        const fresh = this.sAge < MAX_EXTRAP;
        const target = this.sTarget + this.sVel * Math.min(this.sAge, MAX_EXTRAP) * this.sr;
        desired = (fresh ? this.sVel : 0) + (target - this.pos) * this.kFollow;
        desired = Math.max(-MAX_RATE, Math.min(MAX_RATE, desired));
        a = this.aScratch;
        this.sAge += n / this.sr;
      } else if (this.playing) {
        desired = this.tempo * (1 + this.bend);
        a = this.aRun;
      } else {
        desired = 0;
        a = this.aBrake;
      }

      const { L, R, len } = this;
      const loopLen = this.loopOut - this.loopIn;
      for (let i = 0; i < n; i += 1) {
        this.rate += (desired - this.rate) * a;
        if (!this.scratching && !this.playing && Math.abs(this.rate) < 0.0005) this.rate = 0;
        const rate = this.rate;
        const prev = this.pos;
        let pos = prev + rate;

        if (this.loopOn && loopLen > 1) {
          const raw = pos;
          if (rate > 0 && pos >= this.loopOut) pos = this.loopIn + ((pos - this.loopOut) % loopLen);
          else if (rate < 0 && pos < this.loopIn && prev >= this.loopIn) pos = this.loopOut - ((this.loopIn - pos) % loopLen);
          if (pos !== raw) {
            this.xfFrom = raw; this.xfLeft = XFADE;
            // 搓碟中回绕：手势目标一起平移，否则会一直追循环外够不到的目标（6 倍速狂转）
            if (this.scratching) { this.sTarget += pos - raw; this.sShift += pos - raw; }
          }
        }
        if (pos >= len - 2) {
          pos = len - 2;
          if (!this.scratching && this.playing) {
            this.playing = false; this.rate = 0;
            if (!this.endedSent) { this.endedSent = true; this.report({ type: 'ended' }); }
          }
        } else if (pos < 0) {
          pos = 0;
          if (this.rate < 0) this.rate = 0;
        }
        this.pos = pos;

        // 速度接近 0 时淡出，手按住唱片不动 = 静音，避免直流咔嗒
        const speed = Math.abs(rate);
        const g = speed >= 0.08 ? 1 : speed * 12.5;
        let l = this.read(L, pos);
        let r = R === L ? l : this.read(R, pos);
        if (this.xfLeft > 0) {
          const k = this.xfLeft / XFADE;
          this.xfFrom = Math.max(0, Math.min(len - 2, this.xfFrom + rate));
          const ol = this.read(L, this.xfFrom);
          const or = R === L ? ol : this.read(R, this.xfFrom);
          l = l * (1 - k) + ol * k;
          r = r * (1 - k) + or * k;
          this.xfLeft -= 1;
        }
        outL[i] = l * g;
        if (outR !== outL) outR[i] = r * g;
      }

      this.sinceReport += n;
      if (this.dirty || this.sinceReport >= REPORT_FRAMES) this.emit(time + n / this.sr);
    }

    // time = 这一块音频末尾对应的上下文时间，主线程据此外推当前位置
    emit(time) {
      this.sinceReport = 0;
      this.dirty = false;
      this.report({ type: 'pos', pos: this.pos, rate: this.rate, t: time, playing: this.playing, seq: this.seq });
    }
  }

  if (typeof registerProcessor === 'function') {
    class DeckProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.core = new DeckCore(sampleRate, (msg) => this.port.postMessage(msg));
        this.alive = true;
        this.port.onmessage = (event) => {
          // unload = 声部生命周期结束：之后 process() 返回 false 让处理器可被回收，否则每换一首就多一个空转的处理器
          if (event.data.type === 'unload') this.alive = false;
          this.core.handle(event.data);
        };
      }

      process(inputs, outputs) {
        if (!this.alive) return false;
        const out = outputs[0];
        this.core.process(out[0], out[1] || out[0], out[0].length, currentTime);
        return true;
      }
    }
    registerProcessor('devdjam-deck', DeckProcessor);
  } else if (typeof window !== 'undefined') {
    (window.DEVDJAM = window.DEVDJAM || {}).DeckCore = DeckCore;
  }
})();
