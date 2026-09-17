<?php if (!defined('ABSPATH')) exit; ?>
<div class="player" aria-label="站内打碟机" data-player>
    <!-- 侧边栏紧凑模式（单盘/Deck A） -->
    <div class="player-compact">
        <div class="platter-wrap">
            <div class="platter" data-platter aria-label="转盘：按住拖动可搓碟" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0">
                <img class="platter-label" data-player-cover alt="" hidden>
            </div>
            <div class="platter-eye" aria-hidden="true">
                <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/eyeball.gif'); ?>" alt="" width="44" height="44">
            </div>
            <div class="tonearm" aria-hidden="true"></div>
        </div>
        <div class="lcd">
            <p class="lcd-title" data-track-title>no tape</p>
            <span class="lcd-status" data-player-status role="status">stopped</span>
            <span class="lcd-meta"><span data-bpm>--- bpm</span><span data-rate>+0.0%</span></span>
        </div>
        <input class="seek-slider" data-seek type="range" min="0" max="1000" step="1" value="0" aria-label="播放进度" disabled>
        <div class="player-time"><span data-elapsed>00:00</span><span data-duration>00:00</span></div>
        <div class="deck-controls">
            <button type="button" data-player-action="cue" aria-label="回到起点" disabled><?php echo dj_text('cue'); ?></button>
            <button type="button" data-player-action="prev" aria-label="上一首" disabled><?php dj_icon('prev'); ?></button>
            <button type="button" class="play-button" data-player-action="toggle" aria-label="播放" disabled><span data-play-icon><?php dj_icon('play'); ?></span><span data-pause-icon hidden><?php dj_icon('pause'); ?></span></button>
            <button type="button" data-player-action="next" aria-label="下一首" disabled><?php dj_icon('next'); ?></button>
            <button type="button" data-player-action="loop" aria-pressed="false"><?php echo dj_text('loop'); ?></button>
            <button type="button" data-player-action="shuffle" aria-pressed="false"><?php echo dj_text('shuffle'); ?></button>
        </div>
        <label class="fader"><span><?php echo dj_text('pitch'); ?></span><input data-pitch type="range" min="-8" max="8" step="0.1" value="0" aria-label="变速"><button type="button" class="fader-reset" data-player-action="pitch-reset" aria-label="变速归零">0</button></label>
        <label class="fader"><span><?php echo dj_text('vol'); ?></span><input data-volume type="range" min="0" max="1" step="0.01" value="0.7" aria-label="音量"></label>
        <div class="eq">
            <label><span><?php echo dj_text('low'); ?></span><input data-eq="low" type="range" min="-12" max="12" step="1" value="0" aria-label="低频"></label>
            <label><span><?php echo dj_text('mid'); ?></span><input data-eq="mid" type="range" min="-12" max="12" step="1" value="0" aria-label="中频"></label>
            <label><span><?php echo dj_text('hi'); ?></span><input data-eq="high" type="range" min="-12" max="12" step="1" value="0" aria-label="高频"></label>
        </div>
        <details class="queue" open><summary><?php echo dj_text('queue'); ?> <span data-queue-count>00</span></summary><ol class="queue-list" data-queue-list><li class="queue-empty">empty</li></ol></details>
        <button class="player-retry" data-player-retry type="button" hidden><?php echo dj_text('retry'); ?></button>
    </div>

    <!-- 放大后的专业双盘工作台模式（DECK A + MIXER + DECK B） -->
    <div class="player-pro" data-player-pro>
        <div class="pro-console">
            <!-- 左盘 DECK A (Pad 在左，转盘在右) -->
            <div class="pro-deck pro-deck-a" data-pro-deck="a">
                <div class="pro-deck-head">
                    <div class="pro-track-meta">
                        <span class="pro-deck-badge badge-a">DECK A</span>
                        <span class="pro-track-title" data-pro-title="a">no tape</span>
                    </div>
                    <div class="pro-track-time" data-pro-time="a">0:00 / 0:00</div>
                </div>
                <div class="pro-wave-bar">
                    <input class="seek-slider pro-seek" data-pro-seek="a" type="range" min="0" max="1000" step="1" value="0" aria-label="Deck A 播放进度" disabled>
                </div>
                <div class="pro-deck-body">
                    <!-- 左侧 XY 触控垫 / 音效调制 -->
                    <div class="pro-pad" data-pro-pad="a" aria-label="Deck A 触控效果垫" role="application">
                        <div class="pad-crosshair"></div>
                        <div class="pad-dot" data-pad-dot="a"></div>
                        <span class="pad-label">XY PAD</span>
                    </div>
                    <!-- 右侧黑胶转盘与唱臂 -->
                    <div class="pro-platter-section">
                        <div class="platter-wrap pro-platter-wrap">
                            <div class="platter pro-platter" data-pro-platter="a" aria-label="Deck A 黑胶转盘：按住拖动可搓碟" role="slider" tabindex="0">
                                <img class="platter-label" data-pro-cover="a" alt="" hidden>
                            </div>
                            <div class="platter-eye pro-platter-eye" aria-hidden="true">
                                <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/eyeball.gif'); ?>" alt="" width="52" height="52">
                            </div>
                            <div class="tonearm pro-tonearm" data-pro-tonearm="a" aria-hidden="true"></div>
                        </div>
                    </div>
                </div>
                <div class="pro-deck-controls pro-controls-left">
                    <button type="button" class="pro-btn pro-btn-tag" data-pro-btn="cue-a">pro</button>
                    <div class="pro-dropdown-btn">
                        <select data-pro-fx="a" aria-label="Deck A 音效">
                            <option value="none">FX 1 Slicer</option>
                            <option value="filter">FX 2 Filter</option>
                            <option value="crush">FX 3 Bitcrush</option>
                        </select>
                    </div>
                    <div class="pro-loop-group">
                        <button type="button" class="pro-btn pro-loop-step" data-pro-loop-step="a" data-dir="-1">-</button>
                        <button type="button" class="pro-btn pro-loop-toggle" data-pro-btn="loop-a" aria-pressed="false">&#8635; 4</button>
                        <button type="button" class="pro-btn pro-loop-step" data-pro-loop-step="a" data-dir="1">+</button>
                    </div>
                    <button type="button" class="pro-btn pro-play-btn" data-pro-btn="play-a" aria-label="Deck A 播放"><span data-pro-play-icon="a">&#9654;</span><span data-pro-pause-icon="a" hidden>&#9646;&#9646;</span></button>
                </div>
            </div>

            <!-- 中置混音台 MIXER -->
            <div class="pro-mixer" data-pro-mixer>
                <div class="mixer-header">
                    <span class="mixer-icon">&#127881;</span>
                    <div class="mixer-bpm-box">
                        <div class="mixer-bpm-val"><span data-mixer-bpm>126</span> <small>BPM</small></div>
                        <div class="mixer-bpm-bars">
                            <span class="bpm-bar bar-a"></span>
                            <span class="bpm-bar bar-mid"></span>
                            <span class="bpm-bar bar-b"></span>
                        </div>
                    </div>
                    <span class="mixer-icon">&#10024;</span>
                </div>

                <div class="mixer-main-row">
                    <!-- Deck A 旋钮列 -->
                    <div class="mixer-knobs-col col-a">
                        <label class="mixer-knob">
                            <input data-pro-eq="high" data-deck="a" type="range" min="-12" max="12" step="1" value="0">
                            <span>Mid</span>
                        </label>
                        <label class="mixer-knob">
                            <input data-pro-eq="mid" data-deck="a" type="range" min="-12" max="12" step="1" value="0">
                            <span>Bass</span>
                        </label>
                        <label class="mixer-knob knob-filter-a">
                            <input data-pro-eq="low" data-deck="a" type="range" min="-12" max="12" step="1" value="0">
                            <span>Filter</span>
                        </label>
                    </div>

                    <!-- 双通道垂直音量推子 -->
                    <div class="mixer-faders-pair">
                        <div class="fader-track track-a">
                            <input class="is-vertical pro-vol-slider slider-a" data-pro-vol="a" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Deck A 音量">
                            <div class="fader-indicator ind-a"></div>
                        </div>
                        <div class="fader-track track-b">
                            <input class="is-vertical pro-vol-slider slider-b" data-pro-vol="b" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Deck B 音量">
                            <div class="fader-indicator ind-b"></div>
                        </div>
                    </div>

                    <!-- Deck B 旋钮列 -->
                    <div class="mixer-knobs-col col-b">
                        <label class="mixer-knob">
                            <input data-pro-eq="high" data-deck="b" type="range" min="-12" max="12" step="1" value="0">
                            <span>Mid</span>
                        </label>
                        <label class="mixer-knob">
                            <input data-pro-eq="mid" data-deck="b" type="range" min="-12" max="12" step="1" value="0">
                            <span>Bass</span>
                        </label>
                        <label class="mixer-knob knob-filter-b">
                            <input data-pro-eq="low" data-deck="b" type="range" min="-12" max="12" step="1" value="0">
                            <span>Filter</span>
                        </label>
                    </div>
                </div>

                <!-- 底部横向 Crossfader -->
                <div class="mixer-crossfader-wrap">
                    <div class="crossfader-notch notch-left">&#9664;</div>
                    <div class="crossfader-well">
                        <input class="crossfader-slider" data-mixer-crossfader type="range" min="0" max="100" step="1" value="50" aria-label="交叉推子 Crossfader">
                    </div>
                    <div class="crossfader-notch notch-right">&#9654;</div>
                </div>
            </div>

            <!-- 右盘 DECK B (转盘在左，Pad 在右) -->
            <div class="pro-deck pro-deck-b" data-pro-deck="b">
                <div class="pro-deck-head">
                    <div class="pro-track-meta">
                        <span class="pro-deck-badge badge-b">DECK B</span>
                        <span class="pro-track-title" data-pro-title="b">Load A Song From Library</span>
                    </div>
                    <div class="pro-track-time" data-pro-time="b">0:00 / 0:00</div>
                </div>
                <div class="pro-wave-bar">
                    <input class="seek-slider pro-seek" data-pro-seek="b" type="range" min="0" max="1000" step="1" value="0" aria-label="Deck B 播放进度" disabled>
                </div>
                <div class="pro-deck-body">
                    <!-- 左侧黑胶转盘与唱臂 -->
                    <div class="pro-platter-section">
                        <div class="platter-wrap pro-platter-wrap">
                            <div class="platter pro-platter" data-pro-platter="b" aria-label="Deck B 黑胶转盘：按住拖动可搓碟" role="slider" tabindex="0">
                                <img class="platter-label" data-pro-cover="b" alt="" hidden>
                            </div>
                            <div class="platter-eye pro-platter-eye" aria-hidden="true">
                                <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/eyeball.gif'); ?>" alt="" width="52" height="52">
                            </div>
                            <div class="tonearm pro-tonearm" data-pro-tonearm="b" aria-hidden="true"></div>
                        </div>
                    </div>
                    <!-- 右侧 XY 触控垫 / 音效调制 -->
                    <div class="pro-pad" data-pro-pad="b" aria-label="Deck B 触控效果垫" role="application">
                        <div class="pad-crosshair"></div>
                        <div class="pad-dot" data-pad-dot="b"></div>
                        <span class="pad-label">XY PAD</span>
                    </div>
                </div>
                <div class="pro-deck-controls pro-controls-right">
                    <button type="button" class="pro-btn pro-play-btn" data-pro-btn="play-b" aria-label="Deck B 播放"><span data-pro-play-icon="b">&#9654;</span><span data-pro-pause-icon="b" hidden>&#9646;&#9646;</span></button>
                    <div class="pro-loop-group">
                        <button type="button" class="pro-btn pro-loop-step" data-pro-loop-step="b" data-dir="-1">-</button>
                        <button type="button" class="pro-btn pro-loop-toggle" data-pro-btn="loop-b" aria-pressed="false">&#8635; 4</button>
                        <button type="button" class="pro-btn pro-loop-step" data-pro-loop-step="b" data-dir="1">+</button>
                    </div>
                    <div class="pro-dropdown-btn">
                        <select data-pro-fx="b" aria-label="Deck B 音效">
                            <option value="none">FX 1 Slicer</option>
                            <option value="filter">FX 2 Filter</option>
                            <option value="crush">FX 3 Bitcrush</option>
                        </select>
                    </div>
                    <button type="button" class="pro-btn pro-btn-tag" data-pro-btn="cue-b">pro</button>
                </div>
            </div>
        </div>

        <!-- 下方曲库面板（可装载至 A 或 B 盘） -->
        <fieldset class="pro-library">
            <legend>TAPE LIBRARY &bull; LOAD TO DECKS</legend>
            <div class="pro-library-table-wrap">
                <table class="pro-library-table">
                    <thead>
                        <tr>
                            <th style="width:36px;">Cover</th>
                            <th>Title</th>
                            <th style="width:65px;">BPM</th>
                            <th style="width:55px;">Time</th>
                            <th style="width:145px; text-align:center;">Action</th>
                        </tr>
                    </thead>
                    <tbody data-pro-library-list>
                        <tr><td colspan="5" style="text-align:center; padding:10px; color:var(--muted);">loading library...</td></tr>
                    </tbody>
                </table>
            </div>
        </fieldset>
    </div>

    <audio id="devdjam-audio" preload="none"></audio>
    <audio id="devdjam-audio-b" preload="none"></audio>
</div>
