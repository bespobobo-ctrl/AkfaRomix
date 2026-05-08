import { supabase } from './supabase.js';
import fs from 'fs';

async function check() {
    const { data } = await supabase.from('system_users').select('*');
    fs.writeFileSync('users_dump.json', JSON.stringify(data, null, 2));
}
check();
