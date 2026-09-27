/* DEVDJAM 音轨分析：拍速 / 拍网格、波形分段能量与调性识别。纯计算，不碰界面与音频图；
   前台打碟机（audio-engine.js）与后台自动识别（devdjam-core 插件的 admin.js）共用。 */
(() => {
  'use strict';
  const NS = (window.DEVDJAM = window.DEVDJAM || {});

  const BINS_PER_SEC = 150;   // 波形与起音包络的时间分辨率

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

  function decodeAudio(ctx, data) {
    return new Promise((resolve, reject) => {
      const result = ctx.decodeAudioData(data, resolve, reject);
      if (result && typeof result.then === 'function') result.then(resolve, reject);
    });
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

  // ---------- 调性识别 ----------
  // Krumhansl-Kessler 调性轮廓，下标 0 为主音
  const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  // DJ 软件常用简写（与 Camelot 轮盘一一对应）
  const MAJOR_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const MINOR_NAMES = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

  // 原地基 2 复数 FFT
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const angle = (-2 * Math.PI) / len;
      for (let k = 0; k < half; k += 1) {
        const wr = Math.cos(angle * k);
        const wi = Math.sin(angle * k);
        for (let a = k; a < n; a += len) {
          const b = a + half;
          const xr = re[b] * wr - im[b] * wi;
          const xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi;
          re[a] += xr; im[a] += xi;
        }
      }
    }
  }

  function pearson(a, b) {
    const n = a.length;
    let ma = 0; let mb = 0;
    for (let i = 0; i < n; i += 1) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let sab = 0; let saa = 0; let sbb = 0;
    for (let i = 0; i < n; i += 1) {
      const da = a[i] - ma; const db = b[i] - mb;
      sab += da * db; saa += da * da; sbb += db * db;
    }
    return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
  }

  // 频谱局部峰折叠成 12 个音级（色度），逐帧归一后累加，再与 24 个大小调轮廓求相关，取最像的一个。
  // 返回 'Am' / 'F#m' / 'C' 这类简写；整首都是静音时返回空串
  async function detectKey(buffer, stale) {
    const sr = buffer.sampleRate;
    const n = buffer.length;
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
    let size = 1024;
    while (size * 2 <= sr * 0.4) size *= 2;   // 约 0.37 秒的窗：低音区相邻半音也能分开
    const hop = size >> 1;
    const hann = new Float64Array(size);
    for (let i = 0; i < size; i += 1) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
    const lo = Math.max(2, Math.ceil((65 * size) / sr));                 // C2
    const hi = Math.min(size / 2 - 2, Math.floor((2100 * size) / sr));   // C7 附近，再往上多是泛音和镲片
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    const mag = new Float64Array(size / 2);
    const frame = new Float64Array(12);
    const chroma = new Float64Array(12);
    for (let start = 0, f = 0; start + size <= n; start += hop, f += 1) {
      let energy = 0;
      for (let i = 0; i < size; i += 1) {
        const x = (left[start + i] + right[start + i]) * 0.5;
        re[i] = x * hann[i]; im[i] = 0;
        energy += x * x;
      }
      if (energy / size < 1e-6) continue;   // -60 dBFS 以下当静音
      fft(re, im);
      let loudest = 0;
      for (let k = lo - 1; k <= hi + 1; k += 1) mag[k] = Math.hypot(re[k], im[k]);
      for (let k = lo; k <= hi; k += 1) if (mag[k] > loudest) loudest = mag[k];
      frame.fill(0);
      for (let k = lo; k <= hi; k += 1) {
        const m = mag[k];
        if (m <= mag[k - 1] || m < mag[k + 1]) continue;   // 只取尖峰：音高是尖峰，鼓和噪声是宽带
        if (m < loudest * 0.15) continue;                  // 比本帧最强峰低 16 dB 以上的多是噪底和泛音尾巴
        const a = mag[k - 1]; const c = mag[k + 1];
        const freq = ((k + (0.5 * (a - c)) / (a - 2 * m + c)) * sr) / size;   // 抛物线插值求精确频率
        const midi = 69 + 12 * Math.log2(freq / 440);
        const note = Math.round(midi);
        // 幅度开方，免得最响的低音一家独大；偏离半音中心越远权重越低
        frame[((note % 12) + 12) % 12] += Math.sqrt(m) * Math.cos(Math.PI * (midi - note)) ** 2;
      }
      const sum = frame.reduce((s, v) => s + v, 0);
      if (sum > 0) for (let p = 0; p < 12; p += 1) chroma[p] += frame[p] / sum;
      if ((f & 7) === 7) await checkpoint(stale);
    }
    if (!chroma.some((v) => v > 0)) return '';
    let best = ''; let bestScore = -Infinity;
    const rotated = new Float64Array(12);
    for (let tonic = 0; tonic < 12; tonic += 1) {
      for (let p = 0; p < 12; p += 1) rotated[p] = chroma[(tonic + p) % 12];
      const major = pearson(rotated, MAJOR_PROFILE);
      const minor = pearson(rotated, MINOR_PROFILE);
      if (major > bestScore) { bestScore = major; best = MAJOR_NAMES[tonic]; }
      if (minor > bestScore) { bestScore = minor; best = MINOR_NAMES[tonic]; }
    }
    return best;
  }

  NS.analysis = { checkpoint, decodeAudio, analyzeBuffer, detectKey };
})();
