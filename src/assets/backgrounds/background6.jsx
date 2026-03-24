import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Componente que gera os caminhos de luz animados.
 * @param {number} position - Influencia a direção e inclinação das curvas.
 * @param {string} className - Classes CSS para posicionamento e rotação.
 */
function FloatingPaths({ position, className = "", delay = 0, color = "white" }) {
    // Geramos os caminhos de forma estável
    const paths = useMemo(() => {
        return Array.from({ length: 25 }, (_, i) => ({
            id: i,
            // Coordenadas baseadas na lógica original, mas com ajustes de escala
            d: `M${-200 + (i * 10 * position)} ${-100 + (i * 5)} 
                C${100 * position} ${200} 
                 ${400 * position} ${100} 
                 ${800 + (i * 10 * position)} ${500 + (i * 10)}`,
            width: 0.8 + i * 0.04,
            opacity: 0.1 + (i * 0.02),
            duration: 12 + Math.random() * 8
        }));
    }, [position]);

    return (
        <div className={`absolute inset-0 pointer-events-none ${className}`}>
            <svg
                className="w-full h-full"
                viewBox="0 0 800 600"
                fill="none"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
            >
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke={color}
                        strokeWidth={path.width}
                        strokeOpacity={path.opacity}
                        strokeLinecap="round"
                        initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
                        animate={{
                            pathLength: [0.1, 0.5, 0.1],
                            pathOffset: [0, 1],
                            opacity: [0, 0.8, 0],
                        }}
                        transition={{
                            duration: path.duration,
                            repeat: Infinity,
                            ease: "linear",
                            delay: delay + (Math.random() * 5),
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function BackgroundPaths({ color = "white", backgroundColor = "#09090b" }) {
    return (
        <div 
          className="relative min-h-screen w-full overflow-hidden" 
          style={{ backgroundColor }}
        >
            {/* Camada 1: Fluxo Principal (Inferior Esquerdo para Superior Direito) */}
            <FloatingPaths position={1} className="opacity-100" color={color} />
            
            {/* Camada 2: Fluxo Cruzado (Superior Direito para Inferior Esquerdo) */}
            <FloatingPaths 
                position={-1} 
                className="rotate-180 opacity-70" 
                delay={3}
                color={color}
            />
            
            {/* Camada 3: Fluxo Lateral (Verticalizado) */}
            <div className="absolute inset-0 rotate-90 scale-150 opacity-40">
                <FloatingPaths position={1} delay={6} color={color} />
            </div>

            {/* Camada 4: Fluxo Central Suave */}
            <div className="absolute inset-0 -rotate-45 scale-110 opacity-30">
                <FloatingPaths position={-1} delay={9} color={color} />
            </div>

            {/* Efeitos de Vinheta e Profundidade */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                background: `linear-gradient(to bottom, ${backgroundColor}, transparent, ${backgroundColor})` 
              }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                background: `linear-gradient(to right, ${backgroundColor}, transparent, ${backgroundColor})` 
              }}
            />
        </div>
    );
}

export default BackgroundPaths;