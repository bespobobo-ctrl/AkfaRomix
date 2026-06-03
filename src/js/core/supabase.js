import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function checkAuth(roles = []) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = '/index.html';
        return null;
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
        window.location.href = '/index.html';
        return null;
    }
    return user;
}

export function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
}
