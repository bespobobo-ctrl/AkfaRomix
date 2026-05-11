import { supabase } from './supabase.js';
import fs from 'fs';

async function check() {
    const { data } = await supabase.from('employees').select('*');
    fs.writeFileSync('employee_schema.json', JSON.stringify(data, null, 2));
}
check();
