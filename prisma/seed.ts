import { prisma } from '../src/lib/prisma.js';
import { CategoryType } from '../src/generated/prisma/client.js';

const { EXPENSE, INCOME } = CategoryType;

const categories = [
    // Витрати
    { name: 'Продукти', type: EXPENSE, icon: 'shopping-cart' },
    { name: 'Кафе та ресторани', type: EXPENSE, icon: 'utensils' },
    { name: 'Транспорт', type: EXPENSE, icon: 'bus' },
    { name: 'Авто', type: EXPENSE, icon: 'car' },
    { name: 'Житло', type: EXPENSE, icon: 'home' },
    { name: 'Комунальні послуги', type: EXPENSE, icon: 'zap' },
    { name: 'Зв\'язок та інтернет', type: EXPENSE, icon: 'wifi' },
    { name: 'Здоров\'я', type: EXPENSE, icon: 'heart-pulse' },
    { name: 'Краса та догляд', type: EXPENSE, icon: 'sparkles' },
    { name: 'Одяг та взуття', type: EXPENSE, icon: 'shirt' },
    { name: 'Розваги', type: EXPENSE, icon: 'gamepad-2' },
    { name: 'Освіта', type: EXPENSE, icon: 'graduation-cap' },
    { name: 'Подарунки', type: EXPENSE, icon: 'gift' },
    { name: 'Подорожі', type: EXPENSE, icon: 'plane' },
    { name: 'Підписки', type: EXPENSE, icon: 'repeat' },
    { name: 'Дім', type: EXPENSE, icon: 'sofa' },
    { name: 'Діти', type: EXPENSE, icon: 'baby' },
    { name: 'Тварини', type: EXPENSE, icon: 'paw-print' },
    { name: 'Інше', type: EXPENSE, icon: 'circle' },

    // { name: 'Театр', type: EXPENSE, icon: 'circle' },
    // { name: 'Фільми', type: EXPENSE, icon: 'circle' },
    // { name: 'Спортивні події', type: EXPENSE, icon: 'circle' },
    // { name: 'Робочі внески', type: EXPENSE, icon: 'circle' },
    // { name: 'Благодійність', type: EXPENSE, icon: 'circle' },
    // { name: 'Техніка', type: EXPENSE, icon: 'circle' },
    // { name: 'Оренда', type: EXPENSE, icon: 'home' },

    // Доходи
    { name: 'Зарплата', type: INCOME, icon: 'wallet' },
    { name: 'Фриланс', type: INCOME, icon: 'laptop' },
    { name: 'Подарунки', type: INCOME, icon: 'gift' },
    { name: 'Відсотки та кешбек', type: INCOME, icon: 'percent' },
    { name: 'Продаж речей', type: INCOME, icon: 'tag' },
    { name: 'Інше', type: INCOME, icon: 'circle' },
];

async function main() {
    let created = 0;

    for (const c of categories) {
        // Перевіряємо вручну, бо @@unique не працює для userId = null
        const exists = await prisma.category.findFirst({
            where: { userId: null, name: c.name, type: c.type },
        });

        if (!exists) {
            await prisma.category.create({ data: c });
            created++;
        }
    }

    console.log(`Seed: створено ${created}, пропущено ${categories.length - created}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());