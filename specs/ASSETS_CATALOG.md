# ASSETS_CATALOG.md

Personal Wealth Management Web App
Version 1.0

## 1) Purpose

Define a strict asset catalog for frontend usage:

* Logos and brand marks
* App icons and favicons
* UI icon usage rules (no emojis)
* Illustrations and empty states
* File structure, naming, and export conventions
* Implementation rules for Next.js and component usage

Design intent: clinical minimalism inspired by OpenAI and Revolut, with Apple-like clarity and restraint.

## 2) Directory structure (mandatory)

Use this structure in the repo:

/public
/brand
logo-mark.svg
logo-wordmark.svg
logo-lockup.svg
/icons
app-icon-1024.png
app-icon-512.png
app-icon-192.png
app-icon-180.png
app-icon-152.png
app-icon-120.png
favicon.svg
favicon-32.png
favicon-16.png
/og
og-default.png

/src
/assets
/illustrations
empty-no-data.svg
empty-import.svg
empty-scenarios.svg
/badges
badge-placeholder.svg
/components
/icons
Icon.tsx
index.ts
/brand
BrandMark.tsx
Wordmark.tsx

## 3) Logo system

### 3.1 Required logo variants

Provide these SVGs:

* logo-mark.svg (simple symbol, works at 16px)
* logo-wordmark.svg (text only)
* logo-lockup.svg (mark + wordmark)

Rules:

* Monochrome only (use text-1 color by default).
* No gradients.
* No shadows baked into SVG.
* SVG must be clean, minimal geometry, soft corners where relevant.

### 3.2 Placement rules

* Shell top-left: use mark or lockup, small and subtle.
* Do not use oversized logos inside functional screens.
* Only one brand mark per screen.

## 4) App icon and favicon

### 4.1 App icon

* Must work on light and dark backgrounds.
* Must be legible at 16px.
* No text inside the icon.

Deliver:

* app-icon-1024.png as the source of truth
* downscaled sizes listed in /public/icons

### 4.2 Favicons

Deliver:

* favicon.svg
* favicon-32.png
* favicon-16.png

## 5) Icons in UI (no emojis)

### 5.1 Standard icon set

Use a single icon library consistently:

* Lucide (recommended)

Rules:

* No emojis anywhere.
* Icons are functional, not decorative.
* Keep stroke weight consistent across the app.
* Default icon color is text-2, use accent only for primary action emphasis.

### 5.2 Icon wrapper component (mandatory)

Create a single Icon wrapper that enforces:

* consistent size scale (16, 18, 20, 24)
* consistent stroke width
* consistent color tokens

## 6) Illustrations and empty states

Empty states must feel premium and calm, not playful.

Required illustrations (SVG):

* empty-no-data.svg (used when no portfolio imported)
* empty-import.svg (used when import is required)
* empty-scenarios.svg (used when no scenarios exist)

Rules:

* Minimal line art, low contrast.
* Use neutral tones only (text-3 and border colors).
* No characters, no mascots, no humor.

## 7) Naming conventions

* Use kebab-case for file names.
* Use semantic names, not numbers.
* Prefer stable names even if the asset changes visually.

Examples:

* logo-mark.svg
* empty-import.svg
* app-icon-1024.png

## 8) Implementation rules (Next.js)

* Logos and icons served from /public.
* Use next/image for PNG assets.
* Prefer inline SVG components for icons and brand marks if you need theme-aware coloring.

## 9) Definition of done

This asset catalog is complete when:

* All required logo, icons, and illustration assets exist in /public and /src/assets.
* Icon usage in UI goes through the Icon wrapper.
* No emojis are used anywhere in the UI.
* Assets follow naming and directory rules.

End of file.
