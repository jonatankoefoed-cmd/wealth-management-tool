import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const line = await prisma.holdingsSnapshotLine.findFirst({
        where: {
            instrument: {
                ticker: 'RBOT'
            }
        },
        include: {
            instrument: true
        }
    });

    console.log(JSON.stringify(line, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
