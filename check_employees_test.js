
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, full_name, role')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Employees found:', employees);
    }
}

check();
