<?php
if (!defined('ABSPATH')) exit;
$eye = esc_url(get_template_directory_uri() . '/assets/gif/eyeball.gif');

// 单个 Deck 面板：LOOP 行 → Jog + TEMPO 列 → SHIFT/CUE/PLAY + 打击垫。Deck 2 由 CSS 镜像（TEMPO 在外侧）
$deck_panel = static function ($n) {
    ?>
    <section class="ddj-deck" data-ddj-deck="<?php echo $n; ?>" <?php echo dj_attr('aria-label', "Deck {n}", array('n' => $n)); ?>>
        <div class="deck-loop" role="group" <?php echo dj_attr('aria-label', "Deck {n} loop", array('n' => $n)); ?>>
            <span class="ddj-label">loop</span>
            <button type="button" class="ddj-btn" data-act="loop-in" <?php echo dj_attr('title', "IN: set loop start; hold for a 4-beat loop"); ?>>in</button>
            <button type="button" class="ddj-btn" data-act="loop-out" <?php echo dj_attr('title', "OUT: set loop end and start looping"); ?>>out</button>
            <button type="button" class="ddj-btn" data-act="loop-exit" <?php echo dj_attr('title', "EXIT: leave or re-enter loop"); ?>>exit</button>
            <button type="button" class="ddj-btn" data-act="loop-half" <?php echo dj_attr('title', "halve loop length"); ?>>&frac12;x</button>
            <button type="button" class="ddj-btn" data-act="loop-double" <?php echo dj_attr('title', "double loop length"); ?>>2x</button>
        </div>
        <div class="deck-mid">
            <div class="deck-jog">
                <div class="jog" data-jog tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                     <?php echo dj_attr('aria-label', "Deck {n} jog: drag the plate to scratch, the rim to bend pitch", array('n' => $n)); ?>>
                    <div class="jog-plate" data-jog-plate>
                        <img class="jog-cover" data-jog-cover alt="" hidden>
                        <i class="jog-mark" aria-hidden="true"></i>
                    </div>
                    <span class="jog-hub" aria-hidden="true"><?php echo $n; ?></span>
                </div>
            </div>
            <div class="deck-tempo">
                <button type="button" class="ddj-btn sync" data-act="sync" aria-pressed="false" <?php echo dj_attr('title', "BEAT SYNC; SHIFT + click changes tempo range"); ?>>beat<br>sync</button>
                <span class="tempo-led" data-master-led>master</span>
                <span class="tempo-end" aria-hidden="true">&minus;</span>
                <div class="ctl-fader v tempo" data-param="d<?php echo $n; ?>.tempo" data-invert="1" <?php echo dj_attr('aria-label', "Deck {n} tempo", array('n' => $n)); ?>><i class="cap"></i></div>
                <span class="tempo-end" aria-hidden="true">+</span>
                <button type="button" class="ddj-btn range" data-act="range" <?php echo dj_attr('title', "tempo range"); ?>>&plusmn;10</button>
                <button type="button" class="ddj-btn tap" data-act="tap" <?php echo dj_attr('title', "TAP: tap at least 4 beats to set the grid; SHIFT + TAP resets it"); ?>>tap</button>
            </div>
        </div>
        <div class="deck-bottom">
            <div class="transport">
                <button type="button" class="ddj-btn shift" data-act="shift" <?php echo dj_attr('title', "hold SHIFT for secondary functions"); ?>>shift</button>
                <button type="button" class="ddj-btn cue" data-act="cue" <?php echo dj_attr('title', "CUE: set while paused, hold to preview; return to cue while playing"); ?>>cue</button>
                <button type="button" class="ddj-btn play" data-act="play" <?php echo dj_attr('aria-label', "Deck {n} play / pause", array('n' => $n)); ?>><?php dj_icon('play'); ?><?php dj_icon('pause'); ?></button>
            </div>
            <div class="pad-block">
                <div class="pad-modes" role="group" <?php echo dj_attr('aria-label', "pad mode"); ?>>
                    <button type="button" class="ddj-btn" data-pad-mode="hotcue" aria-pressed="true"><?php echo dj_text('hot cue'); ?></button>
                    <button type="button" class="ddj-btn" data-pad-mode="loop" aria-pressed="false"><?php echo dj_text('beat loop'); ?></button>
                    <button type="button" class="ddj-btn" data-pad-mode="jump" aria-pressed="false"><?php echo dj_text('beat jump'); ?></button>
                    <button type="button" class="ddj-btn" data-pad-mode="sampler" aria-pressed="false"><?php echo dj_text('sampler'); ?></button>
                </div>
                <div class="pads">
                    <?php for ($i = 0; $i < 8; $i++) : ?>
                        <button type="button" class="pad" data-pad="<?php echo $i; ?>"><span><?php echo esc_html(chr(65 + $i)); ?></span></button>
                    <?php endfor; ?>
                </div>
            </div>
        </div>
    </section>
    <?php
};

// 混音台通道条：TRIM / HI / MID / LOW / CFX + 电平表 + 推子
$strip = static function ($n) {
    $knobs = array('trim' => 'trim', 'hi' => 'hi', 'mid' => 'mid', 'low' => 'low', 'cfx' => 'cfx');
    ?>
    <div class="mix-strip" data-ch="<?php echo $n; ?>">
        <div class="mix-knobs">
            <?php foreach ($knobs as $key => $label) : ?>
                <div class="knob-cell">
                    <div class="ctl-knob<?php echo $key === 'cfx' ? ' cfx' : ''; ?>" data-param="ch<?php echo $n; ?>.<?php echo $key; ?>" <?php echo dj_attr('aria-label', 'Channel {n} {control}', array('n' => $n, 'control' => strtoupper($label))); ?>></div>
                    <span class="ddj-label"><?php echo esc_html($label); ?></span>
                </div>
            <?php endforeach; ?>
        </div>
        <div class="meter" data-meter="ch<?php echo $n; ?>" aria-hidden="true"></div>
    </div>
    <?php
};
?>
<div class="player" <?php echo dj_attr('aria-label', "site player"); ?> data-player>
    <!-- 侧边栏紧凑模式：站点常驻播放器（= Deck 1） -->
    <div class="player-compact">
        <div class="platter-wrap">
            <div class="platter" data-platter <?php echo dj_attr('aria-label', "drag the platter to scratch"); ?> role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0">
            </div>
            <div class="platter-eye" aria-hidden="true">
                <img class="gif" src="<?php echo $eye; ?>" alt="" width="44" height="44">
            </div>
            <div class="tonearm" aria-hidden="true"></div>
        </div>
        <div class="lcd">
            <p class="lcd-title" data-track-title><?php echo dj_text('no tape'); ?></p>
            <span class="lcd-status" data-player-status role="status"><?php echo dj_text('stopped'); ?></span>
            <span class="lcd-meta"><span data-bpm>--- bpm</span><span class="lcd-live" data-deck2-live hidden>2&#9654;</span><span data-rate>+0.0%</span></span>
        </div>
        <input class="seek-slider" data-seek type="range" min="0" max="1000" step="1" value="0" <?php echo dj_attr('aria-label', "playback position"); ?> disabled>
        <div class="player-time"><span data-elapsed>00:00</span><span data-duration>00:00</span></div>
        <div class="deck-controls">
            <button type="button" data-player-action="cue" <?php echo dj_attr('aria-label', "return to CUE"); ?> disabled><?php echo dj_text('cue'); ?></button>
            <button type="button" data-player-action="prev" <?php echo dj_attr('aria-label', "previous track"); ?> disabled><?php dj_icon('prev'); ?></button>
            <button type="button" class="play-button" data-player-action="toggle" <?php echo dj_attr('aria-label', "play"); ?> disabled><span data-play-icon><?php dj_icon('play'); ?></span><span data-pause-icon hidden><?php dj_icon('pause'); ?></span></button>
            <button type="button" data-player-action="next" <?php echo dj_attr('aria-label', "next track"); ?> disabled><?php dj_icon('next'); ?></button>
            <button type="button" data-player-action="loop" aria-pressed="false"><?php echo dj_text('loop'); ?></button>
            <button type="button" data-player-action="shuffle" aria-pressed="false"><?php echo dj_text('shuffle'); ?></button>
        </div>
        <label class="fader"><span><?php echo dj_text('pitch'); ?></span><input data-pitch type="range" min="-10" max="10" step="0.1" value="0" <?php echo dj_attr('aria-label', "pitch"); ?>><button type="button" class="fader-reset" data-player-action="pitch-reset" <?php echo dj_attr('aria-label', "reset pitch"); ?>>0</button></label>
        <label class="fader"><span><?php echo dj_text('vol'); ?></span><input data-volume type="range" min="0" max="1" step="0.01" value="0.7" <?php echo dj_attr('aria-label', "vol"); ?>></label>
        <div class="eq">
            <label><span><?php echo dj_text('low'); ?></span><input data-eq="low" type="range" min="-1" max="1" step="0.01" value="0" <?php echo dj_attr('aria-label', "low frequencies"); ?>></label>
            <label><span><?php echo dj_text('mid'); ?></span><input data-eq="mid" type="range" min="-1" max="1" step="0.01" value="0" <?php echo dj_attr('aria-label', "mid frequencies"); ?>></label>
            <label><span><?php echo dj_text('hi'); ?></span><input data-eq="hi" type="range" min="-1" max="1" step="0.01" value="0" <?php echo dj_attr('aria-label', "high frequencies"); ?>></label>
        </div>
        <button type="button" class="player-open" data-player-action="open-console">&#10530; <?php echo dj_text('dj controller'); ?></button>
        <details class="queue" open><summary><?php echo dj_text('queue'); ?> <span data-queue-count>00</span></summary><ol class="queue-list" data-queue-list><li class="queue-empty"><?php echo dj_text('empty'); ?></li></ol></details>
        <button class="player-retry" data-player-retry type="button" hidden><?php echo dj_text('retry'); ?></button>
    </div>

    <!-- 放大后的 DDJ 双盘控制台：屏幕 + 曲库 + BEAT FX / Deck 1 · Mixer · Deck 2 -->
    <div class="player-pro" data-player-pro>
        <div class="ddj-top">
            <div class="ddj-screen" data-screen>
                <?php foreach (array(1, 2) as $n) : ?>
                    <div class="scr-deck" data-scr="<?php echo $n; ?>">
                        <div class="scr-info">
                            <b class="scr-num"><?php echo $n; ?></b>
                            <span class="scr-title" data-scr="title"><?php echo dj_text('no tape'); ?></span>
                            <span class="scr-flag" data-scr="mode"><?php echo dj_text('empty'); ?></span>
                            <span class="scr-flag is-sync" data-scr="sync" hidden>sync</span>
                            <span class="scr-flag is-master" data-scr="master" hidden>master</span>
                            <span class="scr-flag is-loop" data-scr="loop" hidden>loop</span>
                            <span class="scr-val"><b data-scr="bpm">---.--</b> bpm</span>
                            <span class="scr-val" data-scr="key">--</span>
                            <span class="scr-val" data-scr="tempo">+0.0%</span>
                            <span class="scr-val scr-time" data-scr="time">-00:00.0</span>
                        </div>
                        <canvas class="scr-zoom" data-scr-canvas="zoom" aria-hidden="true"></canvas>
                        <canvas class="scr-overview" data-scr-canvas="overview" <?php echo dj_attr('title', "jump to position"); ?> aria-hidden="true"></canvas>
                    </div>
                <?php endforeach; ?>
                <div class="scr-tools" role="group" <?php echo dj_attr('aria-label', "waveform controls"); ?>>
                    <button type="button" data-screen-act="quantize" aria-pressed="true" <?php echo dj_attr('title', "QUANTIZE: snap loops, hot cues and CUE to the beat"); ?>>q</button>
                    <button type="button" data-screen-act="zoom-in" <?php echo dj_attr('aria-label', "zoom waveform in"); ?>>+</button>
                    <button type="button" data-screen-act="zoom-out" <?php echo dj_attr('aria-label', "zoom waveform out"); ?>>&minus;</button>
                </div>
            </div>
            <section class="ddj-browser" <?php echo dj_attr('aria-label', "tape library"); ?>>
                <header class="browser-head"><span class="ddj-label"><?php echo dj_text('tape library'); ?></span><span class="browser-count" data-lib-count>00</span><span class="browser-hint"><?php echo dj_text('browse and load'); ?> · <?php echo dj_text('double-click row to load'); ?></span></header>
                <div class="browser-wrap">
                    <table class="browser-table">
                        <thead><tr><th class="c-no">#</th><th class="c-art"></th><th><?php echo dj_text('title'); ?></th><th class="c-num">bpm</th><th class="c-num c-key"><?php echo dj_text('key'); ?></th><th class="c-num c-time"><?php echo dj_text('time'); ?></th><th class="c-load"><?php echo dj_text('deck'); ?></th></tr></thead>
                        <tbody data-lib-list><tr><td colspan="7" class="browser-empty"><?php echo dj_text('loading'); ?></td></tr></tbody>
                    </table>
                </div>
            </section>
            <div class="fx-unit" data-fx-unit <?php echo dj_attr('aria-label', "beat effects"); ?>>
                <div class="fx-head"><span class="ddj-label">beat fx</span><button type="button" class="ddj-btn fx-on" data-fx-act="on" aria-pressed="false" <?php echo dj_attr('aria-label', 'enable beat effects'); ?>><?php echo dj_text('on'); ?></button></div>
                <div class="fx-lcd"><b data-fx="name">ECHO</b><span data-fx="beat">1/2</span><span data-fx="bpm">120.0</span></div>
                <div class="fx-row">
                    <button type="button" class="ddj-btn" data-fx-act="select" <?php echo dj_attr('title', "cycle effects (SHIFT reverses)"); ?>>fx&#9656;</button>
                    <button type="button" class="ddj-btn" data-fx-act="beat-down" <?php echo dj_attr('aria-label', "previous effect beat"); ?>>&#9664;</button>
                    <button type="button" class="ddj-btn" data-fx-act="beat-up" <?php echo dj_attr('aria-label', "next effect beat"); ?>>&#9654;</button>
                    <div class="knob-cell">
                        <div class="ctl-knob" data-param="fx.level" <?php echo dj_attr('aria-label', "FX level / depth"); ?>></div>
                        <span class="ddj-label">lvl</span>
                    </div>
                </div>
                <div class="fx-row fx-ch" role="group" <?php echo dj_attr('aria-label', "FX channel"); ?>>
                    <span class="ddj-label">ch</span>
                    <button type="button" class="ddj-btn" data-fx-ch="1" aria-pressed="true">1</button>
                    <button type="button" class="ddj-btn" data-fx-ch="2" aria-pressed="false">2</button>
                    <button type="button" class="ddj-btn" data-fx-ch="M" aria-pressed="false">m</button>
                </div>
            </div>
        </div>

        <div class="ddj-console">
            <?php $deck_panel(1); ?>
            <section class="ddj-mixer" <?php echo dj_attr('aria-label', "mixer"); ?>>
                <div class="mix-browse">
                    <button type="button" class="ddj-btn" data-load="1" <?php echo dj_attr('title', 'load selected track to deck {n}', array('n' => 1)); ?>>&#9664; <?php echo dj_text('load'); ?></button>
                    <div class="knob-cell">
                        <div class="ctl-knob browse" data-browse tabindex="0" role="slider" <?php echo dj_attr('aria-label', "browse tracks"); ?> aria-valuemin="1" aria-valuemax="1" aria-valuenow="1"></div>
                        <span class="ddj-label"><?php echo dj_text('browse'); ?></span>
                    </div>
                    <button type="button" class="ddj-btn" data-load="2" <?php echo dj_attr('title', 'load selected track to deck {n}', array('n' => 2)); ?>><?php echo dj_text('load'); ?> &#9654;</button>
                </div>
                <div class="mix-body">
                    <?php $strip(1); ?>
                    <div class="mix-master">
                        <div class="knob-cell">
                            <div class="ctl-knob" data-param="master" <?php echo dj_attr('aria-label', "master level"); ?>></div>
                            <span class="ddj-label">master</span>
                        </div>
                        <div class="meter-pair" aria-hidden="true"><div class="meter" data-meter="L"></div><div class="meter" data-meter="R"></div></div>
                        <span class="ddj-label">l&nbsp;&nbsp;r</span>
                    </div>
                    <?php $strip(2); ?>
                </div>
                <div class="mix-faders">
                    <div class="ctl-fader v ch" data-param="ch1.fader" <?php echo dj_attr('aria-label', 'Channel {n} fader', array('n' => 1)); ?>><i class="cap"></i></div>
                    <div class="ddj-brand" aria-hidden="true"><b>DEVDJAM</b><span>DDJ-98 &#10022;</span></div>
                    <div class="ctl-fader v ch" data-param="ch2.fader" <?php echo dj_attr('aria-label', 'Channel {n} fader', array('n' => 2)); ?>><i class="cap"></i></div>
                </div>
                <div class="mix-xfader">
                    <span class="ddj-label">1</span>
                    <div class="ctl-fader h" data-param="xfader" <?php echo dj_attr('aria-label', "crossfader"); ?>><i class="cap"></i></div>
                    <span class="ddj-label">2</span>
                </div>
            </section>
            <?php $deck_panel(2); ?>
        </div>
    </div>

    <audio id="devdjam-audio" preload="none"></audio>
    <audio id="devdjam-audio-b" preload="none"></audio>
</div>
