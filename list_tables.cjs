const { createClient } = require('@supabase/supabase-js');
const URL = "https://dzsswblbpnjuluyqvewt.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const supabase = createClient(URL, KEY);

async function run() {
    console.log("Checking tables via RPC or dynamic queries...");
    
    // Let's try to query some typical table names or query from postgres backend if possible
    const tables = [
        'clapak_production',
        'clapak_inventory',
        'clapak_orders',
        'clapak_shifts',
        'clapak_raw_materials',
        'clapak_refuel',
        'zapravka',
        'refuel',
        'production_logs',
        'machine_logs'
    ];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('not found') || error.message.includes('does not exist')) {
                console.log(`- Table ${table}: Does not exist`);
            } else {
                console.log(`- Table ${table}: Exists but error: ${error.message} (Code: ${error.code})`);
            }
        } else {
            console.log(`- Table ${table}: EXISTS! Sample row:`, data);
        }
    }
}

run();
