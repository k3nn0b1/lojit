import React from 'react';

/**
 * AnimatedBackground - Estilo "Topographic Flow" Intensificado
 * @param {string} primaryColor - Cor das linhas e efeitos (ex: '#6366f1').
 * @param {string} backgroundColor - Cor sólida de fundo (ex: '#000000' ou '#ffffff').
 */
const AnimatedBackground = ({ 
  primaryColor = '#4f46e5', 
  backgroundColor = '#f8fafc' 
}) => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor }}>
      
      {/* Camada 1: Brilho Atmosférico Pulsante */}
      <div 
        className="absolute inset-0 opacity-20 animate-pulse-slow"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${primaryColor}44 0%, transparent 70%)` 
        }}
      />

      {/* Camada 2: Linhas Topográficas Principais (Lentas) */}
      <div className="absolute inset-0 opacity-[0.2]">
        <svg width="100%" height="100%" className="animate-flow-slow">
          <defs>
            <pattern id="topo-pattern-1" width="800" height="800" patternUnits="userSpaceOnUse">
              <path d="M0 200 Q 200 100 400 200 T 800 200" fill="none" stroke={primaryColor} strokeWidth="2" opacity="0.8" />
              <path d="M0 400 Q 200 500 400 400 T 800 400" fill="none" stroke={primaryColor} strokeWidth="1" opacity="0.5" />
              <path d="M0 600 Q 200 500 400 600 T 800 600" fill="none" stroke={primaryColor} strokeWidth="1.5" opacity="0.7" />
            </pattern>
          </defs>
          <rect width="200%" height="200%" fill="url(#topo-pattern-1)" />
        </svg>
      </div>

      {/* Camada 3: Linhas Secundárias (Rápidas e Cruzadas) */}
      <div className="absolute inset-0 opacity-[0.1]">
        <svg width="100%" height="100%" className="animate-flow-fast">
          <defs>
            <pattern id="topo-pattern-2" width="600" height="600" patternUnits="userSpaceOnUse">
              <path d="M0 150 Q 150 250 300 150 T 600 150" fill="none" stroke={primaryColor} strokeWidth="1" />
              <path d="M0 450 Q 150 350 300 450 T 600 450" fill="none" stroke={primaryColor} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="200%" height="200%" fill="url(#topo-pattern-2)" />
        </svg>
      </div>

      {/* Camada 4: Grelha de Pontos Estática para Contraste */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `radial-gradient(${primaryColor} 1.5px, transparent 1.5px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Linha de Scanner Vertical */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="w-full h-1/4 opacity-10 animate-scan-float"
          style={{ 
            background: `linear-gradient(to bottom, transparent, ${primaryColor}, transparent)` 
          }}
        />
      </div>

      {/* Definições de Animação */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow-slow {
          0% { transform: translate(-25%, -25%) rotate(0deg); }
          50% { transform: translate(-20%, -20%) rotate(2deg); }
          100% { transform: translate(-25%, -25%) rotate(0deg); }
        }

        @keyframes flow-fast {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10%, -5%) scale(1.05); }
          100% { transform: translate(0, 0) scale(1); }
        }

        @keyframes scan-float {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 0.2; }
          80% { opacity: 0.2; }
          100% { transform: translateY(400%); opacity: 0; }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.25; }
        }

        .animate-flow-slow {
          animation: flow-slow 40s infinite linear;
        }

        .animate-flow-fast {
          animation: flow-fast 25s infinite ease-in-out;
        }

        .animate-scan-float {
          animation: scan-float 12s infinite ease-in-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
      `}} />
    </div>
  );
};

export default function App() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground 
        primaryColor="#6366f1" 
        backgroundColor="#0f172a" /* Alterado para fundo escuro para realçar a animação */
      />
    </div>
  );
}