(() => {
  'use strict';
  const config = window.DEVDJAM = window.DEVDJAM || {};
  const zh = {
    "skip to content": "跳到正文",
    "preferences": "偏好设置",
    "English": "英文",
    "Chinese": "中文",
    "enter site": "进入网站",
    "you are now": "你即将进入",
    "devdjam’s world": "DEVDJAM 的世界",
    "main navigation": "主导航",
    "Minimize": "最小化",
    "Maximize": "最大化",
    "Restore": "还原",
    "spark": "点亮星光",
    "spin": "旋转",
    "mute": "切换静音",
    "no music yet": "还没有音乐",
    "play {title}": "播放 {title}",
    "pause {title}": "暂停 {title}",
    "load": "装载",
    "browse": "选曲",
    "enable beat effects": "启用节拍效果",
    "playing · {details}": "播放中 · {details}",
    "load {title} to deck {n}": "将 {title} 装到唱盘 {n}",
    "Deck {n}": "唱盘 {n}",
    "Deck {n} loop": "唱盘 {n} 循环",
    "Deck {n} tempo": "唱盘 {n} 变速",
    "Deck {n} play / pause": "唱盘 {n} 播放 / 暂停",
    "Deck {n} jog: drag the plate to scratch, the rim to bend pitch": "唱盘 {n}：拖动顶盘搓碟，拖外圈弯音",
    "Channel {n} {control}": "通道 {n} {control}",
    "IN: set loop start; hold for a 4-beat loop": "IN：设循环入点；长按创建 4 拍循环",
    "OUT: set loop end and start looping": "OUT：设出点并开始循环",
    "EXIT: leave or re-enter loop": "EXIT：退出或重新进入循环",
    "halve loop length": "循环长度减半",
    "double loop length": "循环长度加倍",
    "BEAT SYNC; SHIFT + click changes tempo range": "BEAT SYNC；SHIFT + 点击切换量程",
    "tempo range": "变速量程",
    "TAP: tap at least 4 beats to set the grid; SHIFT + TAP resets it": "TAP：跟着音乐敲至少 4 下校正拍网格；SHIFT + TAP 恢复自动",
    "hold SHIFT for secondary functions": "按住 SHIFT 使用第二功能",
    "CUE: set while paused, hold to preview; return to cue while playing": "CUE：暂停时设点、按住试听；播放中回到起点",
    "pad mode": "打击垫模式",
    "hot cue": "热点",
    "beat loop": "拍循环",
    "beat jump": "跳拍",
    "sampler": "采样器",
    "Hot cue {label}: {position}": "热点 {label}：{position}",
    "Beat loop {beats}": "循环 {beats} 拍",
    "Beat jump {beats}": "跳动 {beats} 拍",
    "Sampler {name}": "采样 {name}",
    "site player": "站内打碟机",
    "drag the platter to scratch": "按住唱盘拖动搓碟",
    "playback position": "播放进度",
    "return to CUE": "回到 CUE 点",
    "previous track": "上一首",
    "next track": "下一首",
    "reset pitch": "变速归零",
    "low frequencies": "低频",
    "mid frequencies": "中频",
    "high frequencies": "高频",
    "kill": "全切",
    "stream": "流式播放",
    "stream only": "仅流式播放",
    "analyzing…": "分析中…",
    "jump to position": "点击跳转",
    "waveform controls": "波形控制",
    "QUANTIZE: snap loops, hot cues and CUE to the beat": "QUANTIZE：循环、热点和 CUE 吸附到拍",
    "zoom waveform in": "放大波形",
    "zoom waveform out": "缩小波形",
    "tape library": "曲库",
    "key": "调性",
    "time": "时长",
    "deck": "唱盘",
    "browse and load": "选曲与装载",
    "beat effects": "节拍效果",
    "previous effect beat": "减少效果拍数",
    "next effect beat": "增加效果拍数",
    "FX level / depth": "效果电平 / 深度",
    "FX channel": "效果通道",
    "cycle effects (SHIFT reverses)": "切换效果（SHIFT 反向）",
    "mixer": "混音台",
    "browse tracks": "转动选择曲目",
    "master level": "主音量",
    "load selected track to deck {n}": "将所选曲目装到唱盘 {n}",
    "Channel {n} fader": "通道 {n} 推子",
    "crossfader": "交叉推子",
    "opening page…": "正在打开页面…",
    "opened {title}": "已打开 {title}",
    "Drag or use arrow keys to move; Home to reset": "拖动或按方向键移动；Home 复位",
    "reduce decorative motion": "减少装饰动效",
    "content pages": "内容分页",
    "comment pages": "留言分页",
    "previous page": "上一页",
    "next page": "下一页",
    "save comment details": "在此浏览器保存姓名、邮箱和网站，方便下次留言。",
    "previous and next months": "前后月份",
    "posts on {date}": "{date} 发布的文章",
    "{name} — RSS feed": "{name} — RSS 订阅",
    "{name} — comments feed": "{name} — 留言订阅",
    "first chapter:": "第一章：",
    "read chapter 1": "阅读第一章",
    "{count} chapters": "共 {count} 章",
    "{count} chapter": "共 {count} 章",
    "serial in progress": "连载中",
    "new": "新作",
    "return to desktop": "返回桌面",
    "close reader": "关闭阅读器并返回桌面",
    "fullscreen reader": "全屏阅读器",
    "fill viewport": "铺满视口",
    "restore reader": "还原阅读窗口",
    "contents": "目录",
    "reading settings": "阅读设置",
    "previous chapter": "上一章",
    "next chapter": "下一章",
    "close settings": "关闭设置",
    "close contents": "关闭目录",
    "font size": "字号大小",
    "font family": "字体选择",
    "small (15)": "小 (15)",
    "standard (18)": "标准 (18)",
    "large (21)": "大 (21)",
    "extra large (25)": "特大 (25)",
    "serif": "宋体 / 明朝",
    "sans serif": "黑体 / 现代",
    "monospace": "仿宋 / 等宽",
    "reading palette": "阅读配色",
    "retro grey": "复古灰",
    "warm paper": "暖色纸张",
    "soft mint": "柔和浅绿",
    "plain white": "纯白",
    "night": "夜间",
    "retro": "复古",
    "paper": "纸张",
    "mint": "浅绿",
    "white": "纯白",
    "line spacing": "行距",
    "compact": "紧凑",
    "standard": "标准",
    "relaxed": "宽松",
    "reading width": "版心宽度",
    "narrow (680)": "专注 (680)",
    "standard (800)": "标准 (800)",
    "wide (960)": "宽屏 (960)",
    "chapter {number}": "第 {number} 章",
    "progress {percent}%": "进度 {percent}%",
    "{count} characters": "{count} 字",
    "current": "当前",
    "serial novel": "连载小说",
    "about {minutes} min read": "阅读约 {minutes} 分钟",
    "published:": "发布时间：",
    "end of chapter": "本章完",
    "first chapter reached": "已经是第一章",
    "view all chapters": "查看完整目录",
    "more chapters coming soon": "敬请期待后续更新",
    "continue to chapter {number}": "继续阅读第 {number} 章",
    "no published chapters yet": "目前还没有已发布的章节",
    "home": "首页",
    "lang": "语言",
    "fx": "动效",
    "music": "音乐",
    "beats": "节拍",
    "blog": "杂谈",
    "links": "链接",
    "about": "关于",
    "guestbook": "留言簿",
    "author": "作者",
    "control panel": "控制面板",
    "calendar": "日历",
    "search": "搜索",
    "error": "错误",
    "novel": "小说",
    "study group": "学习小组",
    "we're a study group": "我们是一个学习小组",
    "fired to level up": "被辞退就能加点",
    "read our novel": "阅读小说",
    "latest": "最新",
    "open >>": "打开 >>",
    "read >>": "阅读 >>",
    "<< back": "<< 返回",
    "ok": "好",
    "play": "播放",
    "pause": "暂停",
    "retry": "重试",
    "go": "搜",
    "nothing here yet": "这里还什么都没有",
    "no beats yet": "还没有节拍",
    "no tape": "没有磁带",
    "no entries yet": "还没有留言",
    "stopped": "已停止",
    "queue": "队列",
    "empty": "空",
    "vol": "音量",
    "admin": "后台",
    "now playing": "正在播放",
    "paused": "已暂停",
    "playing": "播放中",
    "loading": "加载中",
    "ready": "就绪",
    "buffering": "缓冲中",
    "end": "结束",
    "queue offline": "曲库离线",
    "not available": "不可用",
    "tap play again": "再点一次播放",
    "can't play this file": "无法播放这个文件",
    "language": "语言",
    "theme": "配色",
    "effects": "动效",
    "on": "开",
    "off": "关",
    "milk": "牛奶",
    "ink": "墨",
    "cherry": "樱桃",
    "dj deck": "打碟机",
    "cue": "起点",
    "loop": "循环",
    "shuffle": "随机",
    "pitch": "变速",
    "low": "低",
    "mid": "中",
    "hi": "高",
    "visitors": "访客",
    "last updated": "最近更新",
    "rss": "订阅",
    "muted": "已静音",
    "unmuted": "取消静音",
    "sign the guestbook": "写下留言",
    "name": "名字",
    "email": "邮箱",
    "message": "留言",
    "send": "发送",
    "awaiting approval": "等待审核",
    "login required": "需要登录",
    "dj controller": "打碟控制台",
    "thanks for visiting": "谢谢来访",
    "title": "曲名",
    "double-click row to load": "双击整行装载"
};
  const root = document.documentElement;
  const attributes = ['aria-label', 'aria-valuetext', 'title', 'placeholder', 'alt', 'value'];
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* 偏好可选 */ } },
  };
  const saved = storage.get('dj-lang');
  let lang = ['en', 'zh'].includes(saved) ? saved : (/^zh\b/i.test(navigator.languages?.[0] || navigator.language || '') ? 'zh' : 'en');
  function t(key, params = {}) {
    const text = lang === 'zh' && Object.hasOwn(zh, key) ? zh[key] : key;
    return String(text).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(params, name) ? String(params[name]) : match);
  }
  function parameters(el) {
    try {
      const value = JSON.parse(el.getAttribute('data-i18n-params') || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function all(scope, selector) {
    return [...(scope.matches?.(selector) ? [scope] : []), ...scope.querySelectorAll(selector)];
  }
  function apply(scope = document) {
    root.dataset.lang = lang;
    root.lang = lang === 'zh' ? 'zh-CN' : 'en';
    all(scope, '[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n, parameters(el)); });
    attributes.forEach((name) => all(scope, `[data-i18n-${name}]`).forEach((el) => {
      const text = t(el.getAttribute(`data-i18n-${name}`), parameters(el));
      // value 只用于提交按钮；切语言不能改访客填写的数据。
      if (name === 'value') { if (el.matches('input[type="submit"], input[type="button"]')) el.value = text; }
      else el.setAttribute(name, text);
    }));
    all(scope, '[data-calendar-date]').forEach((el) => {
      const date = new Date(`${el.dataset.calendarDate}T12:00:00Z`);
      if (!Number.isFinite(date.getTime())) return;
      const kind = el.dataset.calendarKind;
      const opts = kind === 'day' ? { year: 'numeric', month: 'long', day: 'numeric' } : { year: 'numeric', month: 'long' };
      const label = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { ...opts, timeZone: 'UTC' }).format(date);
      if (kind === 'day') el.setAttribute('aria-label', t('posts on {date}', { date: label }));
      else el.textContent = `${kind === 'prev' ? '« ' : ''}${label}${kind === 'next' ? ' »' : ''}`;
    });
    all(scope, '[data-calendar-month]').forEach((el) => {
      const month = Number(el.dataset.calendarMonth);
      if (month < 1 || month > 12) return;
      const label = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, month - 1, 1)));
      el.textContent = el.dataset.calendarKind === 'prev' ? `« ${label}` : `${label} »`;
    });
    all(scope, '.comment-navigation').forEach((el) => {
      el.setAttribute('data-i18n-aria-label', 'comment pages');
      el.setAttribute('aria-label', t('comment pages'));
    });
    all(scope, '[data-calendar-weekday]').forEach((el) => {
      const date = new Date(Date.UTC(2023, 0, 1 + Number(el.dataset.calendarWeekday)));
      el.textContent = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { weekday: 'narrow', timeZone: 'UTC' }).format(date);
      el.setAttribute('aria-label', new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { weekday: 'long', timeZone: 'UTC' }).format(date));
    });
    // Feed 模板固定英文后缀；仅标记主题自己产生的标题，站名/文章名保持原样。
    all(scope, 'link[type="application/rss+xml"]:not([data-i18n-title])').forEach((el) => {
      const match = el.title.match(/^(.*) — (RSS feed|comments feed)$/);
      if (!match) return;
      el.setAttribute('data-i18n-title', `{name} — ${match[2]}`);
      el.setAttribute('data-i18n-params', JSON.stringify({ name: match[1] }));
      el.title = t(`{name} — ${match[2]}`, { name: match[1] });
    });
    document.querySelectorAll('[data-lang-select]').forEach((el) => { el.value = lang; });
    document.querySelectorAll('[data-set-lang]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.setLang === lang)));
  }
  function setLanguage(value) {
    if (!['en', 'zh'].includes(value)) return;
    lang = value;
    storage.set('dj-lang', lang);
    apply();
    document.dispatchEvent(new CustomEvent('devdjam:language'));
  }
  config.i18n = { t, apply, setLanguage, get language() { return lang; }, has: (key) => Object.hasOwn(zh, key) };
  root.dataset.lang = lang;
  root.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-set-lang]');
    if (button) setLanguage(button.dataset.setLang);
  });
  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-lang-select]')) setLanguage(event.target.value);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply(), { once: true });
  else apply();
})();
