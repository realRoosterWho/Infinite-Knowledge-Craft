import React, { useEffect, useRef } from 'react';

export interface FireworkBurst {
  id: string;
  x: number;
  y: number;
  colors: string[];
  particleCount?: number; // Optional control for intensity
  velocityScale?: number; // Optional control for size/spread
}

interface FireworksProps {
  bursts: FireworkBurst[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
}

const Fireworks: React.FC<FireworksProps> = ({ bursts }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const processedBurstsRef = useRef<Set<string>>(new Set());
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = () => {
      // Clear canvas with trail effect
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over'; // Standard draw

      // Update and draw particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // Gravity
        p.vx *= 0.98; // Air resistance
        p.vy *= 0.98;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (particlesRef.current.length > 0) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    // Check for new bursts
    bursts.forEach(burst => {
      if (!processedBurstsRef.current.has(burst.id)) {
        processedBurstsRef.current.add(burst.id);
        
        // Use custom count/velocity or defaults
        const count = burst.particleCount || 40;
        const velocityBase = burst.velocityScale || 1;

        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          // Add some randomness to the angle for natural look
          const randomAngle = angle + (Math.random() * 0.5 - 0.25);
          
          const velocity = (2 + Math.random() * 3) * velocityBase;
          
          const color = burst.colors[Math.floor(Math.random() * burst.colors.length)];
          
          particlesRef.current.push({
            x: burst.x,
            y: burst.y,
            vx: Math.cos(randomAngle) * velocity,
            vy: Math.sin(randomAngle) * velocity,
            color: color,
            alpha: 1,
            size: (2 + Math.random() * 2) * velocityBase, // Scale size too
            decay: 0.01 + Math.random() * 0.015
          });
        }
        
        // Start animation loop if it wasn't running
        cancelAnimationFrame(requestRef.current);
        animate();
      }
    });

    if (bursts.length === 0) {
        processedBurstsRef.current.clear();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [bursts]);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-40"
    />
  );
};

export default Fireworks;