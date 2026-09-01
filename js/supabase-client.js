// IMPORTANTE: Reemplaza estas variables con las tuyas de Supabase
const SUPABASE_URL = 'https://ezozuorgkovmriocvldn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6b3p1b3Jna292bXJpb2N2bGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NjgxNjUsImV4cCI6MjEwMzU0NDE2NX0.pHkWeaf3DT3RRDhPl7kXTVfhNpfzC5b2YOUjapVpFME';

// Inicializar cliente Supabase y exponerlo globalmente
if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase CDN no cargó. Revisa tu conexión o desactiva tu AdBlock.");
}
