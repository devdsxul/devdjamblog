(() => {
  'use strict';
  if (!window.wp?.media) return;

  // ---------- 封面图片选择与默认封面回退 ----------
  const chooseCover = document.getElementById('dj-choose-cover');
  const removeCover = document.getElementById('dj-remove-cover');
  const coverId = document.getElementById('dj-cover-id');
  const coverPreview = document.getElementById('dj-cover-preview');
  const coverHint = document.getElementById('dj-cover-hint');
  let coverFrame;

  if (chooseCover && coverId && coverPreview) {
    chooseCover.addEventListener('click', () => {
      if (!coverFrame) {
        coverFrame = wp.media({
          title: '选择封面图片',
          library: { type: 'image' },
          button: { text: '使用这张封面' },
          multiple: false,
        });
        coverFrame.on('select', () => {
          const file = coverFrame.state().get('selection').first().toJSON();
          const imgUrl = file.sizes?.medium?.url || file.sizes?.full?.url || file.url;
          coverId.value = String(file.id);
          coverPreview.src = imgUrl;
          if (removeCover) removeCover.disabled = false;
          if (coverHint) coverHint.textContent = '已设定自定义封面。';
        });
      }
      coverFrame.open();
    });

    if (removeCover) {
      removeCover.addEventListener('click', () => {
        coverId.value = '';
        const defaultSrc = coverPreview.dataset.defaultSrc || '';
        if (defaultSrc) coverPreview.src = defaultSrc;
        removeCover.disabled = true;
        if (coverHint) coverHint.textContent = '未设置封面，当前展示默认复古磁带封面。';
      });
    }
  }

  // ---------- 音频文件选择与预览 ----------
  const chooseAudio = document.getElementById('dj-choose-audio');
  const audioId = document.getElementById('dj-audio-id');
  const audioName = document.getElementById('dj-audio-name');
  const audioPreview = document.getElementById('dj-audio-preview');
  const removeAudio = document.getElementById('dj-remove-audio');
  let audioFrame;

  if (chooseAudio && audioId) {
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
      });
    }
  }
})();
