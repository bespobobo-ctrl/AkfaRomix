import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
    const { data: att, error: attErr } = await supabase.from('attendance').select('*').limit(1);
    if (attErr) console.error('ATT ERROR:', attErr.message);
    else console.log('ATT COLUMNS:', Object.keys(att[0] || {}));

    const { data: emp, error: empErr } = await supabase.from('employees').select('*').limit(1);
    if (empErr) console.error('EMP ERROR:', empErr.message);
    else console.log('EMP COLUMNS:', Object.keys(emp[0] || {}));
}
check();
