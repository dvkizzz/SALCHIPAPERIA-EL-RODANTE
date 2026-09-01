const CONFIG = {
    BUSINESS_PHONE: '51929150571' 
};

let products = [];
let cart = [];

const productsGrid = document.getElementById('products-grid');
const cartIcon = document.getElementById('cart-icon');
const cartCount = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartTotal = document.getElementById('cart-total');
const checkoutForm = document.getElementById('checkout-form');
const successModal = document.getElementById('success-modal');
const closeSuccess = document.getElementById('close-success');
const whatsappLink = document.getElementById('whatsapp-link');
const successOrderId = document.getElementById('success-order-id');
const checkoutMsg = document.getElementById('checkout-msg');
const btnCheckout = document.getElementById('btn-checkout');
const btnMisPedidos = document.getElementById('btn-mis-pedidos');
const ordersModal = document.getElementById('orders-modal');
const closeOrders = document.getElementById('close-orders');
const myOrdersContainer = document.getElementById('my-orders-container');
const upsellModal = document.getElementById('upsell-modal');
const btnUpsellYes = document.getElementById('btn-upsell-yes');
const btnUpsellNo = document.getElementById('btn-upsell-no');
const closedBanner = document.getElementById('closed-banner');

// Comprobar horario de atención (6:00 PM a 11:30 PM)
function isBusinessOpen() {
    const now = new Date();
    // Convertir a hora de Perú si el cliente estuviera en otra zona horaria (simplificado)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Abrir de 18:00 (6 PM) a 23:30 (11:30 PM)
    if (hours >= 18 && (hours < 23 || (hours === 23 && minutes <= 30))) {
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    // Si está cerrado, mostrar banner
    if (!isBusinessOpen()) {
        closedBanner.style.display = 'block';
    }

    loadProducts();
    
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
});

async function loadProducts() {
    try {
        const { data, error } = await window.supabaseClient
            .from('productos')
            .select('*')
            .eq('estado', 'activo');

        if (error) throw error;
        
        products = data;
        renderProducts();
    } catch (error) {
        console.error('Error cargando productos:', error);
        productsGrid.innerHTML = '<p>Error al cargar el menú. Por favor, intenta más tarde.</p>';
    }
}

function renderProducts() {
    if (products.length === 0) {
        productsGrid.innerHTML = '<p>No hay productos disponibles por ahora.</p>';
        return;
    }

    productsGrid.innerHTML = '';
    
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.imagen || 'https://via.placeholder.com/300x200?text=Salchipapa'}" alt="${p.nombre}" class="product-img">
            <div class="product-info">
                <h3>${p.nombre}</h3>
                <p>${p.descripcion || ''}</p>
                <div class="product-price">S/ ${p.precio.toFixed(2)}</div>
                <div class="product-stock">Stock disponible: ${p.stock}</div>
                <button class="btn-add" onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''}>
                    ${p.stock > 0 ? 'AGREGAR AL CARRITO' : 'AGOTADO'}
                </button>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

function addToCart(productId) {
    if (!isBusinessOpen()) {
        document.getElementById('closed-modal').style.display = 'block';
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert('No hay suficiente stock disponible.');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            nombre: product.nombre,
            precio: product.precio,
            quantity: 1,
            stock: product.stock
        });
    }

    saveCart();
    updateCartUI();
    
    cartIcon.style.transform = 'scale(1.2)';
    setTimeout(() => cartIcon.style.transform = 'scale(1)', 200);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    
    if (newQuantity > item.stock) {
        alert('No hay suficiente stock disponible.');
        return;
    }
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else {
        item.quantity = newQuantity;
        saveCart();
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.innerText = totalItems;

    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
    } else {
        cart.forEach(item => {
            const subtotal = item.precio * item.quantity;
            total += subtotal;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p>S/ ${item.precio.toFixed(2)}</p>
                </div>
                <div class="cart-item-actions">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button class="btn-remove" onclick="removeFromCart('${item.id}')">🗑️</button>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });
    }

    cartSubtotal.innerText = `S/ ${total.toFixed(2)}`;
    cartTotal.innerText = `S/ ${total.toFixed(2)}`;
}

cartIcon.addEventListener('click', () => {
    cartModal.style.display = 'block';
});

btnMisPedidos.addEventListener('click', () => {
    loadMyOrders();
    ordersModal.style.display = 'block';
});

closeCart.addEventListener('click', () => {
    cartModal.style.display = 'none';
});

closeSuccess.addEventListener('click', () => {
    successModal.style.display = 'none';
});

closeOrders.addEventListener('click', () => {
    ordersModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.style.display = 'none';
    if (e.target === successModal) successModal.style.display = 'none';
    if (e.target === ordersModal) ordersModal.style.display = 'none';
    if (e.target.id === 'closed-modal') e.target.style.display = 'none';
});

async function loadMyOrders() {
    const myOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (myOrders.length === 0) {
        myOrdersContainer.innerHTML = '<p>Aún no has realizado ningún pedido desde este dispositivo.</p>';
        return;
    }

    // Lógica de Fidelización
    if (myOrders.length === 5) {
        const giftBanner = document.createElement('div');
        giftBanner.style.cssText = "background: #f1c40f; color: #000; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-weight: bold; text-align: center;";
        giftBanner.innerHTML = "🎁 ¡Felicidades! Este es tu 5to pedido. Pide tu porción de papas extra GRATIS al vendedor por WhatsApp.";
        myOrdersContainer.prepend(giftBanner);
    }

    myOrdersContainer.innerHTML = '<p>Actualizando estado...</p>';
    
    try {
        const orderIds = myOrders.map(o => o.id);
        const { data, error } = await window.supabaseClient
            .from('pedidos')
            .select('id, numero_pedido, estado, total, created_at')
            .in('id', orderIds)
            .order('created_at', { ascending: false });

        if (error) throw error;

        myOrdersContainer.innerHTML = '';
        data.forEach(order => {
            const card = document.createElement('div');
            card.className = 'my-order-card';
            
            const states = ['pendiente', 'aceptado', 'en_preparacion', 'enviado', 'entregado'];
            const stateLabels = ['Pendiente', 'Aceptado', 'En preparación', 'Enviado', 'Entregado'];
            const stateIcons = ['⏳', '📝', '🍳', '🚚', '✅'];
            
            let timelineHtml = '<div class="tracking-timeline">';
            
            if (order.estado === 'rechazado' || order.estado === 'cancelado') {
                timelineHtml += `<div class="tracking-step rejected"><span class="tracking-icon">❌</span> ${order.estado === 'rechazado' ? 'Rechazado por el negocio' : 'Cancelado'}</div>`;
            } else {
                let reachedCurrent = false;
                let currentIndex = states.indexOf(order.estado);
                if (currentIndex === -1) currentIndex = 0; 
                
                states.forEach((s, idx) => {
                    let statusClass = '';
                    let icon = '⬜';
                    if (idx < currentIndex) {
                        statusClass = 'completed';
                        icon = '✅';
                    } else if (idx === currentIndex) {
                        statusClass = 'current';
                        icon = stateIcons[idx];
                    }
                    
                    timelineHtml += `<div class="tracking-step ${statusClass}"><span class="tracking-icon">${icon}</span> ${stateLabels[idx]}</div>`;
                });
            }
            timelineHtml += '</div>';

            card.innerHTML = `
                <div class="my-order-header">
                    <span>Pedido #${String(order.numero_pedido).padStart(5, '0')}</span>
                    <span>S/ ${order.total.toFixed(2)}</span>
                </div>
                <div style="font-size: 0.85em; color: #a4b0be; margin-bottom: 15px;">
                    ${new Date(order.created_at).toLocaleString()}
                </div>
                ${timelineHtml}
            `;
            myOrdersContainer.appendChild(card);
        });

    } catch (err) {
        console.error('Error cargando mis pedidos:', err);
        myOrdersContainer.innerHTML = '<p>Error al cargar el estado de tus pedidos.</p>';
    }
}

let tempCheckoutEvent = null;

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isBusinessOpen()) {
        alert("Lo sentimos, ya hemos cerrado. ¡Te esperamos mañana desde las 6:00 PM!");
        return;
    }
    
    // Guardar el evento para procesarlo después del upselling
    tempCheckoutEvent = {
        nombre: document.getElementById('c-name').value,
        telefono: document.getElementById('c-phone').value,
        direccion: document.getElementById('c-address').value,
        metodo: document.getElementById('c-payment').value,
        observaciones: document.getElementById('c-notes').value
    };
    
    // Mostrar modal de upselling en vez de procesar directamente
    upsellModal.style.display = 'block';
});

// Eventos del modal de Upselling
btnUpsellNo.addEventListener('click', () => {
    upsellModal.style.display = 'none';
    processCheckout(false);
});

btnUpsellYes.addEventListener('click', () => {
    upsellModal.style.display = 'none';
    processCheckout(true);
});

async function processCheckout(addUpsell) {
    const { nombre, telefono, direccion, metodo, observaciones } = tempCheckoutEvent;
    
    btnCheckout.disabled = true;
    btnCheckout.innerText = 'PROCESANDO...';
    checkoutMsg.innerText = '';
    
    // Si aceptó el upselling, agregarlo al carrito temporalmente
    if (addUpsell) {
        cart.push({
            id: null,
            nombre: "Inka Cola (500ml)",
            precio: 3.00,
            quantity: 1,
            isUpsell: true
        });
    }

    let subtotal = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);

    try {
        const detalles = cart.map(item => {
            if (item.isUpsell) {
                return null;
            }
            return {
                producto_id: item.id,
                cantidad: item.quantity,
                precio_unitario: item.precio,
                subtotal: item.precio * item.quantity
            };
        }).filter(item => item !== null);

        // Si aceptó el upsell, lo agregamos a observaciones para que el vendedor lo sepa
        let finalObservaciones = observaciones;
        if (addUpsell) {
            finalObservaciones += (finalObservaciones ? " | " : "") + "✅ + INKA COLA 500ml (Upsell)";
        }

        const { data: pedidoData, error: rpcError } = await window.supabaseClient.rpc('procesar_pedido', {
            p_cliente_nombre: nombre,
            p_telefono: telefono,
            p_direccion: direccion,
            p_metodo_pago: metodo,
            p_observaciones: finalObservaciones,
            p_subtotal: subtotal,
            p_total: subtotal,
            p_detalles: detalles
        });

        if (rpcError) throw rpcError;

        const numPedido = pedidoData.numero_pedido;

        let wpMsg = `🛒 *NUEVO PEDIDO #${String(numPedido).padStart(5, '0')}*%0A%0A`;
        wpMsg += `👤 *Cliente:* ${nombre}%0A`;
        wpMsg += `📱 *Teléfono:* ${telefono}%0A`;
        wpMsg += `📍 *Dirección:* ${direccion}%0A`;
        wpMsg += `💳 *Pago:* ${metodo}%0A%0A`;
        
        cart.forEach(item => {
            wpMsg += `- ${item.quantity}x ${item.nombre} (S/ ${(item.precio * item.quantity).toFixed(2)})%0A`;
        });

        if (finalObservaciones) wpMsg += `%0A📝 *Obs:* ${finalObservaciones}%0A`;
        wpMsg += `%0A💰 *TOTAL:* S/ ${subtotal.toFixed(2)}`;
        wpMsg += `%0A📌 *Estado:* PENDIENTE%0A`;

        const wpUrl = `https://api.whatsapp.com/send?phone=${CONFIG.BUSINESS_PHONE}&text=${wpMsg}`;
        
        cartModal.style.display = 'none';
        
        const myOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
        myOrders.unshift({ id: pedidoData.id, numero_pedido: numPedido });
        localStorage.setItem('my_orders', JSON.stringify(myOrders));
        
        cart = [];
        saveCart();
        updateCartUI();
        loadProducts(); 

        successOrderId.innerText = `#${String(numPedido).padStart(5, '0')}`;
        whatsappLink.href = wpUrl;
        successModal.style.display = 'block';

    } catch (error) {
        console.error('Error al realizar pedido:', error);
        checkoutMsg.innerText = 'No se pudo registrar el pedido. Inténtalo nuevamente.';
    } finally {
        btnCheckout.disabled = false;
        btnCheckout.innerText = 'REALIZAR PEDIDO';
    }
}
