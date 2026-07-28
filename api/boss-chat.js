import asst from "./_romixassistant.js";

const { stGet, stSet, send, esc } = asst;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    try {
        const { action, dept, text } = req.body;

        if (action === 'history') {
            const history = (await stGet("boss_chat", [])) || [];
            return res.status(200).json({ ok: true, data: history });
        }

        if (action === 'send') {
            if (!dept || !text) {
                return res.status(400).json({ ok: false, error: 'Missing dept or text' });
            }

            const history = (await stGet("boss_chat", [])) || [];
            const newMsg = {
                id: Date.now(),
                from: dept,
                text: text,
                time: new Date().toISOString()
            };
            
            history.push(newMsg);
            // Keep only the last 200 messages to prevent state bloat
            if (history.length > 200) {
                history.shift();
            }
            
            await stSet("boss_chat", history);

            // Send to Telegram (Boss)
            const auth = (await stGet("auth", [])) || [];
            const tgMsg = `🏢 <b>BO'LIM: ${esc(dept)}</b>\n\n💬 ${esc(text)}\n\n<i>(Javob berish uchun ushbu xabarga 'Reply' qilib yozing)</i>`;
            
            let sentCount = 0;
            for (const chatId of auth) {
                try {
                    await send(chatId, tgMsg);
                    sentCount++;
                } catch (e) {
                    console.error("Failed to send boss chat to", chatId, e);
                }
            }

            return res.status(200).json({ ok: true, sentTo: sentCount, message: newMsg });
        }

        return res.status(400).json({ ok: false, error: 'Unknown action' });
    } catch (e) {
        console.error("Boss Chat error:", e);
        return res.status(500).json({ ok: false, error: e.message || String(e) });
    }
}
