// AKFA Romix — Supabase keep-alive
// Har kuni Vercel Cron chaqiradi. Bazaga kichik so'rov yuborib, uni "faol" saqlaydi
// (Supabase bepul tarifi 7 kun faolsizlikdan keyin pauza qiladi — bu shuni oldini oladi).

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
  // Anon kalit — ochiq (frontend bundle'da ham bor), maxfiy emas.
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=id&limit=1`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    const ok = r.ok;
    res.status(200).json({
      ok,
      status: r.status,
      message: ok ? "Supabase faol — pauza oldini olindi" : "Supabase javob berdi, lekin xato status",
      ts: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), ts: new Date().toISOString() });
  }
}
