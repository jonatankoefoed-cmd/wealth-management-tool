/**
 * Danish Cost Basis Calculator
 * 
 * Calculates cost basis using the Danish "gennemsnitsmetoden" (average cost method).
 * This is the primary method for calculating acquisition cost for tax purposes.
 * 
 * Key rules:
 * - All shares in same company use average cost
 * - Updated on each purchase
 * - FIFO exception for shares owned before Jan 1, 2006
 */

// ============================================================================
// Types
// ============================================================================

export interface Lot {
    purchaseDate: Date;
    quantity: number;
    purchasePrice: number;        // Price per share
    totalCost: number;            // Total cost including fees
    currency: string;
}

export interface Position {
    identifier: string;           // ISIN or ticker
    name: string;
    lots: Lot[];

    // Calculated
    totalQuantity: number;
    averageCostPerShare: number;
    totalCostBasis: number;
}

export interface SaleCalculation {
    identifier: string;
    quantitySold: number;
    salePrice: number;
    saleProceedsGross: number;
    saleFees: number;
    saleProceedsNet: number;

    costBasisUsed: number;
    gainOrLoss: number;

    method: 'AVERAGE_COST' | 'FIFO';
    remainingPosition: Position;
}

// ============================================================================
// Cost Basis Calculator
// ============================================================================

/**
 * Calculate the average cost basis for a position.
 * 
 * Formula: (Total Cost of all lots) / (Total Quantity)
 */
export function calculateAverageCost(position: Position): number {
    if (position.totalQuantity === 0) {
        return 0;
    }
    return position.totalCostBasis / position.totalQuantity;
}

/**
 * Add a new purchase lot to an existing position.
 * Updates the average cost basis.
 */
export function addPurchase(
    position: Position | null,
    lot: Lot
): Position {
    if (!position) {
        // Create new position
        return {
            identifier: '',
            name: '',
            lots: [lot],
            totalQuantity: lot.quantity,
            averageCostPerShare: lot.totalCost / lot.quantity,
            totalCostBasis: lot.totalCost,
        };
    }

    // Add lot to existing position
    const newLots = [...position.lots, lot];
    const newTotalQuantity = position.totalQuantity + lot.quantity;
    const newTotalCostBasis = position.totalCostBasis + lot.totalCost;
    const newAverageCost = newTotalCostBasis / newTotalQuantity;

    return {
        ...position,
        lots: newLots,
        totalQuantity: newTotalQuantity,
        averageCostPerShare: newAverageCost,
        totalCostBasis: newTotalCostBasis,
    };
}

/**
 * Calculate gain/loss and update position after a sale.
 * Uses average cost method by default.
 */
export function calculateSale(
    position: Position,
    quantitySold: number,
    salePrice: number,
    saleFees: number = 0,
    method: 'AVERAGE_COST' | 'FIFO' = 'AVERAGE_COST'
): SaleCalculation {
    if (quantitySold > position.totalQuantity) {
        throw new Error(`Cannot sell ${quantitySold} shares - only ${position.totalQuantity} available`);
    }

    const saleProceedsGross = quantitySold * salePrice;
    const saleProceedsNet = saleProceedsGross - saleFees;

    let costBasisUsed: number;
    let remainingPosition: Position;

    if (method === 'AVERAGE_COST') {
        // Average cost method: use GAK for cost basis
        costBasisUsed = quantitySold * position.averageCostPerShare;

        // Update position: reduce quantity, keep average cost
        const remainingQuantity = position.totalQuantity - quantitySold;
        const remainingCostBasis = remainingQuantity * position.averageCostPerShare;

        remainingPosition = {
            ...position,
            lots: position.lots, // Keep all lots for record (simplified)
            totalQuantity: remainingQuantity,
            totalCostBasis: remainingCostBasis,
            // Average cost stays the same until next purchase
        };
    } else {
        // FIFO method: sell oldest lots first
        costBasisUsed = 0;
        let remainingToSell = quantitySold;
        const updatedLots: Lot[] = [];

        // Sort lots by purchase date (oldest first)
        const sortedLots = [...position.lots].sort(
            (a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime()
        );

        for (const lot of sortedLots) {
            if (remainingToSell <= 0) {
                updatedLots.push(lot);
                continue;
            }

            if (lot.quantity <= remainingToSell) {
                // Use entire lot
                costBasisUsed += lot.totalCost;
                remainingToSell -= lot.quantity;
                // Don't add to updatedLots (fully consumed)
            } else {
                // Partial lot usage
                const usedQuantity = remainingToSell;
                const usedCost = (lot.totalCost / lot.quantity) * usedQuantity;
                costBasisUsed += usedCost;

                // Keep remaining portion of lot
                const remainingLotQuantity = lot.quantity - usedQuantity;
                const remainingLotCost = lot.totalCost - usedCost;

                updatedLots.push({
                    ...lot,
                    quantity: remainingLotQuantity,
                    totalCost: remainingLotCost,
                });

                remainingToSell = 0;
            }
        }

        const remainingQuantity = position.totalQuantity - quantitySold;
        const remainingCostBasis = updatedLots.reduce((sum, lot) => sum + lot.totalCost, 0);

        remainingPosition = {
            ...position,
            lots: updatedLots,
            totalQuantity: remainingQuantity,
            totalCostBasis: remainingCostBasis,
            averageCostPerShare: remainingQuantity > 0 ? remainingCostBasis / remainingQuantity : 0,
        };
    }

    const gainOrLoss = saleProceedsNet - costBasisUsed;

    return {
        identifier: position.identifier,
        quantitySold,
        salePrice,
        saleProceedsGross,
        saleFees,
        saleProceedsNet,
        costBasisUsed,
        gainOrLoss,
        method,
        remainingPosition,
    };
}

/**
 * Adjust cost basis for stock splits.
 * 
 * Example: 2-for-1 split doubles quantity, halves average cost.
 */
export function adjustForSplit(
    position: Position,
    splitRatio: number // e.g., 2 for 2-for-1 split
): Position {
    const newTotalQuantity = position.totalQuantity * splitRatio;
    const newAverageCost = position.averageCostPerShare / splitRatio;

    // Adjust all lots
    const newLots = position.lots.map(lot => ({
        ...lot,
        quantity: lot.quantity * splitRatio,
        purchasePrice: lot.purchasePrice / splitRatio,
        // totalCost stays the same
    }));

    return {
        ...position,
        lots: newLots,
        totalQuantity: newTotalQuantity,
        averageCostPerShare: newAverageCost,
        // totalCostBasis stays the same
    };
}

/**
 * Check if any lots are from before 2006 (FIFO exception applies).
 */
export function hasPreCopernicusLots(position: Position): boolean {
    const cutoffDate = new Date('2006-01-01');
    return position.lots.some(lot => lot.purchaseDate < cutoffDate);
}

/**
 * Format cost basis details for audit trail.
 */
export function formatCostBasisAudit(calculation: SaleCalculation): string[] {
    const lines: string[] = [];

    lines.push(`Salg af ${calculation.quantitySold} stk @ ${calculation.salePrice} DKK`);
    lines.push(`Salgsprovenu brutto: ${calculation.saleProceedsGross.toLocaleString('da-DK')} DKK`);
    lines.push(`Handelsomkostninger: ${calculation.saleFees.toLocaleString('da-DK')} DKK`);
    lines.push(`Salgsprovenu netto: ${calculation.saleProceedsNet.toLocaleString('da-DK')} DKK`);
    lines.push(`Anskaffelsessum (${calculation.method === 'AVERAGE_COST' ? 'GAK' : 'FIFO'}): ${calculation.costBasisUsed.toLocaleString('da-DK')} DKK`);
    lines.push(`Gevinst/Tab: ${calculation.gainOrLoss.toLocaleString('da-DK')} DKK`);

    return lines;
}
