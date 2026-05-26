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

const WEB_APP_URL = 'https://akfa-romix.vercel.app/akfa_hr_mini.html';

bot.start((ctx) => {
    ctx.replyWithHTML(
        `<b>Assalomu alaykum, ${ctx.from.first_name}!</b>\n\n` +
        `AKFA Romix Korporativ Tizimiga xush kelibsiz.\n` +
        `Pastdagi tugma orqali boshqaruv paneliga kirishingiz mumkin.`,
        Markup.keyboard([
            [Markup.button.webApp('🚀 Tizimga Kirish', WEB_APP_URL)]
        ]).resize()
    );
});

bot.on('web_app_data', (ctx) => {
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
