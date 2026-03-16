import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground3 = ({
  primaryColor = '#6366f1',
  secondaryColor = '#050327',
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{ backgroundColor: secondaryColor }}>
      {/* Luz Principal Esquerda */}
      <motion.div
        animate={{
          x: [-20, 20, -20],
          y: [-10, 30, -10],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: isMobile ? 25 : 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${primaryColor}22 0%, ${primaryColor}00 70%)`,
          filter: `blur(${isMobile ? '30px' : '60px'})`,
          willChange: 'transform',
        }}
      />

      {/* Luz Secundária Direita */}
      <motion.div
        animate={{
          x: [20, -30, 20],
          y: [20, -20, 20],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: isMobile ? 30 : 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${primaryColor}11 0%, ${primaryColor}00 70%)`,
          filter: `blur(${isMobile ? '40px' : '80px'})`,
          willChange: 'transform',
        }}
      />

      {/* Faixa Aurora Topo */}
      <motion.div
        animate={{
          x: ['-50%', '-40%', '-50%'],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: isMobile ? 20 : 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-0 left-0 w-[200%] h-[40%] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${primaryColor}33 50%, transparent 100%)`,
          filter: `blur(${isMobile ? '50px' : '100px'})`,
          transform: isMobile ? 'none' : 'skewY(-5deg)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Overlay de Vinheta for light reduction */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
          willChange: 'opacity'
        }}
      />
    </div>
  );
}

export default AnimatedBackground3;