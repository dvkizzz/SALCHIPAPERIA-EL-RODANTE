-- Habilitar la extensión uuid-ossp si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLA: productos
-- ==========================================
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    imagen TEXT,
    estado TEXT DEFAULT 'activo', -- activo, inactivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- TABLA: pedidos
-- ==========================================
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pedido SERIAL,
    cliente_nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT,
    metodo_pago TEXT NOT NULL,
    observaciones TEXT,
    subtotal DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    estado TEXT DEFAULT 'pendiente', -- pendiente, aceptado, en_preparacion, enviado, entregado, rechazado, cancelado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- TABLA: detalle_pedidos
-- ==========================================
CREATE TABLE detalle_pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    variante TEXT, -- ej. Talla M
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- TABLA: notificaciones
-- ==========================================
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- ej. nuevo_pedido
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para productos
CREATE POLICY "Permitir lectura de productos a todos" ON productos FOR SELECT USING (true);
CREATE POLICY "Permitir modificaciones a vendedores" ON productos FOR ALL USING (auth.role() = 'authenticated');

-- 2. Políticas para pedidos
CREATE POLICY "Permitir crear pedidos a invitados" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura y actualización a vendedores" ON pedidos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir actualización de pedidos a vendedores" ON pedidos FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Políticas para detalle_pedidos
CREATE POLICY "Permitir crear detalles a invitados" ON detalle_pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura y actualización de detalles a vendedores" ON detalle_pedidos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir actualización de detalles a vendedores" ON detalle_pedidos FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Políticas para notificaciones
CREATE POLICY "Permitir crear notificaciones a invitados" ON notificaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura de notificaciones a vendedores" ON notificaciones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir actualización de notificaciones a vendedores" ON notificaciones FOR UPDATE USING (auth.role() = 'authenticated');

-- ==========================================
-- FUNCIÓN RPC PARA PROCESAR PEDIDO SEGURO
-- ==========================================
-- Esta función permite a un invitado insertar el pedido, los detalles, 
-- actualizar el stock y crear la notificación en una sola transacción
-- sin ser bloqueado por el RLS (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION procesar_pedido(
    p_cliente_nombre TEXT,
    p_telefono TEXT,
    p_direccion TEXT,
    p_metodo_pago TEXT,
    p_observaciones TEXT,
    p_subtotal DECIMAL,
    p_total DECIMAL,
    p_detalles JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id UUID;
    v_numero_pedido INTEGER;
    v_item JSONB;
BEGIN
    -- 1. Insertar el pedido y obtener el ID y Número
    INSERT INTO pedidos (cliente_nombre, telefono, direccion, metodo_pago, observaciones, subtotal, total, estado)
    VALUES (p_cliente_nombre, p_telefono, p_direccion, p_metodo_pago, p_observaciones, p_subtotal, p_total, 'pendiente')
    RETURNING id, numero_pedido INTO v_pedido_id, v_numero_pedido;

    -- 2. Recorrer los detalles (carrito)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        -- Insertar el detalle del producto
        INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (
            v_pedido_id, 
            (v_item->>'producto_id')::uuid, 
            (v_item->>'cantidad')::int, 
            (v_item->>'precio_unitario')::decimal, 
            (v_item->>'subtotal')::decimal
        );

        -- Restar el stock del producto
        UPDATE productos 
        SET stock = stock - (v_item->>'cantidad')::int
        WHERE id = (v_item->>'producto_id')::uuid;
    END LOOP;

    -- 3. Crear la notificación para el vendedor
    INSERT INTO notificaciones (pedido_id, tipo, titulo, mensaje)
    VALUES (v_pedido_id, 'nuevo_pedido', '🔔 NUEVO PEDIDO', 'Se ha recibido el pedido #' || LPAD(v_numero_pedido::text, 5, '0') || ' de ' || p_cliente_nombre);

    -- 4. Retornar el número de pedido generado
    RETURN jsonb_build_object(
        'id', v_pedido_id,
        'numero_pedido', v_numero_pedido
    );
END;
$$;

-- ==========================================
-- REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
