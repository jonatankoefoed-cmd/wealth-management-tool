---
name: Implement Wealth App Brand
description: Instructions for implementing the Personal Wealth Management Web App brand guidelines. Use this skill whenever creating or modifying UI components, pages, or styles for the app.
---

# Implement Wealth App Brand

This skill guides you in applying the brand guidelines for the Personal Wealth Management Web App.

## 1. Reference Material

Always reference these canonical files:
- **Brand Identity:** `specs/BRAND_IDENTITY.md`
- **Design Tokens:** `specs/DESIGN_TOKENS.md`

## 2. Key Principles (Quick Check)

Before finalizing any UI, verify against these pillars:
1. **Clarity over decoration**: Remove non-essential elements.
2. **Calm confidence**: No visual noise, exciting styling, or heavy motion.
3. **Data first**: Numbers are the hero; clear audit trails.
4. **Soft geometry**: Rounded corners everywhere (buttons, cards, charts).
5. **Consistent patterns**: Snapshot -> Drill-down.

## 3. Brand Enforcement Checklist

A screen passes the brand standard only if:
- [ ] It starts with a snapshot or clear headline metric.
- [ ] It uses warm neutral base colors (#FCFBF9, #FAF8EF) and Sage accent (#A4B0A3).
- [ ] It has consistent spacing (8px grid) and soft corners (10-16px).
- [ ] It uses icons (Lucide/Heroicons/Phosphor), NO emojis.
- [ ] It is explainable: "Calculation steps" are available for key numbers.
- [ ] It is accessible: sufficient contrast and calm focus states.

## 4. Common Component Styles

### Buttons
- Radius: 10-12px
- Primary: #A4B0A3 (Sage Accent)
- Secondary: Neutral/Muted

### Cards / Containers
- Radius: 14-16px
- Shadow: Subtle (shadow-soft, shadow-card)
- Background: #FAF8EF (surface) or #FFFFFF (surface-2)

### Charts
- Smooth lines (no sharp joints).
- Minimal gridlines (#E8E5D4).
- Rounded containers.
- Highlight one series (#A4B0A3), mute others (#A7ACB4).

## 5. Color Reference (Quick)

| Role | Hex | Tailwind Class |
|------|-----|----------------|
| Background | #FCFBF9 | bg-brand-bg |
| Surface | #FAF8EF | bg-brand-surface |
| Accent (Sage) | #A4B0A3 | bg-brand-accent |
| Accent-2 (Amber) | #F9E8B0 | bg-brand-accent2 |
| Text Primary | #332E2D | text-brand-text1 |
| Text Secondary | #7E8187 | text-brand-text2 |
| Border | #E8E5D4 | border-brand-border |

## 6. Usage

When asked to build or modify a UI feature:
1. Read `specs/BRAND_IDENTITY.md` to understand specific constraints.
2. Apply the color, typography, and spacing rules from `specs/DESIGN_TOKENS.md`.
3. Ensure the "Definition of Done" includes the Brand Enforcement Checklist.
