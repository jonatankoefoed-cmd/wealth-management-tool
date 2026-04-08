# Widget Integration Guide

This guide explains how to use the `BackgroundWidget` component to create premium, wallpaper-style dashboards.

## 1. Visual Strategy

The goal is to move away from "flat white cards" to a richer, textured look. We use two types of backgrounds:
1.  **Premium Gradients**: Soft, warm gradients that feel like high-end paper or fabric.
2.  **Photographic Wallpapers**: Curated images from Unsplash/Pexels that match our "Warm Neutral + Sage" brand.

## 2. Sourcing Images (Unsplash / Pexels)

Use these specific search terms to find images that fit the brand. Avoid "business people" or "generic tech" images.

| Category | Search Terms | Vibe |
| :--- | :--- | :--- |
| **Abstract** | `abstract paper texture`, `soft beige waves`, `minimalist shadows`, `white architectural detail` | Clean, subtle, textured |
| **Nature** | `sage green leaf macro`, `morning fog forest`, `sand dunes minimal`, `dried grass beige` | Organic, calm, wealth |
| **Architecture** | `concrete wall sunlight`, `modern building corner`, `glass facade reflection`, `frosted glass texture` | Stable, strong, premium |

### Selection Rules:
*   **Low Contrast**: The image should not have heavy black shadows.
*   **No Text**: Avoid images with words or heavy patterns.
*   **Center Safe**: The center of the image will be covered by text, so ensure the focal point (if any) is not obscured or distracting.

## 3. Integration Steps

### Step A: Download & Optimize
1.  Download the image at a reasonable resolution (e.g., 1920x1080 is plenty, even 1200px width is fine for widgets).
2.  Convert to **WebP** or **JPG** (80% quality) to keep file size under 100KB.
3.  Save to `/public/images/widgets/`.

### Step B: Component Usage

```tsx
import { BackgroundWidget } from "@/components/dashboard/background-widget";
import { Wallet } from "lucide-react";

// Option 1: Remote URL (Unsplash) - Good for rapid prototyping
<BackgroundWidget 
  title="Net Worth"
  value="DKK 1.2M"
  icon={Wallet}
  backgroundImage="https://images.unsplash.com/photo-1620641785568-98e3532f8313?w=800&q=80"
  overlayVariant="glass-panel" // Adds blur and border
/>

// Option 2: Local Asset - Production ready
<BackgroundWidget 
  title="Real Estate"
  value="DKK 4.5M"
  icon={Home}
  backgroundImage="/images/widgets/house-minimal.jpg"
  imageSource="local"
  overlayVariant="gradient-bottom" // Ensures text readability
/>

// Option 3: Default Premium Gradient (No image)
<BackgroundWidget 
  title="Cash"
  value="DKK 250k"
  icon={Banknote}
  // No backgroundImage prop triggers the default warm gradient
/>
```

## 4. Overlay Variants

*   **`gradient-bottom`**: Best for general ease. Adds a subtle dark gradient at the bottom so white text pops.
*   **`glass-panel`**: Best for "tech" or "modern" feel. Adds a white border and backdrop blur.
*   **`dimmed`**: Use this if the background image is too bright or busy. Darkens the whole image.
