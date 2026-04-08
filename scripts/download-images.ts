/**
 * Download high-resolution stock images from Pexels API
 * 
 * USAGE:
 * source .env.local && npx tsx scripts/download-images.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const BASE_URL = 'https://api.pexels.com/v1';

interface PexelsPhoto {
    id: number;
    photographer: string;
    photographer_url: string;
    alt: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
    };
}

interface PexelsResponse {
    photos: PexelsPhoto[];
}

interface ImageDownload {
    query: string;
    filename: string;
    folder: 'heroes' | 'illustrations' | 'empty-states';
    orientation?: 'landscape' | 'portrait' | 'square';
}

// Define images to download - matched to brand guidelines
const IMAGES_TO_DOWNLOAD: ImageDownload[] = [
    // Hero images (landscape)
    {
        query: 'scandinavian interior minimal desk workspace light',
        filename: 'hero-dashboard.jpg',
        folder: 'heroes',
        orientation: 'landscape',
    },
    {
        query: 'financial planning notebook clean minimal',
        filename: 'hero-investments.jpg',
        folder: 'heroes',
        orientation: 'landscape',
    },
    {
        query: 'danish home interior modern apartment living room',
        filename: 'hero-housing.jpg',
        folder: 'heroes',
        orientation: 'landscape',
    },
    {
        query: 'abstract soft gradient beige cream minimal',
        filename: 'hero-abstract.jpg',
        folder: 'heroes',
        orientation: 'landscape',
    },
    // Feature illustrations (square)
    {
        query: 'charts graphs analytics minimal white',
        filename: 'feature-portfolio.jpg',
        folder: 'illustrations',
        orientation: 'square',
    },
    {
        query: 'savings growth plant money minimal',
        filename: 'feature-savings.jpg',
        folder: 'illustrations',
        orientation: 'square',
    },
    {
        query: 'tax documents paperwork organized desk',
        filename: 'feature-tax.jpg',
        folder: 'illustrations',
        orientation: 'square',
    },
    {
        query: 'house keys real estate minimal',
        filename: 'feature-housing.jpg',
        folder: 'illustrations',
        orientation: 'square',
    },
    // Empty states
    {
        query: 'empty notebook clean minimal white',
        filename: 'empty-default.jpg',
        folder: 'empty-states',
        orientation: 'square',
    },
];

async function searchPhotos(query: string, orientation?: string): Promise<PexelsPhoto | null> {
    const url = new URL(`${BASE_URL}/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '1');
    if (orientation) {
        url.searchParams.set('orientation', orientation);
    }

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: PEXELS_API_KEY!,
        },
    });

    if (!response.ok) {
        console.error(`Search failed for "${query}": ${response.status}`);
        const text = await response.text();
        console.error(text);
        return null;
    }

    const data: PexelsResponse = await response.json();
    return data.photos?.[0] || null;
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
    if (!PEXELS_API_KEY) {
        console.error('❌ PEXELS_API_KEY environment variable not set');
        console.log('\nRun: source .env.local && npx tsx scripts/download-images.ts');
        process.exit(1);
    }

    const baseDir = path.join(process.cwd(), 'public', 'images');
    const attributions: string[] = [];

    // Create directories
    for (const folder of ['heroes', 'illustrations', 'empty-states']) {
        const dir = path.join(baseDir, folder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    console.log('🖼️  Downloading images from Pexels...\n');

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

        console.log(`   📷 Found: ${photo.alt || 'No description'}`);
        console.log(`   👤 By: ${photo.photographer}`);

        // Download the image (using large2x for good quality)
        console.log(`   ⬇️  Downloading...`);
        await downloadImage(photo.src.large2x, filepath);
        console.log(`   ✅ Saved to ${image.folder}/${image.filename}\n`);

        // Store attribution
        attributions.push(
            `- ${image.filename}: Photo by [${photo.photographer}](${photo.photographer_url}) on [Pexels](https://pexels.com)`
        );

        // Rate limiting: wait 1s between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Write attributions file
    const attributionsPath = path.join(baseDir, 'ATTRIBUTIONS.md');
    const existingAttributions = fs.existsSync(attributionsPath)
        ? fs.readFileSync(attributionsPath, 'utf-8')
        : '# Image Attributions\n\nImages sourced from Pexels (free for commercial use).\n\n';

    if (attributions.length > 0) {
        const content = existingAttributions + attributions.join('\n') + '\n';
        fs.writeFileSync(attributionsPath, content);
        console.log(`📝 Attributions saved to public/images/ATTRIBUTIONS.md`);
    }

    console.log('\n✅ Done!');
}

main().catch(console.error);
