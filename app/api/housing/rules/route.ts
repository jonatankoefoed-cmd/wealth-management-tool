import { NextResponse } from 'next/server';
import { loadHousingRules } from '@/src/housing/rules.server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') ?? '2026', 10);

        // This runs on server, so fs is allowed
        try {
            const rules = loadHousingRules(year, { useExample: true });
            return NextResponse.json(rules);
        } catch (e) {
            return NextResponse.json({ error: `Rules for year ${year} not found` }, { status: 404 });
        }
    } catch (error) {
        console.error("Failed to load housing rules", error);
        return NextResponse.json({ error: "Internal server error loading rules" }, { status: 500 });
    }
}
