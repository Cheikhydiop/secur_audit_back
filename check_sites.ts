import prisma from './src/config/prismaClient.js';

async function main() {
    const count = await prisma.site.count();
    console.log(`Nombre de sites: ${count}`);

    const sites = await prisma.site.findMany({ take: 5 });
    console.log('Exemples de sites:');
    console.log(JSON.stringify(sites, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
