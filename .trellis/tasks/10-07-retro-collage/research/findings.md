# 视觉研究记录（2026-10-07）

## 参考站：实测证据
- https://www.cameronsworld.net/ ：首页说明其内容是从 1994–2009 年 GeoCities 存档收集的文字与图片拼贴。
- 浏览器初次导航超时，随后可以读取页面 DOM 与 CSS。实际确认 section 使用平铺背景，graphic 使用绝对定位；静态图片部分合并成 sprite，通过 background-position 取图，GIF 则独立加载。这不等于已完成整站截图/加载性能验收。
- 当前 CSS：https://www.cameronsworld.net/styles/main-ce8f24db13.css 。本次浏览器读取到 4808 条顶级规则。
- 示例背景：https://www.cameronsworld.net/img/content/1/bg.png 、 /img/content/2/bg.png 。示例动图：/img/content/1/7.gif、9.gif、16.gif、18.gif。静态图集：/img/sprites/sprite1.png。以上只确认 URL 和 CSS 用法，尚未下载或认定适合本项目。
- 字体的计算样式包括 Georgia / Times New Roman、Arial 和 Comic Sans MS / Comic Neue；风格不是依赖一种神奇字体，而是文字风格、图片字和密集布局共同形成。
- https://www.cameronsworld.net/disclaimer.html 明确图片通常非该站所有，非商业用途，不构成向本站授予再分发或商业许可。
- 提取命令：smart-search fetch https://www.cameronsworld.net/ --format markdown；同命令抓取 disclaimer.html。CLI 0.1.24。doctor 中搜索通道网络错误，但 fetch 成功。

## 当前站点：源码证据
以下路径均相对仓库根目录，来自只读研究，并抽查背景与页头入口。
- wp-content/themes/devdjam/assets/site.css:2–24：品牌优先 OldEnglish，UI 是 Pixelated MS Sans Serif，辅助文字 Courier New；并非所有本地字体都有已核实的许可证。
- site.css:43–55：html 平铺 200×200 astro-bg.svg；Ink 主题禁用背景图。site.css:1025：首页下半区也引用星尘纹理。
- wp-content/themes/devdjam/assets/img/astro-bg.svg:1–30：极淡网格和天体小图，解释了视觉仍偏纯白。
- wp-content/themes/devdjam/index.php:63–114：品牌居中、两翼各六张哥特贴纸；保留既有品牌字和交互入口。
- site.css:280–355：页头编排；site.css:1828–1878、1940–1963：响应式。实际移动端是两翼夹字标，不按旧文档的下排贴纸描述实现。
- wp-content/themes/devdjam/assets/site.js:1553：现有贴纸交互，不重写拖拽、碰撞与会话位置保存。
- site.js:1855–1897：现有动效控制；CSS 停止并不等于原生 GIF 暂停，新增 GIF 必须有静态降级方案。
- docs/ASSETS.md:5–55：现有 GifCities 资源来源与风险说明；部分新哥特素材尚未登记。assets/fonts/OFL.txt 不能作为目录中全部字体的许可证明。
- .trellis/spec/frontend/component-guidelines.md:144–150：素材本地化、图片尺寸、不得新增相同 GIF 的多种语义用途。
- README.md:7–28、67–92；dev/server.mjs:7–19、61–71：npm run dev 启动本 worktree 的本地测试站，默认 8787；不读取私有种子站或生产配置。
- dev/check.mjs:7–23：npm run check 主要验证 PHP/JS 语法，不能证明 CSS 视觉正确。

## 建议与边界
采用可读的复古拼贴：窗外明显纹理、页头非对称素材簇、窗口边缘少量徽章；正文窗仍不透明。增加对比和层次，不复制参考站的超长页面、整套坐标、脚本、品牌或音乐。
新素材逐项检查格式、尺寸、体积、原始出处和许可。来源不明的候选不默认标为自由使用；优先有明确许可的小图与原创同风格纹理。旧资源授权审计不扩展成此次全仓库清理。
