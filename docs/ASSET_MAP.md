# ASSET_MAP.md

## Icon System
- Library: `lucide-react` (single icon family across the app).
- Wrapper: `components/ui/icon.tsx`.
- Wrapper rules:
  - Allowed sizes: `16`, `18`, `20`, `24`.
  - Fixed stroke width: `1.75`.
  - Token color mapping only (`brand-text*`, `brand-accent`, `brand-success`, `brand-warning`, `brand-danger`).
  - No direct icon rendering without wrapper in product UI.

## Logo Assets (`/public/assets/logo`)
- `logo-mark.svg`
  - Usage: compact brand mark contexts (reserved for future mobile icon-only shell state).
  - Size rule: 20-24px height.
- `logo-wordmark.svg`
  - Usage: text-only brand rendering for docs/exports.
  - Size rule: 20-28px height.
- `logo-lockup.svg`
  - Usage: primary app shell brand anchor in sidebar header.
  - Current placement: `components/layout/app-shell.tsx`.
  - Size rule: rendered at `width=152`, `height=30`.
- `logo-mark-mono.svg`
  - Usage: monochrome fallback for neutral/print surfaces.
  - Size rule: same as `logo-mark.svg`.
- `logo-wordmark-mono.svg`
  - Usage: monochrome fallback for neutral/print surfaces.
  - Size rule: same as `logo-wordmark.svg`.
- `logo-lockup-mono.svg`
  - Usage: monochrome fallback for neutral/print surfaces.
  - Size rule: same as `logo-lockup.svg`.

## Illustration Assets (`/public/assets/illustrations`)
- `empty-no-data.svg`
  - Usage: generic empty data state surfaces.
  - Size rule: max width 240px.
- `empty-import.svg`
  - Usage: portfolio empty state import CTA panel.
  - Current placement: `app/(dashboard)/portfolio/page.tsx`.
  - Size rule: `240x140` rendered area.
- `empty-scenarios.svg`
  - Usage: monthly savings educational panel (shadow execution explainer).
  - Current placement: `app/(dashboard)/monthly-savings/page.tsx`.
  - Size rule: full-width within card, max 320px visual width.

## Asset Placement Rules
- One brand lockup per shell surface; no oversized logos in content sections.
- Illustrations are informational only (empty states/education), not decorative background noise.
- Money and status communication is icon-backed (no emoji usage).
- PNG favicons/app icons remain in `/public/icons` and existing OG assets remain in `/public/og`.
