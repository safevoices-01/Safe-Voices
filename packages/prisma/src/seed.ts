import { prisma } from './client';

async function main(): Promise<void> {
    const count = await prisma.case.count();
    if (count > 0) {
        console.log('Database already has cases; skipping seed.');
        return;
    }
    console.log('No seed cases created (anonymous cases are created via API).');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
