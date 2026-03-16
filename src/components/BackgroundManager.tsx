import React, { useMemo } from 'react';
import { useStoreSettings } from '@/contexts/StoreSettingsContext';
import { hslStringToHex } from '@/lib/colors';
import AnimatedBackground1 from '@/assets/backgrounds/background1';
import AnimatedBackground2 from '@/assets/backgrounds/background2';
import AnimatedBackground3 from '@/assets/backgrounds/background3';
import AnimatedBackground4 from '@/assets/backgrounds/background4';
import FootballBackground from './FootballBackground';

const BackgroundManager: React.FC = () => {
  const { settings } = useStoreSettings();
  const [scrollY, setScrollY] = React.useState(0);

  const colors = useMemo(() => {
    if (!settings) return null;
    return {
      primary: hslStringToHex(settings.primary_color),
      secondary: hslStringToHex(settings.secondary_color),
      background: hslStringToHex(settings.background_color),
    };
  }, [settings]);

  React.useEffect(() => {
    const handleScroll = () => {
      // Usamos requestAnimationFrame para não sobrecarregar o processamento
      window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!settings || !colors) return null;

  const isSolid = !settings.background_type || settings.background_type === 'solid';
  // O background animado só precisa renderizar enquanto o usuário ainda consegue vê-lo (até ~150% da altura da tela)
  const shouldRenderBackground = scrollY < (window.innerHeight * 1.5);

  const renderBackground = () => {
    if (!shouldRenderBackground) return null;
    if (isSolid) {
      return <FootballBackground mode="hero" />;
    }

    switch (settings.background_type) {
      case 'bg1':
        return <AnimatedBackground1 primaryColor={colors.primary} secondaryColor={colors.background} />;
      case 'bg2':
        return <AnimatedBackground2 primaryColor={colors.primary} backgroundColor={colors.background} />;
      case 'bg3':
        return <AnimatedBackground3 primaryColor={colors.primary} secondaryColor={colors.background} />;
      case 'bg4':
        return <AnimatedBackground4 color={colors.primary + 'CC'} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Background animado sempre fixo ocupando a tela toda */}
      <div 
        className="fixed inset-0 z-[-20] overflow-hidden pointer-events-none"
        style={{ willChange: 'transform' }}
      >
        {renderBackground()}
      </div>

      {/* 
          Overlay de Transição (Fade):
          Ocupa apenas os primeiros 100-120vh para criar o efeito de escurecimento suave.
          É ABSOLUTO para que suba junto com o scroll do Hero.
      */}
      <div 
        className="absolute inset-x-0 top-0 z-[-15] pointer-events-none"
        style={{ 
          height: '120vh',
          background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.4) 40%, hsl(var(--background) / 1) 100%)',
          willChange: 'opacity'
        }}
      />
      
      {/* 
          Overlay do Corpo:
          Começa onde o fade termina e vai até o fim do documento.
      */}
      <div 
        className="absolute inset-x-0 top-[120vh] bottom-0 z-[-15] pointer-events-none"
        style={{ backgroundColor: 'hsl(var(--background))' }}
      />
    </>
  );
};

export default BackgroundManager;
