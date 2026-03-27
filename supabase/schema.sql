-- ============================================================
-- Supabase schema para LOJIT — Multi-Tenant
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

-- ============================================================
-- TENANTS (lojas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  max_products INTEGER DEFAULT 50,
  custom_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MASTER ADMINS (super administradores da plataforma)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.master_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'master' CHECK (role IN ('master', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.master_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNÇÕES HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_tenant_id(p_slug TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.tenants WHERE slug = p_slug AND active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.master_admins
    WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Função Master para Criar/Vincular Lojista
CREATE OR REPLACE FUNCTION public.master_create_lojista(
  p_email TEXT,
  p_password TEXT,
  p_tenant_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Apenas Master Admins
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Master Admins podem realizar esta operação.';
  END IF;

  -- 1. Buscar usuário existente no auth.users por e-mail
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Nota: A criação direta no auth.users via SQL requer extensões como supabase_auth_admin.
    -- Para evitar complexidade, o Master Panel deve lidar com o cadastro Auth via SDK
    -- ou a função deve ser chamada quando o usuário já houver sido criado no Auth.
    RAISE EXCEPTION 'Usuário "%" não encontrado em nossa base de autenticação central.', p_email;
  END IF;

  -- 2. Vincular na tabela public.admins
  -- Aqui você pode optar por salvar email/pass por conveniência na gestão Master
  INSERT INTO public.admins (user_id, tenant_id, email, password)
  VALUES (v_user_id, p_tenant_id, p_email, p_password)
  ON CONFLICT (user_id, tenant_id) DO UPDATE 
  SET email = EXCLUDED.email, password = EXCLUDED.password;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CATEGORIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_category_per_tenant UNIQUE (name, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PRODUTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image TEXT,
  "publicId" TEXT,
  image2 TEXT,
  "publicId2" TEXT,
  image3 TEXT,
  "publicId3" TEXT,
  sizes TEXT[] NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  "stockBySize" JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  category_id BIGINT REFERENCES public.categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Função para calcular estoque total a partir do stockBySize
CREATE OR REPLACE FUNCTION public.compute_stock_from_stock_by_size()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."stockBySize" IS NOT NULL THEN
    NEW.stock := (
      SELECT COALESCE(SUM((value)::text::integer), 0)
      FROM jsonb_each(NEW."stockBySize")
    );
  ELSE
    NEW.stock := COALESCE(NEW.stock, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_compute_stock ON public.products;
CREATE TRIGGER trg_products_compute_stock
BEFORE INSERT OR UPDATE OF "stockBySize" ON public.products
FOR EACH ROW EXECUTE FUNCTION public.compute_stock_from_stock_by_size();

-- ============================================================
-- ADMINS (vincula user ao tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_admins_tenant ON public.admins(tenant_id);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TAMANHOS GLOBAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sizes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_size_per_tenant UNIQUE (name, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_sizes_tenant ON public.sizes(tenant_id);
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PEDIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  itens JSONB NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0),
  status TEXT NOT NULL CHECK (status IN ('pendente','concluido','cancelado','devolvido','parcialmente_devolvido')),
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON public.pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_criacao ON public.pedidos(data_criacao DESC);
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('concluir','cancelar')),
  actor_id UUID,
  actor_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_pedido_id ON public.audit_logs(pedido_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_telefone_per_tenant UNIQUE (telefone, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON public.clientes(tenant_id);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CORES (Catálogo por Tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.colors (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_color_per_tenant UNIQUE (name, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_colors_tenant ON public.colors(tenant_id);
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CONFIGURAÇÕES DA LOJA (POR TENANT)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL DEFAULT 'Minha Loja',
  logo_url TEXT,
  address TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  hero_phrase TEXT DEFAULT 'Bem-vindo à nossa loja!',
  hero_title_l1 TEXT DEFAULT 'BEM-VINDO',
  hero_title_l2 TEXT DEFAULT 'À NOSSA',
  hero_title_l3 TEXT DEFAULT 'LOJA',
  instagram_url TEXT DEFAULT '',
  about_us TEXT DEFAULT '',
  footer_info TEXT DEFAULT '',
  primary_color TEXT DEFAULT '0 100% 50%',
  secondary_color TEXT DEFAULT '142 100% 50%',
  background_color TEXT DEFAULT '0 0% 5%',
  background_url TEXT,
  font_family TEXT DEFAULT 'Inter',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS — MULTI-TENANT
-- ============================================================

-- TENANTS
CREATE POLICY "Public read active tenants" ON public.tenants FOR SELECT USING (active = true);
CREATE POLICY "Master insert tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (public.is_master_admin());
CREATE POLICY "Master update tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());
CREATE POLICY "Master delete tenants" ON public.tenants FOR DELETE TO authenticated USING (public.is_master_admin());

-- MASTER ADMINS
CREATE POLICY "Master read self" ON public.master_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- PRODUCTS
CREATE POLICY "Tenant public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Tenant admins insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins update products" ON public.products FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin()) WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins delete products" ON public.products FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- CATEGORIES
CREATE POLICY "Tenant public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Tenant admins insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins update categories" ON public.categories FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin()) WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins delete categories" ON public.categories FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- SIZES
CREATE POLICY "Tenant public read sizes" ON public.sizes FOR SELECT USING (true);
CREATE POLICY "Tenant admins insert sizes" ON public.sizes FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins update sizes" ON public.sizes FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin()) WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins delete sizes" ON public.sizes FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- PEDIDOS
CREATE POLICY "Tenant public insert pedidos" ON public.pedidos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Tenant admins select pedidos" ON public.pedidos FOR SELECT TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins update pedidos" ON public.pedidos FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin()) WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins delete pedidos" ON public.pedidos FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- CLIENTES
CREATE POLICY "Tenant public insert clientes" ON public.clientes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Tenant admins select clientes" ON public.clientes FOR SELECT TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins update clientes" ON public.clientes FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin()) WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins delete clientes" ON public.clientes FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- AUDIT LOGS
CREATE POLICY "Tenant admins insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Tenant admins select audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ADMINS
CREATE POLICY "Tenant admins read self" ON public.admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Master manage admins" ON public.admins FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());

-- COLORS
CREATE POLICY "Tenant public read colors" ON public.colors FOR SELECT USING (true);
CREATE POLICY "Tenant admins manage colors" ON public.colors FOR ALL TO authenticated 
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- STORE SETTINGS
CREATE POLICY "Tenant public read settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Tenant admins update settings" ON public.store_settings FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin()) WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());
CREATE POLICY "Master insert settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (public.is_master_admin() OR public.is_tenant_admin(tenant_id));