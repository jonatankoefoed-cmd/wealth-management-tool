---
name: Use Wealth App Design Tokens
description: Instructions for using the defined design tokens (colors, typography, spacing) for the Personal Wealth Management App. Use this skill when styling components or pages to ensure consistency.
---

# Use Wealth App Design Tokens

This skill guides you in using the official design tokens for the Personal Wealth Management Web App.

## 1. Reference Material

Always reference the canonical design tokens file:
- **Path:** `specs/DESIGN_TOKENS.md`

## 2. Token Mapping

When implementing styles, map your CSS values to these Tailwind classes/tokens:

### Colors
| Concept | Token / Class | Hex |
|:--------|:--------------|:----|
| Background | `bg-brand-bg` | #FCFBF9 |
| Surface | `bg-brand-surface` | #FAF8EF |
| Surface 2 | `bg-brand-surface2` | #FFFFFF |
| Border | `border-brand-border` | #E8E5D4 |
| Primary Text | `text-brand-text1` | #332E2D |
| Secondary Text | `text-brand-text2` | #7E8187 |
| Tertiary Text | `text-brand-text3` | #A7ACB4 |
| Accent (Sage) | `bg-brand-accent` | #A4B0A3 |
| Accent-2 (Amber) | `bg-brand-accent2` | #F9E8B0 |
| Success | `text-brand-success` | #16A34A |
| Danger | `text-brand-danger` | #DC2626 |

### Chart Colors
| Role | Class | Hex |
|:-----|:------|:----|
| Primary Series | `chart-primary` | #A4B0A3 |
| Muted Series | `chart-muted` | #A7ACB4 |
| Grid Lines | `chart-grid` | #E8E5D4 |

### Roundness
- **Small elements (buttons, inputs)**: `rounded-sm` (10px) or `rounded-md` (12px).
- **Containers (cards, charts)**: `rounded-lg` (16px) or `rounded-xl` (20px).

### Shadows
- **Standard Card**: `shadow-card`
- **Subtle/Hover**: `shadow-soft`
- **Floating**: `shadow-float`

### Typography
- **Font**: Inter or system stack
- **Numbers**: Use `tabular-nums` for financial data.
- **Sizes**: Use semantic sizing (e.g., `text-sm` for density, `text-xl` for headers).

## 3. Configuration

Ensure `tailwind.config.ts` includes the specific configuration outlined in Section 5 of `specs/DESIGN_TOKENS.md`. Copy that config block exactly.

## 4. Usage Rules

1. **Never use arbitrary values** (e.g., `w-[123px]`, `bg-[#F2F2F2]`) if a token exists.
2. **Accent usage**: Sage (#A4B0A3) for primary actions, Amber (#F9E8B0) for highlights only.
3. **Never use both accent colors as strong** on the same screen.
4. **Whitespace**: Use the 8px grid (m-2, p-4, gap-8).
