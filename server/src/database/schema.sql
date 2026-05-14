DROP FUNCTION IF EXISTS place_order_atomic CASCADE;
DROP TABLE IF EXISTS public.watchlists  CASCADE;
DROP TABLE IF EXISTS public.orders      CASCADE;
DROP TABLE IF EXISTS public.portfolios  CASCADE;
DROP TABLE IF EXISTS public.price_history CASCADE;
DROP TABLE IF EXISTS public.stocks      CASCADE;
DROP TABLE IF EXISTS public.users       CASCADE;

CREATE TABLE public.users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance       NUMERIC(15, 2) DEFAULT 100000000.00,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.portfolios (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symbol        VARCHAR(20) NOT NULL,
    quantity      INT DEFAULT 0 CHECK (quantity >= 0),
    average_price NUMERIC(15, 4) DEFAULT 0,
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_portfolio_user ON public.portfolios (user_id);

CREATE TABLE public.orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id),
    symbol      VARCHAR(20) NOT NULL,
    type        VARCHAR(10) CHECK (type IN ('BUY', 'SELL')),
    quantity    INT NOT NULL CHECK (quantity > 0),
    price       NUMERIC(15, 4) NOT NULL,
    total_value NUMERIC(15, 2) NOT NULL,
    status      VARCHAR(20) DEFAULT 'COMPLETED',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_user_time ON public.orders (user_id, created_at DESC);

CREATE TABLE public.watchlists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symbol     VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Executes a BUY or SELL atomically: updates balance, portfolio, and inserts order record.
-- Returns JSONB with success flag, price, total_value, and new_balance.
CREATE OR REPLACE FUNCTION place_order_atomic(
    p_user_id   UUID,
    p_symbol    VARCHAR,
    p_type      VARCHAR,
    p_quantity  INT,
    p_price     NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_total_value   NUMERIC;
    v_balance       NUMERIC;
    v_new_balance   NUMERIC;
    v_existing_qty  INT;
    v_existing_avg  NUMERIC;
    v_new_qty       INT;
    v_new_avg       NUMERIC;
    v_portfolio_id  UUID;
BEGIN
    v_total_value := p_price * p_quantity;

    SELECT balance INTO v_balance FROM public.users WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    IF p_type = 'BUY' THEN
        IF v_balance < v_total_value THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
        END IF;

        UPDATE public.users SET balance = balance - v_total_value WHERE id = p_user_id;
        v_new_balance := v_balance - v_total_value;

        SELECT id, quantity, average_price
        INTO v_portfolio_id, v_existing_qty, v_existing_avg
        FROM public.portfolios WHERE user_id = p_user_id AND symbol = p_symbol FOR UPDATE;

        IF FOUND THEN
            v_new_qty := v_existing_qty + p_quantity;
            v_new_avg := (v_existing_avg * v_existing_qty + v_total_value) / v_new_qty;
            UPDATE public.portfolios SET quantity = v_new_qty, average_price = v_new_avg WHERE id = v_portfolio_id;
        ELSE
            INSERT INTO public.portfolios (user_id, symbol, quantity, average_price)
            VALUES (p_user_id, p_symbol, p_quantity, p_price);
        END IF;

    ELSIF p_type = 'SELL' THEN
        SELECT id, quantity INTO v_portfolio_id, v_existing_qty
        FROM public.portfolios WHERE user_id = p_user_id AND symbol = p_symbol FOR UPDATE;

        IF NOT FOUND OR v_existing_qty < p_quantity THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock quantity');
        END IF;

        UPDATE public.users SET balance = balance + v_total_value WHERE id = p_user_id;
        v_new_balance := v_balance + v_total_value;

        v_new_qty := v_existing_qty - p_quantity;
        IF v_new_qty = 0 THEN
            DELETE FROM public.portfolios WHERE id = v_portfolio_id;
        ELSE
            UPDATE public.portfolios SET quantity = v_new_qty WHERE id = v_portfolio_id;
        END IF;

    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid order type');
    END IF;

    INSERT INTO public.orders (user_id, symbol, type, quantity, price, total_value, status)
    VALUES (p_user_id, p_symbol, p_type, p_quantity, p_price, v_total_value, 'COMPLETED');

    RETURN jsonb_build_object(
        'success',     true,
        'message',     'Order placed successfully',
        'price',       p_price,
        'total_value', v_total_value,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql;
