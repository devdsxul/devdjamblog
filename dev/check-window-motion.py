"""Window-motion regression with real CSS/handlers, no WordPress or network writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / 'wp-content/themes/devdjam'
source = (THEME / 'assets/site.js').read_text(encoding='utf-8')
start = source.index('  // ---------- 窗口管理：')
end = source.index('  // ---------- 贴纸：', start)
handlers = source[start:end]


def fixture():
    windows = []
    for name in ['content', 'player']:
        windows.append(f'''<section class="window win-{name}" data-window="{name}">
          <div class="title-bar"><div class="title-bar-text">{name}</div>
          <div class="title-bar-controls"><button data-window-action="min">_</button>
          <button data-window-action="max">□</button></div></div>
          <div class="window-body"><p>DEVDJAM / SYSTEM READY</p>
          <div style="height:160px">Window content</div></div></section>''')
    return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="desk"><div class="col">' + ''.join(windows) + '</div></main><div class="desk-dim" data-dim hidden></div></body></html>'


def click(page, name, action):
    page.locator(f'[data-window="{name}"] [data-window-action="{action}"]').evaluate('(el) => el.click()')


def settled(page, name, mode):
    page.wait_for_function('''([name, mode]) => {
      const win = document.querySelector(`[data-window="${name}"]`);
      return win.classList.contains('is-max') === (mode === 'max')
        && win.classList.contains('is-min') === (mode === 'min')
        && !win.matches('.is-minimizing, .is-unmax, .is-restoring');
    }''', arg=[name, mode])


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for width, height, touch in [(1440, 1000, False), (390, 844, True), (844, 390, True), (320, 740, True)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=touch, has_touch=touch)
        page = context.new_page()
        page.route('**/*', lambda route: route.fulfill(content_type='text/html', body=fixture()) if route.request.resource_type == 'document' else route.abort())
        page.goto('http://window.test/')
        for file in ['assets/98/98.css', 'assets/site.css', 'assets/deck.css']:
            page.add_style_tag(content=(THEME / file).read_text(encoding='utf-8'))
        page.add_script_tag(content='(() => {\n' + handlers + '\n})();')
        for name in ['content', 'player']:
            win = page.locator(f'[data-window="{name}"]')
            click(page, name, 'max')
            assert win.evaluate('(el) => getComputedStyle(el).animationDuration') == '0.6s'
            page.wait_for_timeout(220)
            assert float(win.evaluate('(el) => getComputedStyle(el, "::after").opacity')) > 0
            page.wait_for_timeout(450)
            if name == 'player' and touch:
                bounds = win.bounding_box()
                assert bounds['x'] >= -1 and bounds['y'] >= -1, bounds
                assert bounds['x'] + bounds['width'] <= width + 1, bounds
                assert bounds['y'] + bounds['height'] <= height + 1, bounds
                rotated = win.evaluate('(el) => getComputedStyle(el).getPropertyValue("--deck-rotated").trim()')
                assert rotated == ('1' if width < height else '0')
            click(page, name, 'max')
            page.wait_for_timeout(200)
            assert win.evaluate('(el) => el.matches(".is-max.is-unmax")')
            # Rapid input must not overwrite state halfway through the exit.
            click(page, name, 'min')
            settled(page, name, 'open')
            assert page.locator('.window-ghost').count() == 0
            assert not page.locator('[data-dim]').evaluate('(el) => el.classList.contains("is-active")')
            click(page, name, 'min')
            page.wait_for_timeout(200)
            assert win.evaluate('(el) => el.classList.contains("is-minimizing") && !el.classList.contains("is-min")')
            assert win.locator('.window-body').evaluate('(el) => getComputedStyle(el).display') != 'none'
            settled(page, name, 'min')
            assert win.locator('.window-body').evaluate('(el) => getComputedStyle(el).display') == 'none'
            click(page, name, 'min')
            assert win.evaluate('(el) => el.classList.contains("is-restoring")')
            settled(page, name, 'open')
            click(page, name, 'max')
            page.wait_for_timeout(650)
            click(page, name, 'min')
            settled(page, name, 'min')
            assert page.locator('.window-ghost').count() == 0
            click(page, name, 'min')
            settled(page, name, 'open')
        for preference in ['reduce', 'off']:
            if preference == 'reduce':
                page.emulate_media(reduced_motion='reduce')
            else:
                page.emulate_media(reduced_motion='no-preference')
                page.evaluate('document.documentElement.dataset.effects = "off"')
            click(page, 'player', 'max')
            assert page.locator('.win-player').evaluate('(el) => getComputedStyle(el).animationDuration') == '0s'
            page.keyboard.press('Escape')
            settled(page, 'player', 'open')
            click(page, 'content', 'min')
            settled(page, 'content', 'min')
            click(page, 'content', 'min')
            settled(page, 'content', 'open')
        print(f'PASS {width}x{height} touch={touch}: 600ms enter/exit, scanlines, minimize/restore, rapid input, rotation bounds, reduced motion')
        context.close()
    browser.close()
