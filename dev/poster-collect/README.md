# 海报墙管线

桌面壁纸（`wp-content/themes/devdjam/assets/img/poster-wall/giallo-wall.jpg`）的源料与拼版脚本。

```bash
python fetch.py          # 按片单拉英文维基信息框海报到本目录（已存在的跳过）
python compose.py        # 桌面散贴墙 + 5 张窗口拼贴版，直接写进主题的 assets/img/poster-wall/
python contact_sheet.py  # 可选：出联系表，肉眼过一遍素材
```

产出两份东西：`giallo-wall.jpg`（桌面 2560×1440 散贴）与 `win-<窗口类>.jpg`（每个窗口自己的 2–3 张叠贴，烧好白纱与柔化）。窗口版的片单在 `compose.py` 的 `PLATES` 里。

- 片单在 `fetch.py` 的 `TITLES` / `ALT`，`manifest.json` 是解析出的海报 URL 缓存。
- 本目录的 `*.jpg` 是工作文件，已在 `.gitignore` 里；成品 JPEG 才进主题。
- `compose.py` 的排版常量（行数、每行张数、种子、亮度/饱和度、暗角强度）集中在文件顶部，改完重跑即可。
- 海报是各片宣传物料，版权归出品方，非自由许可。用途与来源记录见 `docs/ASSETS.md`。
