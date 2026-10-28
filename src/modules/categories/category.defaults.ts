import { CategoryType } from '../../generated/prisma/enums.js';
import type { CategoryIcon } from './category.icons.js';

const { EXPENSE, INCOME } = CategoryType;

const DEFAULTS = [
    // Витрати
    { name: 'Продукти', type: EXPENSE, icon: 'shopping-cart' },
    { name: 'Кафе та ресторани', type: EXPENSE, icon: 'utensils' },
    { name: 'Транспорт', type: EXPENSE, icon: 'bus' },
    { name: 'Авто', type: EXPENSE, icon: 'car' },
    { name: 'Житло', type: EXPENSE, icon: 'house' },
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
    { name: 'Інше', type: EXPENSE, icon: 'circle-ellipsis' },

    // { name: 'Театр', type: EXPENSE, icon: 'drama' },
    // { name: 'Фільми', type: EXPENSE, icon: 'film' },
    // { name: 'Спортивні події', type: EXPENSE, icon: 'trophy' },
    // { name: 'Робочі внески', type: EXPENSE, icon: 'briefcase' },
    // { name: 'Благодійність', type: EXPENSE, icon: 'hand-heart' },
    // { name: 'Техніка', type: EXPENSE, icon: 'smartphone' },
    // { name: 'Оренда', type: EXPENSE, icon: 'key-round' },

    // Доходи
    { name: 'Зарплата', type: INCOME, icon: 'wallet' },
    { name: 'Фриланс', type: INCOME, icon: 'laptop' },
    { name: 'Подарунки', type: INCOME, icon: 'gift' },
    { name: 'Відсотки та кешбек', type: INCOME, icon: 'percent' },
    { name: 'Продаж речей', type: INCOME, icon: 'tag' },
    { name: 'Інше', type: INCOME, icon: 'circle-ellipsis' },
] satisfies { name: string; type: CategoryType; icon: CategoryIcon }[];

export const DEFAULT_CATEGORIES = DEFAULTS.map((c) => ({ ...c, isDefault: true }));
