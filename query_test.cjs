const { createClient } = require('@supabase/supabase-js');
const URL = "https://dzsswblbpnjuluyqvewt.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const supabase = createClient(URL, KEY);

async function check() {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;

    console.log("Querying records...");
    const { data, error } = await supabase
        .from('clapak_production')
        .select('*')
        .or(`status.eq.zakaz,stage.neq.finished,last_update.gte.${startOfDay},start_time.gte.${startOfDay}`);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log(`Found ${data.length} records.`);
        console.log("Stages in result:", [...new Set(data.map(d => d.stage))]);
        console.log("Sample records:", data.slice(0, 10));
    }
}
check();
