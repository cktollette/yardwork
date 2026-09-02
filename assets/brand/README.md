# Brand source assets

Canonical home for Klippa brand source assets that the app or build may consume.
Kept separate from the app-config build inputs in `assets/` (`icon.png`,
`splash-icon.png`, `favicon.png`, the `android-icon-*` set) so nothing here is
implicitly wired into `app.json` / `app.config.js`.

## Contents

| File | What it is | Origin |
| --- | --- | --- |
| `wordmark-gradient.svg` | Gradient wordmark (light `#66B287` → dark `#2E5E43`), tagline outlined. Consumed in-app via the hand-ported `src/share/Wordmark.tsx`. | Verbatim copy of `Wordmark/Svg/Wordmark-01.svg`. |
| `wordmark-white.svg` | White wordmark for dark/photo backgrounds. | Verbatim copy of `Wordmark/Svg/Wordmark-02.svg`. |
| `k-mark.svg` | Standalone K mark on a transparent 1024 canvas, single fill `#2E5E43`. | Mechanical extraction of the K paths from `App Icon/Svg/App Icon-01-01.svg` (green field rect dropped, fill recolored). No redraw. |
| `app-icon-green-1024.png` | App Store icon, green field. 1024×1024, RGB, no alpha, square corners. **Parked** — not yet wired into `app.json`; rides the first Phase 2 PR that forces a native rebuild. | Rendered from `App Icon/Svg/App Icon-01-01.svg` (see command below). |
| `app-icon-white-inverse-1024.png` | App Store icon, white-inverse field. 1024×1024, RGB, no alpha, square corners. | Rendered from `App Icon/Svg/App Icon-01-02.svg`. |

## Vector masters live OUTSIDE this repo

The Illustrator / EPS / PDF vector masters are design sources, not build inputs,
and are **deliberately not committed**. They live in the delivered brand package:

    ~/Desktop/Klippa Logo Final Files/
      App Icon/{Ai,Eps,Pdf,Png,Jpeg,Svg}/
      Wordmark/{Ai,Eps,Pdf,Png,Jpeg,Svg}/

The delivered raster icons (`App Icon-01.png` / `-02.png`) are 4267×4267 RGBA
with partial-alpha corner pixels; they are intentionally **not** used. The 1024
PNGs above are rendered fresh from the icon SVGs instead.

## Reproducing the 1024 icon PNGs from source

Machine tooling only (`brew install librsvg imagemagick`); neither is a project
dependency. Run from the delivered brand package:

    rsvg-convert -w 1024 -h 1024 "App Icon/Svg/App Icon-01-01.svg" \
      | magick - -background '#2e5e43' -flatten -alpha off app-icon-green-1024.png

    rsvg-convert -w 1024 -h 1024 "App Icon/Svg/App Icon-01-02.svg" \
      | magick - -background '#ffffff' -flatten -alpha off app-icon-white-inverse-1024.png

Verify: `sips -g pixelWidth -g pixelHeight -g hasAlpha <file>` → 1024×1024,
`hasAlpha: no`, and all four corners fully opaque in the field color.
