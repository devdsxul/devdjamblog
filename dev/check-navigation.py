"""Real router/DOM regression in Edge; all requests are fulfilled locally."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'wp-content/themes/devdjam/assets/site.js').read_text(encoding='utf-8')
router = source[source.index('  const pages = new Map();'):source.index('  // ---------- 控制面板')]


def html(url):
    return ('<!doctype html><title>' + url + '</title><audio id="persistent"></audio>'
            '<div class="navigation-status"></div><main tabindex="-1" id="site-content" '
            'data-view="blog" style="height:3600px">' + url +
            '<div id="target" style="margin-top:900px">anchor</div></main>')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for width, height in [(390, 844), (1440, 1000)]:
        context = browser.new_context(viewport={'width': width, 'height': height})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/*', lambda route: route.fulfill(content_type='text/html', body=html(route.request.url)))
        page.goto('http://router.test/a')
        page.add_script_tag(content=(ROOT / 'wp-content/themes/devdjam/assets/i18n.js').read_text(encoding='utf-8'))
        page.add_script_tag(content='''(() => {
          const {t, apply: applyLanguage} = window.DEVDJAM.i18n;
          function syncButtons() {} function initNovelReader() {} function loadTracks() {}
          window.originalAudio = document.getElementById('persistent');
        ''' + router + '''
          window.routerGo = path => navigate(new URL(path, location.href));
        })();''')
        page.evaluate('window.scrollTo(0, 640)')
        page.wait_for_function('history.state.scrollY === 640')
        page.evaluate("routerGo('/b')")
        assert page.evaluate('window.scrollY') == 0
        page.go_back()
        page.wait_for_function("location.pathname === '/a' && document.title.endsWith('/a') && window.scrollY === 640")
        assert page.evaluate("originalAudio === document.getElementById('persistent') && originalAudio.isConnected")
        page.evaluate("routerGo('/b#target')")
        assert page.evaluate('window.scrollY') > 800
        page.evaluate("routerGo('/a#%E0%A4')")
        # Observe beyond the next compositor frame: a stale smooth scroll used to move the new page.
        page.wait_for_timeout(300)
        assert page.evaluate('window.scrollY') == 0
        assert not errors, errors
        print(f'PASS browser router {width}x{height}: top reset, history 640px, hash switching, invalid hash, persistent audio DOM')
        context.close()
    browser.close()
