// Назви іконок з lucide (https://lucide.dev/icons), kebab-case
export const CATEGORY_ICONS = [
    // Їжа
    'shopping-cart', 'utensils', 'coffee', 'pizza', 'wine',
    // Транспорт
    'bus', 'car', 'fuel', 'car-taxi-front', 'train-front', 'bike', 'square-parking',
    // Житло та побут
    'house', 'key-round', 'sofa', 'zap', 'droplet', 'flame', 'wifi', 'wrench', 'washing-machine',
    // Здоров'я та догляд
    'heart-pulse', 'pill', 'stethoscope', 'dumbbell', 'sparkles', 'scissors',
    // Покупки
    'shirt', 'shopping-bag', 'package', 'smartphone', 'laptop',
    // Розваги та хобі
    'gamepad-2', 'film', 'drama', 'tv', 'music', 'book-open', 'ticket', 'trophy',
    // Сім'я, тварини, подарунки
    'baby', 'users', 'paw-print', 'gift', 'hand-heart',
    // Навчання та робота
    'graduation-cap', 'briefcase',
    // Подорожі
    'plane', 'luggage', 'tent',
    // Фінанси
    'wallet', 'banknote', 'coins', 'piggy-bank', 'credit-card', 'landmark', 'receipt',
    'shield-check', 'hand-coins', 'trending-up', 'percent', 'tag', 'repeat', 'undo-2', 'award',
    // Інше
    'heart', 'circle-ellipsis',
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];
