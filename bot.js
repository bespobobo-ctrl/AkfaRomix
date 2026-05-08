import { Telegraf, Markup } from 'telegraf';

/**
 * AKFA Romix Executive Bot
 * Token: 8736726197:AAHysZwqLIH2vgvv2ngLb7rl0_t33zGobTg
 */

const bot = new Telegraf('8736726197:AAHysZwqLIH2vgvv2ngLb7rl0_t33zGobTg');

// 🚀 TO'G'RI MANZIL: Mobil foydalanuvchilar uchun Mini App versiyasi
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
    // Mini Appdan ma'lumot kelsa shu yerda ushlash mumkin
    ctx.reply('Ma\'lumot qabul qilindi!');
});

console.log('--- AKFA Romix Bot ishga tushdi ---');
bot.launch().catch(err => {
    console.error('Bot launch error:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
