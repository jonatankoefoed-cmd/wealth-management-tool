/**
 * Download high-resolution stock images from Unsplash API
 * 
 * USAGE:
 * PATH=$HOME/.nvm/versions/node/v20.19.6/bin:$PATH \
 *   UNSPLASH_ACCESS_KEY="your_key" npx tsx scripts/download-unsplash.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const BASE_URL = 'https://api.unsplash.com';

interface UnsplashPhoto {
    id: string;
    description: string | null;
    alt_description: string | null;
    urls: {
        raw: string;
        full: string;
        regular: string;
        small: string;
    };
    user: {
        name: string;
        username: string;
    };
    links: {
        download_location: string;
    };
}

interface UnsplashResponse {
    results: UnsplashPhoto[];
}

interface ImageDownload {
    query: string;
    filename: string;
    folder: 'heroes' | 'illustrations' | 'empty-states' | 'backgrounds';
    orientation?: 'landscape' | 'portrait' | 'squarish';
}

// Images to download - different from Pexels to get variety
const IMAGES_TO_DOWNLOAD: ImageDownload[] = [
    // Additional hero images
    {
        query: 'copenhagen morning light apartment',
        filename: 'unsplash-hero-copenhagen.jpg',
        folder: 'heroes',
        orientation: 'landscape',
    },
    {
        query: 'scandinavian design living room natural light',
        filename: 'unsplash-hero-scandinavian.jpg',
        folder: 'heroes',
        orientation: 'landscape',
    },
    {
        query: 'financial success laptop coffee morning',
        filename: 'unsplash-hero-finance.jpg',
        folder: 'heroes',
        orientation: 'landscape',
    },
    // Background textures
    {
        query: 'cream paper texture minimal',
        filename: 'bg-texture-cream.jpg',
        folder: 'backgrounds',
        orientation: 'landscape',
    },
    {
        query: 'soft gradient abstract pastel',
        filename: 'bg-gradient-soft.jpg',
        folder: 'backgrounds',
        orientation: 'landscape',
    },
    // Additional illustrations
    {
        query: 'calculator notebook budget planning',
        filename: 'unsplash-budget.jpg',
        folder: 'illustrations',
        orientation: 'squarish',
    },
    {
        query: 'retirement planning peaceful nature',
        filename: 'unsplash-retirement.jpg',
        folder: 'illustrations',
        orientation: 'squarish',
    },
    {
        query: 'growth plant coins investment',
        filename: 'unsplash-growth.jpg',
        folder: 'illustrations',
        orientation: 'squarish',
    },
];

async function searchPhotos(query: string, orientation?: string): Promise<UnsplashPhoto | null> {
    const url = new URL(`${BASE_URL}/search/photos`);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '1');
    url.searchParams.set('order_by', 'relevant');
    if (orientation) {
        url.searchParams.set('orientation', orientation);
    }

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
    });

    if (!response.ok) {
        console.error(`Search failed for "${query}": ${response.status}`);
        const text = await response.text();
        console.error(text);
        return null;
    }

    const data: UnsplashResponse = await response.json();
    return data.results?.[0] || null;
}

async function triggerDownload(photo: UnsplashPhoto): Promise<void> {
    // Unsplash requires triggering download endpoint for attribution
    await fetch(photo.links.download_location, {
        headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
    });
}

async function downloadImage(url: string, filepath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
}

async function main(): Promise<void> {
    if (!UNSPLASH_ACCESS_KEY) {
        console.error('❌ UNSPLASH_ACCESS_KEY environment variable not set');
        console.log('\nUsage:');
        console.log('UNSPLASH_ACCESS_KEY="your_key" npx tsx scripts/download-unsplash.ts');
        process.exit(1);
    }

    const baseDir = path.join(process.cwd(), 'public', 'images');
    const attributions: string[] = [];

    // Create directories
    for (const folder of ['heroes', 'illustrations', 'empty-states', 'backgrounds']) {
        const dir = path.join(baseDir, folder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    console.log('🖼️  Downloading images from Unsplash...\n');

    for (const image of IMAGES_TO_DOWNLOAD) {
        const filepath = path.join(baseDir, image.folder, image.filename);

        // Skip if already exists
        if (fs.existsSync(filepath)) {
            console.log(`⏭️  Skipping ${image.filename} (already exists)`);
            continue;
        }

        console.log(`🔍 Searching: "${image.query}"`);
        const photo = await searchPhotos(image.query, image.orientation);

        if (!photo) {
            console.log(`   ❌ No results found\n`);
            continue;
        }

        console.log(`   📷 Found: ${photo.alt_description || photo.description || 'No description'}`);
        console.log(`   👤 By: ${photo.user.name} (@${photo.user.username})`);

        // Trigger download (required by Unsplash API guidelines)
        await triggerDownload(photo);

        // Download the image (using 'regular' size - 1080px wide)
        console.log(`   ⬇️  Downloading...`);
        await downloadImage(photo.urls.regular, filepath);
        console.log(`   ✅ Saved to ${image.folder}/${image.filename}\n`);

        // Store attribution
        attributions.push(
            `- ${image.filename}: Photo by [${photo.user.name}](https://unsplash.com/@${photo.user.username}) on [Unsplash](https://unsplash.com)`
        );

        // Rate limiting: wait 2s between requests (50 requests/hour limit)
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Append to attributions file
    const attributionsPath = path.join(baseDir, 'ATTRIBUTIONS.md');
    if (attributions.length > 0) {
        const existingContent = fs.existsSync(attributionsPath)
            ? fs.readFileSync(attributionsPath, 'utf-8')
            : '# Image Attributions\n\n';

        const unsplashSection = '\n## Unsplash\n\n' + attributions.join('\n') + '\n';
        fs.writeFileSync(attributionsPath, existingContent + unsplashSection);
        console.log(`📝 Attributions appended to public/images/ATTRIBUTIONS.md`);
    }

    console.log('\n✅ Done!');
}

main().catch(console.error);
