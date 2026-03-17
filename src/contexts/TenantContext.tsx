import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  owner_id: string | null;
  active: boolean;
  plan: string;
  max_products: number;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  tenantSlug: string | null;
  isMaster: boolean;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * Extrai o slug do subdomínio a partir do hostname.
 * 
 * Exemplos:
 * - "loja1.fut75.com.br"     → "loja1"
 * - "master.fut75.com.br"    → "master"
 * - "localhost"               → usa VITE_DEFAULT_TENANT_SLUG ou "fut75"
 * - "loja1.localhost"         → "loja1"
 * - "fut75.com.br"           → usa VITE_DEFAULT_TENANT_SLUG ou "fut75"
 * - "www.fut75.com.br"       → usa VITE_DEFAULT_TENANT_SLUG ou "fut75"
 */
function extractSlugFromHostname(hostname: string): string {
  const defaultSlug = import.meta.env.VITE_DEFAULT_TENANT_SLUG || "fut75";

  // Desenvolvimento local: localhost sem subdomínio
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return defaultSlug;
  }

  // Desenvolvimento local com subdomínio: loja1.localhost
  if (hostname.endsWith(".localhost")) {
    const slug = hostname.replace(".localhost", "");
    return slug || defaultSlug;
  }

  // Produção: extrair primeira parte do hostname
  const parts = hostname.split(".");

  // Se tem 3+ partes (ex: loja1.fut75.com.br → ["loja1","fut75","com","br"])
  // A primeira parte é o subdomínio
  if (parts.length >= 3) {
    const subdomain = parts[0];

    // "www" não é um tenant, é o principal
    if (subdomain === "www") {
      return defaultSlug;
    }

    return subdomain;
  }

  // Se tem 2 partes (ex: fut75.com.br) → é o domínio raiz
  return defaultSlug;
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = extractSlugFromHostname(window.location.hostname);
  const isMaster = slug === "master";

  useEffect(() => {
    const resolveTenant = async () => {
      // Se é o painel master, não precisa resolver tenant
      if (isMaster) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", slug)
          .eq("active", true)
          .single();

        if (fetchError || !data) {
          console.error("Tenant não encontrado para slug:", slug, fetchError);
          setError(`Loja "${slug}" não encontrada ou está inativa.`);
          setTenant(null);
        } else {
          setTenant(data as Tenant);
          setError(null);
        }
      } catch (e) {
        console.error("Erro ao resolver tenant:", e);
        setError("Erro ao carregar informações da loja.");
      } finally {
        setLoading(false);
      }
    };

    resolveTenant();
  }, [slug, isMaster]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id || null,
        tenantSlug: slug,
        isMaster,
        loading,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return context;
};
