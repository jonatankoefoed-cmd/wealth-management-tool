---
name: pexels-image-download
description: Download high-resolution stock images from Pexels API for the wealth management app. Use this skill when you need to fetch images for heroes, illustrations, or empty states.
---

# Pexels Image Download Skill

Download high-resolution, royalty-free images from Pexels for the wealth management app.

## API Key Location

The Pexels API key is stored in `.env.local`:
```
PEXELS_API_KEY=<key>
```

## Quick Usage

```bash
# Load the environment and run download script
source .env.local && npx tsx scripts/download-images.ts
```

## API Limits

- **Free tier**: 200 requests/hour, 20,000 requests/month
- **Rate limit**: No hard limit, be reasonable

## Recommended Search Queries

For brand-aligned images (warm neutrals, Scandinavian aesthetic):

| Category | Query |
|----------|-------|
| Dashboard Hero | `scandinavian interior minimal workspace` |
| Investment Hero | `financial planning notebook minimal` |
| Housing Hero | `danish home modern apartment interior` |
| Abstract Background | `abstract soft gradient warm cream` |
| Portfolio | `charts graphs clean white background` |
| Savings | `savings minimal aesthetic cream` |
| Tax | `documents organized minimal` |

## API Endpoint Reference

```typescript
// Search photos
GET https://api.pexels.com/v1/search?query={query}&per_page=1&orientation=landscape

// Headers
Authorization: {PEXELS_API_KEY}
```

## Response Fields

```typescript
{
  photos: [{
    id: number,
    photographer: string,
    src: {
      original: string,   // Full resolution
      large2x: string,    // 1880px wide
      large: string,      // 940px wide
      medium: string,     // 350px tall
    },
    alt: string,
  }]
}
```

## Attribution

Pexels images are free for commercial use. Attribution is appreciated but not required.
Include in `public/images/ATTRIBUTIONS.md`:
```
Photo by [Photographer Name] on Pexels
```

## Script Location

Main download script: `scripts/download-images.ts`
