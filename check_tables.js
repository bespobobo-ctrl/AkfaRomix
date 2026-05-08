import { supabase } from './supabase.js';

async function checkTables() {
    console.log("Checking tables...");
    // There is no direct "list tables" in Supabase client, 
    // but we can try to query common ones or check a known list.
    const tables = ['employees', 'attendance', 'activity_logs', 'logs', 'kitchen_finance'];
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table '${t}' exists with ${data || 0} rows.`);
        } else {
            console.log(`Table '${t}' DOES NOT EXIST or NO ACCESS.`);
        }
    }
}
checkTables();
