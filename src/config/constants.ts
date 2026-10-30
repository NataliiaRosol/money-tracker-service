// Currencies we have exchange rates for
export const CURRENCIES = ['UAH', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

// Official NBU exchange rates (UAH per 1 unit of currency)
export const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';
