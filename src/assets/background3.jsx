import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

/**
 * Utilitário para mesclar classes Tailwind
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONFIGURAÇÕES DO GRADIENTE ---

const GRADIENT_COLORS = {
  blue: [
    { color: "rgb(180, 176, 254)", start: "0%" },
    { color: "rgb(54, 50, 133)", start: "22.92%" },
    { color: "rgb(17, 13, 91)", start: "42.71%" },
    { color: "rgb(5, 3, 39)", start: "88.54%" },
  ],
  purple: [
    { color: "#342456", start: "0%" },
    { color: "#2B1E48", start: "22.92%" },
    { color: "#22183A", start: "42.71%" },
    { color: "#110C1D", start: "88.54%" },
  ],
};

const GRADIENT_SIZES = {
  lg: { width: "120%", height: "100%" },
};

const GRADIENT_POSITIONS = {
  top: { x: "50%", y: "0%" },
};

// --- COMPONENTE BG ANIMADO ---

interface BgGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  gradientSize?: keyof typeof GRADIENT_SIZES;
  gradientPosition?: keyof typeof GRADIENT_POSITIONS;
  gradientColors?: keyof typeof GRADIENT_COLORS;
}

/**
 * Componente que renderiza um gradiente radial animado que expande e contrai.
 */
export function BgGradient({
  gradientSize = "lg",
  gradientPosition = "top",
  gradientColors = "blue",
  className,
  style,
  ...props
}: BgGradientProps) {
  
  const colorsArray = GRADIENT_COLORS[gradientColors] || GRADIENT_COLORS.blue;
  const gradientString = colorsArray.map(({ color, start }) => `${color} ${start}`).join(", ");
  const size = GRADIENT_SIZES[gradientSize];
  const position = GRADIENT_POSITIONS[gradientPosition];

  const gradientStyle = `radial-gradient(${size.width} ${size.height} at ${position.x} ${position.y}, ${gradientString})`;
  const dominantColor = colorsArray[colorsArray.length - 1].color;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      {/* Camada base para evitar transparências indesejadas */}
      <div 
        className="absolute inset-0 w-full h-full" 
        style={{ backgroundColor: dominantColor }} 
      />

      {/* Camada de iluminação animada */}
      <motion.div
        className={cn("absolute inset-0 size-full select-none", className)}
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ 
          scale: [1, 1.2, 1], // Efeito de expansão da luz
          opacity: [0.6, 0.9, 0.6] // Efeito de pulsação da intensidade
        }}
        transition={{
          duration: 10, // Animação lenta e fluida
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          backgroundImage: gradientStyle,
          ...style,
        }}
        {...props}
      />
    </div>
  );
}

// --- APLICAÇÃO PRINCIPAL ---

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Apenas o fundo animado, sem elementos de interface */}
      <BgGradient gradientColors="blue" />

      {/* Textura de grão/ruído opcional para um aspeto mais premium */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }}
      />
    </div>
  );
}