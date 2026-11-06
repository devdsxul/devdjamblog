"""Real local UI/i18n state transitions with intercepted tracks and silent WAV.

No authored content, comments, counter writes or external requests leave the browser.
Audio assertions concern DOM/engine continuity, not listening quality.
"""
import importlib.util
import io
import json
import wave
from pathlib import Path
from playwright.sync_api import sync_playwright

spec=importlib.util.spec_from_file_location('ui',Path(__file__).with_name('check-ui-i18n.py'))
ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
audio=io.BytesIO()
with wave.open(audio,'wb') as wav:
    wav.setparams((1,2,16000,0,'NONE','not compressed'));wav.writeframes(b'\0\0'*16000*12)
TRACKS=[{'id':900001,'title':'Tape <one> & 曲目','url':ui.BASE+'/__ui-test.wav','duration':12,'bpm':120,'key':'Am','cover':''}]


def settled(page,mode):
    page.wait_for_function('''mode=>{const w=document.querySelector('.win-player');return w.classList.contains('is-max')===(mode==='max')&&w.classList.contains('is-min')===(mode==='min')&&!w.matches('.is-unmax,.is-minimizing,.is-restoring')}''',arg=mode)


def main():
    evidence={}
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        context=ui.context_for(browser);page=context.new_page();errors=[];pending=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.route('**/wp-json/devdjam/v1/tracks*',lambda r:pending.append(r))
        page.route('**/__ui-test.wav',lambda r:r.fulfill(content_type='audio/wav',body=audio.getvalue()))
        page.goto(ui.BASE,wait_until='domcontentloaded')
        page.wait_for_function('window.DEVDJAM?.engine')
        assert page.locator('[data-motion-toggle]').count()==0
        assert page.locator('.visitors-box [data-i18n="visitors"]').count()==0
        page.locator('[data-set-lang="zh"]').click()
        assert pending
        pending.pop(0).fulfill(json=TRACKS)
        page.wait_for_function('document.querySelector("[data-queue-count]").textContent==="01"')
        assert page.locator('[data-queue-list] button').get_attribute('aria-label')=='播放 Tape <one> & 曲目'
        assert page.locator('[data-lib-list] [data-i18n="load"]').first.inner_text()=='装载'
        assert not page.evaluate(ui.MARKERS),page.evaluate(ui.MARKERS)
        page.evaluate('''() => {window.refs={engine:DEVDJAM.engine,audio:document.getElementById('devdjam-audio'),queue:document.querySelector('[data-queue-list] button'),row:document.querySelector('[data-lib-list] tr')};DEVDJAM.engine.set('master',0)}''')
        page.locator('[data-player-action="toggle"]').click()
        page.wait_for_function('DEVDJAM.engine.decks[0].isPlaying')
        page.wait_for_function('document.getElementById("devdjam-audio").currentTime > .2')
        page.evaluate('refs.ctx=DEVDJAM.engine.ctx;refs.at=refs.audio.currentTime')
        page.locator('[data-set-lang="en"]').click()
        assert page.locator('[data-player-action="toggle"]').get_attribute('aria-label')=='pause'
        assert page.locator('[data-queue-list] button').get_attribute('aria-label')=='pause Tape <one> & 曲目'
        assert page.evaluate('refs.engine===DEVDJAM.engine&&refs.ctx===DEVDJAM.engine.ctx&&refs.audio===document.getElementById("devdjam-audio")&&refs.audio.currentTime>=refs.at&&refs.queue===document.querySelector("[data-queue-list] button")&&refs.row===document.querySelector("[data-lib-list] tr")')
        page.locator('[data-player-action="toggle"]').click()
        assert page.locator('[data-player-action="toggle"]').get_attribute('aria-label')=='play'
        page.locator('[data-player-action="open-console"]').click();settled(page,'max')
        page.wait_for_function('DEVDJAM.engine.decks[0].phase!=="analyzing"')
        pad=page.locator('[data-ddj-deck="1"] [data-pad="0"]')
        assert pad.get_attribute('aria-label')=='Hot cue A: empty'
        pad.click()
        assert 'empty' not in pad.get_attribute('aria-label')
        page.evaluate('DEVDJAM.i18n.setLanguage("zh")')
        assert pad.get_attribute('aria-label').startswith('热点 A：')
        page.locator('[data-load="2"]').click()
        page.wait_for_function('DEVDJAM.engine.decks[1].track?.id===900001')
        assert page.locator('.win-player [data-window-action="max"]').get_attribute('aria-label')=='还原'
        assert not page.evaluate(ui.MARKERS),page.evaluate(ui.MARKERS)
        evidence['console_contrast']={}
        for theme in ('milk','ink','cherry'):
            page.evaluate('(theme)=>document.querySelector(`button[data-theme="${theme}"]`).click()',theme)
            page.wait_for_timeout(250) # Let existing color transitions finish before measuring.
            evidence['console_contrast'][theme]=page.evaluate(ui.CONTRAST)
            assert page.locator('.ddj-deck').first.evaluate('(el)=>getComputedStyle(el).backgroundColor')=='rgb(255, 253, 247)'
            page.screenshot(path=str(ui.OUT/f'console-zh-{theme}-1440.png'))
        print('PASS late queue, playback identity, hot cues, dual-deck loading and console labels',flush=True)
        page.locator('.win-player [data-window-action="max"]').click();settled(page,'open')
        page.locator('.win-player [data-window-action="min"]').click();settled(page,'min')
        assert page.locator('.win-player [data-window-action="min"]').get_attribute('aria-label')=='还原'
        page.evaluate('DEVDJAM.i18n.setLanguage("en")')
        assert page.locator('.win-player [data-window-action="min"]').get_attribute('aria-label')=='Restore'
        page.locator('.win-player [data-window-action="min"]').click();settled(page,'open')
        page.locator('.dock [data-nav="guestbook"]').click()
        page.wait_for_function('document.querySelector("#site-content").dataset.view==="guestbook" && !document.querySelector("#site-content").hasAttribute("aria-busy")')
        page.locator('#author').fill('Visitor <one>');page.locator('#email').fill('reader@example.test');page.locator('#comment').fill('保留我的文字 & content')
        cookie=page.locator('#wp-comment-cookies-consent')
        page.locator('label[for="wp-comment-cookies-consent"]').click()
        page.locator('[data-set-lang="zh"]').click()
        assert page.locator('#author').input_value()=='Visitor <one>'
        assert page.locator('#comment').input_value()=='保留我的文字 & content'
        assert cookie.is_checked()
        assert page.locator('#submit').input_value()=='发送'
        assert page.locator('label[for="wp-comment-cookies-consent"]').inner_text()=='在此浏览器保存姓名、邮箱和网站，方便下次留言。'
        assert page.evaluate('refs.audio===document.getElementById("devdjam-audio")&&refs.engine===DEVDJAM.engine')
        page.locator('a[href$="/novel/chapter-1/"]').first.click()
        page.wait_for_selector('#novel-reader-viewport')
        body=page.locator('#novel-content-prose').inner_text()
        page.locator('#novel-toggle-settings').click()
        page.locator('[data-novel-setting="size"][data-val="21"]').click()
        page.locator('#novel-close-settings').click()
        viewport=page.locator('#novel-reader-viewport');viewport.evaluate('(el)=>{el.style.scrollBehavior="auto";el.scrollTop=800}')
        page.wait_for_function('document.querySelector("#novel-progress-text").textContent!=="进度 0%"')
        before=viewport.evaluate('(el)=>el.scrollTop')
        page.evaluate('DEVDJAM.i18n.setLanguage("en")')
        assert viewport.evaluate('(el)=>el.scrollTop')==before
        assert viewport.get_attribute('data-font-size')=='21'
        assert page.locator('#novel-content-prose').inner_text()==body
        assert page.locator('#novel-progress-text').inner_text().startswith('progress ')
        evidence['novel_contrast']={}
        for theme in ('milk','ink','cherry'):
            page.evaluate('(theme)=>document.querySelector(`button[data-theme="${theme}"]`).click()',theme)
            page.wait_for_timeout(250)
            evidence['novel_contrast'][theme]=page.evaluate(ui.CONTRAST)
        page.locator('#novel-toggle-toc').click();assert page.locator('#novel-toc-drawer').is_visible()
        page.locator('#novel-close-toc').click()
        page.locator('#novel-toggle-fullscreen').click()
        assert page.locator('#novel-toggle-fullscreen').get_attribute('title')=='restore reader'
        assert not page.evaluate(ui.MARKERS),page.evaluate(ui.MARKERS)
        page.locator('.novel-bar-actions a[title="next chapter"]').click()
        page.wait_for_url('**/novel/chapter-2/')
        page.wait_for_function('document.querySelector(".novel-current-tag").textContent.includes("2")')
        assert page.locator('#novel-reader-viewport').get_attribute('data-font-size')=='21'
        page.go_back();page.wait_for_url('**/novel/chapter-1/')
        page.wait_for_function('document.querySelector(".novel-current-tag").textContent.includes("1")')
        page.locator('.novel-bar-actions [data-nav="home"]').click()
        page.wait_for_function('document.querySelector("#site-content").dataset.view==="home"')
        assert page.evaluate('refs.audio===document.getElementById("devdjam-audio")&&refs.engine===DEVDJAM.engine')
        page.locator('[data-sticker=fx]').click()
        page.wait_for_function('document.documentElement.dataset.effects==="off"')
        page.wait_for_function('Array.from(document.querySelectorAll("img.gif")).filter(e=>e.complete&&e.naturalWidth).every(e=>e.src.startsWith("data:image/png"))')
        assert page.locator('.marquee > span').evaluate('(el)=>getComputedStyle(el).animationName')=='none'
        still=page.locator('.dock-nav img.gif').first.get_attribute('src')
        page.wait_for_timeout(120)
        assert page.locator('.dock-nav img.gif').first.get_attribute('src')==still
        page.locator('[data-sticker=fx]').click()
        assert page.locator('.dock-nav img.gif').first.get_attribute('src').endswith('.gif')
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function('document.querySelector("[data-sticker=fx]").disabled')
        assert page.locator('.dock-nav img.gif').first.get_attribute('src').startswith('data:image/png')
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function('!document.querySelector("[data-sticker=fx]").disabled')
        page.locator('[data-set-lang="zh"]').click()
        page.locator('button[data-theme="ink"]').click()
        # A separate page load verifies saved preferences; let this GET read the real local track list.
        page.unroute('**/wp-json/devdjam/v1/tracks*')
        page.reload(wait_until='networkidle')
        assert page.locator('html').get_attribute('lang')=='zh-CN'
        assert page.locator('html').get_attribute('data-theme')=='ink'
        for response in ('empty','offline'):
            page.route('**/wp-json/devdjam/v1/tracks*',lambda r:r.fulfill(status=200 if response=='empty' else 503,json=[]))
            page.reload(wait_until='networkidle')
            if response=='empty':
                assert page.locator('.queue-empty').inner_text()=='空'
                assert page.locator('.browser-empty').inner_text()=='空', page.locator('.browser-empty').inner_text()
            else:
                assert page.locator('[data-player-status]').inner_text()=='曲库离线'
                assert page.locator('[data-player-retry]').is_visible()
            page.evaluate('DEVDJAM.i18n.setLanguage("en")')
            assert not page.evaluate(ui.MARKERS),page.evaluate(ui.MARKERS)
            page.unroute('**/wp-json/devdjam/v1/tracks*')
            page.evaluate('DEVDJAM.i18n.setLanguage("zh")')
        assert not errors,errors
        evidence['errors']=errors
        evidence['passed']=['bright console in all themes','no top motion switch/duplicate visitors label','empty/offline/late queue','play/pause labels','audio/engine/context/queue identity','literal track title','hot cue empty/set','load deck 2','window min/max/restore','PJAX/history','comment values/cookies','novel settings/scroll/content/chapter/fullscreen','motion off/reduce/restore','saved preferences reload']
        for group in ('console_contrast','novel_contrast'):
            for theme, samples in evidence[group].items():
                assert all(c['ratio']>=c['threshold'] for c in samples), (group,theme,[c for c in samples if c['ratio']<c['threshold']])
        (ui.OUT/'state-report.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
        page.unroute_all(behavior='wait')
        context.unroute_all(behavior='wait')
        context.close();browser.close()
    print('PASS '+', '.join(evidence['passed']))


if __name__=='__main__':main()
