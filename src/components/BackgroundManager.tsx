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

  const colors = useMemo(() => {
    if (!settings) return null;
    return {
      primary: hslStringToHex(settings.primary_color),
      secondary: hslStringToHex(settings.secondary_color),
      background: hslStringToHex(settings.background_color),
    };
  }, [settings]);

  if (!settings || !colors) return null;

  const isSolid = !settings.background_type || settings.background_type === 'solid';

  const renderBackground = () => {
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
      <div className="fixed inset-0 z-[-20] overflow-hidden pointer-events-none">
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
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.95) 100%)' 
        }}
      />
      
      {/* 
          Overlay do Corpo:
          Começa onde o fade termina e vai até o fim do documento.
          O segredo aqui é usar uma cor de fundo sólida no body ou em uma div pai que não force altura extra.
      */}
      <div 
        className="absolute inset-x-0 top-[120vh] bottom-0 z-[-15] pointer-events-none bg-black/95"
      />
    </>
  );
};

export default BackgroundManager;
