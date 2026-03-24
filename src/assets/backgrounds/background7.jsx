import React, { useMemo } from 'react';

/**
 * Utilitário para combinar classes
 */
const cn = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Componente BeamsBackground
 * Simula o efeito de feixes de luz cruzando a tela horizontalmente.
 */
export const BeamsBackground = ({
  children,
  className,
  primaryColor = '#3b82f6',
  secondaryColor = '#8b5cf6',
  backgroundColor = '#000000',
  intensity = 0.3,
}) => {
  // Criamos uma lista de feixes com propriedades variadas para um efeito orgânico
  const beams = useMemo(() => [
    { id: 1, top: '10%', width: '600px', height: '300px', duration: '15s', delay: '0s' },
    { id: 2, top: '30%', width: '800px', height: '400px', duration: '20s', delay: '-5s' },
    { id: 3, top: '50%', width: '700px', height: '350px', duration: '18s', delay: '-2s' },
    { id: 4, top: '70%', width: '900px', height: '450px', duration: '25s', delay: '-10s' },
    { id: 5, top: '20%', width: '500px', height: '250px', duration: '12s', delay: '-7s' },
    { id: 6, top: '80%', width: '750px', height: '380px', duration: '22s', delay: '-15s' },
  ], []);

  return (
    <div 
      className={cn("relative w-full h-full overflow-hidden flex items-center justify-center", className)}
      style={{ 
        backgroundColor,
        '--beam-primary': primaryColor,
        '--beam-secondary': secondaryColor,
        '--beam-intensity': intensity
      }}
    >
      {/* Estilos de Animação Linear */}
      <style>{`
        @keyframes move-right {
          0% {
            transform: translateX(-150%) skewX(-15deg);
            opacity: 0;
          }
          10% {
            opacity: var(--beam-intensity);
          }
          90% {
            opacity: var(--beam-intensity);
          }
          100% {
            transform: translateX(250%) skewX(-15deg);
            opacity: 0;
          }
        }

        .beam-streak {
          position: absolute;
          pointer-events: none;
          filter: blur(100px);
          border-radius: 50%;
          will-change: transform, opacity;
          mix-blend-mode: screen;
        }
      `}</style>

      {/* Camada de Animação */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {beams.map((beam) => (
          <div
            key={beam.id}
            className="beam-streak"
            style={{
              top: beam.top,
              left: 0,
              width: beam.width,
              height: beam.height,
              background: `linear-gradient(90deg, var(--beam-primary) 0%, var(--beam-secondary) 100%)`,
              animation: `move-right ${beam.duration} infinite linear`,
              animationDelay: beam.delay,
            }}
          />
        ))}

        {/* Overlay de Textura/Ruído para realismo */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        {/* Máscara de vinheta para suavizar as bordas */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 20%, ${backgroundColor} 90%)`
          }}
        />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};

export default BeamsBackground;