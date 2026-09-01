const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nzrmqxabpfiwdfdjngob.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5juGYwcsZIMxdY-IZ4fU3A_zGfurx_W';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateDescriptions() {
    console.log('Iniciando sesión...');
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'vikisebastian19z@gmail.com',
        password: 'viki2312'
    });

    if (authError) {
        console.error('Error de autenticación:', authError.message);
        return;
    }

    const { data: productos } = await supabase.from('productos').select('*');
    
    for (const p of productos) {
        let newDesc = p.descripcion;
        const nombreLower = p.nombre.toLowerCase();
        
        if (nombreLower.includes('clasica') || nombreLower.includes('clásica')) {
            newDesc = "Crujientes papas amarillas doradas a la perfección, acompañadas de abundante hot dog frankfurt ahumado. ¡El clásico que nunca falla!";
        } else if (nombreLower.includes('royal')) {
            newDesc = "La reina de la casa: Papas súper crocantes, hot dog premium, huevo frito jugosito montado y un toque de queso derretido. ¡Una explosión de sabor!";
        } else if (nombreLower.includes('broaster') || nombreLower.includes('pollo')) {
            newDesc = "Trozos de pollo broaster súper jugosos por dentro y extracrocantes por fuera, sobre una cama de nuestras clásicas papas fritas doradas.";
        } else if (nombreLower.includes('chorizo')) {
            newDesc = "Deliciosas papas fritas bañadas con rodajas de chorizo finas hierbas frito al instante. ¡Sabor intenso en cada bocado!";
        } else if (!p.descripcion || p.descripcion.length < 20) {
            newDesc = "Preparado al instante con ingredientes premium y nuestra sazón secreta. ¡Pídelo con todas las cremas y disfruta!";
        }

        if (newDesc !== p.descripcion) {
            await supabase.from('productos').update({ descripcion: newDesc }).eq('id', p.id);
            console.log(`Actualizado: ${p.nombre}`);
        }
    }
    console.log('✅ Descripciones actualizadas a modo Food Porn.');
}

updateDescriptions();
