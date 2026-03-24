import React, { useEffect, useRef, useState } from 'react';

/**
 * Componente SmokeBackground
 * * @param {string} primaryColor - Cor principal da fumaça (Hex)
 * @param {string} secondaryColor - Cor de fundo/secundária (Hex)
 * @param {number} density - Densidade da fumaça (0.1 a 1.0)
 * @param {number} speed - Velocidade da animação
 */
const SmokeBackground = ({ 
  primaryColor = "#ff0000", 
  secondaryColor = "#0a0a0a",
  density = 0.5,
  speed = 0.4
}) => {
  const canvasRef = useRef(null);

  // Função para converter Hex para RGB para o Shader
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // --- Shaders ---
    const vertexSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_primaryColor;
      uniform vec3 u_secondaryColor;
      uniform float u_density;

      // Funções de ruído para efeito de fumaça
      float random (in vec2 _st) {
          return fract(sin(dot(_st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float noise (in vec2 _st) {
          vec2 i = floor(_st);
          vec2 f = fract(_st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      #define NUM_OCTAVES 5
      float fbm ( in vec2 _st) {
          float v = 0.0;
          float a = 0.5;
          vec2 shift = vec2(100.0);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < NUM_OCTAVES; ++i) {
              v += a * noise(_st);
              _st = rot * _st * 2.0 + shift;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          st.x *= u_resolution.x / u_resolution.y;

          vec3 color = vec3(0.0);
          vec2 q = vec2(0.);
          q.x = fbm( st + 0.00 * u_time);
          q.y = fbm( st + vec2(1.0));

          vec2 r = vec2(0.);
          r.x = fbm( st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * u_time );
          r.y = fbm( st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time );

          float f = fbm(st + r);

          // Mistura das cores baseada no ruído (fumaça)
          float strength = clamp((f * f * f * 4.0 * f) * u_density, 0.0, 1.0);
          color = mix(u_secondaryColor, u_primaryColor, strength);

          gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Helper para criar shader
    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Buffer de posição (retângulo que cobre a tela)
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const primaryLoc = gl.getUniformLocation(program, "u_primaryColor");
    const secondaryLoc = gl.getUniformLocation(program, "u_secondaryColor");
    const densityLoc = gl.getUniformLocation(program, "u_density");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let animationFrame;
    const render = (time) => {
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, time * 0.001 * speed);
      gl.uniform1f(densityLoc, density);
      
      const pRGB = hexToRgb(primaryColor);
      const sRGB = hexToRgb(secondaryColor);
      gl.uniform3f(primaryLoc, pRGB[0], pRGB[1], pRGB[2]);
      gl.uniform3f(secondaryLoc, sRGB[0], sRGB[1], sRGB[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [primaryColor, secondaryColor, density, speed]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full -z-10"
      style={{ background: secondaryColor }}
    />
  );
};

export default SmokeBackground;