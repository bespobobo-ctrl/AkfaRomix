import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verify() {
    const { data: att } = await supabase.from('attendance').select('*').order('created_at', { ascending: false }).limit(10);
    const { data: emps } = await supabase.from('employees').select('id, full_name');

    let out = "=== XODIMLAR ===\n";
    emps?.forEach(e => out += `  ${e.full_name} => ${e.id}\n`);

    out += "\n=== BARCHA ATTENDANCE ===\n";
    att?.forEach((a, i) => {
        const empName = emps?.find(e => e.id === a.employee_id)?.full_name || 'NOMA\'LUM';
        out += `#${i + 1}: id=${a.id} | employee_id=${a.employee_id} | emp=${empName} | date=${a.date} | status=${a.status} | in=${a.check_in} | out=${a.check_out}\n`;
    });

    const farhod = emps?.find(e => e.full_name.includes('Farhod'));
    if (farhod) {
        const { data: fAtt } = await supabase.from('attendance').select('*').eq('employee_id', farhod.id);
        out += `\n=== FARHOD: employee_id bo'yicha topildi: ${fAtt?.length || 0} ta ===\n`;
        fAtt?.forEach(a => out += `  ${a.date} | ${a.status} | in:${a.check_in} | out:${a.check_out}\n`);
    }

    fs.writeFileSync('debug_output.txt', out);
    console.log("DONE");
}
verify();
