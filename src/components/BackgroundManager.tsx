import React, { useMemo } from 'react';
import { useStoreSettings } from '@/contexts/StoreSettingsContext';
import { hslStringToHex } from '@/lib/colors';
import AnimatedBackground1 from '@/assets/backgrounds/background1';
import AnimatedBackground2 from '@/assets/backgrounds/background2';
import AnimatedBackground3 from '@/assets/backgrounds/background3';
import AnimatedBackground4 from '@/assets/backgrounds/background4';
import AnimatedBackground5 from '@/assets/backgrounds/background5';
import AnimatedBackground6 from '@/assets/backgrounds/background6';
import FootballBackground from './FootballBackground';

interface BackgroundManagerProps {
  forceType?: string;
}

const BackgroundManager: React.FC<BackgroundManagerProps> = ({ forceType }) => {
  const { settings } = useStoreSettings();
  const [shouldRenderBg, setShouldRenderBg] = React.useState(true);

  const colors = useMemo(() => {
    return {
      primary: settings?.primary_color ? hslStringToHex(settings.primary_color) : "#08c0d9",
      secondary: settings?.secondary_color ? hslStringToHex(settings.secondary_color) : "#08c0d9",
      background: settings?.background_color ? hslStringToHex(settings.background_color) : "#000000",
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

  if (!colors) return null;

  const isSolid = !settings?.background_type || settings.background_type === 'solid';

  const renderBackground = () => {
    const type = forceType || settings?.background_type;

    switch (type) {
      case 'bg1':
        return <AnimatedBackground1 primaryColor={colors.primary} secondaryColor={colors.background} />;
      case 'bg2':
        return <AnimatedBackground2 primaryColor={colors.primary} backgroundColor={colors.background} />;
      case 'bg3':
        return <AnimatedBackground3 primaryColor={colors.primary} secondaryColor={colors.background} />;
      case 'bg4':
        return <AnimatedBackground4 color={colors.primary + 'CC'} />;
      case 'bg5':
        return <AnimatedBackground5 primaryColor={colors.primary} secondaryColor={colors.background} />;
      case 'bg6':
        return <AnimatedBackground6 color={colors.primary} backgroundColor={colors.background} />;
      default:
        return isSolid ? <FootballBackground mode="hero" /> : null;
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
