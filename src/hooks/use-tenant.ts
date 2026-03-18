import { useTenantContext } from "@/contexts/TenantContext";

/**
 * Hook simplificado para acessar informações do tenant atual.
 * 
 * Uso:
 * const { tenantId, tenantSlug, isMaster, loading } = useTenant();
 */
export const useTenant = () => {
  const { tenant, tenantId, tenantSlug, isMaster, loading, error } = useTenantContext();

  return {
    /** Objeto completo do tenant */
    tenant,
    /** UUID do tenant atual (null se master ou não resolvido) */
    tenantId,
    /** Slug do subdomínio (ex: "lojit", "loja1") */
    tenantSlug,
    /** True se estamos no painel master (master.dominio.com) */
    isMaster,
    /** True enquanto está resolvendo o tenant */
    loading,
    /** Mensagem de erro se o tenant não foi encontrado */
    error,
    /** True se o tenant foi resolvido com sucesso e está ativo */
    isReady: !loading && !error && !!tenantId,
  };
};
