import { z } from 'zod';
import { CURRENCIES, NBU_URL, type Currency } from '../config/constants.js';
import { AppError } from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client.js';

// NBU sets the official rate once a day, so an hour-old rate is still current
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

const nbuResponseSchema = z.array(
    z.object({
        cc: z.string(),
        rate: z.number().positive(),
        exchangedate: z.string(), // DD.MM.YYYY
    }),
);

export type ExchangeRates = {
    // price of 1 unit of the currency in UAH
    uah: Record<Currency, Prisma.Decimal>;
    date: string; // YYYY-MM-DD
};

// In-memory: lost on restart, which is fine since it's refetched on the first request
let cache: { rates: ExchangeRates; fetchedAt: number } | null = null;

async function fetchNbuRates(): Promise<ExchangeRates> {
    const res = await fetch(NBU_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`NBU responded with ${res.status}`);

    const items = nbuResponseSchema.parse(await res.json());
    const usd = items.find((i) => i.cc === 'USD');
    const eur = items.find((i) => i.cc === 'EUR');
    if (!usd || !eur) throw new Error('NBU response has no USD or EUR rate');

    const [day, month, year] = usd.exchangedate.split('.');
    return {
        uah: {
            UAH: new Prisma.Decimal(1),
            USD: new Prisma.Decimal(usd.rate),
            EUR: new Prisma.Decimal(eur.rate),
        },
        date: `${year}-${month}-${day}`,
    };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.rates;
    }

    try {
        const rates = await fetchNbuRates();
        cache = { rates, fetchedAt: Date.now() };
        return rates;
    } catch (err) {
        console.warn('Failed to fetch NBU exchange rates:', err);
        // stale rates are better than no total at all
        if (cache) return cache.rates;
        throw AppError.serviceUnavailable('Exchange rates are temporarily unavailable');
    }
}

function isCurrency(value: string): value is Currency {
    return (CURRENCIES as readonly string[]).includes(value);
}

// NBU gives every rate relative to UAH, so USD → EUR goes through UAH
export function convert(amount: Prisma.Decimal, from: string, to: string, rates: ExchangeRates) {
    if (from === to) return amount;
    if (!isCurrency(from) || !isCurrency(to)) {
        throw new Error(`Unsupported currency conversion: ${from} → ${to}`);
    }
    return amount.times(rates.uah[from]).dividedBy(rates.uah[to]);
}
