import { PrismaClient } from '@prisma/client'
import { createDefaultHousingInput } from './src/housing/defaults'
import { BUDGET_PRESETS } from './hooks/use-projection-model'

const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst()
    if (!user) {
        console.log("No user found")
        return
    }

    const scenario = await prisma.scenario.findFirst({
        where: { userId: user.id, isBase: true },
    })

    if (!scenario) {
        console.log("No base scenario found")
        return
    }

    // 1. Force update housing default
    const currentHousing = await prisma.scenarioOverride.findFirst({
        where: { scenarioId: scenario.id, key: 'housing' }
    });

    let housingData = currentHousing?.valueJson ? (currentHousing.valueJson as any) : createDefaultHousingInput(2026);
    
    // Override the specific budget rules
    housingData.budgetIntegration = housingData.budgetIntegration || {};
    housingData.budgetIntegration.utilities = 0;
    housingData.budgetIntegration.insurance = 0;
    
    // We already zeroed that out in defaults.ts, let's just make sure housing is completely updated with the new baseline
    const newHousing = {
        ...housingData,
        budgetIntegration: {
            ...housingData.budgetIntegration,
            utilities: 0,
            insurance: 0
        }
    }

    await prisma.scenarioOverride.upsert({
        where: { scenarioId_key: { scenarioId: scenario.id, key: 'housing' } },
        update: { valueJson: newHousing },
        create: { scenarioId: scenario.id, key: 'housing', valueJson: newHousing }
    })
    
    // 2. Force apply the preset for budget_categories
    const totalMonthly = BUDGET_PRESETS.sophisticated_research.categories.reduce((acc, c) => acc + c.amount, 0);

    await prisma.scenarioOverride.upsert({
        where: { scenarioId_key: { scenarioId: scenario.id, key: 'budget_categories' } },
        update: { valueJson: BUDGET_PRESETS.sophisticated_research.categories as any },
        create: { scenarioId: scenario.id, key: 'budget_categories', valueJson: BUDGET_PRESETS.sophisticated_research.categories as any }
    })

    // Also update baseline's monthlyNonHousingExpenses
    const currentBaseline = await prisma.scenarioOverride.findFirst({
        where: { scenarioId: scenario.id, key: 'baseline' }
    });
    
    let baselineData = currentBaseline?.valueJson ? (currentBaseline.valueJson as any) : {};
    baselineData.monthlyNonHousingExpenses = totalMonthly;
    
    await prisma.scenarioOverride.upsert({
        where: { scenarioId_key: { scenarioId: scenario.id, key: 'baseline' } },
        update: { valueJson: baselineData },
        create: { scenarioId: scenario.id, key: 'baseline', valueJson: baselineData }
    })
    
    console.log("Database successfully synchronized with new defaults.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
