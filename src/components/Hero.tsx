import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";

const Hero = () => {
  const { settings } = useStoreSettings();
  const storeName = settings?.store_name || "";
  const heroPhrase = settings?.hero_phrase || "";

  const scrollToProducts = () => {
    const element = document.getElementById("products");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToAbout = () => {
    const element = document.getElementById("about");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-[90vh] md:h-svh overflow-hidden flex items-center justify-center scroll-mt-24 md:scroll-mt-32 pt-24 md:pt-32 pb-16 md:pb-20"
    >
      {/* Deep Glow Elements - Subtle highlight for the core content */}
      <div className="absolute top-1/4 -left-10 w-64 h-64 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-10 w-80 h-80 rounded-full bg-primary/5 blur-[140px] animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center justify-center">
        {/* Logo Section - Removed AOS for instant FCP/LCP */}
        {settings?.logo_url && (
          <div
            className="relative mb-8 md:mb-12 hover-scale transition-smooth animate-in fade-in zoom-in duration-1000 fill-mode-both"
          >
            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
            <img
              src={settings.logo_url}
              alt={storeName}
              width={420}
              height={280}
              fetchPriority="high"
              loading="eager"
              className="relative w-full max-w-[280px] md:max-w-[420px] h-auto max-h-[15vh] md:max-h-[22vh] object-contain"
            />
          </div>
        )}

        {/* Content Section - Instant visibility */}
        <div
          className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both"
        >
          <div className="space-y-4">
            <h2 className="text-[12vw] sm:text-[10vw] md:text-7xl lg:text-8xl font-display font-black leading-[1.1] uppercase flex flex-col items-center justify-center max-w-[100vw] text-center w-full px-2">
              <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] max-w-full break-words">
                {settings?.hero_title_l1 || "BEM-VINDO"}
              </span>
              <span className="text-primary glow-neon drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)] max-w-full break-words">
                {settings?.hero_title_l2 || "À NOSSA LOJA"}
              </span>
              {settings?.hero_title_l3 && (
                <span className="text-primary glow-neon drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)] max-w-full break-words">
                  {settings?.hero_title_l3}
                </span>
              )}
            </h2>
            
            <p className="text-sm sm:text-base md:text-xl text-muted-foreground/80 max-w-[90%] md:max-w-2xl mx-auto font-medium leading-relaxed px-4 break-words">
              {heroPhrase || "Confira nossa coleção exclusiva de produtos com qualidade premium e atendimento personalizado."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center pt-4 w-full px-4">
            <Button
              onClick={scrollToProducts}
              size="lg"
              className="w-full max-w-[300px] sm:max-w-none sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm md:text-lg px-6 md:px-10 py-6 md:py-7 rounded-full glow-soft transition-smooth hover:scale-105 active:scale-95"
            >
              VER COLEÇÃO
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full max-w-[300px] sm:max-w-none sm:w-auto border-primary/40 hover:border-primary bg-transparent text-foreground hover:text-primary hover:bg-transparent font-bold text-sm md:text-lg px-6 md:px-10 py-6 md:py-7 rounded-full transition-smooth hover:scale-105 active:scale-95"
              onClick={scrollToAbout}
            >
              SOBRE NÓS
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-10 w-20 h-20 rounded-full bg-primary/10 blur-xl md:blur-3xl md:animate-pulse" />
      <div
        className="absolute bottom-1/4 right-10 w-32 h-32 rounded-full bg-primary/10 blur-xl md:blur-3xl md:animate-pulse"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute inset-x-0 bottom-3 flex justify-center"
      >
        <button
          type="button"
          aria-label="Scroll para produtos"
          onClick={() =>
            document
              .getElementById("products")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="group"
        >
          <div className="hidden md:flex items-center justify-center">
            <div className="h-9 w-6 rounded-full border border-primary/60 bg-secondary/40 shadow-[var(--glow-neon)] flex items-start justify-center p-1 animate-bounce">
              <span className="h-2 w-1 rounded bg-primary mt-1" />
            </div>
          </div>
          <div className="md:hidden flex items-center justify-center text-primary glow-neon animate-bounce">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>
    </section>
  );
};

export default Hero;

