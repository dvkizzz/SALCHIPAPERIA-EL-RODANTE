let currentOrders = [];
let currentProducts = [];

// Elementos DOM
const ordersTbody = document.getElementById('orders-tbody');
const orderModal = document.getElementById('order-modal');
const closeModal = document.getElementById('close-modal');
const orderDetailsContent = document.getElementById('order-details-content');
const orderActions = document.getElementById('order-actions');
const btnLogout = document.getElementById('btn-logout');
const notifSound = document.getElementById('notification-sound');

// Elementos Productos
const navPedidos = document.getElementById('nav-pedidos');
const navProductos = document.getElementById('nav-productos');
const pedidosSection = document.querySelector('.orders-section');
const statsSection = document.querySelector('.stats-grid');
const productosSection = document.getElementById('productos-section');
const productosTbody = document.getElementById('productos-tbody');
const productModal = document.getElementById('product-modal');
const closeProductModal = document.getElementById('close-product-modal');
const productForm = document.getElementById('product-form');
const btnNuevoProducto = document.getElementById('btn-nuevo-producto');

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sesión
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    loadOrders();
    loadProducts();
    subscribeToRealtime();
});

// Logout
btnLogout.addEventListener('click', async (e) => {
    e.preventDefault();
    await window.supabaseClient.auth.signOut();
    window.location.href = 'login.html';
});

// Navegación
navPedidos.addEventListener('click', (e) => {
    e.preventDefault();
    navPedidos.classList.add('active');
    navProductos.classList.remove('active');
    pedidosSection.style.display = 'block';
    statsSection.style.display = 'grid'; // as grid in css
    productosSection.style.display = 'none';
});

navProductos.addEventListener('click', (e) => {
    e.preventDefault();
    navProductos.classList.add('active');
    navPedidos.classList.remove('active');
    pedidosSection.style.display = 'none';
    statsSection.style.display = 'none';
    productosSection.style.display = 'block';
});

// Cargar Pedidos
async function loadOrders() {
    try {
        const { data, error } = await window.supabaseClient
            .from('pedidos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        currentOrders = data;
        renderOrders();
        updateStats();
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        ordersTbody.innerHTML = '<tr><td colspan="6">Error al cargar pedidos.</td></tr>';
    }
}

// Renderizar tabla
function renderOrders() {
    if (currentOrders.length === 0) {
        ordersTbody.innerHTML = '<tr><td colspan="6" class="loading-msg">No hay pedidos registrados.</td></tr>';
        return;
    }

    ordersTbody.innerHTML = '';
    currentOrders.forEach(order => {
        // Fidelización: Contar pedidos de este teléfono
        const orderCount = currentOrders.filter(o => o.telefono === order.telefono).length;
        const loyaltyBadge = orderCount >= 5 ? ' <span title="Cliente Frecuente (5+ pedidos)" style="cursor:help;">🏆</span>' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${String(order.numero_pedido).padStart(5, '0')}</td>
            <td>${order.cliente_nombre}${loyaltyBadge}</td>
            <td>${new Date(order.created_at).toLocaleString()}</td>
            <td>S/ ${order.total.toFixed(2)}</td>
            <td><span class="status-badge status-${order.estado}">${order.estado.toUpperCase().replace('_', ' ')}</span></td>
            <td><button class="btn-view" onclick="viewOrder('${order.id}')">VER PEDIDO</button></td>
        `;
        ordersTbody.appendChild(tr);
    });
}

// Actualizar Estadísticas
function updateStats() {
    const pendientes = currentOrders.filter(o => o.estado === 'pendiente').length;
    const preparacion = currentOrders.filter(o => o.estado === 'en_preparacion').length;
    const enviados = currentOrders.filter(o => o.estado === 'enviado').length;
    
    // Ventas del día (Solo entregados)
    const hoy = new Date().toLocaleDateString();
    const ventasDia = currentOrders
        .filter(o => new Date(o.created_at).toLocaleDateString() === hoy && o.estado === 'entregado')
        .reduce((sum, o) => sum + parseFloat(o.total), 0);

    document.getElementById('stat-pendientes').innerText = pendientes;
    document.getElementById('stat-preparacion').innerText = preparacion;
    document.getElementById('stat-enviados').innerText = enviados;
    document.getElementById('stat-ventas').innerText = `S/ ${ventasDia.toFixed(2)}`;
}

// Suscripción Realtime
function subscribeToRealtime() {
    // Escuchar tabla pedidos
    window.supabaseClient
        .channel('pedidos-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'pedidos' },
            (payload) => {
                console.log('Cambio en pedidos:', payload);
                if (payload.eventType === 'INSERT') {
                    // Nuevo pedido
                    currentOrders.unshift(payload.new);
                    playNotification();
                    // Opcional: mostrar notificación HTML
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('🔔 NUEVO PEDIDO', {
                            body: `Pedido #${payload.new.numero_pedido} de ${payload.new.cliente_nombre}`
                        });
                    }
                } else if (payload.eventType === 'UPDATE') {
                    // Actualización
                    const index = currentOrders.findIndex(o => o.id === payload.new.id);
                    if (index !== -1) currentOrders[index] = payload.new;
                }
                
                renderOrders();
                updateStats();
            }
        )
        .subscribe();

    // Solicitar permiso de notificaciones de escritorio
    if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// Reproducir sonido
function playNotification() {
    notifSound.play().catch(e => console.log('El navegador bloqueó el autoplay del sonido.', e));
}

// Ver Detalles del Pedido
async function viewOrder(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;

    // Obtener detalles de BD
    try {
        const { data: details, error } = await window.supabaseClient
            .from('detalle_pedidos')
            .select('*, productos(nombre)')
            .eq('pedido_id', order.id);

        if (error) throw error;

        let html = `
            <div class="order-details-content">
                <h2>PEDIDO #${String(order.numero_pedido).padStart(5, '0')}</h2>
                <div class="order-info-grid">
                    <div class="order-info-item">
                        <span>Cliente</span>
                        <strong>${order.cliente_nombre}</strong>
                    </div>
                    <div class="order-info-item">
                        <span>Teléfono</span>
                        <strong>${order.telefono}</strong>
                    </div>
                    <div class="order-info-item">
                        <span>Dirección</span>
                        <strong>${order.direccion}</strong>
                    </div>
                    <div class="order-info-item">
                        <span>Método de pago</span>
                        <strong>${order.metodo_pago}</strong>
                    </div>
                    <div class="order-info-item">
                        <span>Fecha</span>
                        <strong>${new Date(order.created_at).toLocaleString()}</strong>
                    </div>
                    <div class="order-info-item">
                        <span>Estado</span>
                        <strong><span class="status-badge status-${order.estado}">${order.estado.toUpperCase().replace('_', ' ')}</span></strong>
                    </div>
                </div>

                <h3>Productos</h3>
                <div class="products-list">`;

        details.forEach(item => {
            const prodName = item.productos ? item.productos.nombre : 'Producto Eliminado';
            html += `
                <div class="product-row">
                    <span>${prodName} ${item.variante ? '('+item.variante+')' : ''} x${item.cantidad}</span>
                    <span>S/ ${item.subtotal.toFixed(2)}</span>
                </div>
            `;
        });

        html += `
                </div>
                `;

        if (order.observaciones) {
            html += `
                <div style="margin-bottom: 1.5rem">
                    <span>Observaciones:</span><br>
                    <strong>${order.observaciones}</strong>
                </div>
            `;
        }

        html += `
                <div class="order-totals">
                    Subtotal: S/ ${order.subtotal.toFixed(2)}<br>
                    <strong>Total: S/ ${order.total.toFixed(2)}</strong>
                </div>
            </div>
        `;

        orderDetailsContent.innerHTML = html;
        renderActions(order);
        orderModal.style.display = 'block';

    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        alert('Hubo un error al cargar los detalles.');
    }
}

// Renderizar botones de acción según el estado
function renderActions(order) {
    orderActions.innerHTML = '';
    const state = order.estado;

    if (state === 'pendiente') {
        orderActions.innerHTML = `
            <button class="btn-action btn-accept" onclick="updateStatus('${order.id}', 'aceptado')">ACEPTAR PEDIDO</button>
            <button class="btn-action btn-reject" onclick="updateStatus('${order.id}', 'rechazado')">RECHAZAR PEDIDO</button>
        `;
    } else if (state === 'aceptado') {
        orderActions.innerHTML = `
            <button class="btn-action btn-prepare" onclick="updateStatus('${order.id}', 'en_preparacion')">EN PREPARACIÓN</button>
        `;
    } else if (state === 'en_preparacion') {
        orderActions.innerHTML = `
            <button class="btn-action btn-send" onclick="updateStatus('${order.id}', 'enviado')">ENVIADO</button>
        `;
    } else if (state === 'enviado') {
        orderActions.innerHTML = `
            <button class="btn-action btn-deliver" onclick="updateStatus('${order.id}', 'entregado')">ENTREGADO</button>
        `;
    }
}

// Actualizar Estado
window.updateStatus = async function(orderId, newState) {
    try {
        const { error } = await window.supabaseClient
            .from('pedidos')
            .update({ estado: newState })
            .eq('id', orderId);

        if (error) throw error;
        
        // Buscar el pedido para obtener el teléfono del cliente
        const order = currentOrders.find(o => o.id === orderId);
        
        if (order && order.telefono) {
            let numPedidoFormateado = String(order.numero_pedido).padStart(5, '0');
            let mensaje = '';
            
            switch(newState) {
                case 'aceptado':
                    mensaje = `Hola *${order.cliente_nombre}*, tu pedido *#${numPedidoFormateado}* ha sido *ACEPTADO* y pronto comenzaremos a prepararlo. 🍔🍟`;
                    break;
                case 'en_preparacion':
                    mensaje = `Hola *${order.cliente_nombre}*, te informamos que tu pedido *#${numPedidoFormateado}* ya está *EN PREPARACIÓN*. 🧑‍🍳`;
                    break;
                case 'enviado':
                    mensaje = `Hola *${order.cliente_nombre}*, ¡buenas noticias! Tu pedido *#${numPedidoFormateado}* ha sido *ENVIADO* y va en camino. 🛵`;
                    break;
                case 'entregado':
                    mensaje = `Hola *${order.cliente_nombre}*, tu pedido *#${numPedidoFormateado}* ha sido *ENTREGADO*. ¡Que lo disfrutes! 🎉`;
                    break;
                case 'rechazado':
                    mensaje = `Hola *${order.cliente_nombre}*, lamentablemente tu pedido *#${numPedidoFormateado}* ha sido *RECHAZADO*. Por favor comunícate con nosotros para más detalles. ❌`;
                    break;
                case 'cancelado':
                    mensaje = `Hola *${order.cliente_nombre}*, tu pedido *#${numPedidoFormateado}* ha sido *CANCELADO*. 🚫`;
                    break;
            }

            if (mensaje !== '') {
                // Formatear el teléfono (quitar espacios o caracteres raros y asegurar que tenga el código de país si es necesario)
                let telefonoCliente = order.telefono.replace(/[^\d+]/g, '');
                // Si el teléfono tiene 9 dígitos (formato Perú), agregarle el +51
                if (telefonoCliente.length === 9 && !telefonoCliente.startsWith('+')) {
                    telefonoCliente = '+51' + telefonoCliente;
                }
                
                const wpUrl = `https://api.whatsapp.com/send?phone=${telefonoCliente}&text=${encodeURIComponent(mensaje)}`;
                window.open(wpUrl, '_blank');
            }
        }

        // Cierra modal si está abierto
        orderModal.style.display = 'none';

    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert('No se pudo actualizar el estado.');
    }
};

// Cerrar Modal
closeModal.addEventListener('click', () => {
    orderModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target === orderModal) orderModal.style.display = 'none';
    if (e.target === productModal) productModal.style.display = 'none';
});

// ==================== LÓGICA DE PRODUCTOS ====================

async function loadProducts() {
    try {
        const { data, error } = await window.supabaseClient
            .from('productos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        currentProducts = data;
        renderProducts();
    } catch (error) {
        console.error('Error al cargar productos:', error);
        productosTbody.innerHTML = '<tr><td colspan="6">Error al cargar productos.</td></tr>';
    }
}

function renderProducts() {
    if (currentProducts.length === 0) {
        productosTbody.innerHTML = '<tr><td colspan="6" class="loading-msg">No hay productos registrados.</td></tr>';
        return;
    }

    productosTbody.innerHTML = '';
    currentProducts.forEach(prod => {
        const tr = document.createElement('tr');
        const defaultImg = 'https://via.placeholder.com/50';
        tr.innerHTML = `
            <td><img src="${prod.imagen || defaultImg}" alt="${prod.nombre}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"></td>
            <td>${prod.nombre}</td>
            <td>S/ ${prod.precio.toFixed(2)}</td>
            <td>${prod.stock}</td>
            <td><span class="status-badge status-${prod.estado}">${prod.estado.toUpperCase()}</span></td>
            <td>
                <button class="btn-edit" onclick="editProduct('${prod.id}')">Editar</button>
            </td>
        `;
        productosTbody.appendChild(tr);
    });
}

// Modal Productos
btnNuevoProducto.addEventListener('click', () => {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('product-modal-title').innerText = 'Nuevo Producto';
    productModal.style.display = 'block';
});

closeProductModal.addEventListener('click', () => {
    productModal.style.display = 'none';
});

// Guardar / Actualizar Producto
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const producto = {
        nombre: document.getElementById('prod-nombre').value,
        descripcion: document.getElementById('prod-desc').value,
        precio: parseFloat(document.getElementById('prod-precio').value),
        stock: parseInt(document.getElementById('prod-stock').value),
        imagen: document.getElementById('prod-imagen').value,
        estado: document.getElementById('prod-estado').value
    };

    try {
        if (id) {
            // Actualizar
            const { error } = await window.supabaseClient.from('productos').update(producto).eq('id', id);
            if (error) throw error;
        } else {
            // Insertar
            const { error } = await window.supabaseClient.from('productos').insert([producto]);
            if (error) throw error;
        }
        productModal.style.display = 'none';
        loadProducts(); // Recargar lista
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert('Error al guardar el producto.');
    }
});

window.editProduct = function(id) {
    const prod = currentProducts.find(p => p.id === id);
    if (!prod) return;
    
    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-nombre').value = prod.nombre;
    document.getElementById('prod-desc').value = prod.descripcion;
    document.getElementById('prod-precio').value = prod.precio;
    document.getElementById('prod-stock').value = prod.stock;
    document.getElementById('prod-imagen').value = prod.imagen || '';
    document.getElementById('prod-estado').value = prod.estado;
    
    document.getElementById('product-modal-title').innerText = 'Editar Producto';
    productModal.style.display = 'block';
};

