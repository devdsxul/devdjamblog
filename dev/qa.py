"""Browser/API acceptance checks against the isolated LOCAL QA WordPress only."""
from pathlib import Path
from datetime import datetime, timezone
import json
import math
import struct
import traceback
import wave

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8788'
PREVIEW = 'http://127.0.0.1:8787'
REPORT = ROOT / 'docs' / 'qa-report.json'
FIXTURES = ROOT / '.runtime' / 'qa-fixtures'
FIXTURES.mkdir(parents=True, exist_ok=True)
checks = []
created = []
page_errors = []
report = {'timestamp': datetime.now(timezone.utc).isoformat(), 'target': BASE, 'preview': PREVIEW,
          'runtime': 'WordPress 7.1 / PHP 8.3 / Playground SQLite / Microsoft Edge', 'checks': checks}

def check(name, condition, detail=None):
    checks.append({'name': name, 'passed': bool(condition), 'detail': detail})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    assert condition, name + ': ' + str(detail)

def tone(filename, frequency):
    path = FIXTURES / filename
    rate = 16000
    with wave.open(str(path), 'wb') as out:
        out.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        out.writeframes(b''.join(struct.pack('<h', int(1300 * math.sin(2 * math.pi * frequency * i / rate))) for i in range(rate * 32)))
    return path

def sign_in(page, base, access):
    page.goto(base + '/wp-login.php', wait_until='networkidle')
    page.fill('#user_login', access['username'])
    page.fill('#user_pass', access['password'])
    page.click('#wp-submit')
    page.wait_for_url('**/wp-admin/**')
    page.wait_for_load_state('networkidle')

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    public = browser.new_context(viewport={'width': 1440, 'height': 1000})
    public_page = public.new_page()
    public_page.on('pageerror', lambda error: page_errors.append(str(error)))
    admin = browser.new_context(viewport={'width': 1440, 'height': 1000})
    admin_page = admin.new_page()
    nonce = None
    error = None

    def api(method, path, data=None, multipart=None, expected=200):
        kwargs = {'headers': {'X-WP-Nonce': nonce}, 'timeout': 25000}
        if data is not None:
            kwargs['data'] = data
        if multipart is not None:
            kwargs['multipart'] = multipart
        response = admin.request.fetch(BASE + '/wp-json/wp/v2/' + path, method=method, **kwargs)
        assert response.status == expected, f'{method} {path}: {response.status}: {response.text()[:450]}'
        return response.json()

    def create(kind, data):
        result = api('POST', kind, data=data, expected=201)
        created.append((kind, result['id']))
        return result

    def tracks():
        response = public.request.get(BASE + '/wp-json/devdjam/v1/tracks')
        assert response.status == 200
        return response.json()

    try:
        access = json.loads((ROOT / '.runtime/qa-access.json').read_text())
        public_page.goto(PREVIEW, wait_until='networkidle')
        check('Preview starts with an empty playlist', public.request.get(PREVIEW + '/wp-json/devdjam/v1/tracks').json() == [])
        check('Preview starts with no public articles or music',
              public.request.get(PREVIEW + '/wp-json/wp/v2/posts').json() == [] and
              public.request.get(PREVIEW + '/wp-json/wp/v2/music').json() == [])
        expect(public_page.locator('[data-player-action="toggle"]')).to_be_disabled()
        check('Empty player has honest status and disabled play', public_page.locator('[data-player-status]').inner_text() == 'stopped')

        for width in [320, 390, 768, 1440]:
            public_page.set_viewport_size({'width': width, 'height': 1000})
            bounds = public_page.evaluate('''() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,
                links:[...document.querySelectorAll('.dock a')].map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right}))})''')
            check(f'No horizontal overflow or clipped nav links at {width}px',
                  bounds['scroll'] <= width and all(x['left'] >= -1 and x['right'] <= width + 1 for x in bounds['links']), bounds)

        public_page.emulate_media(reduced_motion='reduce')
        expect(public_page.locator('[data-motion-toggle]')).to_be_disabled()
        check('System reduced motion disables decorative animation', public_page.evaluate("getComputedStyle(document.querySelector('.marquee span')).animationName") == 'none')
        public_page.emulate_media(reduced_motion='no-preference')
        public_page.evaluate('window.originalAudio = document.getElementById("devdjam-audio")')
        for view in ['music', 'beats', 'blog', 'links', 'about', 'home']:
            public_page.locator(f'.dock [data-nav="{view}"]').click()
            expect(public_page.locator('#site-content')).to_have_attribute('data-view', view)
            public_page.wait_for_function('document.querySelector("#site-content").getAttribute("aria-busy") !== "true"')
            check(f'Navigation to {view} preserves the audio element', public_page.evaluate('window.originalAudio === document.getElementById("devdjam-audio")'))
        public_page.go_back()
        expect(public_page.locator('#site-content')).to_have_attribute('data-view', 'about')
        public_page.go_forward()
        expect(public_page.locator('#site-content')).to_have_attribute('data-view', 'home')
        check('Browser back and forward restore the correct view', True)
        check('Decorative assets load', public_page.evaluate('Array.from(document.images).filter(x=>x.getAttribute("src")).every(x=>x.complete && x.naturalWidth>0)'))

        response = public.request.get(PREVIEW + '/this-frequency-does-not-exist/')
        check('Missing content has a real 404 and a designed page', response.status == 404 and 'lost in the static' in response.text())
        no_js = browser.new_context(java_script_enabled=False)
        no_js_page = no_js.new_page()
        no_js_page.goto(PREVIEW + '/beats/', wait_until='domcontentloaded')
        check('Basic content navigation works without JavaScript', no_js_page.locator('#site-content').get_attribute('data-view') == 'beats')
        no_js.close()

        denied = public.request.post(BASE + '/wp-json/wp/v2/posts', data={'title': 'DENIED', 'status': 'publish'})
        check('Anonymous content creation is rejected', denied.status in [401, 403], {'status': denied.status, 'body': denied.text()[:400]})
        denied_file = public.request.post(BASE + '/wp-json/wp/v2/media', multipart={'file': {'name': 'denied.txt', 'mimeType': 'text/plain', 'buffer': b'not authorized'}})
        check('Anonymous media upload is rejected', denied_file.status in [401, 403], {'status': denied_file.status, 'body': denied_file.text()[:400]})

        sign_in(admin_page, BASE, access)
        nonce_response = admin.request.get(BASE + '/wp-admin/admin-ajax.php?action=rest-nonce')
        nonce = nonce_response.text()
        check('WordPress administrator login works', nonce_response.status == 200 and len(nonce) == 10)

        post = create('posts', {'title': 'QA temporary journal', 'content': '<p>Temporary acceptance content.</p>', 'status': 'draft'})
        hidden = public.request.get(BASE + f'/wp-json/wp/v2/posts/{post["id"]}')
        check('Draft articles are private in the REST API', hidden.status in [401, 403])
        api('POST', f'posts/{post["id"]}', {'status': 'publish'})
        updated = api('POST', f'posts/{post["id"]}', {'title': 'QA journal edited', 'content': '<p>Edited from the WordPress admin API.</p>'})
        check('Article create, publish and edit reach the public page', 'QA journal edited' in public.request.get(updated['link']).text())
        music = create('music', {'title': 'QA listening room', 'content': '<p>Temporary music note.</p>', 'status': 'publish'})
        check('Music notes have their own public archive', 'QA listening room' in public.request.get(BASE + '/music/').text())

        bad = admin.request.post(BASE + '/wp-json/wp/v2/beats', headers={'X-WP-Nonce': nonce}, data={'title': 'Invalid missing audio', 'status': 'publish'})
        check('Publishing a beat without audio is rejected', bad.status == 400 and bad.json()['code'] == 'dj_audio_required')

        audio_a = tone('devdjam-qa-a.wav', 174)
        audio_b = tone('devdjam-qa-b.wav', 220)
        admin_page.goto(BASE + '/wp-admin/post-new.php?post_type=dj_beat', wait_until='networkidle')
        admin_page.fill('#title', 'QA tape A')
        admin_page.fill('#dj-bpm', '142')
        admin_page.fill('#dj-key', 'F minor')
        admin_page.click('#dj-choose-audio')
        admin_page.locator('input[type=file]').set_input_files(str(audio_a))
        expect(admin_page.locator('.media-button-select')).to_be_enabled(timeout=30000)
        admin_page.locator('.media-button-select').click()
        audio_id = int(admin_page.locator('#dj-audio-id').input_value())
        created.append(('media', audio_id))
        check('Native media uploader links and previews a real audio file', audio_id > 0 and bool(admin_page.locator('#dj-audio-preview').get_attribute('src')))
        admin_page.click('#publish')
        admin_page.wait_for_url('**/post.php?**')
        admin_page.wait_for_load_state('networkidle')
        from urllib.parse import urlparse, parse_qs
        beat_a_id = int(parse_qs(urlparse(admin_page.url).query)['post'][0])
        created.append(('beats', beat_a_id))
        a = next((x for x in tracks() if x['id'] == beat_a_id), None)
        check('Publishing a beat through the real editor updates the queue', a is not None and a['bpm'] == 142 and a['key'] == 'F minor')
        admin_page.fill('#dj-bpm', '150')
        admin_page.click('#publish')
        admin_page.wait_for_load_state('networkidle')
        check('Editing beat metadata updates the public queue', next(x for x in tracks() if x['id'] == beat_a_id)['bpm'] == 150)

        media_b = api('POST', 'media', multipart={'file': {'name': audio_b.name, 'mimeType': 'audio/wav', 'buffer': audio_b.read_bytes()}}, expected=201)
        created.append(('media', media_b['id']))
        beat_b = create('beats', {'title': 'QA tape B', 'status': 'publish', 'meta': {'_dj_audio_id': media_b['id'], '_dj_bpm': 160, '_dj_key': 'C minor'}})
        draft = create('beats', {'title': 'QA secret draft', 'status': 'draft', 'meta': {'_dj_audio_id': audio_id}})
        check('Playlist contains only published beats', len(tracks()) == 2 and all(x['id'] != draft['id'] for x in tracks()))
        check('Draft beat detail is not public', public.request.get(BASE + f'/wp-json/wp/v2/beats/{draft["id"]}').status in [401, 403])

        public_page.goto(BASE + '/beats/', wait_until='networkidle')
        public_page.evaluate('document.querySelector("audio").muted = true; window.originalAudio = document.querySelector("audio")')
        check('Published tracks do not autoplay on arrival', public_page.evaluate('document.querySelector("audio").paused'))
        public_page.locator(f'.track-button[data-track-id="{beat_a_id}"]').click()
        public_page.wait_for_function('!document.querySelector("audio").paused && document.querySelector("audio").currentTime > 0.2')
        before = public_page.evaluate('document.querySelector("audio").currentTime')
        check('The player actually decodes and plays the uploaded audio', before > 0.2)
        public_page.locator('.dock [data-nav="music"]').click()
        expect(public_page.locator('#site-content')).to_have_attribute('data-view', 'music')
        uninterrupted = public_page.evaluate('({same:window.originalAudio===document.querySelector("audio"),paused:document.querySelector("audio").paused,time:document.querySelector("audio").currentTime})')
        check('Music continues through navigation without replacing audio', uninterrupted['same'] and not uninterrupted['paused'] and uninterrupted['time'] >= before, uninterrupted)
        seek_box = public_page.locator('[data-seek]').bounding_box()
        public_page.mouse.click(seek_box['x'] + seek_box['width'] * 0.6, seek_box['y'] + seek_box['height'] / 2)
        public_page.wait_for_function('document.querySelector("audio").currentTime > 12')
        check('Dragging the progress control seeks the real audio', public_page.evaluate('document.querySelector("audio").currentTime') > 12)
        volume_box = public_page.locator('[data-volume]').bounding_box()
        public_page.mouse.click(volume_box['x'] + volume_box['width'] * 0.25, volume_box['y'] + volume_box['height'] / 2)
        check('Volume control changes the audio element', 0.05 < public_page.evaluate('document.querySelector("audio").volume') < 0.5)
        public_page.locator('[data-player-action="toggle"]').click()
        check('Pause stops the real audio', public_page.evaluate('document.querySelector("audio").paused'))
        public_page.locator('[data-player-action="next"]').click()
        public_page.wait_for_function('!document.querySelector("audio").paused && document.querySelector("audio").currentTime>0')
        check('Next track switches and plays', public_page.locator('[data-track-title]').inner_text() == 'QA tape B')
        public_page.locator('[data-player-action="prev"]').click()
        check('Previous track works', public_page.locator('[data-track-title]').inner_text() == 'QA tape A')
        public_page.locator('.queue summary').click()
        public_page.locator(f'.queue button[data-track-id="{beat_b["id"]}"]').click()
        check('The expanded queue can select tracks', public_page.locator('[data-track-title]').inner_text() == 'QA tape B')
        public_page.locator('[data-player-action="toggle"]').click()

        # Both negative cases are isolated to this browser; the live server is unchanged.
        queue_pattern = BASE + '/wp-json/devdjam/v1/tracks'
        public.route(queue_pattern, lambda route: route.fulfill(status=503, content_type='application/json', body='{}'))
        public_page.reload(wait_until='networkidle')
        expect(public_page.locator('[data-player-retry]')).to_be_visible()
        check('A failed playlist request has a usable error state', '无法连接' in public_page.locator('[data-player-status]').inner_text())
        public.unroute(queue_pattern)
        public_page.locator('[data-player-retry]').click()
        expect(public_page.locator('[data-player-action="toggle"]')).to_be_enabled()
        check('Playlist retry recovers', public_page.locator('[data-queue-count]').inner_text() == '02')

        bad_audio_url = next(x for x in tracks() if x['id'] == beat_b['id'])['url']
        public.route(bad_audio_url, lambda route: route.fulfill(status=404, body='missing'))
        public_page.goto(BASE + '/beats/', wait_until='networkidle')
        public_page.evaluate('document.querySelector("audio").muted = true')
        public_page.locator(f'.track-button[data-track-id="{beat_b["id"]}"]').click()
        expect(public_page.locator('[data-player-retry]')).to_be_visible()
        check('Missing audio displays a recoverable playback error', '无法播放' in public_page.locator('[data-player-status]').inner_text())
        public.unroute(bad_audio_url)
        public_page.locator('[data-player-retry]').click()
        public_page.wait_for_function('!document.querySelector("audio").paused && document.querySelector("audio").currentTime>0')
        check('Audio retry successfully resumes playback', True)
        public_page.locator('[data-player-action="toggle"]').click()

        public_page.locator('.dock [data-nav="music"]').click()
        public_page.locator('.main-nav [data-nav="blog"]').click()
        expect(public_page.locator('#site-content')).to_have_attribute('data-view', 'blog')
        check('Rapid navigation resolves to the last destination', '/blog/' in public_page.url)

        api('DELETE', f'beats/{beat_a_id}')
        check('Trashing a beat removes it from the playback queue', all(x['id'] != beat_a_id for x in tracks()))
        api('DELETE', f'posts/{post["id"]}')
        check('Trashing an article removes it from the public archive', 'QA journal edited' not in public.request.get(BASE + '/blog/').text())
        check('No uncaught frontend JavaScript errors', page_errors == [], page_errors)

        # Capture the clean owner dashboard, with no fixture content from QA.
        preview_access = json.loads((ROOT / '.runtime/preview-access.json').read_text())
        sign_in(admin_page, PREVIEW, preview_access)
        admin_page.goto(PREVIEW + '/wp-admin/admin.php?page=devdjam', wait_until='networkidle')
        admin_page.screenshot(path=str(ROOT / 'docs/screenshots/admin-control-room.png'), full_page=True)
        check('Owner control room shows the three empty content collections', admin_page.locator('.dj-admin-cards strong').all_text_contents() == ['0', '0', '0'])

    except Exception as exc:
        error = str(exc)
        report['error'] = error
        traceback.print_exc()
        try:
            admin_page.screenshot(path=str(ROOT / '.runtime/qa-failure-admin.png'), full_page=True)
            public_page.screenshot(path=str(ROOT / '.runtime/qa-failure-public.png'), full_page=True)
        except Exception:
            pass
    finally:
        cleanup = []
        # Remove only the IDs created in this run, in dependency order.
        for kind, identity in sorted(created, key=lambda entry: entry[0] == 'media'):
            try:
                response = admin.request.delete(BASE + f'/wp-json/wp/v2/{kind}/{identity}?force=true', headers={'X-WP-Nonce': nonce})
                cleanup.append({'type': kind, 'id': identity, 'status': response.status})
            except Exception as exc:
                cleanup.append({'type': kind, 'id': identity, 'error': str(exc)})
        report['cleanup'] = cleanup
        report['passed'] = error is None and all(c['passed'] for c in checks) and all(c.get('status') in [200, 404, 410] for c in cleanup)
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        browser.close()

print(f'Report: {REPORT}', flush=True)
raise SystemExit(0 if report['passed'] else 1)
