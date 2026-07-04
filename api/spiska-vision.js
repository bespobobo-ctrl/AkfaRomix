// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Spiska rasmidan AI orqali mahsulot ro'yxati
//  Buxgalteriya panelidagi "Rasmdan Kirim" tugmasi shu yerga
//  rasm (base64) yuboradi, javobda mahsulotlar ro'yxati qaytadi.
// ═══════════════════════════════════════════════════════════

import { extractSpiskaFromImage, isConfigured } from "./_romixai.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Faqat POST so'rov qabul qilinadi" });
    }
    if (!isConfigured()) {
        return res.status(500).json({ error: "GEMINI_API_KEY sozlanmagan (Vercel env)" });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const { image, mimeType } = body || {};
        if (!image) {
            return res.status(400).json({ error: "Rasm (base64) yuborilmadi" });
        }

        const items = await extractSpiskaFromImage(image, mimeType);
        return res.status(200).json({ items });
    } catch (err) {
        console.error("spiska-vision xatolik:", err);
        return res.status(500).json({ error: err.message || "Rasmni tahlil qilishda xatolik" });
    }
}
