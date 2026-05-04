import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log('--- START TEST ---');

    // Test Employees
    const { data: empData, error: empError } = await supabase.from('employees').select('*').limit(1);
    if (empError) console.log('EMPLOYEES_ERROR:', empError.message);
    else console.log('EMPLOYEES_OK:', empData.length > 0 ? 'Data exists' : 'Empty');

    // Test Attendance
    const { data: attData, error: attError } = await supabase.from('attendance').select('*').limit(1);
    if (attError) console.log('ATTENDANCE_ERROR:', attError.message);
    else console.log('ATTENDANCE_OK:', attData.length > 0 ? 'Data exists' : 'Empty');

    console.log('--- END TEST ---');
}

test();
