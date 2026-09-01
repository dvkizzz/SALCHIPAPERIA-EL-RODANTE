const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nzrmqxabpfiwdfdjngob.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5juGYwcsZIMxdY-IZ4fU3A_zGfurx_W';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateStock() {
    console.log('Iniciando sesión...');
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'vikisebastian19z@gmail.com',
        password: 'viki2312'
    });

    if (authError) {
        console.error('Error de autenticación:', authError.message);
        return;
    }

    console.log('Sesión iniciada correctamente. Actualizando stock de productos...');
    
    // Obtener todos los productos para actualizarlos uno por uno (ya que Supabase JS no tiene .update() sin filtros fácilmente, aunque podemos usar algo como .neq('id', '00000000-0000-0000-0000-000000000000'))
    // Usaremos un update masivo con un filtro que afecte a todos.
    const { data, error } = await supabase
        .from('productos')
        .update({ stock: 10 })
        .not('id', 'is', null);

    if (error) {
        console.error('Error actualizando stock:', error.message);
    } else {
        console.log('✅ Todos los productos han sido actualizados a stock: 10');
    }
}

updateStock();
