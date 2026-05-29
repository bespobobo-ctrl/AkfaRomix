const { createClient } = require('@supabase/supabase-js');
const URL = "https://dzsswblbpnjuluyqvewt.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const supabase = createClient(URL, KEY);

async function check() {
    console.log("Fetching clapak_inventory items...");
    const { data, error } = await supabase.from('clapak_inventory').select('*');
    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log(`Success! Total items: ${data.length}`);
        data.forEach(item => {
            console.log(`- ID: ${item.id} | Name: "${item.product_name}" | Category: "${item.category}" | Qty: ${item.stock_quantity} ${item.unit} | Price: ${item.price} | Desc: "${item.description}"`);
        });
    }
}

check();
