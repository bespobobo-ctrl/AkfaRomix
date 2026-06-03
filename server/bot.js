import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load env variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

/**
 * AKFA Romix Executive Bot
 * Standalone Node.js service
 */
const token = process.env.VITE_TELEGRAM_BOT_TOKEN_EXECUTIVE;
if (!token) {
    console.error('CRITICAL: VITE_TELEGRAM_BOT_TOKEN_EXECUTIVE is not defined in .env!');
    process.exit(1);
}

const bot = new Telegraf(token);

const WEB_APP_URL = 'https://akfa-romix.vercel.app/akfa_hr_mini.html?v=3';

bot.use((ctx, next) => {
    console.log(`[BOT UPDATE] Message from ${ctx.from?.username || ctx.from?.first_name}: ${ctx.message?.text || '[non-text]'}`);
    return next();
});

bot.start((ctx) => {
    console.log(`[BOT START] User ${ctx.from?.username || ctx.from?.id} started bot. Sending WebApp URL: ${WEB_APP_URL}`);
    ctx.replyWithHTML(
        `<b>Assalomu alaykum, ${ctx.from.first_name}!</b>\n\n` +
        `AKFA Romix Korporativ Tizimiga xush kelibsiz.\n` +
        `Pastdagi tugma orqali boshqaruv paneliga kirishingiz mumkin.`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Tizimga Kirish', WEB_APP_URL)]
        ])
    );
});

bot.on('web_app_data', (ctx) => {
    console.log('[BOT WEB APP DATA] Received data from web app');
    ctx.reply('Ma\'lumot qabul qilindi!');
});

console.log('--- AKFA Romix Bot starting standalone ---');
bot.launch()
    .then(() => {
        console.log('Bot is running successfully.');
    })
    .catch(err => {
        console.error('Bot launch error:', err);
    });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
