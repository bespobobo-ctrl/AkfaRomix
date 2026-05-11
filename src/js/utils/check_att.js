import { supabase } from './supabase.js';
import fs from 'fs';

async function check() {
    const { data } = await supabase.from('attendance').select('*').limit(1);
    fs.writeFileSync('attendance_sample.json', JSON.stringify(data, null, 2));
}
check();
