# Image Assets Guide

> For Wealth Management Web App  
> Generated: 2026-02-08

---

## Directory Structure

```
public/images/
├── heroes/          # Hero section backgrounds
├── illustrations/   # Feature illustrations
└── empty-states/    # Empty state graphics
```

---

## 1. Stock Photo Sources (Free, Commercial Use)

### Unsplash Collections
| Category | Direct Link |
|----------|-------------|
| Investment Portfolio | https://unsplash.com/s/photos/investment-portfolio |
| Financial Planning | https://unsplash.com/s/photos/financial-planning |
| Scandinavian Style | https://unsplash.com/s/photos/scandinavian-interior |
| Minimal Office | https://unsplash.com/s/photos/minimal-office |
| Danish Home | https://unsplash.com/s/photos/danish-home |

### Pexels Collections
| Category | Direct Link |
|----------|-------------|
| Finance | https://www.pexels.com/search/finance/ |
| Scandinavian Interior | https://www.pexels.com/search/scandinavian%20interior/ |
| Copenhagen | https://www.pexels.com/search/copenhagen/ |
| Minimal Workspace | https://www.pexels.com/search/minimal%20workspace/ |

### Recommended Search Terms
```
"financial planning warm light"
"investment portfolio clean desk"
"danish apartment minimal"
"copenhagen interior cream"
"modern home office scandinavian"
"savings growth abstract"
"budget planning notebook"
```

---

## 2. AI Generation Prompts (For Later)

When image generation quota resets (~22:05 UTC), use these prompts:

### Hero Dashboard
```
Abstract minimalist illustration for premium wealth management dashboard. 
Warm cream background (#FCFBF9), soft sage green (#A4B0A3) geometric shapes 
representing growth and stability. Subtle amber (#F9E8B0) accents. 
Clean lines, soft rounded corners, no text, no people. 
Modern Scandinavian design aesthetic. 1920x1080 aspect ratio.
```

### Empty State: No Transactions
```
Minimal empty state illustration for finance app showing "no transactions yet". 
Soft neutral warm cream palette. Simple abstract shapes - subtle document 
or receipt icon with gentle checkmark. Sage green (#A4B0A3) and warm gray tones. 
No people, no text. Clean vector style, minimal detail. Square format.
```

### Empty State: No Investments
```
Minimal empty state illustration for "no investments yet". 
Simple abstract shapes suggesting potential - soft rounded forms, 
abstract seeds or growth potential. Sage green (#A4B0A3) and warm cream (#FCFBF9). 
Subtle, calming, inviting. No text, no people. Vector style. Square format.
```

### Illustration: Portfolio
```
Abstract illustration representing investment portfolio diversity. 
Minimalist style with overlapping rounded rectangles and circles in 
sage green (#A4B0A3), warm cream, and subtle amber (#F9E8B0) highlights. 
Suggests growth, balance, organization. No charts, no numbers, no text. 
Soft shadows, premium feel. Square format.
```

### Illustration: Savings
```
Abstract minimalist illustration representing savings and financial growth. 
Ascending curved shapes in sage green (#A4B0A3) gradient on warm cream 
background (#FCFBF9). Subtle amber highlight at peak. 
Soft, organic forms suggesting upward momentum. 
No coins, no piggy bank, no text. Premium, calm. Square format.
```

### Illustration: Home Purchase
```
Abstract minimalist illustration representing home ownership and real estate. 
Simple geometric house shape with soft rounded corners in sage green (#A4B0A3) 
on warm cream background. Subtle amber (#F9E8B0) accent. 
Clean Scandinavian design, no detailed windows or doors. 
Premium, calm. Square format.
```

---

## 3. Image Requirements

| Type | Size | Format | Notes |
|------|------|--------|-------|
| Hero | 1920x1080 | WebP/PNG | Compress to <200KB |
| Illustration | 800x800 | SVG/PNG | Prefer vector |
| Empty State | 400x400 | SVG/PNG | Minimal, lightweight |
| Icons | 24x24, 48x48 | SVG | Lucide recommended |

---

## 4. Brand Color Overlays

When using stock photos, apply these overlays to match brand:

```css
/* Warm cream overlay for hero images */
.hero-overlay {
  background: linear-gradient(
    135deg,
    rgba(252, 251, 249, 0.85) 0%,
    rgba(250, 248, 239, 0.75) 100%
  );
}

/* Sage tint for accents */
.sage-tint {
  filter: sepia(10%) saturate(80%) hue-rotate(80deg);
}
```

---

## 5. Download Checklist

- [ ] Hero image for dashboard (neutral, minimal)
- [ ] Hero image for investments page
- [ ] Hero image for housing module
- [ ] Empty state: No transactions
- [ ] Empty state: No investments
- [ ] Empty state: No portfolio
- [ ] Illustration: Portfolio diversity
- [ ] Illustration: Savings growth
- [ ] Illustration: Home purchase
- [ ] Illustration: Tax planning
