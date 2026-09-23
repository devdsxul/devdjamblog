(() => {
  'use strict';
  const config = window.DEVDJAM;
  const audio = document.getElementById('devdjam-audio');
  const deck = document.querySelector('[data-player]');
  if (!config || !audio || !deck) return;

  const $ = (selector) => deck.querySelector(selector);
  const seek = $('[data-seek]');
  const volume = $('[data-volume]');
  const queue = $('[data-queue-list]');
  const status = $('[data-player-status]');
  const retry = $('[data-player-retry]');
  const trayTitle = document.querySelector('[data-tray-title]');
  const state = { tracks: [], index: -1, queueController: null, error: null, shuffle: false };
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* 偏好可选 */ } },
  };
  const sparkColors = ['#7fe9ff', '#ff5fd0', '#ffe94a', '#7dff5a', '#b21ed6'];

  // ---------- 界面文案中英切换：英文原文作键 ----------
  const zh = {
    home: '首页', lang: '语言', fx: '动效', music: '音乐', beats: '节拍', blog: '杂谈', links: '链接', about: '关于', guestbook: '留言簿',
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
  function broadcast() {
    const track = activeTrack();
    const playing = track && !audio.paused && !audio.ended;
    if (trayTitle) trayTitle.textContent = playing ? track.title : t('stopped');
  }
  function syncButtons() {
    const hasTrack = state.index >= 0 && !!activeTrack();
    const playing = hasTrack && !audio.paused && !audio.ended;
    deck.classList.toggle('is-playing', playing);
    document.body.classList.toggle('is-playing', playing);
    $('[data-play-icon]').hidden = playing;
    $('[data-pause-icon]').hidden = !playing;
    const toggle = $('[data-player-action="toggle"]');
    toggle.disabled = !hasTrack;
    toggle.setAttribute('aria-label', playing ? '暂停' : '播放');
    $('[data-player-action="cue"]').disabled = !hasTrack;
    $('[data-player-action="prev"]').disabled = state.tracks.length < 2;
    $('[data-player-action="next"]').disabled = state.tracks.length < 2;
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

    // 同步 Pro 控制台 Deck A
    const proDeckA = $('[data-pro-deck="a"]');
    if (proDeckA) proDeckA.classList.toggle('is-playing', playing);
    const proPlayA = $('[data-pro-btn="play-a"]');
    if (proPlayA) proPlayA.classList.toggle('is-active', playing);
    const proPlayIconA = $('[data-pro-play-icon="a"]');
    const proPauseIconA = $('[data-pro-pause-icon="a"]');
    if (proPlayIconA) proPlayIconA.hidden = playing;
    if (proPauseIconA) proPauseIconA.hidden = !playing;

    broadcast();
  }
  function progress() {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : activeTrack()?.duration || 0;
    $('[data-elapsed]').textContent = time(audio.currentTime);
    $('[data-duration]').textContent = time(duration);
    seek.disabled = !(Number.isFinite(audio.duration) && audio.duration > 0);
    seek.value = duration > 0 ? String(Math.round((audio.currentTime / duration) * 1000)) : '0';
    seek.setAttribute('aria-valuetext', `${time(audio.currentTime)} / ${time(duration)}`);

    // 同步 Pro 控制台 Deck A 进度
    const proTimeA = $('[data-pro-time="a"]');
    if (proTimeA) proTimeA.textContent = `${time(audio.currentTime)} / ${time(duration)}`;
    const proSeekA = $('[data-pro-seek="a"]');
    if (proSeekA) {
      proSeekA.disabled = seek.disabled;
      proSeekA.value = seek.value;
    }
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
    if (typeof renderProLibrary === 'function') renderProLibrary();
  }
  function renderTrack() {
    const track = activeTrack();
    const title = $('[data-track-title]');
    title.textContent = track?.title || t('no tape');
    if (track) delete title.dataset.i18n; else title.dataset.i18n = 'no tape';
    const cover = $('[data-player-cover]');
    if (cover) {
      if (track?.cover) { cover.src = track.cover; cover.hidden = false; }
      else { cover.hidden = true; cover.removeAttribute('src'); }
    }

    // 同步 Pro 控制台 Deck A 磁带信息
    const proTitleA = $('[data-pro-title="a"]');
    if (proTitleA) proTitleA.textContent = track?.title || 'no tape';
    const proCoverA = $('[data-pro-cover="a"]');
    if (proCoverA) {
      if (track?.cover) { proCoverA.src = track.cover; proCoverA.hidden = false; }
      else { proCoverA.hidden = true; proCoverA.removeAttribute('src'); }
    }

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
  async function play() {
    if (!activeTrack()) return;
    state.error = null;
    retry.hidden = true;
    message('loading');
    ensureEq();
    try {
      await audio.play();
    } catch (error) {
      if (error.name === 'AbortError') return;
      state.error = 'audio';
      message(error.name === 'NotAllowedError' ? 'tap play again' : "can't play this file");
      retry.hidden = false;
      syncButtons();
    }
  }
  function selectTrack(index, autoplay = true) {
    if (index < 0 || index >= state.tracks.length) return;
    const track = state.tracks[index];
    const changed = index !== state.index || audio.getAttribute('src') !== track.url || state.error === 'audio';
    state.index = index;
    state.error = null;
    retry.hidden = true;
    if (changed) {
      audio.pause();
      audio.src = track.url;
      audio.load();
    }
    renderTrack();
    message('ready');
    if (autoplay) void play();
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
        .map((item) => ({ ...item, url: mediaURL(item.url), cover: item.cover ? mediaURL(item.cover) : '', duration: Number(item.duration) || 0 }));
      state.tracks = tracks;
      const nextIndex = old ? tracks.findIndex((track) => track.id === old.id) : -1;
      if (nextIndex >= 0) {
        state.index = nextIndex;
        if (old.url !== tracks[nextIndex].url) selectTrack(nextIndex, !audio.paused);
        else renderTrack();
      } else if (tracks.length) {
        state.index = -1;
        selectTrack(0, false);
      } else {
        state.index = -1;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        message('stopped');
        renderTrack();
      }
      if (state.error === 'queue') state.error = null;
      retry.hidden = state.error !== 'audio';
      renderQueue();
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (audio.paused) message('queue offline');
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
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (state.tracks.length) selectTrack((state.index - 1 + state.tracks.length) % state.tracks.length);
  }
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-track-id]');
    if (!button) return;
    const id = Number(button.dataset.trackId);
    if (!state.tracks.some((track) => track.id === id)) await loadTracks();
    const index = state.tracks.findIndex((track) => track.id === id);
    if (index < 0) { message('not available'); return; }
    if (index === state.index && !audio.paused) audio.pause();
    else selectTrack(index);
  });
  deck.addEventListener('click', (event) => {
    const action = event.target.closest('[data-player-action]')?.dataset.playerAction;
    if (action === 'toggle') { if (audio.paused) void play(); else audio.pause(); }
    else if (action === 'next') next();
    else if (action === 'prev') previous();
    else if (action === 'cue') { audio.currentTime = 0; progress(); }
    else if (action === 'loop') { audio.loop = !audio.loop; $('[data-player-action="loop"]').setAttribute('aria-pressed', String(audio.loop)); }
    else if (action === 'shuffle') { state.shuffle = !state.shuffle; $('[data-player-action="shuffle"]').setAttribute('aria-pressed', String(state.shuffle)); }
    else if (action === 'pitch-reset') { pitch.value = '0'; applyPitch(); }
  });

  // ---------- 打碟机：变速、转盘搓碟、三段 EQ ----------
  const pitch = $('[data-pitch]');
  const platter = $('[data-platter]');
  const rateOut = $('[data-rate]');
  const bpmOut = $('[data-bpm]');
  const REV_SECONDS = 1.8; // 33⅓ 转/分钟，一圈 1.8 秒
  function applyPitch() {
    const percent = Number(pitch.value) || 0;
    audio.playbackRate = 1 + percent / 100;
    try { audio.preservesPitch = false; audio.mozPreservesPitch = false; } catch { /* 可选 */ }
    rateOut.textContent = `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
    platter.style.animationDuration = `${REV_SECONDS / audio.playbackRate}s`;
    updateBpm();
  }
  function updateBpm() {
    const bpm = activeTrack()?.bpm;
    bpmOut.textContent = bpm ? `${(bpm * audio.playbackRate).toFixed(1)} bpm` : '--- bpm';
  }
  pitch.addEventListener('input', applyPitch);
  applyPitch();
  // 转盘：拖动即搓碟，按角度换算成秒
  let scratch = null;
  const angleAt = (event) => {
    const box = platter.getBoundingClientRect();
    return Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2));
  };
  platter.addEventListener('pointerdown', (event) => {
    if (!activeTrack() || !Number.isFinite(audio.duration)) return;
    platter.setPointerCapture(event.pointerId);
    scratch = { angle: angleAt(event), wasPlaying: !audio.paused };
    audio.pause();
    deck.classList.add('is-scratching');
  });
  platter.addEventListener('pointermove', (event) => {
    if (!scratch) return;
    const angle = angleAt(event);
    let delta = angle - scratch.angle;
    if (delta > Math.PI) delta -= 2 * Math.PI; else if (delta < -Math.PI) delta += 2 * Math.PI;
    scratch.angle = angle;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + (delta / (2 * Math.PI)) * REV_SECONDS));
    platter.style.transform = `rotate(${(audio.currentTime / REV_SECONDS) * 360}deg)`;
    progress();
  });
  const endScratch = () => {
    if (!scratch) return;
    const resume = scratch.wasPlaying;
    scratch = null;
    deck.classList.remove('is-scratching');
    platter.style.transform = '';
    if (resume) void play();
  };
  platter.addEventListener('pointerup', endScratch);
  platter.addEventListener('pointercancel', endScratch);
  platter.addEventListener('keydown', (event) => {
    if (!activeTrack()) return;
    if (event.key === 'ArrowRight') audio.currentTime += 5;
    else if (event.key === 'ArrowLeft') audio.currentTime -= 5;
    else if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (audio.paused) void play(); else audio.pause(); }
  });
  // 三段 EQ：首次播放时接入 Web Audio，失败则静默降级
  let eq = null;
  function ensureEq() {
    if (eq !== null || !('AudioContext' in window)) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 200;
      const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 1;
      const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 4000;
      source.connect(low); low.connect(mid); mid.connect(high); high.connect(ctx.destination);
      eq = { ctx, low, mid, high };
      deck.querySelectorAll('[data-eq]').forEach(applyEq);
    } catch { eq = false; }
    if (eq && eq.ctx.state === 'suspended') void eq.ctx.resume();
  }
  function applyEq(input) {
    if (!eq) return;
    eq[input.dataset.eq].gain.value = Number(input.value) || 0;
  }
  deck.querySelectorAll('[data-eq]').forEach((input) => input.addEventListener('input', () => applyEq(input)));
  audio.addEventListener('ratechange', updateBpm);
  retry.addEventListener('click', () => {
    if (state.error === 'audio' && activeTrack()) selectTrack(state.index);
    else void loadTracks();
  });
  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
      progress();
    }
  });
  const savedVolume = storage.get('devdjam-volume');
  const initialVolume = savedVolume !== null && Number.isFinite(Number(savedVolume)) ? Math.max(0, Math.min(1, Number(savedVolume))) : 0.7;
  audio.volume = initialVolume;
  volume.value = String(initialVolume);
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value);
    storage.set('devdjam-volume', volume.value);
  });
  audio.addEventListener('playing', () => {
    const track = activeTrack();
    message([track?.bpm ? `${track.bpm} bpm` : '', track?.key || ''].filter(Boolean).join(' / ') || 'playing');
    state.error = null;
    retry.hidden = true;
    syncButtons();
  });
  audio.addEventListener('pause', () => {
    if (activeTrack() && !state.error && !audio.ended) message('paused');
    syncButtons();
  });
  audio.addEventListener('waiting', () => { if (activeTrack() && !audio.paused) message('buffering'); });
  audio.addEventListener('loadedmetadata', progress);
  audio.addEventListener('durationchange', progress);
  audio.addEventListener('timeupdate', progress);
  audio.addEventListener('ended', () => {
    if (state.index + 1 < state.tracks.length) selectTrack(state.index + 1);
    else { message('end'); syncButtons(); }
  });
  audio.addEventListener('error', () => {
    if (!activeTrack() || !audio.getAttribute('src')) return;
    state.error = 'audio';
    message("can't play this file");
    retry.hidden = false;
    syncButtons();
  });
  if ('mediaSession' in navigator) {
    const handlers = { play: () => void play(), pause: () => audio.pause(), previoustrack: previous, nexttrack: next,
      seekto: (details) => { if (Number.isFinite(details.seekTime) && Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, details.seekTime)); } };
    Object.entries(handlers).forEach(([name, handler]) => {
      try { navigator.mediaSession.setActionHandler(name, handler); } catch { /* 可选能力 */ }
    });
  }

  // ---------- 双盘专业工作台控制器 (DECK A + MIXER + DECK B) ----------
  const audioB = document.getElementById('devdjam-audio-b');
  const deckB = { track: null, playing: false };

  const proDeckB = $('[data-pro-deck="b"]');
  const proTitleB = $('[data-pro-title="b"]');
  const proTimeB = $('[data-pro-time="b"]');
  const proSeekB = $('[data-pro-seek="b"]');
  const proCoverB = $('[data-pro-cover="b"]');
  const proPlayB = $('[data-pro-btn="play-b"]');
  const playIconB = $('[data-pro-play-icon="b"]');
  const pauseIconB = $('[data-pro-pause-icon="b"]');
  const proPlatterB = $('[data-pro-platter="b"]');
  const proPlatterA = $('[data-pro-platter="a"]');
  const proLoopB = $('[data-pro-btn="loop-b"]');

  const volSliderA = $('[data-pro-vol="a"]');
  const volSliderB = $('[data-pro-vol="b"]');
  const crossfader = $('[data-mixer-crossfader]');

  function updateDualVolumes() {
    const cf = crossfader ? Number(crossfader.value) : 50;
    const blendA = cf <= 50 ? 1 : Math.max(0, (100 - cf) / 50);
    const blendB = cf >= 50 ? 1 : Math.max(0, cf / 50);
    const va = volSliderA ? Number(volSliderA.value) : 0.8;
    const vb = volSliderB ? Number(volSliderB.value) : 0.8;
    audio.volume = Math.max(0, Math.min(1, va * blendA));
    if (audioB) audioB.volume = Math.max(0, Math.min(1, vb * blendB));
  }
  volSliderA?.addEventListener('input', updateDualVolumes);
  volSliderB?.addEventListener('input', updateDualVolumes);
  crossfader?.addEventListener('input', updateDualVolumes);

  function loadDeckB(track, autoplay = true) {
    if (!track || !audioB) return;
    deckB.track = track;
    if (proTitleB) proTitleB.textContent = track.title;
    if (proCoverB) {
      if (track.cover) { proCoverB.src = track.cover; proCoverB.hidden = false; }
      else { proCoverB.hidden = true; proCoverB.removeAttribute('src'); }
    }
    audioB.pause();
    audioB.src = track.url;
    audioB.load();
    updateDualVolumes();
    if (autoplay) audioB.play().catch(() => {});
  }

  function updateProgressB() {
    if (!audioB) return;
    const dur = Number.isFinite(audioB.duration) && audioB.duration > 0 ? audioB.duration : deckB.track?.duration || 0;
    if (proTimeB) proTimeB.textContent = `${time(audioB.currentTime)} / ${time(dur)}`;
    if (proSeekB) {
      proSeekB.disabled = !(Number.isFinite(audioB.duration) && audioB.duration > 0);
      proSeekB.value = dur > 0 ? String(Math.round((audioB.currentTime / dur) * 1000)) : '0';
    }
  }

  if (audioB) {
    audioB.addEventListener('timeupdate', updateProgressB);
    audioB.addEventListener('loadedmetadata', updateProgressB);
    audioB.addEventListener('durationchange', updateProgressB);
    audioB.addEventListener('playing', () => {
      deckB.playing = true;
      proDeckB?.classList.add('is-playing');
      proPlayB?.classList.add('is-active');
      if (playIconB) playIconB.hidden = true;
      if (pauseIconB) pauseIconB.hidden = false;
    });
    audioB.addEventListener('pause', () => {
      deckB.playing = false;
      proDeckB?.classList.remove('is-playing');
      proPlayB?.classList.remove('is-active');
      if (playIconB) playIconB.hidden = false;
      if (pauseIconB) pauseIconB.hidden = true;
    });
    audioB.addEventListener('ended', () => {
      deckB.playing = false;
      proDeckB?.classList.remove('is-playing');
      proPlayB?.classList.remove('is-active');
      if (playIconB) playIconB.hidden = false;
      if (pauseIconB) pauseIconB.hidden = true;
    });
  }

  proSeekB?.addEventListener('input', () => {
    if (audioB && Number.isFinite(audioB.duration) && audioB.duration > 0) {
      audioB.currentTime = (Number(proSeekB.value) / 1000) * audioB.duration;
      updateProgressB();
    }
  });
  const proSeekA = $('[data-pro-seek="a"]');
  proSeekA?.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(proSeekA.value) / 1000) * audio.duration;
      progress();
    }
  });

  // Pro 播放按钮点击
  $('[data-pro-btn="play-a"]')?.addEventListener('click', () => {
    if (audio.paused) void play(); else audio.pause();
  });
  proPlayB?.addEventListener('click', () => {
    if (!audioB) return;
    if (!deckB.track && state.tracks.length) {
      const candidate = state.tracks.length > 1 ? state.tracks[1] : state.tracks[0];
      loadDeckB(candidate, true);
      return;
    }
    if (audioB.paused) audioB.play().catch(() => {}); else audioB.pause();
  });

  // Pro Loop 循环
  $('[data-pro-btn="loop-a"]')?.addEventListener('click', () => {
    audio.loop = !audio.loop;
    $('[data-pro-btn="loop-a"]')?.setAttribute('aria-pressed', String(audio.loop));
    $('[data-player-action="loop"]')?.setAttribute('aria-pressed', String(audio.loop));
  });
  proLoopB?.addEventListener('click', () => {
    if (!audioB) return;
    audioB.loop = !audioB.loop;
    proLoopB.setAttribute('aria-pressed', String(audioB.loop));
  });

  // 双盘搓碟逻辑绑定
  function attachPlatterScratch(platterEl, audioElement, onScratchStateChange) {
    if (!platterEl || !audioElement) return;
    let scratchData = null;
    const getAngle = (event) => {
      const box = platterEl.getBoundingClientRect();
      return Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2));
    };
    platterEl.addEventListener('pointerdown', (event) => {
      if (!audioElement.src || !Number.isFinite(audioElement.duration)) return;
      try { platterEl.setPointerCapture(event.pointerId); } catch {}
      scratchData = { angle: getAngle(event), wasPlaying: !audioElement.paused };
      audioElement.pause();
      onScratchStateChange(true);
    });
    platterEl.addEventListener('pointermove', (event) => {
      if (!scratchData) return;
      const angle = getAngle(event);
      let delta = angle - scratchData.angle;
      if (delta > Math.PI) delta -= 2 * Math.PI; else if (delta < -Math.PI) delta += 2 * Math.PI;
      scratchData.angle = angle;
      audioElement.currentTime = Math.max(0, Math.min(audioElement.duration, audioElement.currentTime + (delta / (2 * Math.PI)) * REV_SECONDS));
      platterEl.style.transform = `rotate(${(audioElement.currentTime / REV_SECONDS) * 360}deg)`;
    });
    const end = () => {
      if (!scratchData) return;
      const resume = scratchData.wasPlaying;
      scratchData = null;
      onScratchStateChange(false);
      platterEl.style.transform = '';
      if (resume) audioElement.play().catch(() => {});
    };
    platterEl.addEventListener('pointerup', end);
    platterEl.addEventListener('pointercancel', end);
  }

  attachPlatterScratch(proPlatterA, audio, (active) => {
    $('[data-pro-deck="a"]')?.classList.toggle('is-scratching', active);
  });
  attachPlatterScratch(proPlatterB, audioB, (active) => {
    $('[data-pro-deck="b"]')?.classList.toggle('is-scratching', active);
  });

  // XY Pad 交互绑定
  function attachXYPad(padEl, dotEl) {
    if (!padEl || !dotEl) return;
    let dragging = false;
    function updateDot(event) {
      const box = padEl.getBoundingClientRect();
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const x = clamp((event.clientX - box.left) / box.width, 0, 1);
      const y = clamp((event.clientY - box.top) / box.height, 0, 1);
      dotEl.style.left = `${(x * 100).toFixed(1)}%`;
      dotEl.style.top = `${(y * 100).toFixed(1)}%`;
    }
    padEl.addEventListener('pointerdown', (event) => {
      try { padEl.setPointerCapture(event.pointerId); } catch {}
      dragging = true;
      updateDot(event);
    });
    padEl.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      updateDot(event);
    });
    const stop = () => {
      if (!dragging) return;
      dragging = false;
      dotEl.style.left = '50%';
      dotEl.style.top = '50%';
    };
    padEl.addEventListener('pointerup', stop);
    padEl.addEventListener('pointercancel', stop);
  }
  attachXYPad($('[data-pro-pad="a"]'), $('[data-pad-dot="a"]'));
  attachXYPad($('[data-pro-pad="b"]'), $('[data-pad-dot="b"]'));

  // 底部曲库列表渲染与独立加载
  function renderProLibrary() {
    const list = $('[data-pro-library-list]');
    if (!list) return;
    list.replaceChildren();
    if (!state.tracks.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" style="text-align:center; padding:10px; color:#7b82a0;">library empty</td>';
      list.appendChild(tr);
      return;
    }
    state.tracks.forEach((track, index) => {
      const tr = document.createElement('tr');
      const coverSrc = track.cover || (config.homeUrl ? config.homeUrl + '/wp-content/themes/devdjam/assets/logo.png' : '');
      tr.innerHTML = `
        <td><img class="pro-lib-cover" src="${coverSrc}" alt=""></td>
        <td style="font-weight:700;"></td>
        <td style="color:#ffcc00;">${track.bpm ? track.bpm + ' BPM' : '---'}</td>
        <td style="color:#8c93b3;">${time(track.duration)}</td>
        <td class="pro-lib-actions">
          <button type="button" class="pro-load-btn" data-load-deck="a" data-idx="${index}">LOAD A</button>
          <button type="button" class="pro-load-btn" data-load-deck="b" data-idx="${index}">LOAD B</button>
        </td>
      `;
      // 标题在服务端已解码为纯文本，必须用 textContent 写入，不能拼进 innerHTML 被当 HTML 解析
      tr.cells[1].textContent = track.title;
      list.appendChild(tr);
    });
    // 如果 Deck B 尚无曲目，默认载入曲库第 2 首（若无则第 1 首）
    if (!deckB.track && state.tracks.length) {
      const candidate = state.tracks.length > 1 ? state.tracks[1] : state.tracks[0];
      loadDeckB(candidate, false);
    }
  }

  $('[data-pro-library-list]')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-load-deck]');
    if (!btn) return;
    const targetDeck = btn.dataset.loadDeck;
    const idx = Number(btn.dataset.idx);
    if (idx < 0 || idx >= state.tracks.length) return;
    const track = state.tracks[idx];
    if (targetDeck === 'a') {
      selectTrack(idx, true);
    } else if (targetDeck === 'b') {
      loadDeckB(track, true);
    }
  });

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
      titleText.querySelector('span').textContent = incoming.dataset.title || view;
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
  let isUnmaxing = false;
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
      if (wasMin && mode === 'open') {
        win.classList.add('is-restoring');
        setTimeout(() => win.classList.remove('is-restoring'), 240);
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
    if (isUnmaxing) return;
    const maxWins = windows.filter((w) => w.classList.contains('is-max'));
    if (!maxWins.length) {
      if (callback) callback();
      return;
    }
    isUnmaxing = true;
    maxWins.forEach((w) => w.classList.add('is-unmax'));
    if (dim) dim.classList.remove('is-active');
    setTimeout(() => {
      isUnmaxing = false;
      Object.keys(windowState).forEach((id) => { if (windowState[id] === 'max') delete windowState[id]; });
      session.set(windowState);
      if (callback) callback();
      applyWindows();
    }, 150);
  }
  dim?.addEventListener('click', () => restoreMaximized());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') restoreMaximized(); });
  function setWindow(id, mode) {
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
    if (!action) return;
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
    if (action === 'play') { if (!activeTrack()) message('no tape'); else if (audio.paused) void play(); else audio.pause(); }
    else if (action === 'next') next();
    else if (action === 'prev') previous();
    else if (action === 'mute') { audio.muted = !audio.muted; message(audio.muted ? 'muted' : 'unmuted'); }
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
