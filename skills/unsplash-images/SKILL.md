---
name: unsplash-image-download
description: Download high-resolution stock images from Unsplash API for the wealth management app. Use this skill when you need premium quality photos.
---

# Unsplash Image Download Skill

Download high-resolution, royalty-free images from Unsplash for the wealth management app.

## API Key Location

The Unsplash API key is stored in `.env.local`:
```
UNSPLASH_ACCESS_KEY=<key>
```

## Quick Usage

```bash
# Download images from Unsplash
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:$PATH \
  UNSPLASH_ACCESS_KEY="$(grep UNSPLASH_ACCESS_KEY .env.local | cut -d= -f2)" \
  npx tsx scripts/download-unsplash.ts
```

## API Limits

- **Demo tier**: 50 requests/hour
- **Production**: Apply for higher limits at unsplash.com/developers

## Recommended Search Queries

For brand-aligned images (warm neutrals, Scandinavian aesthetic):

| Category | Query |
|----------|-------|
| Dashboard | `scandinavian workspace minimal light` |
| Finance | `financial planning documents organized` |
| Housing | `copenhagen apartment interior bright` |
| Abstract | `abstract gradient warm soft` |
| Portfolio | `investment graph clean minimal` |

## API Endpoint Reference

```typescript
// Search photos
GET https://api.unsplash.com/search/photos?query={query}&per_page=1&orientation=landscape

// Headers
Authorization: Client-ID {UNSPLASH_ACCESS_KEY}
```

## Response Fields

```typescript
{
  results: [{
    id: string,
    description: string,
    alt_description: string,
    urls: {
      raw: string,    // Original
      full: string,   // Full resolution
      regular: string, // 1080px wide
      small: string,   // 400px wide
    },
    user: {
      name: string,
      username: string,
    },
    links: {
      download_location: string, // Must trigger for attribution
    },
  }]
}
```

## Attribution (Required)

Unsplash requires triggering the download endpoint for proper attribution.
Include in `public/images/ATTRIBUTIONS.md`:
```
Photo by [Photographer Name](https://unsplash.com/@username) on [Unsplash](https://unsplash.com)
```

## Script Location

Main download script: `scripts/download-unsplash.ts`
