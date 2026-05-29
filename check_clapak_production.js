const { createClient } = require('@supabase/supabase-js');
const URL = "https://dzsswblbpnjuluyqvewt.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const supabase = createClient(URL, KEY);

async function check() {
    console.log("Fetching one row from clapak_production...");
    const { data, error } = await supabase.from('clapak_production').select('*').limit(1);
    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log("Success! Columns:", Object.keys(data[0] || {}));
        console.log("Row sample:", data[0]);
    }

    console.log("\nTrying to insert a test order...");
    const orderDetails = {
        isOmbor: false,
        clientName: "Test Client",
        phone: "+998 90 123 45 67",
        deadline: "2026-06-03",
        rawNeeded: 240,
        accsNeeded: 400
    };

    const payload = {
        model: "TEST MODEL",
        quantity: 400,
        status: 'zakaz',
        stage: 'zakaz-1',
        operator: JSON.stringify(orderDetails)
    };

    const { data: insData, error: insError } = await supabase.from('clapak_production').insert([payload]).select();
    if (insError) {
        console.error("Insert Error:", insError);
    } else {
        console.log("Insert Success! Inserted:", insData);
    }
}

check();
