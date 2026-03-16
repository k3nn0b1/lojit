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
  const [shouldRenderBg, setShouldRenderBg] = React.useState(true);

  const colors = useMemo(() => {
    if (!settings) return null;
    return {
      primary: hslStringToHex(settings.primary_color),
      secondary: hslStringToHex(settings.secondary_color),
      background: hslStringToHex(settings.background_color),
    };
  }, [settings]);

  React.useEffect(() => {
    const threshold = window.innerHeight * 1.5;
    const handleScroll = () => {
      const visible = window.scrollY < threshold;
      setShouldRenderBg(prev => prev !== visible ? visible : prev);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!settings || !colors) return null;

  const isSolid = !settings.background_type || settings.background_type === 'solid';

  const renderBackground = () => {
    if (!shouldRenderBg) return null;
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
      <div 
        className="fixed inset-0 z-[-20] overflow-hidden pointer-events-none bg-background"
      >
        {renderBackground()}
        {/* Overlay que cobre a tela toda permanentemente, sem causar scroll extra */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle at center, transparent 0%, hsl(var(--background) / 0.8) 100%)',
          }}
        />
      </div>
    </>
  );
};

export default BackgroundManager;
