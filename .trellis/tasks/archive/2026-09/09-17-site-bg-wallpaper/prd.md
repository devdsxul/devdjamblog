# Set custom photo wallpaper as site background layer

## Goal

Use the user-uploaded rural grassland billiards documentary photograph as the site background placed at the bottom layer under all desktop content.

## Requirements

1. **Asset Management**:
   - Save the uploaded image to `wp-content/themes/devdjam/assets/img/site-bg.jpg`.
2. **Background Styling**:
   - Set the site background on `html` with `background-image: url("img/site-bg.jpg")`, `background-position: center bottom`, `background-size: cover`, `background-repeat: no-repeat`, `background-attachment: fixed`.
   - Set fallback `background-color: #3b5336`.
   - Ensure `body` has `background: transparent`.
3. **Banner Blending**:
   - Update `.site-banner` and `.banner-stage` to have `background: transparent`, allowing the grassland and mountain sky wallpaper to show naturally behind the floating stickers and 3D gothic wordmark.
4. **Window Integrity**:
   - Windows (`.window`), the sidebar dock (`.dock`), inputs, and controls maintain their authentic Win98 solid white/black panels with hard drop shadows floating above the wallpaper.
5. **Splash Gate Independence**:
   - The entrance splash gate (`.enter[data-enter]`) retains its independent full-screen Neocities starfield splash overlay at `z-index: 999` until entered.

## Acceptance Criteria

- [x] Image saved at `wp-content/themes/devdjam/assets/img/site-bg.jpg`.
- [x] `html` renders the wallpaper bottom-anchored with cover sizing.
- [x] `.site-banner` and `.banner-stage` have transparent backgrounds.
- [x] `npm run check` passes without errors.
