import { supabase } from './supabase.js';
import fs from 'fs';

async function check() {
    const { data, error } = await supabase.from('attendance').select('*').limit(5).order('created_at', { ascending: false });
    fs.writeFileSync('db_output.json', JSON.stringify({ error, data }, null, 2));
}
check();
