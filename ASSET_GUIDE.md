# Katakana RPG Visual Asset Pack v1.0

Target: Katakana RPG Ver.1.3

## Folder layout

```text
assets/images/
├── branding/
│   └── ege-logo.png
├── characters/
│   └── hero-main.png
├── enemies/
│   ├── enemy-normal.png
│   ├── enemy-challenge.png
│   └── enemy-demon-king.png
└── backgrounds/
    ├── bg-title.webp
    ├── bg-normal.webp
    ├── bg-challenge.webp
    ├── bg-demon-king.webp
    └── bg-stage-result.webp
```

## Screen mapping

- Title: `bg-title.webp` + `ege-logo.png`
- Normal: `hero-main.png` + `enemy-normal.png` + `bg-normal.webp`
- Challenge: `hero-main.png` + `enemy-challenge.png` + `bg-challenge.webp`
- Demon King: `hero-main.png` + `enemy-demon-king.png` + `bg-demon-king.webp`
- Result / stage end: `bg-stage-result.webp`

## Processing

- Character/enemy/logo assets are transparent PNGs.
- Backgrounds are WebP at 1536x864.
- Original uploaded files are retained under `source-originals/` for traceability.
- Do not rename files after implementation unless the application references are updated at the same time.
