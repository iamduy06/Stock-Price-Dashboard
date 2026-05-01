CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 100000000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stocks (
    symbol VARCHAR(10) PRIMARY KEY, 
    company_name VARCHAR(255) NOT NULL, 
    reference_price NUMERIC(10, 2) NOT NULL, 
    ceiling_price NUMERIC(10, 2) NOT NULL, 
    floor_price NUMERIC(10, 2) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    quantity INT DEFAULT 0 CHECK (quantity >= 0), 
    average_price NUMERIC(10, 2) DEFAULT 0, 
    UNIQUE(user_id, symbol) 
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('BUY', 'SELL')),
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL, 
    total_value NUMERIC(15, 2) NOT NULL, 
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.price_history (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    timeframe VARCHAR(5) NOT NULL, 
    open NUMERIC(10, 2),
    high NUMERIC(10, 2),
    low NUMERIC(10, 2),
    close NUMERIC(10, 2),
    volume INT DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);




DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_portfolio_user') THEN
        ALTER TABLE public.portfolios ADD CONSTRAINT fk_portfolio_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_portfolio_stock') THEN
        ALTER TABLE public.portfolios ADD CONSTRAINT fk_portfolio_stock FOREIGN KEY (symbol) REFERENCES public.stocks(symbol);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_user') THEN
        ALTER TABLE public.orders ADD CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES public.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_stock') THEN
        ALTER TABLE public.orders ADD CONSTRAINT fk_order_stock FOREIGN KEY (symbol) REFERENCES public.stocks(symbol);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_history_stock') THEN
        ALTER TABLE public.price_history ADD CONSTRAINT fk_history_stock FOREIGN KEY (symbol) REFERENCES public.stocks(symbol);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_watchlist_user') THEN
        ALTER TABLE public.watchlists ADD CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_watchlist_stock') THEN
        ALTER TABLE public.watchlists ADD CONSTRAINT fk_watchlist_stock FOREIGN KEY (symbol) REFERENCES public.stocks(symbol);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portfolio_user_lookup ON public.portfolios (user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_chart_data ON public.price_history (symbol, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_time_history ON public.orders (user_id, created_at DESC);



CREATE OR REPLACE FUNCTION place_order_atomic(
    p_user_id UUID,
    p_symbol VARCHAR,
    p_type VARCHAR,
    p_quantity INT,
    p_price NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_total_value NUMERIC;
    v_balance NUMERIC;
    v_existing_qty INT;
    v_existing_avg NUMERIC;
    v_new_qty INT;
    v_new_avg NUMERIC;
    v_portfolio_id UUID;
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

        SELECT id, quantity, average_price INTO v_portfolio_id, v_existing_qty, v_existing_avg 
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
        'success', true, 
        'message', 'Order placed successfully', 
        'price', p_price, 
        'total_value', v_total_value
    );
END;
$$ LANGUAGE plpgsql;
