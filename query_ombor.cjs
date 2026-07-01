const { createClient } = require('@supabase/supabase-js');
const URL = "https://dzsswblbpnjuluyqvewt.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const supabase = createClient(URL, KEY);

async function check() {
    console.log("Querying records where stage contains 'sovutish' or 'xom_ombor'...");
    const { data, error } = await supabase
        .from('clapak_production')
        .select('*')
        .or('stage.ilike.%sovutish%,stage.ilike.%xom_ombor%');

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log(`Found ${data.length} records.`);
        console.log(data);
    }
}
check();
