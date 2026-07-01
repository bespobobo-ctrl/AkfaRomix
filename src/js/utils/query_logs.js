import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('Fetching sample records from clapak_kraska_logs...');
    const { data: logs, error } = await supabase.from('clapak_kraska_logs').select('*').limit(3);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample logs:', JSON.stringify(logs, null, 2));
    }

    console.log('Fetching sample records from clapak_production...');
    const { data: production, error2 } = await supabase.from('clapak_production').select('*').limit(3);
    if (error2) {
        console.error('Error2:', error2);
    } else {
        console.log('Sample production:', JSON.stringify(production, null, 2));
    }
}

run();
