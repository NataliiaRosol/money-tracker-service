import { createApp } from "./app.js";
import { env } from "./config/env.js";
import cron from 'node-cron';
import { cleanupExpired } from "./jobs/cleanup.js";



function runCleanup() {
    // an unhandled rejection would crash the whole server
    cleanupExpired().catch((err) => console.error('[cleanup] failed:', err));
}

const app = createApp();

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
    runCleanup(); // on start too: the server may have been down at night
    cron.schedule('0 4 * * *', runCleanup, { timezone: 'Europe/Kyiv' });
});
