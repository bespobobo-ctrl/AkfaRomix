const axios = require('axios');

const BOT_TOKEN = '8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA';
const MINI_APP_URL = 'https://akfa-romix.vercel.app/src/mini-app/stanok-app/index.html';

async function setupBot() {
    console.log("Botni sozlash boshlandi...");

    try {
        // 1. Menyu tugmasini sozlash
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
            menu_button: {
                type: 'web_app',
                text: 'Stanok Panel 📟',
                web_app: { url: MINI_APP_URL }
            }
        });
        console.log("✅ Menyu tugmasi muvaffaqiyatli o'rnatildi!");

        // 2. Botga /start yozilganda tugma chiqarish (Polling rejimi)
        let lastUpdateId = 0;
        console.log("🤖 Bot xabarlarni kutmoqda... (To'xtatish uchun: Ctrl+C)");

        while (true) {
            const updates = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
            for (const update of updates.data.result) {
                lastUpdateId = update.update_id;
                if (update.message && update.message.text === '/start') {
                    const chatId = update.message.chat.id;
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: "Assalomu alaykum! Stanokchi boshqaruv paneliga xush kelibsiz. Quyidagi tugmani bosing:",
                        reply_markup: {
                            inline_keyboard: [[
                                { text: "Panelni ochish 📟", web_app: { url: MINI_APP_URL } }
                            ]]
                        }
                    });
                    console.log(`✉️ /start xabari yuborildi: ${chatId}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Xatolik yuz berdi:", error.response ? error.response.data : error.message);
    }
}

setupBot();
