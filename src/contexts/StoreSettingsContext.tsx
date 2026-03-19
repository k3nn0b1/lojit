import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hexToHSL } from "@/lib/colors";
import { useTenantContext } from "@/contexts/TenantContext";

export interface StoreSettings {
  tenant_id: string;
  store_name: string;
  logo_url: string | null;
  address: string;
  whatsapp: string;
  hero_phrase: string;
  hero_title_l1?: string;
  hero_title_l2?: string;
  hero_title_l3?: string;
  instagram_url?: string;
  youtube_url?: string;
  show_instagram?: boolean;
  show_whatsapp?: boolean;
  show_youtube?: boolean;
  about_us: string;
  footer_info: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  background_url: string | null;
  background_type?: 'solid' | 'bg1' | 'bg2' | 'bg3' | 'bg4';
  background_config?: any;
  opening_hours?: string;
  font_family?: string;
  collection_title_l1?: string;
  collection_title_l2?: string;
  collection_subtitle?: string;
  updated_at?: string;
}


interface StoreSettingsContextType {
  settings: StoreSettings | null;
  loading: boolean;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

const defaultSettings: StoreSettings = {
  tenant_id: "",
  store_name: "",
  logo_url: null,
  address: "",
  whatsapp: "",
  hero_phrase: "",
  about_us: "",
  footer_info: "",
  primary_color: "179 78% 52%", // Ciano Elite (#23e7e3)
  secondary_color: "179 78% 52%",
  background_color: "240 0% 8%", // Escuro base (#141414)
  background_url: null,
  background_type: "bg4",
  background_config: {},
  opening_hours: "",
  show_instagram: true,
  show_whatsapp: true,
  show_youtube: false,
  youtube_url: "",
  font_family: "Inter"
};

const getInitialSettings = (tenantId?: string | null): StoreSettings => {
  if (typeof window !== "undefined" && tenantId) {
    const cached = localStorage.getItem(`store_settings_cache_${tenantId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed;
      } catch (e) {}
    }
  }
  return defaultSettings;
};

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantId, isMaster, loading: tenantLoading } = useTenantContext();
  const [settings, setSettings] = useState<StoreSettings>(getInitialSettings(tenantId));
  const [loading, setLoading] = useState(true);

  const applyColors = (s: StoreSettings) => {
    const root = document.documentElement;

    // Converter HEX para HSL caso venha do Blueprint ou Banco em formato #######
    let primaryHSL = s.primary_color || "179 78% 52%";
    let secondaryHSL = s.secondary_color || "179 78% 52%";
    let backgroundHSL = s.background_color || "240 0% 8%";

    if (primaryHSL.startsWith('#')) primaryHSL = hexToHSL(primaryHSL);
    if (secondaryHSL.startsWith('#')) secondaryHSL = hexToHSL(secondaryHSL);
    if (backgroundHSL.startsWith('#')) backgroundHSL = hexToHSL(backgroundHSL);

    // Se o fundo for HEX, converter para HSL para a lógica de contraste abaixo
    const finalBgHSL = backgroundHSL;
    const parts = finalBgHSL.split(' ');
    const lightnessPart = parts[2] || "0%";
    const lValue = parseInt(lightnessPart.replace('%', '') || '0');
    
    // Determinar se o tema é claro ou escuro
    const isLight = lValue > 50;
    
    // Base colors from settings
    root.style.setProperty("--primary", primaryHSL);
    root.style.setProperty("--secondary", secondaryHSL);
    root.style.setProperty("--background", backgroundHSL);
    root.style.setProperty("--font-family", s.font_family || "Inter");
    root.style.setProperty("--ring", primaryHSL);
    root.style.setProperty("--accent", primaryHSL);
    
    // Automatic Contrast Adjustment
    if (isLight) {
        root.style.setProperty("--foreground", "0 0% 10%");
        root.style.setProperty("--card", "0 0% 96%");
        root.style.setProperty("--card-foreground", "0 0% 10%");
        root.style.setProperty("--popover", "0 0% 100%");
        root.style.setProperty("--popover-foreground", "0 0% 10%");
        root.style.setProperty("--muted", "0 0% 92%");
        root.style.setProperty("--muted-foreground", "0 0% 40%");
        root.style.setProperty("--border", "0 0% 80%");
        root.style.setProperty("--input", "0 0% 80%");
        root.style.setProperty("--primary-foreground", "0 0% 100%");
    } else {
        root.style.setProperty("--foreground", "0 0% 98%");
        root.style.setProperty("--card", "0 0% 8%");
        root.style.setProperty("--card-foreground", "0 0% 98%");
        root.style.setProperty("--popover", "0 0% 8%");
        root.style.setProperty("--popover-foreground", "0 0% 98%");
        root.style.setProperty("--muted", "0 0% 15%");
        root.style.setProperty("--muted-foreground", "0 0% 65%");
        root.style.setProperty("--border", "0 0% 18%");
        root.style.setProperty("--input", "0 0% 18%");
        root.style.setProperty("--primary-foreground", "0 0% 0%");
    }

    // Vincular efeitos de neon à cor secundária conforme solicitado
    root.style.setProperty("--neon-green", s.secondary_color);
    root.style.setProperty("--neon-glow", s.secondary_color);
    
    if (s.background_url) {
        root.style.setProperty("--background-image", `url(${s.background_url})`);
    } else {
        root.style.setProperty("--background-image", "none");
    }
  };

  const updateMetadata = (s: StoreSettings) => {
    if (s.store_name) {
      document.title = s.store_name;
    }
    
    if (s.logo_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = s.logo_url;
    }
  };



  const fetchSettings = async () => {
    // Se não temos tenantId (é master), não buscar e liberar o loading
    if (!tenantId) {
      setSettings({ ...defaultSettings, store_name: "Painel Master" });
      setLoading(false);
      return;
    }

    // Tentar carregar do cache primeiro (separado por tenant)
    const cacheKey = `store_settings_cache_${tenantId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSettings(parsed);
        applyColors(parsed);
        updateMetadata(parsed);
      } catch (e) {}
    }

    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (error) {
          if (error.code === 'PGRST116') {
              if (!settings) setSettings(defaultSettings);
              return;
          }
          throw error;
      }
      
      setSettings(data);
      applyColors(data);
      updateMetadata(data);
      // Salvar no cache (separado por tenant)
      localStorage.setItem(cacheKey, JSON.stringify(data));

    } catch (error) {
      console.error("Error fetching settings:", error);
      if (!settings) setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    if (!tenantId) throw new Error("Tenant não resolvido");

    try {
      // 1. Atualizar store_settings
      const { error } = await supabase
        .from("store_settings")
        .update(newSettings)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // 2. Sincronizar 'store_name' com a tabela 'tenants', se necessário
      if (newSettings.store_name) {
        await supabase
          .from("tenants")
          .update({ name: newSettings.store_name })
          .eq("id", tenantId);
      }
      
      const updated = { ...settings, ...newSettings } as StoreSettings;
      setSettings(updated);
      applyColors(updated);
      updateMetadata(updated);
      // Atualizar cache (separado por tenant)
      localStorage.setItem(`store_settings_cache_${tenantId}`, JSON.stringify(updated));

    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  useEffect(() => {
    // Se o tenant está carregando, esperamos.
    if (tenantLoading) return;

    // Se o tenant foi resolvido (ou é master), buscamos as configurações
    fetchSettings();
  }, [tenantId, tenantLoading]);

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, updateSettings, refresh: fetchSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (context === undefined) {
    throw new Error("useStoreSettings must be used within a StoreSettingsProvider");
  }
  return context;
};
