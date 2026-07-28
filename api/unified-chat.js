export default async function handler(req, res) {
    const dept = req.query.dept || 'romix';
    let module;
    try {
        if (dept === 'hr') module = await import('./_hr-ai-chat.js');
        else if (dept === 'sotuv') module = await import('./_sotuv-ai-chat.js');
        else if (dept === 'ishlab') module = await import('./_ishlab-chiqarish-ai-chat.js');
        else if (dept === 'buxgalter') module = await import('./_buxgalter-ai-chat.js');
        else if (dept === 'ombor') module = await import('./_ombor-ai-chat.js');
        else module = await import('./_romix-ai-chat.js');
        
        return module.default(req, res);
    } catch (e) {
        console.error("Unified Router Error:", e);
        return res.status(500).json({ ok: false, error: "Internal router error: " + String(e) });
    }
}
