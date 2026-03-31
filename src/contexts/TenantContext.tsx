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
  max_photos_per_product: number;
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
 * Lógica robusta para extração de subdomínio
 */
function extractSlugFromHostname(hostname: string): string {
  const parts = hostname.split(".");
  const defaultSlug = import.meta.env.VITE_DEFAULT_TENANT_SLUG || "lojit";

  // Desenvolvimento local (localhost:5173 ou 127.0.0.1)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return defaultSlug;
  }

  // Tratamento para Vercel Preview ou Localhost com subdomínio (loja1.localhost)
  if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
      return parts[0] === 'www' ? defaultSlug : parts[0];
  }

  // Caso lojit.com.br (domínio raiz)
  if (hostname === "lojit.com.br" || hostname === "www.lojit.com.br") {
      return defaultSlug;
  }

  // Caso subdomínio: loja.lojit.com.br ou loja.lojit.com
  // Se o hostname termina com lojit.com.br, o que vem antes é o slug
  if (hostname.endsWith(".lojit.com.br")) {
    const slug = hostname.replace(".lojit.com.br", "");
    return slug || defaultSlug;
  }

  // Fallback geral: pega a primeira parte se houver mais de um ponto
  if (parts.length >= 2) {
      const subdomain = parts[0];
      return subdomain === 'www' ? defaultSlug : subdomain;
  }

  return defaultSlug;
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hostname = window.location.hostname;
  const slug = extractSlugFromHostname(hostname);
  const isMaster = slug === "master";

  useEffect(() => {
    const resolveTenant = async () => {
      setLoading(true);
      setError(null);

      // 1. Painel Master não precisa buscar tenant no banco
      if (isMaster) {
        setLoading(false);
        return;
      }

      try {
        // 2. Tentar buscar pelo Slug Primeiro
        let query = supabase
          .from("tenants")
          .select("*");

        // Se o hostname for diferente do padrão lojit, pode ser um domínio customizado
        if (!hostname.endsWith("lojit.com.br") && hostname !== "localhost") {
             query = query.or(`slug.eq.${slug},custom_domain.eq.${hostname}`);
        } else {
             query = query.eq("slug", slug);
        }

        const { data, error: fetchError } = await query.maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError(`A loja "${slug}" não foi encontrada.`);
          setTenant(null);
        } else {
          setTenant(data as Tenant);
        }
      } catch (e: any) {
        console.error("Erro crítico ao resolver tenant:", e);
        setError("Falha na conexão com o servidor. Verifique sua rede.");
      } finally {
        setLoading(false);
      }
    };

    resolveTenant();
  }, [slug, isMaster, hostname]);

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
