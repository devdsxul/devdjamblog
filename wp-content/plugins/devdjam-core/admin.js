(() => {
  'use strict';
  const media = window.wp?.media;   // 只有编辑页加载了媒体库

  // ---------- 音频文件选择与预览 ----------
  const chooseAudio = document.getElementById('dj-choose-audio');
  const audioId = document.getElementById('dj-audio-id');
  const audioName = document.getElementById('dj-audio-name');
  const audioPreview = document.getElementById('dj-audio-preview');
  const removeAudio = document.getElementById('dj-remove-audio');
  let audioFrame;

  if (media && chooseAudio && audioId) {
    chooseAudio.addEventListener('click', () => {
      if (!audioFrame) {
        audioFrame = wp.media({
          title: '选择音频文件',
          library: { type: 'audio' },
          button: { text: '使用这段音频' },
          multiple: false,
        });
        audioFrame.on('select', () => {
          const file = audioFrame.state().get('selection').first().toJSON();
          audioId.value = String(file.id);
          if (audioName) audioName.textContent = file.filename || file.title;
          if (audioPreview) {
            audioPreview.pause();
            audioPreview.src = file.url;
            audioPreview.hidden = false;
          }
          if (removeAudio) removeAudio.disabled = false;
          audioChanged(file.url);
        });
      }
      audioFrame.open();
    });

    if (removeAudio) {
      removeAudio.addEventListener('click', () => {
        audioId.value = '0';
        if (audioName) audioName.textContent = '还没有选择音频';
        if (audioPreview) {
          audioPreview.pause();
          audioPreview.removeAttribute('src');
          audioPreview.load();
          audioPreview.hidden = true;
        }
        removeAudio.disabled = true;
        audioChanged('');
      });
    }
  }

  // ---------- BPM / 调性自动识别（分析代码与前台打碟机共用主题的 track-analysis.js） ----------
  const analysis = window.DEVDJAM?.analysis;

  // 下载并解码到 22.05 kHz：识别用不到更高的频段，省一半内存和时间。
  // 不足 8 秒的片段听不出拍速，BPM 留空
  async function detect(url, stale) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`下载音频失败（HTTP ${response.status}）`);
    const buffer = await analysis.decodeAudio(new OfflineAudioContext(1, 1, 22050), await response.arrayBuffer());
    const grid = await analysis.analyzeBuffer(buffer, 0, stale);
    return { bpm: buffer.duration >= 8 ? Math.round(grid.bpm) : 0, key: await analysis.detectKey(buffer, stale) };
  }
  const describe = (bpm, key) => [bpm ? `${bpm} BPM` : '', key].filter(Boolean).join(' · ') || '没识别出来';

  // 编辑页：选好音频后自动补空着的字段；点按钮则整体重新识别
  const detectButton = document.getElementById('dj-detect');
  const detectStatus = document.getElementById('dj-detect-status');
  const bpmInput = document.getElementById('dj-bpm');
  const keyInput = document.getElementById('dj-key');
  let detectJob = 0;

  async function detectInto(url, onlyEmpty) {
    const job = ++detectJob;
    detectButton.disabled = true;
    detectStatus.textContent = '正在分析音频…';
    try {
      const found = await detect(url, () => job !== detectJob);
      if (found.bpm && (!onlyEmpty || !bpmInput.value)) bpmInput.value = String(found.bpm);
      if (found.key && (!onlyEmpty || !keyInput.value)) keyInput.value = found.key;
      detectStatus.textContent = `识别结果：${describe(found.bpm, found.key)}。保存后生效，可以手动改。`;
    } catch (error) {
      if (error.name === 'AbortError') return;   // 换了音频，旧结果作废
      detectStatus.textContent = `识别失败：${error.message}`;
    }
    detectButton.disabled = !audioPreview?.getAttribute('src');
  }

  function audioChanged(url) {
    if (!analysis || !detectButton) return;
    detectButton.disabled = !url;
    if (!url) {
      detectJob += 1;
      detectStatus.textContent = '';
    } else if (!bpmInput.value || !keyInput.value) {
      detectInto(url, true);
    }
  }

  if (analysis && detectButton && bpmInput && keyInput) {
    detectButton.addEventListener('click', () => {
      const url = audioPreview?.getAttribute('src');
      if (url) detectInto(url, false);
    });
  }

  // 控制室：逐首识别缺失的 BPM / 调性，只写空着的字段，通过 REST 保存
  const detectAll = document.getElementById('dj-detect-all');
  const detectLog = document.getElementById('dj-detect-log');
  if (analysis && window.wp?.apiFetch && detectAll && detectLog) {
    detectAll.addEventListener('click', async () => {
      const tracks = JSON.parse(detectAll.dataset.tracks || '[]');
      detectAll.disabled = true;
      detectLog.hidden = false;
      detectLog.textContent = '';
      let saved = 0;
      for (const track of tracks) {
        const row = document.createElement('li');
        row.textContent = `${track.title}：分析中…`;
        detectLog.append(row);
        try {
          const found = await detect(track.url);
          const meta = {};
          if (!track.bpm && found.bpm) meta._dj_bpm = found.bpm;
          if (!track.key && found.key) meta._dj_key = found.key;
          if (Object.keys(meta).length) {
            await wp.apiFetch({ path: `/wp/v2/${track.rest}/${track.id}`, method: 'POST', data: { meta } });
            saved += 1;
          }
          row.textContent = `${track.title}：${describe(meta._dj_bpm || track.bpm, meta._dj_key || track.key)}`;
        } catch (error) {
          row.textContent = `${track.title}：识别失败，${error.message}`;
          row.className = 'is-error';
        }
      }
      detectAll.textContent = `完成：已更新 ${saved} / ${tracks.length} 首`;
    });
  }
})();
