"""Read-only local UI acceptance. No WordPress writes or external requests.

Run against the existing 8787 preview; reports/screenshots stay in .runtime/cult-ui/after.
Uses the real PHP templates, language module and browser DOM, including PJAX.
"""
import json
import mimetypes
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / 'wp-content/themes/devdjam'
BASE = 'http://127.0.0.1:8787'
OUT = ROOT / '.runtime/cult-ui/after'
OUT.mkdir(parents=True, exist_ok=True)
PAGES = {
    'home':'/', 'music':'/music/', 'music-single':'/music/sweet-static-review/',
    'beats':'/beats/', 'blog':'/blog/', 'post':'/2026/09/24/hello-from-the-deck/',
    'links':'/links/', 'about':'/about/', 'guestbook':'/guestbook/',
    'novel':'/novel/chapter-1/', '404':'/no-such-page-xyz/', 'search':'/?s=tape',
}
MARKERS = r'''() => {
  const {t,has} = DEVDJAM.i18n, failures = [];
  for (const el of document.querySelectorAll('*')) {
    const params = JSON.parse(el.getAttribute('data-i18n-params') || '{}');
    for (const attr of el.attributes) {
      if (attr.name !== 'data-i18n' && !attr.name.startsWith('data-i18n-')) continue;
      if (attr.name === 'data-i18n-params') continue;
      const name = attr.name === 'data-i18n' ? 'text' : attr.name.slice(10), key = attr.value;
      if (!['text','aria-label','aria-valuetext','title','placeholder','alt','value'].includes(name)) failures.push(`illegal: ${name}`);
      if (key && !has(key)) failures.push(`missing: ${key}`);
      if (name === 'text' && el.children.length) failures.push(`nested: ${key}`);
      for (const [,p] of key.matchAll(/\{(\w+)\}/g)) if (!Object.hasOwn(params,p)) failures.push(`parameter: ${key}/${p}`);
      const actual = name === 'text' ? el.textContent : name === 'value' ? el.value : el.getAttribute(name);
      if (actual !== t(key,params)) failures.push(`stale ${name}: ${key} => ${actual}`);
    }
  }
  return [...new Set(failures)];
}'''
CONTRAST = r'''() => {
  const rgba = s => { const n = s.match(/[\d.]+/g)?.map(Number); return n?.length >= 3 ? [...n.slice(0,3), n[3] ?? 1] : [0,0,0,0]; };
  const lum = rgb => rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const blend = (a,b) => a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
  const out = [];
  const scope = '.single-entry h2,.prose p,.home-hero-title,.home-hero-preview,.entry-name,.entry-meta,.entry-date,.home-hero-meta,.guest-body,.guest-head,.calendar th,.calendar caption,.lcd-title,.lcd-status,.lcd-meta,.queue-list button,.browser-table th,.browser-table td,.ddj-label,.pad-modes button,.top-lang-btn,.study-group-big,.study-group-count,label,.prose-novel p,.chapter-info-bar,.settings-popup-header,.btn-setting,.scroll-next-link,.scr-num,.scr-flag,.lib-deck,.player-pro .ddj-btn';
  const seen = new Set();
  for (const group of document.querySelectorAll(scope)) {
    const walker = document.createTreeWalker(group,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const node=walker.currentNode, el=node.parentElement, text=node.textContent.trim();
      if (!text || !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) || el.closest('[disabled]')) continue;
      const cs=getComputedStyle(el); let chain=[], source='', image=false, opacity=1;
      for(let e=el;e;e=e.parentElement) {
        const s=getComputedStyle(e), bg=rgba(s.backgroundColor); opacity*=Number(s.opacity);
        if(s.backgroundImage!=='none') image=true;
        chain.push(bg);
        if(bg[3]===1) {source=e.className||e.tagName;break;}
      }
      if(image || !chain.some(c=>c[3]===1)) continue; // Photo/gradient surfaces require visual or pixel inspection.
      let bg=[255,255,255]; for(const c of chain.reverse()) bg=blend(c,bg);
      const fg=rgba(cs.color); fg[3]*=opacity; const color=blend(fg,bg);
      const a=lum(color), b=lum(bg), ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const threshold=el.closest('.prose p,.guest-body,.prose-novel p')?7:4.5;
      const key=cs.color+'|'+bg+'|'+threshold;
      if(seen.has(key))continue;seen.add(key);
      out.push({text:text.slice(0,50),selector:el.className||el.tagName,fg:cs.color,bg,source,ratio:+ratio.toFixed(2),threshold});
    }
  }
  return out;
}'''


def protect(route):
    request = route.request
    if request.url.startswith(BASE + '/') and request.method == 'GET':
        path=unquote(urlparse(request.url).path)
        if path.startswith('/wp-content/themes/devdjam/'):
            file=(ROOT / path.lstrip('/')).resolve()
            if file.is_relative_to(THEME) and file.is_file() and file.suffix != '.php':
                route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
                return
        route.continue_()
    else:
        route.abort()


def context_for(browser, width=1440, lang='en', theme='milk', locale='en-US', saved=True, touch=None):
    touch=width < 600 if touch is None else touch
    context = browser.new_context(viewport={'width':width,'height':900 if width > 720 else 844},
                                  is_mobile=touch, has_touch=touch, locale=locale)
    context.route('**/*', protect)
    # Mark the local counter as already counted so its existing read endpoint is used.
    context.add_init_script("sessionStorage.setItem('dj-entered','1');localStorage.setItem('dj-hit',new Date().toDateString());"
                            + f"if(localStorage.getItem('dj-theme')===null)localStorage.setItem('dj-theme',{json.dumps(theme)});"
                            + (f"if(localStorage.getItem('dj-lang')===null)localStorage.setItem('dj-lang',{json.dumps(lang)});" if saved else ''))
    return context


def load(page, path):
    page.goto(BASE + path, wait_until='networkidle')
    page.wait_for_function('window.DEVDJAM?.i18n && document.querySelector("[data-lib-count]").textContent !== "00"')


def isolated_language(browser):
    code = (THEME / 'assets/i18n.js').read_text(encoding='utf-8')
    cases = [('zh-TW',None,'zh'),('en-US',None,'en'),('fr-FR',None,'en'),
             ('zh-CN','en','en'),('en-US','zh','zh'),('zh-CN','invalid','zh'),('zh-CN','throw','zh')]
    for locale,saved,want in cases:
        context=browser.new_context(locale=locale)
        context.route('**/*',lambda r:r.fulfill(content_type='text/html; charset=utf-8',body='''<!doctype html><html><meta charset="utf-8"><body>
          <button data-set-lang="zh">中文</button><button data-set-lang="en">EN</button>
          <p data-i18n="play {title}" data-i18n-params='{"title":"&lt;img src=x onerror=alert(1)&gt; &amp; 作者"}'></p>
          <input id="input" value="visitor content" data-i18n-value="send">
          <input id="submit" type="submit" data-i18n-value="send">
          <button id="attr" data-i18n-title="reading settings" data-i18n-onclick="send"></button>
          </body></html>'''))
        page=context.new_page();page.goto('http://language.test/')
        if saved=='throw': page.evaluate("Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})")
        elif saved is not None: page.evaluate('(v)=>localStorage.setItem("dj-lang",v)',saved)
        page.add_script_tag(content=code)
        # Deliberately no audio/createEngine: the complete site script must safely return.
        page.add_script_tag(content=(THEME / 'assets/site.js').read_text(encoding='utf-8'))
        assert page.evaluate('DEVDJAM.i18n.language')==want
        page.locator('[data-set-lang="zh"]').click()
        assert page.locator('p').inner_text()=='播放 <img src=x onerror=alert(1)> & 作者', page.locator('p').inner_text()
        assert page.locator('p img').count()==0
        assert page.locator('#input').input_value()=='visitor content'
        assert page.locator('#submit').input_value()=='发送'
        assert page.locator('#attr').get_attribute('title')=='阅读设置'
        assert page.locator('#attr').get_attribute('onclick') is None
        page.locator('[data-set-lang="en"]').click()
        assert page.locator('html').get_attribute('lang')=='en'
        assert page.locator('#submit').input_value()=='send'
        context.close()
    print('PASS 7 language/storage cases, no audio engine, literal interpolation, safe attributes and visitor input',flush=True)


def controller_bounds(browser):
    results=[]
    for width,height,touch in [(1440,900,False),(390,844,True),(320,740,True),(844,390,True),(768,900,False),(980,900,False)]:
        context=context_for(browser,width,'zh','milk',touch=touch)
        context.add_init_script('window.requestIdleCallback=()=>0')
        page=context.new_page();page.set_viewport_size({'width':width,'height':height});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        load(page,'/')
        viewport=page.evaluate('({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
        assert max(viewport.values())<=width,viewport
        # Real hit-testing catches EQ thumbs intercepting the compact player's button.
        page.locator('[data-player-action="open-console"]').click()
        page.wait_for_timeout(350)
        bounds=page.locator('.win-player').bounding_box()
        assert bounds['x']>=-1 and bounds['y']>=-1 and bounds['x']+bounds['width']<=width+1 and bounds['y']+bounds['height']<=height+1,bounds
        assert page.locator('[data-motion-toggle]').count()==0
        assert page.locator('.visitors-box [data-i18n="visitors"]').count()==0
        assert not errors,errors
        page.screenshot(path=str(OUT/f'preview-controller-{width}.png'))
        results.append({'width':width,'height':height,'touch':touch,'viewport':viewport,'bounds':bounds,'errors':errors})
        print('PASS actual controller bounds',width,height,flush=True)
        context.close()
    return results


def main():
    followup='--followup' in sys.argv
    report={'matrix':{},'language_cases':0 if followup else 7}
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        if not followup: isolated_language(browser)
        jobs=[(name,lang,'milk',1440) for name in PAGES for lang in ('en','zh')]
        jobs += [(name,lang,'milk',390) for name in ('home','post','guestbook','novel','beats') for lang in ('en','zh')]
        jobs += [(name,'en',theme,1440) for name in ('home','post','guestbook') for theme in ('ink','cherry')]
        jobs += [(name,lang,'milk',width) for name in ('home','novel','beats') for lang in ('en','zh') for width in (320,768,980)]
        if followup:
            jobs=[('home',lang,theme,1440) for lang in ('en','zh') for theme in ('milk','ink','cherry')]
            jobs += [('home',lang,'milk',width) for lang in ('en','zh') for width in (320,390,768,980)]
        for name,lang,theme,width in jobs:
            context=context_for(browser,width,lang,theme)
            # This matrix checks direct pages; PJAX/prefetch uses the separate state suite.
            context.add_init_script('window.requestIdleCallback = () => 0')
            page=context.new_page();errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            load(page,PAGES[name])
            # Repeat apply in both directions to catch stale cached/dynamic labels.
            page.evaluate('(lang)=>{DEVDJAM.i18n.setLanguage(lang==="en"?"zh":"en");DEVDJAM.i18n.setLanguage(lang)}',lang)
            tag=f'{name}-{lang}-{theme}-{width}'
            markers=page.evaluate(MARKERS)
            viewport=page.evaluate('({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
            overflow=max(viewport.values())-width
            contrast=page.evaluate(CONTRAST)
            assert page.locator('html').get_attribute('lang')==('zh-CN' if lang=='zh' else 'en')
            assert page.locator('.dock-nav > a[data-nav]').evaluate_all('(els)=>els.every(e=>!!e.getAttribute("aria-label"))')
            report['matrix'][tag]={'markers':markers,'viewport':viewport,'expected_width':width,'overflow':overflow,'errors':errors,'contrast':contrast}
            (OUT/('followup-report.json' if followup else 'report.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            if (name in ('home','post','guestbook','novel','beats') and width in (1440,390)) or width==320:
                page.screenshot(path=str(OUT/f'{tag}.png'))
            print(tag,'markers',len(markers),'overflow',overflow,'errors',len(errors),'contrast failures',sum(c['ratio']<c['threshold'] for c in contrast),flush=True)
            context.close()
        report['controllers']=controller_bounds(browser)
        browser.close()
    (OUT/('followup-report.json' if followup else 'report.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    failures={k:v for k,v in report['matrix'].items() if v['markers'] or v['overflow']>0 or v['errors'] or any(c['ratio']<c['threshold'] for c in v['contrast'])}
    assert not failures, 'See .runtime/cult-ui/after/report.json: '+', '.join(failures)
    print(f'PASS {len(jobs)} page/language/theme/viewport cases and {len(report["controllers"])} controller sizes',flush=True)


if __name__=='__main__':main()
