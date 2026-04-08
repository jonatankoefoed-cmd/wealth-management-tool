/**
 * Housing Rules Loader (Server-side only)
 * 
 * Load and validate housing rules from JSON files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { HousingRules } from './types';
import { validateHousingRules } from './rules';

const rulesCache = new Map<number, HousingRules>();

/**
 * Load housing rules for a given year.
 */
export function loadHousingRules(
    year: number,
    opts?: { rulesDir?: string; useExample?: boolean }
): HousingRules {
    // Check cache
    const cacheKey = opts?.useExample ? year + 1000 : year;
    const cached = rulesCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Determine path
    const rulesDir = opts?.rulesDir ?? path.join(process.cwd(), 'specs', 'housing');
    const filename = opts?.useExample
        ? `rules_${year}.example.json`
        : `rules_${year}.json`;
    const rulesPath = path.join(rulesDir, filename);

    // Check file exists
    if (!fs.existsSync(rulesPath)) {
        throw new Error(`Housing rules file not found: ${rulesPath}`);
    }

    // Load and parse
    const content = fs.readFileSync(rulesPath, 'utf-8');
    const rules = JSON.parse(content) as HousingRules;

    // Validate
    validateHousingRules(rules);

    // Cache and return
    rulesCache.set(cacheKey, rules);
    return rules;
}

/**
 * Clear rules cache (for testing).
 */
export function clearRulesCache(): void {
    rulesCache.clear();
}
