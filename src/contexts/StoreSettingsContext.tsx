import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hexToHSL } from "@/lib/colors";

export interface StoreSettings {
  id: number;
  store_name: string;
  logo_url: string | null;
  address: string;
  whatsapp: string;
  hero_phrase: string;
  hero_title_l1?: string;
  hero_title_l2?: string;
  hero_title_l3?: string;
  instagram_url?: string;
  about_us: string;
  footer_info: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  background_url: string | null;
  updated_at?: string;
}


interface StoreSettingsContextType {
  settings: StoreSettings | null;
  loading: boolean;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const applyColors = (s: StoreSettings) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", s.primary_color);
    root.style.setProperty("--secondary", s.secondary_color);
    root.style.setProperty("--background", s.background_color);
    root.style.setProperty("--ring", s.primary_color);
    root.style.setProperty("--accent", s.primary_color);
    
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
    // Tentar carregar do cache primeiro
    const cached = localStorage.getItem("store_settings_cache");
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
        .eq("id", 1)
        .single();

      if (error) {
          if (error.code === 'PGRST116') {
              return;
          }
          throw error;
      }
      
      setSettings(data);
      applyColors(data);
      updateMetadata(data);
      // Salvar no cache
      localStorage.setItem("store_settings_cache", JSON.stringify(data));

    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      const { error } = await supabase
        .from("store_settings")
        .update(newSettings)
        .eq("id", 1);

      if (error) throw error;
      
      const updated = { ...settings, ...newSettings } as StoreSettings;
      setSettings(updated);
      applyColors(updated);
      updateMetadata(updated);
      // Atualizar cache
      localStorage.setItem("store_settings_cache", JSON.stringify(updated));

    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
