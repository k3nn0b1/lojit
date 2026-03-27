-- ============================================================
-- MIGRAÇÃO MULTI-TENANT — LOJIT
-- Execute este script no SQL Editor do Supabase
-- ATENÇÃO: Faça backup antes de executar!
-- ============================================================

-- ============================================================
-- PARTE 1: Criar tabela de tenants
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,             -- ex: "lojit" → lojit.seudominio.com.br
  name TEXT NOT NULL,                    -- Nome da loja exibido
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  max_products INTEGER DEFAULT 50,
  custom_domain TEXT,                    -- ex: "www.minhaloja.com" (uso futuro)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 2: Criar tabela de master admins (super administradores)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.master_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'master' CHECK (role IN ('master', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.master_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master read self"
  ON public.master_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- PARTE 3: Adicionar tenant_id em TODAS as tabelas existentes
-- (DEVE vir ANTES das funções que referenciam essas colunas!)
-- ============================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.sizes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password TEXT;

-- PARTE 3.1: Criar tabela de cores (Colors)
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sizes_tenant ON public.sizes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON public.pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON public.clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admins_tenant ON public.admins(tenant_id);

-- ============================================================
-- PARTE 4: Funções helper
-- (Agora admins.tenant_id já existe!)
-- ============================================================

-- Buscar tenant_id a partir do slug (subdomínio)
CREATE OR REPLACE FUNCTION public.get_tenant_id(p_slug TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.tenants WHERE slug = p_slug AND active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar se o user logado é admin de um tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar se é master admin
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
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Master Admins podem realizar esta operação.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário "%" não encontrado na base Auth.', p_email;
  END IF;

  INSERT INTO public.admins (user_id, tenant_id, email, password)
  VALUES (v_user_id, p_tenant_id, p_email, p_password)
  ON CONFLICT (user_id, tenant_id) DO UPDATE 
  SET email = EXCLUDED.email, password = EXCLUDED.password;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PARTE 5: Alterar store_settings para multi-tenant
-- ============================================================

-- Remover constraints de single-row
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS single_row;
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_id_check;

-- Adicionar tenant_id
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ============================================================
-- PARTE 6: Criar o primeiro tenant e migrar dados existentes
-- ============================================================

-- Inserir seu tenant atual
INSERT INTO public.tenants (slug, name, active, plan, max_products)
VALUES ('lojit', 'Lojit Store', true, 'pro', 999)
ON CONFLICT (slug) DO NOTHING;

-- Atualizar TODOS os registros existentes com o tenant_id do lojit
UPDATE public.products SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;
UPDATE public.categories SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;
UPDATE public.sizes SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;
UPDATE public.pedidos SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;
UPDATE public.clientes SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;
UPDATE public.audit_logs SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;
UPDATE public.admins SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;
UPDATE public.store_settings SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lojit') WHERE tenant_id IS NULL;

-- ============================================================
-- PARTE 7: Tornar tenant_id NOT NULL (após migração)
-- ============================================================

ALTER TABLE public.products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sizes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.pedidos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.admins ALTER COLUMN tenant_id SET NOT NULL;

-- Store settings: tornar tenant_id NOT NULL e criar unique constraint
ALTER TABLE public.store_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_tenant_unique UNIQUE (tenant_id);

-- ============================================================
-- PARTE 8: Atualizar TODAS as políticas RLS
-- ============================================================

-- ---- TENANTS ----
DROP POLICY IF EXISTS "Public read active tenants" ON public.tenants;
CREATE POLICY "Public read active tenants"
  ON public.tenants FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Master insert tenants" ON public.tenants;
CREATE POLICY "Master insert tenants"
  ON public.tenants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master_admin());

DROP POLICY IF EXISTS "Master update tenants" ON public.tenants;
CREATE POLICY "Master update tenants"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

DROP POLICY IF EXISTS "Master delete tenants" ON public.tenants;
CREATE POLICY "Master delete tenants"
  ON public.tenants FOR DELETE
  TO authenticated
  USING (public.is_master_admin());

-- ---- PRODUCTS ----
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Admins insert products" ON public.products;
DROP POLICY IF EXISTS "Admins update products" ON public.products;
DROP POLICY IF EXISTS "Admins delete products" ON public.products;
DROP POLICY IF EXISTS "Tenant public read products" ON public.products;
DROP POLICY IF EXISTS "Tenant admins insert products" ON public.products;
DROP POLICY IF EXISTS "Tenant admins update products" ON public.products;
DROP POLICY IF EXISTS "Tenant admins delete products" ON public.products;

CREATE POLICY "Tenant public read products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Tenant admins insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin())
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ---- CATEGORIES ----
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "Admins insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins delete categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant public read categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant admins insert categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant admins update categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant admins delete categories" ON public.categories;

CREATE POLICY "Tenant public read categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Tenant admins insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin())
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ---- SIZES ----
DROP POLICY IF EXISTS "Public read sizes" ON public.sizes;
DROP POLICY IF EXISTS "Admins insert sizes" ON public.sizes;
DROP POLICY IF EXISTS "Admins update sizes" ON public.sizes;
DROP POLICY IF EXISTS "Admins delete sizes" ON public.sizes;
DROP POLICY IF EXISTS "Tenant public read sizes" ON public.sizes;
DROP POLICY IF EXISTS "Tenant admins insert sizes" ON public.sizes;
DROP POLICY IF EXISTS "Tenant admins update sizes" ON public.sizes;
DROP POLICY IF EXISTS "Tenant admins delete sizes" ON public.sizes;

CREATE POLICY "Tenant public read sizes"
  ON public.sizes FOR SELECT
  USING (true);

CREATE POLICY "Tenant admins insert sizes"
  ON public.sizes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins update sizes"
  ON public.sizes FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin())
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins delete sizes"
  ON public.sizes FOR DELETE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ---- PEDIDOS ----
DROP POLICY IF EXISTS "Public insert pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Admins select pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Admins update pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Admins delete pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Tenant public insert pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Tenant admins select pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Tenant admins update pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Tenant admins delete pedidos" ON public.pedidos;

CREATE POLICY "Tenant public insert pedidos"
  ON public.pedidos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Tenant admins select pedidos"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins update pedidos"
  ON public.pedidos FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin())
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins delete pedidos"
  ON public.pedidos FOR DELETE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ---- CLIENTES ----
DROP POLICY IF EXISTS "Public insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins select clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Tenant public insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Tenant admins select clientes" ON public.clientes;
DROP POLICY IF EXISTS "Tenant admins update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Tenant admins delete clientes" ON public.clientes;

CREATE POLICY "Tenant public insert clientes"
  ON public.clientes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Tenant admins select clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins update clientes"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin())
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins delete clientes"
  ON public.clientes FOR DELETE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ---- AUDIT_LOGS ----
DROP POLICY IF EXISTS "Admins insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins select audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tenant admins insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tenant admins select audit_logs" ON public.audit_logs;

CREATE POLICY "Tenant admins insert audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

CREATE POLICY "Tenant admins select audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ---- ADMINS ----
DROP POLICY IF EXISTS "Admins read self" ON public.admins;
DROP POLICY IF EXISTS "Tenant admins read self" ON public.admins;

CREATE POLICY "Tenant admins read self"
  ON public.admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Master manage admins"
  ON public.admins FOR ALL
  TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- ---- COLORS ----
DROP POLICY IF EXISTS "Tenant public read colors" ON public.colors;
CREATE POLICY "Tenant public read colors" ON public.colors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tenant admins manage colors" ON public.colors;
CREATE POLICY "Tenant admins manage colors" ON public.colors FOR ALL TO authenticated 
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- ---- STORE_SETTINGS ----
DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins update settings" ON public.store_settings;
DROP POLICY IF EXISTS "Tenant public read settings" ON public.store_settings;
DROP POLICY IF EXISTS "Tenant admins update settings" ON public.store_settings;

CREATE POLICY "Tenant public read settings"
  ON public.store_settings FOR SELECT
  USING (true);

CREATE POLICY "Tenant admins update settings"
  ON public.store_settings FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_master_admin())
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_master_admin());

-- Permitir master inserir settings para novos tenants
DROP POLICY IF EXISTS "Master insert settings" ON public.store_settings;
CREATE POLICY "Master insert settings"
  ON public.store_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master_admin() OR public.is_tenant_admin(tenant_id));

-- ============================================================
-- PARTE 9: Verificação final
-- ============================================================

-- Rode estas queries para confirmar que tudo está correto:

-- 1. Verificar que o tenant foi criado:
-- SELECT * FROM public.tenants;

-- 2. Verificar que todos os produtos têm tenant_id:
-- SELECT COUNT(*) as sem_tenant FROM public.products WHERE tenant_id IS NULL;

-- 3. Verificar store_settings:
-- SELECT tenant_id, store_name FROM public.store_settings;

-- ============================================================
-- PARTE 10: Inserir-se como master admin
-- (ATENÇÃO: Substitua pelo seu UUID real do auth.users!)
-- 
-- Para descobrir seu UUID, rode:
-- SELECT id, email FROM auth.users;
--
-- Depois insira:
-- INSERT INTO public.master_admins (user_id, role)
-- VALUES ('SEU-UUID-AQUI', 'master');
-- ============================================================
