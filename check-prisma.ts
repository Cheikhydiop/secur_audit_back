import prisma from './src/config/prismaClient.js';

async function check() {
    try {
        const user = await prisma.user.findFirst();
        console.log('User model entite field:', user?.entite !== undefined);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

check();
