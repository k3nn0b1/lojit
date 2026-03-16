import React from 'react';

/**
 * AnimatedBackground - Um fundo de gradiente de malha (mesh gradient) ultra-dinâmico.
 * @param {string} primaryColor - Cor base hexadecimal (ex: '#6366f1').
 * @param {string} secondaryColor - Cor de fundo (ex: '#ffffff').
 * @param {boolean} glassmorphism - Se deve aplicar o efeito de desfoque por cima.
 */
const AnimatedBackground = ({ 
  primaryColor = '#6366f1', 
  secondaryColor = '#ffffff',
  glassmorphism = true 
}) => {
  // Cores derivadas para dar profundidade
  const color1 = primaryColor;
  const color2 = primaryColor; // Poderia ser processada para ser mais clara/escura

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: secondaryColor }}>
      {/* Camada de base com um brilho suave da cor principal */}
      <div 
        className="absolute inset-0 transition-colors duration-1000 opacity-20"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${primaryColor}33 0%, transparent 70%)`
        }}
      />

      {/* Contentor de Blobs Animados */}
      <div className="absolute inset-0 filter blur-[80px] md:blur-[120px]">
        
        {/* Blob 1: Grande e Lento */}
        <div 
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-60 animate-float-slow"
          style={{ backgroundColor: color1, filter: 'brightness(1.1)' }}
        />
        
        {/* Blob 2: Médio e Rápido */}
        <div 
          className="absolute top-[10%] right-[-15%] w-[50%] h-[50%] rounded-full opacity-50 animate-float-medium"
          style={{ backgroundColor: color2, filter: 'brightness(0.9)' }}
        />

        {/* Blob 3: Pequeno e Errático */}
        <div 
          className="absolute bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full opacity-40 animate-float-fast"
          style={{ backgroundColor: color1, filter: 'brightness(1.2)' }}
        />

        {/* Blob 4: Inferior Direito */}
        <div 
          className="absolute bottom-[-20%] right-[10%] w-[60%] h-[60%] rounded-full opacity-50 animate-float-reverse"
          style={{ backgroundColor: color2, filter: 'brightness(0.8)' }}
        />

        {/* Blob 5: Central de Contraste */}
        <div 
          className="absolute top-[30%] left-[30%] w-[30%] h-[30%] rounded-full opacity-30 animate-pulse-slow"
          style={{ backgroundColor: color1 }}
        />
      </div>

      {/* Textura de "Grain" para um acabamento cinematográfico */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      
      {/* Camada de Vidro/Blur Final para suavizar as bordas das animações */}
      {glassmorphism && (
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[60px]"></div>
      )}

      {/* Definições das Animações Complexas */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          50% { transform: translate(10%, 5%) rotate(90deg) scale(1.1); }
          100% { transform: translate(0, 0) rotate(180deg) scale(1); }
        }
        @keyframes float-medium {
          0% { transform: translate(0, 0) rotate(0deg) scale(1.1); }
          50% { transform: translate(-15%, 15%) rotate(-120deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(-240deg) scale(1.1); }
        }
        @keyframes float-fast {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20%, -10%) scale(1.2); }
          66% { transform: translate(-10%, 20%) scale(0.8); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float-reverse {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(-20%, -20%) rotate(-360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }

        .animate-float-slow { animation: float-slow 35s infinite linear; }
        .animate-float-medium { animation: float-medium 25s infinite ease-in-out; }
        .animate-float-fast { animation: float-fast 18s infinite alternate ease-in-out; }
        .animate-float-reverse { animation: float-reverse 40s infinite linear; }
        .animate-pulse-slow { animation: pulse-slow 12s infinite ease-in-out; }
      `}} />
    </div>
  );
};

// Componente de Demonstração
export default function App() {
  return (
    <div className="relative min-h-screen selection:bg-indigo-200">
      {/* Fundo com animações reforçadas */}
      <AnimatedBackground primaryColor="#4f46e5" />
      
      {/* Conteúdo Simulado */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">
        <header className="max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
            Experiência <span className="text-indigo-600">Vibrante</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed">
            Agora com 5 camadas independentes de movimento, rotação e escala para um efeito visual muito mais rico.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-slate-900 text-white px-8 py-3 rounded-full font-medium hover:bg-slate-800 transition-all shadow-lg">
              Explorar Loja
            </button>
            <button className="bg-white/50 backdrop-blur-sm border border-slate-200 text-slate-900 px-8 py-3 rounded-full font-medium hover:bg-white/80 transition-all">
              Saber Mais
            </button>
          </div>
        </header>
      </div>
    </div>
  );
}