import footballSvg from "@/assets/football.svg";
import footballSvg2 from "@/assets/football2.svg";

interface FootballBackgroundProps {
  mode?: 'global' | 'hero';
}

const FootballBackground: React.FC<FootballBackgroundProps> = ({ mode = 'global' }) => {
  const footballImages = [footballSvg, footballSvg2];
  
  return (
    <div className="football-bg">
      {[...Array(8)].map((_, i) => (
        <img
          key={i}
          src={footballImages[i % 2]}
          alt=""
          className="football"
        />
      ))}
      {/* Overlay escuro apenas para o modo global */}
      {mode === 'global' && (
        <div className="absolute inset-0 bg-black/90 pointer-events-none z-[1]" />
      )}
    </div>
  );
};

export default FootballBackground;
