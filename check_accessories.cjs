const { createClient } = require('@supabase/supabase-js');
const URL = "https://dzsswblbpnjuluyqvewt.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const supabase = createClient(URL, KEY);

async function check() {
    console.log("Listing tables...");
    // Since PostgREST doesn't directly allow reading information_schema easily unless configured,
    // let's try calling a common select or list known tables.
    // Let's check some common tables:
    const tables = ['clapak_inventory', 'clapak_production', 'employees', 'attendance', 'buh_employees', 'buh_sales', 'buh_transactions', 'warehouse_products', 'warehouse_transactions'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table '${table}': ERROR - ${error.message}`);
        } else {
            console.log(`Table '${table}': SUCCESS - Row sample keys: ${Object.keys(data[0] || {})}`);
        }
    }
}

check();
