import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground3 = ({
  primaryColor = '#6366f1',
  secondaryColor = '#050327',
}) => {
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
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${primaryColor}22 0%, ${primaryColor}00 70%)`,
          filter: 'blur(60px)',
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
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${primaryColor}11 0%, ${primaryColor}00 70%)`,
          filter: 'blur(80px)',
        }}
      />

      {/* Faixa Aurora Topo */}
      <motion.div
        animate={{
          x: ['-50%', '-40%', '-50%'],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-0 left-0 w-[200%] h-[40%] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${primaryColor}33 50%, transparent 100%)`,
          filter: 'blur(100px)',
          transform: 'skewY(-5deg)',
        }}
      />

      {/* Overlay de Vinheta para manter as bordas escuras */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
        }}
      />
    </div>
  );
}

export default AnimatedBackground3;