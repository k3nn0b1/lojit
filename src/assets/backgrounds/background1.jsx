import React from 'react';

const AnimatedBackground1 = ({ 
  primaryColor = '#6366f1', 
  secondaryColor = '#ffffff',
  glassmorphism = true 
}) => {
  const color1 = primaryColor;
  const color2 = primaryColor;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: secondaryColor }}>
      <div 
        className="absolute inset-0 transition-colors duration-1000 opacity-20"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${primaryColor}33 0%, transparent 70%)`
        }}
      />

      <div className="absolute inset-0 filter blur-[80px] md:blur-[120px]">
        <div 
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-60 animate-float-slow"
          style={{ backgroundColor: color1, filter: 'brightness(1.1)' }}
        />
        <div 
          className="absolute top-[10%] right-[-15%] w-[50%] h-[50%] rounded-full opacity-50 animate-float-medium"
          style={{ backgroundColor: color2, filter: 'brightness(0.9)' }}
        />
        <div 
          className="absolute bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full opacity-40 animate-float-fast"
          style={{ backgroundColor: color1, filter: 'brightness(1.2)' }}
        />
        <div 
          className="absolute bottom-[-20%] right-[10%] w-[60%] h-[60%] rounded-full opacity-50 animate-float-reverse"
          style={{ backgroundColor: color2, filter: 'brightness(0.8)' }}
        />
        <div 
          className="absolute top-[30%] left-[30%] w-[30%] h-[30%] rounded-full opacity-30 animate-pulse-slow"
          style={{ backgroundColor: color1 }}
        />
      </div>

      {glassmorphism && (
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[60px]"></div>
      )}

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

export default AnimatedBackground1;