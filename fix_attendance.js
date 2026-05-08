import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixDate() {
    // Farhod Manopov ning eski yozuvi 2026-05-08 da bor (UTC tufayli)
    // Lekin haqiqatda u 2026-05-09 kuni kelgan (local vaqt bo'yicha 03:00)
    // Uni yangi local sana bilan yangilash kerak

    const farhodId = '80bb0fbd-3216-4cfb-a1ea-fad946736347';

    // check_in vaqti 2026-05-08T22:39:12.705Z = local vaqt 2026-05-09 03:39
    // Demak bu haqiqatan 2026-05-09 ga tegishli yozuv
    const { error } = await supabase.from('attendance')
        .update({ date: '2026-05-09' })
        .eq('id', farhodId)
        .eq('date', '2026-05-08');

    if (error) console.log("Xato:", error.message);
    else console.log("Farhod yozuvi sanasi 2026-05-09 ga tuzatildi");

    // Tekshirish
    const { data } = await supabase.from('attendance').select('*').eq('employee_id', farhodId);
    console.log("Hozirgi holat:", JSON.stringify(data, null, 2));
}
fixDate();
