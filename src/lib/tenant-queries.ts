import { supabase } from "./supabase";

/**
 * Helper centralizado para queries filtradas por tenant_id.
 * Evita repetição de .eq('tenant_id', tenantId) em todo o código.
 */

/** SELECT filtrado por tenant */
export const tenantSelect = (table: string, tenantId: string, columns = "*") => {
  return supabase.from(table).select(columns).eq("tenant_id", tenantId);
};

/** INSERT com tenant_id incluso automaticamente */
export const tenantInsert = (table: string, tenantId: string, data: Record<string, any> | Record<string, any>[]) => {
  if (Array.isArray(data)) {
    return supabase.from(table).insert(data.map((item) => ({ ...item, tenant_id: tenantId })));
  }
  return supabase.from(table).insert({ ...data, tenant_id: tenantId });
};

/** UPSERT com tenant_id incluso automaticamente */
export const tenantUpsert = (
  table: string,
  tenantId: string,
  data: Record<string, any> | Record<string, any>[],
  options?: { onConflict?: string }
) => {
  if (Array.isArray(data)) {
    return supabase.from(table).upsert(
      data.map((item) => ({ ...item, tenant_id: tenantId })),
      options
    );
  }
  return supabase.from(table).upsert({ ...data, tenant_id: tenantId }, options);
};

/** UPDATE filtrado por tenant (retorna o builder para encadear .eq('id', ...) etc.) */
export const tenantUpdate = (table: string, tenantId: string, data: Record<string, any>) => {
  return supabase.from(table).update(data).eq("tenant_id", tenantId);
};

/** DELETE filtrado por tenant (retorna o builder para encadear .eq('id', ...) etc.) */
export const tenantDelete = (table: string, tenantId: string) => {
  return supabase.from(table).delete().eq("tenant_id", tenantId);
};

/**
 * Buscar store_settings pelo tenant_id.
 * Substitui a query antiga .eq("id", 1).single()
 */
export const fetchTenantSettings = async (tenantId: string) => {
  return supabase
    .from("store_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();
};

/**
 * Atualizar store_settings pelo tenant_id.
 * Substitui a query antiga .eq("id", 1)
 */
export const updateTenantSettings = async (tenantId: string, data: Record<string, any>) => {
  return supabase
    .from("store_settings")
    .update(data)
    .eq("tenant_id", tenantId);
};

/**
 * Verificar se o usuário logado é admin de um tenant específico.
 */
export const checkTenantAdmin = async (tenantId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  return !error && !!data;
};

/**
 * Verificar se o usuário logado é master admin.
 */
export const checkMasterAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("master_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  return !error && !!data;
};
