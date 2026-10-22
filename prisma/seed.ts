import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { TEST_USER_EMAIL, TEST_USER_ID, TEST_USER_PASSWORD } from '../src/config/dev.js';
import { createDefaultCategories } from '../src/modules/categories/category.service.js';
import { hashPassword } from '../src/modules/auth/password.js';


async function seedTestUser() {
    const passwordHash = await hashPassword(TEST_USER_PASSWORD);

    const user = await prisma.user.upsert({
        where: { email: TEST_USER_EMAIL },
        update: { passwordHash },   // щоб і вже існуючий тестовий юзер отримав пароль
        create: {
            id: TEST_USER_ID,
            email: TEST_USER_EMAIL,
            name: 'Test User',
            passwordHash,
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