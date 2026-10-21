import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { TEST_USER_EMAIL, TEST_USER_ID } from '../src/config/dev.js';
import { createDefaultCategories } from '../src/modules/categories/category.service.js';


async function seedTestUser() {
    const user = await prisma.user.upsert({
        where: { email: TEST_USER_EMAIL },
        update: {},
        create: {
            id: TEST_USER_ID,
            email: TEST_USER_EMAIL,
            name: 'Test User',
            //passwordHash: await bcrypt.hash('password123', 10),
            emailVerifiedAt: new Date(),
        },
    });

    await createDefaultCategories(user.id);

    console.log(`Seed: тестовий користувач ${user.email} (id: ${user.id})`);
}


async function main() {

    if (env.NODE_ENV !== 'production') {
        await seedTestUser();
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());